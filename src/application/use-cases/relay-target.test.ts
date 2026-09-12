/**
 * Tests for the target-owned relay's additive decision-review phase
 * (DECISION-REVIEW-MODE-1, @maturity PROTOTYPE).
 *
 * Two layers:
 *  1. Pure-function units — the trigger detector and the converged/contested
 *     classifier (the load-bearing logic the slice calls out for coverage).
 *  2. A headless integration exercise — drive `targetRelayLoop` with stub
 *     providers over a temp target tree, proving the phase fires + emits a
 *     ratification-packet + halts at `awaiting-ratification` WHEN the marker is
 *     present, and is a no-op (-> done) when it is ABSENT (additive parity at
 *     the use-case level).
 */

import { createHash } from 'node:crypto';
import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, rm, access, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';

import type { ClockPort } from '../ports/clock.js';
import type { ArtifactStorePort } from '../ports/artifact-store.js';
import type {
  ProviderRunnerPort,
  RunRequest,
  RunResult,
} from '../ports/provider-runner.js';
import { RunStatus } from '../../core/run-record.js';
import { FilesystemArtifactStore } from '../../adapters/filesystem/artifact-store.js';
import {
  parseBaselineManifest,
  parsePersistedAssurance,
  parseRequirementsReviewResult,
  parseRequirementsReviewRecord,
  parseApprovalRecordV2,
  renderAssuranceError,
  validateBaselineAdmission,
  type AssuranceFileSnapshot,
  type AssuranceSnapshot,
  type RequirementsReviewResult,
} from '../../core/assurance.js';
import { ClaudeAdapter } from '../../adapters/providers/claude-code/adapter.js';
import { CodexAdapter } from '../../adapters/providers/codex/adapter.js';
import { CopilotAdapter } from '../../adapters/providers/copilot/adapter.js';
import {
  admitBaseline,
  prepareReviewedTargetDryRunDeliveries,
  recordReviewedBaselineApproval,
  targetRelayLoop,
  hasRatificationDecisions,
  shouldEnterDecisionReview,
  parseChallengerAssessments,
  parseRebutterResponses,
  classifyRatification,
  extractDecisionIds,
  extractDecisionTexts,
  extractRecommendations,
  type TargetRelayInput,
  type TargetRelayDeps,
} from './relay-target.js';

// ---------------------------------------------------------------------------
// ASSURANCE-1: pure stage-1 grammar and policy
// ---------------------------------------------------------------------------

function snapshot(path: string, content: string): AssuranceFileSnapshot {
  return { status: 'ok', path, bytes: new TextEncoder().encode(content), sha256: computeDigest(content) };
}

function snapshotContent(value: AssuranceFileSnapshot): string {
  return new TextDecoder().decode(value.bytes);
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function addExtraField(raw: string, path: readonly (string | number)[]): string {
  const root = JSON.parse(raw) as unknown;
  let current = root;
  for (const segment of path) {
    if (typeof current !== 'object' || current === null) {
      throw new Error(`Test fixture path '${path.join('/')}' is not an object.`);
    }
    current = (current as Record<string | number, unknown>)[segment];
  }
  if (typeof current !== 'object' || current === null || Array.isArray(current)) {
    throw new Error(`Test fixture path '${path.join('/')}' does not select an object.`);
  }
  (current as Record<string, unknown>).extra = true;
  return json(root);
}

function mutateRequirementMetadata(
  content: string,
  mutate: (metadata: Record<string, unknown>) => void
): string {
  const open = '<!-- requirements-assurance-v1\n';
  const close = '\n-->';
  const end = content.indexOf(close, open.length);
  if (!content.startsWith(open) || end < 0) throw new Error('Invalid requirement test fixture.');
  const metadata = JSON.parse(content.slice(open.length, end)) as Record<string, unknown>;
  mutate(metadata);
  return `${open}${JSON.stringify(metadata, null, 2)}${content.slice(end)}`;
}

function requirementText(
  id = 'EX-REQ-001',
  sourcePath = 'docs/source.md',
  fragment = 'origin',
  lowId = `${id}-L01`,
  parentId = id
): string {
  return [
    '<!-- requirements-assurance-v1',
    JSON.stringify({
      formatVersion: 1,
      kind: 'requirement',
      requirementId: id,
      sources: [{ kind: 'document-section', path: sourcePath, fragment }],
      lowLevelRequirements: [{ id: lowId, parentId }],
    }, null, 2),
    '-->',
    `# ${id} — Example`,
    '',
    `### ${lowId} — Rule`,
    '',
  ].join('\n');
}

interface ClosureOptions {
  requirementFiles?: { path: string; content: string }[];
  sourcePlacement?: 'dependency' | 'requirement' | 'both' | 'absent' | 'governance';
  reviewResult?: 'accepted' | 'rejected' | 'decision-required';
  approvalDecision?: 'approved' | 'rejected';
}

function validClosure(options: ClosureOptions = {}): {
  manifestPath: string;
  snapshots: AssuranceSnapshot[];
  allocationPath: string;
} {
  const manifestPath = 'docs/requirements/baselines/B1.json';
  const allocationPath = 'docs/slices/S1.md';
  const sourcePath = 'docs/source.md';
  const sourcePlacement = options.sourcePlacement ?? 'dependency';
  const requirementSourcePath = 'docs/requirements/source-req.md';
  const defaultRequirement = {
    path: 'docs/requirements/ex-req-001.md',
    content: sourcePlacement === 'requirement' || sourcePlacement === 'both'
      ? requirementText('EX-REQ-001', requirementSourcePath, 'shared-source')
      : requirementText(),
  };
  const requirementFiles = options.requirementFiles ?? [defaultRequirement];
  if ((sourcePlacement === 'requirement' || sourcePlacement === 'both') && options.requirementFiles === undefined) {
    requirementFiles.push({
      path: requirementSourcePath,
      content: `${requirementText('EX-REQ-002', sourcePath, 'origin')}\n## Shared Source\n`,
    });
  }
  const source = snapshot(sourcePath, '# Origin\n');
  const requirements = requirementFiles.map((r) => snapshot(r.path, r.content));
  const manifestRequirements = requirements.map((r) => ({ path: r.path, sha256: r.sha256 }));
  const dependencies: { role: string; path: string; sha256: string }[] = [
    { role: 'allocation', path: allocationPath, sha256: computeDigest('# Slice\n') },
  ];
  if (sourcePlacement === 'dependency' || sourcePlacement === 'requirement') {
    dependencies.push({ role: 'source', path: source.path, sha256: source.sha256 });
  } else if (sourcePlacement === 'both') {
    dependencies.push({ role: 'source', path: source.path, sha256: source.sha256 });
    const sourceRequirement = requirements.find((r) => r.path === requirementSourcePath);
    if (sourceRequirement) {
      dependencies.push({ role: 'source', path: sourceRequirement.path, sha256: sourceRequirement.sha256 });
    }
  } else if (sourcePlacement === 'governance') {
    dependencies.push({ role: 'governance', path: source.path, sha256: source.sha256 });
  }
  const manifest = snapshot(manifestPath, json({
    formatVersion: 1,
    kind: 'requirements-baseline-manifest',
    baselineId: 'B1',
    target: { projectId: 'example', root: '.' },
    requirements: manifestRequirements,
    dependencies,
    requiredDecisionIds: ['D1'],
  }));
  const reviewPath = 'docs/assurance/B1/requirements-review.json';
  const review = snapshot(reviewPath, json({
    formatVersion: 1,
    kind: 'manual-requirements-review',
    reviewId: 'R1',
    subject: { path: manifest.path, sha256: manifest.sha256 },
    author: { role: 'builder', provider: 'stub', model: 'b', effort: 'high', runId: 'build-1' },
    reviewer: { role: 'reviewer', provider: 'stub', model: 'r', effort: 'high', runId: 'review-1' },
    result: options.reviewResult ?? 'accepted',
    completedAt: '2026-09-11T20:00:00.000Z',
    report: 'Accepted fixture.',
  }));
  const authority = snapshot('docs/authority.md', '# Authority\n');
  const approval = snapshot('docs/assurance/B1/baseline-approval.json', json({
    formatVersion: 1,
    kind: 'requirements-baseline-approval',
    approvalId: 'A1',
    subject: { path: manifest.path, sha256: manifest.sha256 },
    review: { path: review.path, sha256: review.sha256 },
    decision: options.approvalDecision ?? 'approved',
    approvedBy: { actorType: 'operator', actorId: 'manager' },
    recordedBy: { actorType: 'operator', actorId: 'manager' },
    authorityBasis: { path: authority.path, sha256: authority.sha256 },
    resolvedDecisions: [{ id: 'D1', record: { path: authority.path, sha256: authority.sha256 } }],
    decidedAt: '2026-09-11T20:01:00.000Z',
    rationale: 'Reviewed and approved.',
  }));
  const allocation = snapshot(allocationPath, '# Slice\n');
  return {
    manifestPath,
    allocationPath,
    snapshots: [manifest, ...requirements, source, allocation, review, approval, authority],
  };
}

function replaceSnapshot(
  closure: ReturnType<typeof validClosure>,
  path: string,
  replacement: AssuranceSnapshot
): ReturnType<typeof validClosure> {
  return { ...closure, snapshots: closure.snapshots.map((s) => s.path === path ? replacement : s) };
}

function errorCodes(closure: ReturnType<typeof validClosure>): string[] {
  const result = validateBaselineAdmission({
    manifestPath: closure.manifestPath,
    snapshots: closure.snapshots,
    allocationPath: closure.allocationPath,
  });
  return result.ok ? [] : result.errors.map((e) => e.code);
}

describe('ASSURANCE-1 pure grammar and policy (A1-C01)', () => {
  it('admits a valid closed input chain and renders the exact persisted identity', () => {
    const closure = validClosure();
    const result = validateBaselineAdmission({ manifestPath: closure.manifestPath, snapshots: closure.snapshots, allocationPath: closure.allocationPath });
    expect(result).toEqual({
      ok: true,
      admission: {
        enforcement: 'baseline-admission',
        manifest: expect.objectContaining({ path: closure.manifestPath, sha256: expect.stringMatching(/^sha256:/) }),
        baselineId: 'B1',
        allocationPaths: [closure.allocationPath],
      },
    });
  });

  it.each([
    ['missing', { status: 'error', path: 'docs/source.md', code: 'missing', detail: 'gone' }],
    ['unreadable', { status: 'error', path: 'docs/source.md', code: 'unreadable', detail: 'denied' }],
    ['io-failure', { status: 'error', path: 'docs/source.md', code: 'io-failure', detail: 'device error' }],
    ['path-escape', { status: 'error', path: 'docs/source.md', code: 'path-escape', detail: 'escaped' }],
  ] as const)('keeps the %s read outcome distinct', (expected, failure) => {
    expect(errorCodes(replaceSnapshot(validClosure(), 'docs/source.md', failure))).toContain(expected);
  });

  it('rejects malformed JSON, duplicate members, unknown fields, wrong fields/version/kind', () => {
    const base = validClosure();
    const manifest = base.snapshots[0] as AssuranceFileSnapshot;
    const variants: [string, string][] = [
      ['malformed-json', '{"formatVersion":1,'],
      ['duplicate-field', snapshotContent(manifest).replace('"kind":', '"kind": "requirements-baseline-manifest",\n  "kind":')],
      ['unknown-field', snapshotContent(manifest).replace('{\n', '{\n  "futureEvidence": [],\n')],
      ['invalid-field', snapshotContent(manifest).replace('"baselineId": "B1"', '"baselineId": 1')],
      ['unsupported-version', snapshotContent(manifest).replace('"formatVersion": 1', '"formatVersion": 99')],
      ['unsupported-kind', snapshotContent(manifest).replace('"kind": "requirements-baseline-manifest"', '"kind": "future"')],
    ];
    for (const [expected, content] of variants) {
      const parsed = parseBaselineManifest(snapshot(base.manifestPath, content));
      expect(parsed.ok ? [] : parsed.errors.map((e) => e.code)).toContain(expected);
    }
  });

  it('stops deeper diagnostics at malformed or duplicate-key boundaries for every record kind', () => {
    const malformed = (raw: string): string =>
      raw.replace('"formatVersion": 1,', '"formatVersion": 1,,');
    const duplicateUnrelatedRootMember = (raw: string): string =>
      raw.replace('{\n', '{\n  "extra": false,\n');
    const expectOnlyAmbiguousRecordError = (
      closure: ReturnType<typeof validClosure>,
      expected: 'malformed-json' | 'duplicate-field'
    ): void => {
      expect(errorCodes(closure)).toEqual([expected]);
    };

    // Manifest: the duplicate path and invalid sibling are readable only after
    // decoding, which the ambiguous-record rule deliberately forbids.
    const manifestClosure = validClosure();
    const manifestSnapshot = manifestClosure.snapshots[0] as AssuranceFileSnapshot;
    const manifestValue = JSON.parse(snapshotContent(manifestSnapshot)) as {
      requirements: { path: string; sha256: string }[];
      dependencies: { role: string; path: string; sha256: string }[];
      extra?: boolean;
    };
    manifestValue.dependencies.push({
      role: 'source',
      path: manifestValue.requirements[0]!.path,
      sha256: 'invalid-digest',
    });
    manifestValue.extra = true;
    const manifestWithDeeperErrors = json(manifestValue);
    for (const [expected, raw] of [
      ['malformed-json', malformed(manifestWithDeeperErrors)],
      ['duplicate-field', duplicateUnrelatedRootMember(manifestWithDeeperErrors)],
    ] as const) {
      const parsed = parseBaselineManifest(snapshot(manifestSnapshot.path, raw));
      expect(parsed.ok ? [] : parsed.errors.map((item) => item.code)).toEqual([expected]);
    }

    // Requirement: if the second record were decoded, its H/L identities would
    // duplicate the first record and its `extra` field would also be unknown.
    const requirementWithDeeperErrors = mutateRequirementMetadata(requirementText(), (metadata) => {
      metadata.extra = true;
    });
    for (const [expected, content] of [
      ['malformed-json', malformed(requirementWithDeeperErrors)],
      ['duplicate-field', duplicateUnrelatedRootMember(requirementWithDeeperErrors)],
    ] as const) {
      expectOnlyAmbiguousRecordError(validClosure({
        requirementFiles: [
          { path: 'docs/requirements/a.md', content: requirementText() },
          { path: 'docs/requirements/b.md', content },
        ],
      }), expected);
    }

    // Review: keep the approval's byte reference aligned with the deliberately
    // ambiguous review so only diagnostics requiring review decoding are tested.
    const reviewPath = 'docs/assurance/B1/requirements-review.json';
    const approvalPath = 'docs/assurance/B1/baseline-approval.json';
    const reviewClosure = validClosure();
    const reviewSnapshot = reviewClosure.snapshots.find((item) => item.path === reviewPath) as AssuranceFileSnapshot;
    const reviewValue = JSON.parse(snapshotContent(reviewSnapshot)) as {
      author: { runId: string };
      reviewer: { runId: string };
      extra?: boolean;
    };
    reviewValue.reviewer.runId = reviewValue.author.runId;
    reviewValue.extra = true;
    const reviewWithDeeperErrors = json(reviewValue);
    for (const [expected, raw] of [
      ['malformed-json', malformed(reviewWithDeeperErrors)],
      ['duplicate-field', duplicateUnrelatedRootMember(reviewWithDeeperErrors)],
    ] as const) {
      const changedReview = snapshot(reviewPath, raw);
      const originalApproval = reviewClosure.snapshots.find((item) => item.path === approvalPath) as AssuranceFileSnapshot;
      const approvalValue = JSON.parse(snapshotContent(originalApproval)) as {
        review: { path: string; sha256: string };
      };
      approvalValue.review.sha256 = changedReview.sha256;
      const closure = replaceSnapshot(
        replaceSnapshot(reviewClosure, reviewPath, changedReview),
        approvalPath,
        snapshot(approvalPath, json(approvalValue))
      );
      expectOnlyAmbiguousRecordError(closure, expected);
    }

    // Approval: the duplicate decision identity, invalid nested ContentRef and
    // unknown root field are not harvested through ambiguous JSON.
    const approvalClosure = validClosure();
    const approvalSnapshot = approvalClosure.snapshots.find((item) => item.path === approvalPath) as AssuranceFileSnapshot;
    const approvalValue = JSON.parse(snapshotContent(approvalSnapshot)) as {
      resolvedDecisions: Record<string, unknown>[];
      extra?: boolean;
    };
    approvalValue.resolvedDecisions.push({
      id: approvalValue.resolvedDecisions[0]!.id,
      record: { path: 'docs/authority.md' },
    });
    approvalValue.extra = true;
    const approvalWithDeeperErrors = json(approvalValue);
    for (const [expected, raw] of [
      ['malformed-json', malformed(approvalWithDeeperErrors)],
      ['duplicate-field', duplicateUnrelatedRootMember(approvalWithDeeperErrors)],
    ] as const) {
      expectOnlyAmbiguousRecordError(
        replaceSnapshot(approvalClosure, approvalPath, snapshot(approvalPath, raw)),
        expected
      );
    }
  });

  it('rejects unknown fields at every closed record-object level', () => {
    const closure = validClosure();
    const requirementPath = 'docs/requirements/ex-req-001.md';
    const reviewPath = 'docs/assurance/B1/requirements-review.json';
    const approvalPath = 'docs/assurance/B1/baseline-approval.json';
    const changes: [string, string, (raw: string) => string][] = [
      ['manifest root', closure.manifestPath, (raw) => addExtraField(raw, [])],
      ['manifest target', closure.manifestPath, (raw) => addExtraField(raw, ['target'])],
      ['manifest requirement ContentRef', closure.manifestPath, (raw) => addExtraField(raw, ['requirements', 0])],
      ['manifest dependency', closure.manifestPath, (raw) => addExtraField(raw, ['dependencies', 0])],
      ['requirement metadata root', requirementPath, (raw) => mutateRequirementMetadata(raw, (metadata) => { metadata.extra = true; })],
      ['requirement source', requirementPath, (raw) => mutateRequirementMetadata(raw, (metadata) => {
        ((metadata.sources as Record<string, unknown>[])[0] as Record<string, unknown>).extra = true;
      })],
      ['requirement low-level reference', requirementPath, (raw) => mutateRequirementMetadata(raw, (metadata) => {
        ((metadata.lowLevelRequirements as Record<string, unknown>[])[0] as Record<string, unknown>).extra = true;
      })],
      ['review root', reviewPath, (raw) => addExtraField(raw, [])],
      ['review subject', reviewPath, (raw) => addExtraField(raw, ['subject'])],
      ['review author', reviewPath, (raw) => addExtraField(raw, ['author'])],
      ['review reviewer', reviewPath, (raw) => addExtraField(raw, ['reviewer'])],
      ['approval root', approvalPath, (raw) => addExtraField(raw, [])],
      ['approval subject', approvalPath, (raw) => addExtraField(raw, ['subject'])],
      ['approval review', approvalPath, (raw) => addExtraField(raw, ['review'])],
      ['approval approvedBy', approvalPath, (raw) => addExtraField(raw, ['approvedBy'])],
      ['approval recordedBy', approvalPath, (raw) => addExtraField(raw, ['recordedBy'])],
      ['approval authorityBasis', approvalPath, (raw) => addExtraField(raw, ['authorityBasis'])],
      ['approval resolved decision', approvalPath, (raw) => addExtraField(raw, ['resolvedDecisions', 0])],
      ['approval resolved decision record', approvalPath, (raw) => addExtraField(raw, ['resolvedDecisions', 0, 'record'])],
    ];
    for (const [, path, mutate] of changes) {
      const original = closure.snapshots.find((s) => s.path === path) as AssuranceFileSnapshot;
      expect(errorCodes(replaceSnapshot(closure, path, snapshot(path, mutate(snapshotContent(original)))))).toContain('unknown-field');
    }

    const persistedRoot = parsePersistedAssurance({
      contract: 'requirements-assurance/v1-stage1', enforcement: 'baseline-admission',
      manifest: { path: closure.manifestPath, sha256: (closure.snapshots[0] as AssuranceFileSnapshot).sha256 },
      extra: true,
    }, 'status.json');
    expect(persistedRoot.ok ? [] : persistedRoot.errors.map((e) => e.code)).toContain('unknown-field');
    const persistedManifest = parsePersistedAssurance({
      contract: 'requirements-assurance/v1-stage1', enforcement: 'baseline-admission',
      manifest: { path: closure.manifestPath, sha256: (closure.snapshots[0] as AssuranceFileSnapshot).sha256, extra: true },
    }, 'status.json');
    expect(persistedManifest.ok ? [] : persistedManifest.errors.map((e) => e.code)).toContain('unknown-field');
  });

  it('rejects UTF-8 BOM bytes on every JSON-bearing record type', () => {
    const closure = validClosure();
    for (const path of [
      closure.manifestPath,
      'docs/requirements/ex-req-001.md',
      'docs/assurance/B1/requirements-review.json',
      'docs/assurance/B1/baseline-approval.json',
    ]) {
      const original = closure.snapshots.find((item) => item.path === path) as AssuranceFileSnapshot;
      const bomPrefixed = snapshot(path, `\uFEFF${snapshotContent(original)}`);
      expect(errorCodes(replaceSnapshot(closure, path, bomPrefixed))).toContain('malformed-json');
    }
  });

  it('applies required-field, version, and kind rules to requirement, review, and approval records', () => {
    const closure = validClosure();
    const cases: [string, string, (raw: string) => string][] = [
      ['unsupported-version', 'docs/requirements/ex-req-001.md', (raw) => raw.replace('"formatVersion": 1', '"formatVersion": 2')],
      ['unsupported-kind', 'docs/requirements/ex-req-001.md', (raw) => raw.replace('"kind": "requirement"', '"kind": "future-requirement"')],
      ['unsupported-version', 'docs/assurance/B1/requirements-review.json', (raw) => raw.replace('"formatVersion": 1', '"formatVersion": 2')],
      ['unsupported-kind', 'docs/assurance/B1/requirements-review.json', (raw) => raw.replace('"kind": "manual-requirements-review"', '"kind": "future-review"')],
      ['unsupported-version', 'docs/assurance/B1/baseline-approval.json', (raw) => raw.replace('"formatVersion": 1', '"formatVersion": 2')],
      ['unsupported-kind', 'docs/assurance/B1/baseline-approval.json', (raw) => raw.replace('"kind": "requirements-baseline-approval"', '"kind": "future-approval"')],
      ['invalid-field', 'docs/assurance/B1/baseline-approval.json', (raw) => {
        const value = JSON.parse(raw) as Record<string, unknown>;
        delete value.rationale;
        return json(value);
      }],
    ];
    for (const [expected, path, mutate] of cases) {
      const original = closure.snapshots.find((s) => s.path === path) as AssuranceFileSnapshot;
      expect(errorCodes(replaceSnapshot(closure, path, snapshot(path, mutate(snapshotContent(original)))))).toContain(expected);
    }
  });

  it('rejects duplicate paths and duplicate global H/L identities with both locations', () => {
    const sameH = [
      { path: 'docs/requirements/a.md', content: requirementText() },
      { path: 'docs/requirements/b.md', content: requirementText() },
    ];
    const closure = validClosure({ requirementFiles: sameH });
    expect(errorCodes(closure)).toContain('duplicate-identity');
    const both = validClosure({ sourcePlacement: 'both' });
    expect(errorCodes(both)).toContain('duplicate-identity');
    const manifest = both.snapshots[0] as AssuranceFileSnapshot;
    const value = JSON.parse(snapshotContent(manifest)) as { requiredDecisionIds: string[] };
    value.requiredDecisionIds.push(value.requiredDecisionIds[0] as string);
    const parsed = parseBaselineManifest(snapshot(manifest.path, json(value)));
    expect(parsed.ok ? [] : parsed.errors.map((e) => e.code)).toContain('duplicate-identity');
  });

  it('reports duplicate identities alongside unrelated errors in every unambiguous record kind', () => {
    const closure = validClosure();
    const manifest = closure.snapshots[0] as AssuranceFileSnapshot;
    const manifestValue = JSON.parse(snapshotContent(manifest)) as {
      requirements: { path: string; sha256: string }[];
      dependencies: { role: string; path: string; sha256: string }[];
    };
    manifestValue.dependencies.push({
      role: 'source',
      path: manifestValue.requirements[0]!.path,
      sha256: 'invalid-digest',
    });
    (manifestValue as unknown as Record<string, unknown>).extra = true;
    const manifestResult = parseBaselineManifest(snapshot(manifest.path, json(manifestValue)));
    const manifestCodes = manifestResult.ok ? [] : manifestResult.errors.map((item) => item.code);
    expect(manifestCodes).toEqual(expect.arrayContaining(['unknown-field', 'invalid-field', 'duplicate-identity']));

    const requirementPath = 'docs/requirements/ex-req-001.md';
    const requirement = closure.snapshots.find((item) => item.path === requirementPath) as AssuranceFileSnapshot;
    const duplicateLow = mutateRequirementMetadata(snapshotContent(requirement), (metadata) => {
      const entries = metadata.lowLevelRequirements as Record<string, unknown>[];
      entries.push({ id: entries[0]!.id, parentId: 'EX-REQ-999' });
    });
    const lowCodes = errorCodes(replaceSnapshot(closure, requirementPath, snapshot(requirementPath, duplicateLow)));
    expect(lowCodes).toEqual(expect.arrayContaining(['parent-mismatch', 'duplicate-identity']));

    const reviewPath = 'docs/assurance/B1/requirements-review.json';
    const review = closure.snapshots.find((item) => item.path === reviewPath) as AssuranceFileSnapshot;
    const reviewValue = JSON.parse(snapshotContent(review)) as {
      author: { runId: string };
      reviewer: { runId: string };
      extra?: boolean;
    };
    reviewValue.reviewer.runId = reviewValue.author.runId;
    reviewValue.extra = true;
    const reviewCodes = errorCodes(replaceSnapshot(closure, reviewPath, snapshot(reviewPath, json(reviewValue))));
    expect(reviewCodes).toEqual(expect.arrayContaining(['unknown-field', 'duplicate-identity']));

    const approvalPath = 'docs/assurance/B1/baseline-approval.json';
    const approval = closure.snapshots.find((item) => item.path === approvalPath) as AssuranceFileSnapshot;
    const approvalValue = JSON.parse(snapshotContent(approval)) as {
      resolvedDecisions: Record<string, unknown>[];
      extra?: boolean;
    };
    approvalValue.resolvedDecisions.push({ id: approvalValue.resolvedDecisions[0]!.id, record: { path: 'docs/authority.md' } });
    approvalValue.extra = true;
    const approvalCodes = errorCodes(replaceSnapshot(closure, approvalPath, snapshot(approvalPath, json(approvalValue))));
    expect(approvalCodes).toEqual(expect.arrayContaining(['unknown-field', 'invalid-field', 'duplicate-identity']));
  });

  it('reports global H/L duplicates when one requirement has independent sibling errors', () => {
    const firstPath = 'docs/requirements/a.md';
    const secondPath = 'docs/requirements/b.md';
    const invalidSibling = mutateRequirementMetadata(requirementText(), (metadata) => {
      ((metadata.sources as Record<string, unknown>[])[0] as Record<string, unknown>).extra = true;
    });
    const closure = validClosure({
      requirementFiles: [
        { path: firstPath, content: requirementText() },
        { path: secondPath, content: invalidSibling },
      ],
    });

    const result = validateBaselineAdmission({
      manifestPath: closure.manifestPath,
      snapshots: closure.snapshots,
      allocationPath: closure.allocationPath,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'unknown-field',
        recordPath: secondPath,
        location: '/sources/0/extra',
      }),
      expect.objectContaining({
        code: 'duplicate-identity',
        detail: "duplicate identity 'EX-REQ-001'",
        location: `${secondPath}#/requirementId`,
        otherLocation: `${firstPath}#/requirementId`,
      }),
      expect.objectContaining({
        code: 'duplicate-identity',
        detail: "duplicate identity 'EX-REQ-001-L01'",
        location: `${secondPath}#/lowLevelRequirements/0/id`,
        otherLocation: `${firstPath}#/lowLevelRequirements/0/id`,
      }),
    ]));
  });

  it('reports global H/L duplicates when one requirement metadata root has an unknown field', () => {
    const firstPath = 'docs/requirements/a.md';
    const secondPath = 'docs/requirements/b.md';
    const invalidRoot = mutateRequirementMetadata(requirementText(), (metadata) => {
      metadata.extra = true;
    });
    const closure = validClosure({
      requirementFiles: [
        { path: firstPath, content: requirementText() },
        { path: secondPath, content: invalidRoot },
      ],
    });

    const result = validateBaselineAdmission({
      manifestPath: closure.manifestPath,
      snapshots: closure.snapshots,
      allocationPath: closure.allocationPath,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'unknown-field',
        recordPath: secondPath,
        location: '/extra',
      }),
      expect.objectContaining({
        code: 'duplicate-identity',
        detail: "duplicate identity 'EX-REQ-001'",
        location: `${secondPath}#/requirementId`,
        otherLocation: `${firstPath}#/requirementId`,
      }),
      expect.objectContaining({
        code: 'duplicate-identity',
        detail: "duplicate identity 'EX-REQ-001-L01'",
        location: `${secondPath}#/lowLevelRequirements/0/id`,
        otherLocation: `${firstPath}#/lowLevelRequirements/0/id`,
      }),
    ]));
  });

  it('rejects metadata delimiter, heading and parent mismatches', () => {
    const cases: [string, string][] = [
      ['metadata-delimiter', requirementText().replace('<!-- requirements-assurance-v1\n', 'preface\n<!-- requirements-assurance-v1\n')],
      ['metadata-delimiter', requirementText().replace('\n-->', '\nextra\n-->')],
      ['heading-mismatch', requirementText().replace('# EX-REQ-001 —', '# EX-REQ-999 —')],
      ['parent-mismatch', requirementText('EX-REQ-001', 'docs/source.md', 'origin', 'EX-REQ-001-L01', 'EX-REQ-999')],
    ];
    for (const [expected, content] of cases) {
      const closure = validClosure();
      const reqPath = 'docs/requirements/ex-req-001.md';
      expect(errorCodes(replaceSnapshot(closure, reqPath, snapshot(reqPath, content)))).toContain(expected);
    }
  });

  it('rejects digest drift, source absence/ambiguity/non-source placement, and stale subjects', () => {
    const drift = validClosure();
    const source = snapshot('docs/source.md', '# Changed\n');
    expect(errorCodes(replaceSnapshot(drift, source.path, source))).toContain('digest-mismatch');
    expect(errorCodes(validClosure({ sourcePlacement: 'absent' }))).toContain('source-not-found');
    expect(errorCodes(validClosure({ sourcePlacement: 'governance' }))).toContain('source-not-found');
    const ambiguous = validClosure();
    expect(errorCodes(replaceSnapshot(ambiguous, 'docs/source.md', snapshot('docs/source.md', '# Origin\n## Origin\n')))).toContain('source-ambiguous');

    const stale = validClosure();
    const reviewPath = 'docs/assurance/B1/requirements-review.json';
    const review = stale.snapshots.find((s) => s.path === reviewPath) as AssuranceFileSnapshot;
    expect(errorCodes(replaceSnapshot(stale, reviewPath, snapshot(reviewPath, snapshotContent(review).replace(/sha256:[0-9a-f]{64}/, `sha256:${'0'.repeat(64)}`))))).toContain('subject-mismatch');
  });

  it('retains a valid source reference for diagnostics when an unrelated requirement field is unknown', () => {
    const missingHeading = requirementText('EX-REQ-001', 'docs/source.md', 'absent-heading');
    const withoutUnrelatedError = validClosure({
      requirementFiles: [{ path: 'docs/requirements/ex-req-001.md', content: missingHeading }],
    });
    expect(errorCodes(withoutUnrelatedError)).toContain('source-not-found');

    const withUnrelatedError = validClosure({
      requirementFiles: [{
        path: 'docs/requirements/ex-req-001.md',
        content: mutateRequirementMetadata(missingHeading, (metadata) => { metadata.extra = true; }),
      }],
    });
    expect(errorCodes(withUnrelatedError)).toEqual(expect.arrayContaining([
      'unknown-field',
      'source-not-found',
    ]));
  });

  it('binds baselineId to its fixed manifest location', () => {
    const closure = validClosure();
    const manifest = closure.snapshots[0] as AssuranceFileSnapshot;
    const moved = snapshot('docs/requirements/baselines/MOVED.json', snapshotContent(manifest));
    const result = validateBaselineAdmission({
      manifestPath: moved.path,
      snapshots: [moved, ...closure.snapshots.slice(1)],
      allocationPath: closure.allocationPath,
    });
    expect(result.ok ? [] : result.errors.map((e) => e.code)).toContain('subject-mismatch');
  });

  it('accepts a source supplied by requirements or role-source and rejects the other closure classifications', () => {
    expect(errorCodes(validClosure({ sourcePlacement: 'dependency' }))).toEqual([]);
    expect(errorCodes(validClosure({ sourcePlacement: 'requirement' }))).toEqual([]);
    expect(errorCodes(validClosure({ sourcePlacement: 'both' }))).toContain('duplicate-identity');
    expect(errorCodes(validClosure({ sourcePlacement: 'absent' }))).toContain('source-not-found');
    expect(errorCodes(validClosure({ sourcePlacement: 'governance' }))).toContain('source-not-found');
  });

  it('rejects unaccepted review/approval and malformed persisted mode; renderer covers every stable code', () => {
    expect(errorCodes(validClosure({ reviewResult: 'rejected' }))).toContain('review-not-accepted');
    expect(errorCodes(validClosure({ approvalDecision: 'rejected' }))).toContain('approval-not-approved');
    const malformed = parsePersistedAssurance({ contract: 'requirements-assurance/v1-stage1', enforcement: 'baseline-admission' }, 'status.json');
    expect(malformed.ok).toBe(false);
    if (!malformed.ok) expect(malformed.errors.map(renderAssuranceError).join('\n')).toContain('invalid-field: status.json');
  });
});

describe('ASSURANCE-1 filesystem boundary (A1-C02)', () => {
  let target = '';
  const store = new FilesystemArtifactStore();

  afterEach(async () => {
    if (target) await rm(target, { recursive: true, force: true });
    target = '';
  });

  it('reads a contained regular file and hashes its exact bytes', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-1-fs-ok-');
    await mkdir(join(target, 'docs'));
    await writeFile(join(target, 'docs', 'x.md'), 'exact\r\nbytes\n', 'utf-8');
    const result = await store.readContainedFile(target, 'docs/x.md');
    expect(result).toEqual(expect.objectContaining({
      status: 'ok', path: 'docs/x.md', sha256: computeDigest('exact\r\nbytes\n'),
    }));
    if (result.status === 'ok') {
      expect([...result.bytes]).toEqual([...new TextEncoder().encode('exact\r\nbytes\n')]);
    }
  });

  it.each(['../outside', '/absolute', 'windows\\path', 'a//b', './x'])('rejects non-contained path %s before reading', async (path) => {
    target = await mkdtemp('/private/tmp/ASSURANCE-1-fs-path-');
    const result = await store.readContainedFile(target, path);
    expect(result).toEqual(expect.objectContaining({ status: 'error', code: 'path-escape', path }));
  });

  it('distinguishes missing, non-file I/O failure, and a symlink escape', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-1-fs-errors-');
    await mkdir(join(target, 'directory'));
    const missing = await store.readContainedFile(target, 'missing.json');
    expect(missing).toEqual(expect.objectContaining({ status: 'error', code: 'missing' }));
    const directory = await store.readContainedFile(target, 'directory');
    expect(directory).toEqual(expect.objectContaining({ status: 'error', code: 'io-failure' }));
    await import('node:fs/promises').then(({ symlink }) => symlink('/private/tmp', join(target, 'escape')));
    const escaped = await store.readContainedFile(target, 'escape');
    expect(escaped).toEqual(expect.objectContaining({ status: 'error', code: 'path-escape' }));
  });

  it('classifies backslash as invalid-field in the pure manifest grammar', () => {
    const closure = validClosure();
    const manifest = closure.snapshots[0] as AssuranceFileSnapshot;
    const value = JSON.parse(snapshotContent(manifest)) as { dependencies: { path: string }[] };
    const source = value.dependencies.find((d) => d.path === 'docs/source.md');
    if (!source) throw new Error('fixture source dependency missing');
    source.path = 'docs\\source.md';
    const parsed = parseBaselineManifest(snapshot(manifest.path, json(value)));
    expect(parsed.ok ? [] : parsed.errors.map((e) => e.code)).toContain('invalid-field');
  });

  it.each(['../outside.md', '/absolute.md'])('classifies escaping manifest reference %s as path-escape', (badPath) => {
    const closure = validClosure();
    const manifest = closure.snapshots[0] as AssuranceFileSnapshot;
    const value = JSON.parse(snapshotContent(manifest)) as { dependencies: { path: string }[] };
    const source = value.dependencies.find((d) => d.path === 'docs/source.md');
    if (!source) throw new Error('fixture source dependency missing');
    source.path = badPath;
    const parsed = parseBaselineManifest(snapshot(manifest.path, json(value)));
    expect(parsed.ok ? [] : parsed.errors.map((e) => e.code)).toContain('path-escape');
  });

  it('uses the injected port seam to preserve an unreadable manifest outcome', async () => {
    const unreadableStore = {
      readContainedFile: async (_root: string, path: string) => ({
        status: 'error' as const,
        path,
        code: 'unreadable' as const,
        detail: 'permission denied by fixture',
      }),
    } as ArtifactStorePort;
    const result = await admitBaseline('/unused-fixture-root', 'manifest.json', unreadableStore);
    expect(result.ok ? [] : result.errors.map((e) => e.code)).toEqual(['unreadable']);
  });
});

async function writeClosure(target: string, closure: ReturnType<typeof validClosure>): Promise<void> {
  for (const item of closure.snapshots) {
    if (item.status !== 'ok') continue;
    await mkdir(dirname(join(target, item.path)), { recursive: true });
    await writeFile(join(target, item.path), item.bytes);
  }
}

async function seedAssuranceSlice(
  target: string,
  sliceId: string,
  phase: 'implement' | 'review-impl',
  assurance?: { contract: string; enforcement: string; manifest?: { path: string; sha256: string } }
): Promise<void> {
  const sliceDir = join(target, '.agent-manager', 'slices', sliceId);
  await mkdir(join(sliceDir, 'runs'), { recursive: true });
  await writeFile(join(sliceDir, 'selection.md'), `STATUS: selected\nSLICE_ID: ${sliceId}\nSLICE_DOC: docs/slices/S1.md\n`, 'utf-8');
  if (phase === 'review-impl') await writeFile(join(sliceDir, 'build-0.md'), '# built\n', 'utf-8');
  const status = {
    phase,
    sliceId,
    sliceDoc: 'docs/slices/S1.md',
    iteration: 0,
    updatedAt: '2026-09-11T20:00:00.000Z',
    lastActor: 'codex',
    builderProvider: 'claude',
    supervisorProvider: 'codex',
    ...(assurance ? { assurance } : {}),
  };
  await writeFile(join(sliceDir, 'status.json'), json(status), 'utf-8');
  await writeFile(join(target, '.agent-manager', 'current.json'), json({
    sliceId,
    sliceDoc: 'docs/slices/S1.md',
    updatedAt: '2026-09-11T20:00:00.000Z',
    ...(assurance ? { assurance } : {}),
  }), 'utf-8');
}

describe('ASSURANCE-1 use-case dispatch and resume (A1-C03)', () => {
  let target = '';

  afterEach(async () => {
    if (target) await rm(target, { recursive: true, force: true });
    target = '';
  });

  it('invalid initial baseline blocks before selector, builder, or reviewer', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-1-use-invalid-');
    const builder = new StubRunner(() => 'built');
    const supervisor = new StubRunner(() => 'STATUS: selected\nSLICE_ID: S1\nSLICE_DOC: docs/slices/S1.md\n');
    const result = await targetRelayLoop({ ...makeInput(target), baselinePath: 'missing.json' }, makeDeps(builder, supervisor));
    expect(result.phase).toBe('blocked');
    expect(result.reason).toContain('missing: missing.json');
    expect(builder.calls).toHaveLength(0);
    expect(supervisor.calls).toHaveLength(0);
  });

  it('malformed and stale initial baselines also block every provider', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-1-use-initial-');
    for (const name of ['malformed', 'stale']) {
      const caseRoot = join(target, name);
      await mkdir(caseRoot);
      const closure = validClosure();
      await writeClosure(caseRoot, closure);
      if (name === 'malformed') await writeFile(join(caseRoot, closure.manifestPath), '{', 'utf-8');
      else await writeFile(join(caseRoot, 'docs/source.md'), '# drift\n', 'utf-8');
      const builder = new StubRunner(() => 'built');
      const supervisor = new StubRunner(() => 'STATUS: selected\nSLICE_ID: S1\nSLICE_DOC: docs/slices/S1.md');
      const result = await targetRelayLoop({ ...makeInput(caseRoot), baselinePath: closure.manifestPath }, makeDeps(builder, supervisor));
      expect(result.phase).toBe('blocked');
      expect(builder.calls).toHaveLength(0);
      expect(supervisor.calls).toHaveLength(0);
    }
  });

  it('a BOM-prefixed selected manifest blocks before every provider call', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-1-use-bom-');
    const closure = validClosure();
    await writeClosure(target, closure);
    const manifest = closure.snapshots[0] as AssuranceFileSnapshot;
    await writeFile(
      join(target, closure.manifestPath),
      new Uint8Array([0xef, 0xbb, 0xbf, ...manifest.bytes])
    );
    const builder = new StubRunner(() => 'built');
    const supervisor = new StubRunner(() => 'STATUS: selected\nSLICE_ID: S1\nSLICE_DOC: docs/slices/S1.md');
    const result = await targetRelayLoop(
      { ...makeInput(target), baselinePath: closure.manifestPath },
      makeDeps(builder, supervisor)
    );
    expect(result.phase).toBe('blocked');
    expect(result.reason).toContain('malformed-json');
    expect(result.reason).toContain('byte order mark');
    expect(builder.calls).toHaveLength(0);
    expect(supervisor.calls).toHaveLength(0);
  });

  it('fresh selection with an allocation mismatch calls selector once and builder zero times', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-1-use-allocation-');
    const closure = validClosure();
    await writeClosure(target, closure);
    const builder = new StubRunner(() => 'built');
    const supervisor = new StubRunner(() => 'STATUS: selected\nSLICE_ID: S2\nSLICE_DOC: docs/slices/S2.md\n');
    const result = await targetRelayLoop({ ...makeInput(target), baselinePath: closure.manifestPath, reselect: true }, makeDeps(builder, supervisor));
    expect(result.phase).toBe('blocked');
    expect(result.reason).toContain('subject-mismatch');
    expect(supervisor.rolesCalled()).toEqual(['supervisor']);
    expect(builder.calls).toHaveLength(0);
  });

  it('valid prepared slice reaches exactly one builder and one reviewer and persists identical mode objects', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-1-use-valid-');
    const closure = validClosure();
    await writeClosure(target, closure);
    await seedAssuranceSlice(target, 'S1', 'implement');
    const builder = new StubRunner(() => '# build complete\n');
    const supervisor = new StubRunner(() => 'STATUS: approved\nGood.');
    const result = await targetRelayLoop({ ...makeInput(target), sliceId: 'S1', baselinePath: closure.manifestPath }, makeDeps(builder, supervisor));
    expect(result.phase).toBe('done');
    expect(builder.rolesCalled()).toEqual(['builder']);
    expect(supervisor.rolesCalled()).toEqual(['reviewer']);
    const status = JSON.parse(await readFile(join(target, '.agent-manager/slices/S1/status.json'), 'utf-8')) as { assurance: unknown };
    const current = JSON.parse(await readFile(join(target, '.agent-manager/current.json'), 'utf-8')) as { assurance: unknown };
    expect(status.assurance).toEqual(current.assurance);
    expect(status.assurance).toEqual(expect.objectContaining({ enforcement: 'baseline-admission' }));
  });

  it('a byte mutation by the builder is caught before review dispatch', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-1-use-drift-');
    const closure = validClosure();
    await writeClosure(target, closure);
    await seedAssuranceSlice(target, 'S1', 'implement');
    class MutatingBuilder implements ProviderRunnerPort {
      calls: RunRequest[] = [];
      async run(request: RunRequest): Promise<RunResult> {
        this.calls.push(request);
        await writeFile(join(target, 'docs/source.md'), '# Mutated\n', 'utf-8');
        return { runId: request.runId, status: RunStatus.COMPLETED, outputArtifacts: [{ suggestedPath: 'build.md', type: 'provider-output', content: 'built' }], logPath: '/tmp/stub.log', startedAt: '2026-09-11T20:00:00.000Z', completedAt: '2026-09-11T20:00:01.000Z', deliveryReceipt: receiptFor(request) };
      }
    }
    const builder = new MutatingBuilder();
    const supervisor = new StubRunner(() => 'STATUS: approved');
    const result = await targetRelayLoop({ ...makeInput(target), sliceId: 'S1', baselinePath: closure.manifestPath }, makeDeps(builder, supervisor));
    expect(result.phase).toBe('blocked');
    expect(result.reason).toContain('notes-for-human.md');
    expect(builder.calls).toHaveLength(1);
    expect(supervisor.calls).toHaveLength(0);
    expect(await readFile(join(target, '.agent-manager/slices/S1/notes-for-human.md'), 'utf-8')).toContain('digest-mismatch');
  });

  it('omitting the flag on resume revalidates persisted assurance', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-1-use-resume-');
    const closure = validClosure();
    await writeClosure(target, closure);
    const manifest = closure.snapshots[0] as AssuranceFileSnapshot;
    const mode = { contract: 'requirements-assurance/v1-stage1', enforcement: 'baseline-admission', manifest: { path: manifest.path, sha256: manifest.sha256 } };
    await seedAssuranceSlice(target, 'S1', 'implement', mode);
    const builder = new StubRunner(() => 'built');
    const supervisor = new StubRunner(() => 'STATUS: approved');
    const result = await targetRelayLoop(makeInput(target), makeDeps(builder, supervisor));
    expect(result.phase).toBe('done');
    expect(builder.calls).toHaveLength(1);
    expect(supervisor.calls).toHaveLength(1);
  });

  it('a conflicting flag or partial persisted mode blocks all dispatch', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-1-use-conflict-');
    const closure = validClosure();
    await writeClosure(target, closure);
    const manifest = closure.snapshots[0] as AssuranceFileSnapshot;
    await seedAssuranceSlice(target, 'S1', 'implement', {
      contract: 'requirements-assurance/v1-stage1',
      enforcement: 'baseline-admission',
      manifest: { path: 'different.json', sha256: `sha256:${'0'.repeat(64)}` },
    });
    const builder = new StubRunner(() => 'built');
    const supervisor = new StubRunner(() => 'STATUS: approved');
    const conflict = await targetRelayLoop({ ...makeInput(target), sliceId: 'S1', baselinePath: manifest.path }, makeDeps(builder, supervisor));
    expect(conflict.reason).toContain('Baseline conflict');
    expect(builder.calls).toHaveLength(0);
    expect(supervisor.calls).toHaveLength(0);

    await seedAssuranceSlice(target, 'S1', 'implement', {
      contract: 'requirements-assurance/v1-stage1',
      enforcement: 'baseline-admission',
    });
    const corrupt = await targetRelayLoop({ ...makeInput(target), sliceId: 'S1' }, makeDeps(builder, supervisor));
    expect(corrupt.reason).toContain('Malformed assured status.json');
    expect(builder.calls).toHaveLength(0);
    expect(supervisor.calls).toHaveLength(0);
  });

  it('malformed current or an active pointer to missing/malformed status blocks instead of selecting legacy work', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-1-use-pointer-');
    await mkdir(join(target, '.agent-manager', 'slices', 'S1'), { recursive: true });
    const builder = new StubRunner(() => 'built');
    const supervisor = new StubRunner(() => 'STATUS: selected\nSLICE_ID: S2');

    await writeFile(join(target, '.agent-manager', 'current.json'), '{', 'utf-8');
    const malformedCurrent = await targetRelayLoop(makeInput(target), makeDeps(builder, supervisor));
    expect(malformedCurrent.reason).toContain('Malformed active current.json');
    expect(supervisor.calls).toHaveLength(0);

    await writeFile(join(target, '.agent-manager', 'current.json'), json({ sliceId: 'S1', sliceDoc: 'docs/slices/S1.md', updatedAt: '2026-09-11T20:00:00.000Z' }), 'utf-8');
    const missing = await targetRelayLoop(makeInput(target), makeDeps(builder, supervisor));
    expect(missing.reason).toContain('missing status.json');
    expect(supervisor.calls).toHaveLength(0);
    await writeFile(join(target, '.agent-manager', 'slices', 'S1', 'status.json'), '{', 'utf-8');
    const malformed = await targetRelayLoop(makeInput(target), makeDeps(builder, supervisor));
    expect(malformed.reason).toContain('malformed status.json');
    expect(builder.calls).toHaveLength(0);
    expect(supervisor.calls).toHaveLength(0);
  });

  it.each([
    ['phase', 'corrupt'],
    ['lastActor', 'unknown'],
    ['builderProvider', 'unknown'],
    ['supervisorProvider', 'unknown'],
    ['iteration', -1],
    ['iteration', 0.5],
  ])('blocks a semantically invalid active status field %s before implicit dispatch', async (field, value) => {
    target = await mkdtemp('/private/tmp/ASSURANCE-1-use-status-shape-');
    await seedAssuranceSlice(target, 'S1', 'implement');
    const statusPath = join(target, '.agent-manager', 'slices', 'S1', 'status.json');
    const status = JSON.parse(await readFile(statusPath, 'utf-8')) as Record<string, unknown>;
    status[field] = value;
    await writeFile(statusPath, json(status), 'utf-8');

    const builder = new StubRunner(() => 'built');
    const supervisor = new StubRunner(() => 'STATUS: selected\nSLICE_ID: S2');
    const result = await targetRelayLoop(makeInput(target), makeDeps(builder, supervisor));

    expect(result).toEqual(expect.objectContaining({ phase: 'blocked', sliceId: 'S1' }));
    expect(result.reason).toContain('malformed status.json');
    expect(builder.calls).toHaveLength(0);
    expect(supervisor.calls).toHaveLength(0);
  });

  it('rejects the selection-only phase as non-resumable before implicit dispatch', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-1-use-select-phase-');
    await seedAssuranceSlice(target, 'S1', 'implement');
    const statusPath = join(target, '.agent-manager', 'slices', 'S1', 'status.json');
    const status = JSON.parse(await readFile(statusPath, 'utf-8')) as Record<string, unknown>;
    status.phase = 'select-slice';
    await writeFile(statusPath, json(status), 'utf-8');

    const builder = new StubRunner(() => 'built');
    const supervisor = new StubRunner(() => 'STATUS: selected\nSLICE_ID: S2');
    // Zero cycles makes the pre-fix path terminate at the cap rather than hang;
    // the admission guard must reject this phase before either path is reached.
    const result = await targetRelayLoop(
      { ...makeInput(target), maxIterations: 0 },
      makeDeps(builder, supervisor)
    );

    expect(result).toEqual(expect.objectContaining({ phase: 'blocked', sliceId: 'S1' }));
    expect(result.reason).toContain("Active status phase 'select-slice' is not resumable");
    expect(builder.calls).toHaveLength(0);
    expect(supervisor.calls).toHaveLength(0);
  });

  it('resumes intact legacy state without selecting different work', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-1-use-legacy-resume-');
    await seedAssuranceSlice(target, 'S1', 'implement');
    const builder = new StubRunner(() => 'built');
    const supervisor = new StubRunner((request) => request.role === 'reviewer'
      ? 'STATUS: approved'
      : 'STATUS: selected\nSLICE_ID: S2\nSLICE_DOC: docs/slices/S2.md');
    const result = await targetRelayLoop(makeInput(target), makeDeps(builder, supervisor));
    expect(result).toEqual(expect.objectContaining({ phase: 'done', sliceId: 'S1' }));
    expect(builder.rolesCalled()).toEqual(['builder']);
    expect(supervisor.rolesCalled()).toEqual(['reviewer']);
  });

  it('revalidates and continues preserved partial work after evidence-supported assured-state repair', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-1-use-recovery-');
    const closure = validClosure();
    await writeClosure(target, closure);
    const manifest = closure.snapshots[0] as AssuranceFileSnapshot;
    const mode = {
      contract: 'requirements-assurance/v1-stage1',
      enforcement: 'baseline-admission',
      manifest: { path: manifest.path, sha256: manifest.sha256 },
    };
    await seedAssuranceSlice(target, 'S1', 'implement', mode);
    const partialPath = join(target, 'preserved-partial-work.txt');
    await writeFile(partialPath, 'candidate bytes retained\n', 'utf-8');
    await writeFile(join(target, '.agent-manager', 'current.json'), '{', 'utf-8');

    const builder = new StubRunner(() => 'continued existing candidate');
    const supervisor = new StubRunner((request) => request.role === 'reviewer'
      ? 'STATUS: approved'
      : 'STATUS: selected\nSLICE_ID: S2\nSLICE_DOC: docs/slices/S2.md');
    const deps = makeDeps(builder, supervisor);
    const refused = await targetRelayLoop(makeInput(target), deps);
    expect(refused.reason).toContain('Malformed active current.json');
    expect(builder.calls).toHaveLength(0);
    expect(supervisor.calls).toHaveLength(0);

    // Model the manager's evidence-supported repair: restore only the active
    // pointer from the intact assured status, then explicitly resume S1.
    const intactStatus = JSON.parse(await readFile(
      join(target, '.agent-manager', 'slices', 'S1', 'status.json'),
      'utf-8'
    )) as { sliceId: string; sliceDoc: string; updatedAt: string; assurance: unknown };
    expect(intactStatus).toEqual(expect.objectContaining({
      sliceId: 'S1',
      sliceDoc: 'docs/slices/S1.md',
      assurance: mode,
    }));
    await writeFile(join(target, '.agent-manager', 'current.json'), json({
      sliceId: intactStatus.sliceId,
      sliceDoc: intactStatus.sliceDoc,
      updatedAt: intactStatus.updatedAt,
      assurance: intactStatus.assurance,
    }), 'utf-8');

    await writeFile(join(target, 'docs/source.md'), '# Drifted\n', 'utf-8');
    const drifted = await targetRelayLoop({ ...makeInput(target), sliceId: 'S1' }, deps);
    expect(drifted.reason).toContain('digest-mismatch');
    expect(builder.calls).toHaveLength(0);
    expect(supervisor.calls).toHaveLength(0);

    await writeFile(join(target, 'docs/source.md'), '# Origin\n', 'utf-8');
    const resumed = await targetRelayLoop({ ...makeInput(target), sliceId: 'S1' }, deps);
    expect(resumed).toEqual(expect.objectContaining({ phase: 'done', sliceId: 'S1' }));
    expect(builder.rolesCalled()).toEqual(['builder']);
    expect(supervisor.rolesCalled()).toEqual(['reviewer']);
    expect(await readFile(partialPath, 'utf-8')).toBe('candidate bytes retained\n');
  });

  it('new scaffold is wholly local-only while existing scaffold bytes remain untouched', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-1-use-scaffold-');
    await execFileTest('git', ['init'], { cwd: target });
    await seedSlice(target, 'IMPL-1', NO_MARKER_ARTIFACT);
    const builder = new StubRunner(() => 'built');
    const supervisor = new StubRunner(() => 'STATUS: approved');
    await targetRelayLoop({ ...makeInput(target), sliceId: 'IMPL-1' }, makeDeps(builder, supervisor));
    expect(await readFile(join(target, '.agent-manager', '.gitignore'), 'utf-8')).toContain('\n*\n');
    expect(await readFile(join(target, '.agent-manager', 'README.md'), 'utf-8')).toContain('local-only process state');
    const gitStatus = await execFileTest('git', ['status', '--short'], { cwd: target });
    expect(gitStatus.stdout).toBe('');

    const second = join(target, 'existing');
    await seedSlice(second, 'IMPL-2', NO_MARKER_ARTIFACT);
    await writeFile(join(second, '.agent-manager', '.gitignore'), 'existing-ignore\n', 'utf-8');
    await writeFile(join(second, '.agent-manager', 'README.md'), 'existing-readme\n', 'utf-8');
    await targetRelayLoop({ ...makeInput(second), sliceId: 'IMPL-2' }, makeDeps(builder, supervisor));
    expect(await readFile(join(second, '.agent-manager', '.gitignore'), 'utf-8')).toBe('existing-ignore\n');
    expect(await readFile(join(second, '.agent-manager', 'README.md'), 'utf-8')).toBe('existing-readme\n');
  });
});

const execFileTest = promisify(execFileCallback);

async function builtCli(
  args: string[]
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  try {
    const result = await execFileTest(process.execPath, ['dist/cli/relay-target.js', ...args], {
      cwd: process.cwd(),
      maxBuffer: 8 * 1024 * 1024,
    });
    return { exitCode: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (cause) {
    const failed = cause as { code?: number; stdout?: string; stderr?: string };
    return {
      exitCode: typeof failed.code === 'number' ? failed.code : -1,
      stdout: failed.stdout ?? '',
      stderr: failed.stderr ?? String(cause),
    };
  }
}

async function readRegularFileBytesByPath(root: string): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  const visit = async (directory: string, prefix: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await visit(join(directory, entry.name), path);
      else if (entry.isFile()) files[path] = (await readFile(join(directory, entry.name))).toString('base64');
    }
  };
  await visit(root, '');
  return files;
}

function routingLines(output: string): string[] {
  return output
    .split('\n')
    .filter((line) => /^(# (select-slice|implement|review-impl)|  cwd :|  cmd :|  shared-prompt:|  stdin:)/.test(line));
}

// Captured from the predecessor dry run before ASSURANCE-1 changed dispatch.
// Only the disposable target path and prompt-preview length are normalized.
const legacyRoutingCapture = [
  '# select-slice  (codex, mode=plan, permission=read-only)',
  '  cwd : <target-root>',
  '  cmd : codex exec --model gpt-5.6-terra --config model_reasoning_effort="high" --config developer_instructions="# Engineering discipline for supervised agent w...(<shared-prompt-length> chars, TOML-escaped) --sandbox read-only -C <target-root> -',
  '  stdin: <pinned role prompts> + <generated select-slice context>',
  '# implement  (codex, mode=edit, permission=write)',
  '  cwd : <target-root>',
  '  cmd : codex exec --model gpt-5.6-sol --config model_reasoning_effort="high" --config developer_instructions="# Engineering discipline for supervised agent w...(<shared-prompt-length> chars, TOML-escaped) --sandbox workspace-write -C <target-root> -',
  '  stdin: <pinned role prompts> + <generated implement context>',
  '# review-impl  (codex, mode=review, permission=read-only)',
  '  cwd : <target-root>',
  '  cmd : codex exec --model gpt-5.6-terra --config model_reasoning_effort="high" --config developer_instructions="# Engineering discipline for supervised agent w...(<shared-prompt-length> chars, TOML-escaped) --sandbox read-only -C <target-root> -',
  '  stdin: <pinned role prompts> + <generated review-impl context>',
];

describe('ASSURANCE-1 built CLI isolation and dry-run (A1-C04)', () => {
  let target = '';

  beforeAll(async () => {
    await execFileTest('npm', ['run', 'build'], { cwd: process.cwd() });
  }, 30_000);

  afterEach(async () => {
    if (target) await rm(target, { recursive: true, force: true });
    target = '';
  });

  it('invalid baseline exits nonzero before any provider executable is reached', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-1-cli-invalid-');
    const result = await builtCli([target, '--baseline', 'missing.json']);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('Final phase: blocked');
    expect(result.stdout).toContain('missing: missing.json');
    expect(result.stdout).not.toContain('[select-slice]');
  });

  it('assured dry-run admits only a matching prepared slice, prints the exact digest, and writes nothing', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-1-cli-valid-');
    const closure = validClosure();
    await writeClosure(target, closure);
    await seedAssuranceSlice(target, 'S1', 'implement');
    const before = await readFile(join(target, '.agent-manager/slices/S1/status.json'), 'utf-8');
    const currentBefore = await readFile(join(target, '.agent-manager/current.json'), 'utf-8');
    const result = await builtCli([
      target,
      '--dry-run',
      '--baseline', closure.manifestPath,
      '--slice', 'S1',
      '--shared-prompt', join(process.cwd(), 'SYSTEM.txt'),
      '--builder', 'codex', '--builder-model', 'gpt-5.6-sol',
      '--supervisor', 'codex', '--supervisor-model', 'gpt-5.6-terra',
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Enforcement: baseline-admission');
    expect(result.stdout).toContain((closure.snapshots[0] as AssuranceFileSnapshot).sha256);
    expect(await readFile(join(target, '.agent-manager/slices/S1/status.json'), 'utf-8')).toBe(before);
    expect(await readFile(join(target, '.agent-manager/current.json'), 'utf-8')).toBe(currentBefore);
  });

  it('v2 dry-run uses no-spawn adapter preparation, prints input/channel identities, and writes nothing', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-2-cli-v2-');
    const configured = await seedV2Implementation(target);
    const statusPath = join(target, '.agent-manager/slices/S2/status.json');
    const currentPath = join(target, '.agent-manager/current.json');
    const beforeStatus = await readFile(statusPath, 'utf-8');
    const beforeCurrent = await readFile(currentPath, 'utf-8');
    const result = await builtCli([
      target, '--dry-run', '--baseline', configured.baselinePath as string, '--slice', 'S2',
      '--shared-prompt', join(process.cwd(), 'SYSTEM.txt'), '--builder', 'codex', '--supervisor', 'claude',
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Enforcement: reviewed-inputs');
    expect(result.stdout).toContain('Independence: different-provider');
    expect(result.stdout).toContain('input: baseline-manifest target:docs/requirements/baselines/B2.json');
    expect(result.stdout).toContain('channel: shared-instruction mechanism=codex-developer-instructions');
    expect(result.stdout).toContain('channel: shared-instruction mechanism=claude-system-prompt-file');
    expect(result.stdout).toContain('no snapshot files written');
    expect(await readFile(statusPath, 'utf-8')).toBe(beforeStatus);
    expect(await readFile(currentPath, 'utf-8')).toBe(beforeCurrent);
    expect(await exists(join(target, '.agent-manager/logs'))).toBe(false);
  });

  it('built document preflight uses the admitted v1 allocation and truthfully defers the absent authored reviewer subject', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-2-document-preflight-');
    const seeded = await seedV1DocumentBridge(target);
    const before = await readRegularFileBytesByPath(target);
    const result = await builtCli([
      target, '--dry-run', '--baseline', seeded.inputClosure.manifestPath, '--slice', 'DOC-NEG',
      '--shared-prompt', join(process.cwd(), 'SYSTEM.txt'),
      '--builder', 'codex', '--builder-model', 'gpt-5.6-sol',
      '--supervisor', 'codex', '--supervisor-model', 'gpt-5.6-terra',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Enforcement: baseline-admission');
    expect(result.stdout).toContain('input: allocation target:docs/slices/S1.md');
    expect(result.stdout).toContain('# implement  (codex, mode=edit, permission=write)');
    expect(result.stdout).toContain('# review-impl  (pending authored review subject; no provider delivery available)');
    expect(result.stdout).toContain('missing REVIEW_BASELINE          : docs/requirements/baselines/B2.json');
    expect(result.stdout).toContain('declared SLICE_DOC (not validated): docs/slices/S2.md');
    expect(result.stdout).toContain('relay will then validate its SLICE_DOC allocation before reviewer dispatch');
    expect(result.stdout).not.toContain('input: review-subject');
    expect(await readRegularFileBytesByPath(target)).toEqual(before);
    expect(await exists(join(target, '.agent-manager/logs'))).toBe(false);
  });

  it('built document preflight validates an existing candidate before exposing actual reviewer delivery', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-2-document-preflight-candidate-');
    const seeded = await seedV1DocumentBridge(target);
    await writeV2DocumentCandidate(target);
    const before = await readRegularFileBytesByPath(target);
    const result = await builtCli([
      target, '--dry-run', '--baseline', seeded.inputClosure.manifestPath, '--slice', 'DOC-NEG',
      '--shared-prompt', join(process.cwd(), 'SYSTEM.txt'),
      '--builder', 'codex', '--supervisor', 'codex',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('# review-impl  (codex, mode=review, permission=read-only)');
    expect(result.stdout).toContain('input: review-subject target:docs/requirements/baselines/B2.json');
    expect(result.stdout).toContain('input: review-subject target:docs/slices/S2.md');
    expect(result.stdout).not.toContain('pending authored review subject');
    expect(await readRegularFileBytesByPath(target)).toEqual(before);
    expect(await exists(join(target, '.agent-manager/logs'))).toBe(false);
  });

  it('built document preflight refuses a malformed existing candidate without exposing either provider plan', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-2-document-preflight-malformed-');
    const seeded = await seedV1DocumentBridge(target);
    await mkdir(join(target, 'docs/requirements/baselines'), { recursive: true });
    await writeFile(join(target, 'docs/requirements/baselines/B2.json'), '{', 'utf-8');
    const before = await readRegularFileBytesByPath(target);
    const result = await builtCli([
      target, '--dry-run', '--baseline', seeded.inputClosure.manifestPath, '--slice', 'DOC-NEG',
      '--shared-prompt', join(process.cwd(), 'SYSTEM.txt'),
      '--builder', 'codex', '--supervisor', 'codex',
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('malformed-json');
    expect(result.stdout).not.toContain('# implement');
    expect(result.stdout).not.toContain('# review-impl');
    expect(await readRegularFileBytesByPath(target)).toEqual(before);
    expect(await exists(join(target, '.agent-manager/logs'))).toBe(false);
  });

  it('built document preflight refuses a missing candidate once the author phase has completed', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-2-document-preflight-missing-review-subject-');
    const seeded = await seedV1DocumentBridge(target);
    const statusPath = join(target, '.agent-manager/slices/DOC-NEG/status.json');
    const status = JSON.parse(await readFile(statusPath, 'utf-8')) as Record<string, unknown>;
    status.phase = 'review-impl';
    await writeFile(statusPath, json(status), 'utf-8');
    const before = await readRegularFileBytesByPath(target);
    const result = await builtCli([
      target, '--dry-run', '--baseline', seeded.inputClosure.manifestPath, '--slice', 'DOC-NEG',
      '--shared-prompt', join(process.cwd(), 'SYSTEM.txt'),
      '--builder', 'codex', '--supervisor', 'codex',
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('missing: docs/requirements/baselines/B2.json');
    expect(result.stdout).not.toContain('# implement');
    expect(result.stdout).not.toContain('# review-impl');
    expect(await readRegularFileBytesByPath(target)).toEqual(before);
    expect(await exists(join(target, '.agent-manager/logs'))).toBe(false);
  });

  it.each([
    ['missing', [
      'ARTIFACT_KIND: REQUIREMENTS_DOCUMENT',
      'REVIEW_BASELINE: docs/requirements/baselines/B2.json',
      'REVIEW_OBLIGATION_IDS: EX-REQ-001,EX-REQ-001-L01',
    ], 'requires exactly one ADMISSION_ALLOCATION'],
    ['non-admitted', [
      'ARTIFACT_KIND: REQUIREMENTS_DOCUMENT',
      'ADMISSION_ALLOCATION: docs/slices/not-admitted.md',
      'REVIEW_BASELINE: docs/requirements/baselines/B2.json',
      'REVIEW_OBLIGATION_IDS: EX-REQ-001,EX-REQ-001-L01',
    ], 'subject-mismatch'],
  ])('built document preflight refuses %s allocation without writing or exposing a provider plan', async (_label, fields, expected) => {
    target = await mkdtemp('/private/tmp/ASSURANCE-2-document-preflight-refusal-');
    const seeded = await seedV1DocumentBridge(target, fields);
    const before = await readRegularFileBytesByPath(target);
    const result = await builtCli([
      target, '--dry-run', '--baseline', seeded.inputClosure.manifestPath, '--slice', 'DOC-NEG',
      '--shared-prompt', join(process.cwd(), 'SYSTEM.txt'),
      '--builder', 'codex', '--supervisor', 'codex',
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain(expected);
    expect(result.stdout).not.toContain('# implement');
    expect(result.stdout).not.toContain('# review-impl');
    expect(await readRegularFileBytesByPath(target)).toEqual(before);
    expect(await exists(join(target, '.agent-manager/logs'))).toBe(false);
  });

  it('built target approval command creates the fixed v2 record once without provider or commit', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-2-cli-approval-');
    const fixture = validV2Snapshots();
    for (const item of fixture.snapshots) {
      if (item.status !== 'ok' || item.path.endsWith('baseline-approval.json')) continue;
      await mkdir(dirname(join(target, item.path)), { recursive: true });
      await writeFile(join(target, item.path), item.bytes);
    }
    const argv = [
      target, '--record-reviewed-baseline-approval', fixture.manifestPath,
      '--approval-id', 'approval-cli-1', '--project-id', 'example',
      '--approved-by-type', 'operator', '--approved-by-id', 'manager',
      '--recorded-by-type', 'operator', '--recorded-by-id', 'manager',
      '--authority-basis', 'docs/authority.md', '--rationale', 'Approve exact reviewed bytes.',
      '--decision-record', 'D-FIXTURE=docs/decisions/D-FIXTURE.md',
    ];
    const recorded = await builtCli(argv);
    expect(recorded.exitCode).toBe(0);
    expect(recorded.stdout).toContain('recorded reviewed-baseline approval');
    expect(recorded.stdout).toContain('commit: not performed');
    const outputPath = join(target, 'docs/assurance/B2/baseline-approval.json');
    expect(parseApprovalRecordV2(snapshot('approval-copy', await readFile(outputPath, 'utf-8'))).ok).toBe(true);
    const duplicate = await builtCli(argv);
    expect(duplicate.exitCode).not.toBe(0);
    expect(duplicate.stderr).toContain('approval-already-exists');
  });

  it('built approval refuses wrong target/project, stale subject, missing decision, rejected review, and malformed input with zero writes', async () => {
    const baseArgs = (root: string, projectId = 'example') => [
      root, '--record-reviewed-baseline-approval', 'docs/requirements/baselines/B2.json',
      '--approval-id', 'approval-negative', '--project-id', projectId,
      '--approved-by-type', 'operator', '--approved-by-id', 'manager',
      '--recorded-by-type', 'operator', '--recorded-by-id', 'manager',
      '--authority-basis', 'docs/authority.md', '--rationale', 'Negative approval fixture.',
      '--decision-record', 'D-FIXTURE=docs/decisions/D-FIXTURE.md',
    ];
    const materialize = async (root: string, mutate?: (records: Map<string, string>) => void) => {
      const fixture = validV2Snapshots();
      const records = new Map(fixture.snapshots.flatMap((item) => item.status === 'ok' && !item.path.endsWith('baseline-approval.json') ? [[item.path, snapshotContent(item)] as const] : []));
      mutate?.(records);
      for (const [path, raw] of records) {
        await mkdir(dirname(join(root, path)), { recursive: true });
        await writeFile(join(root, path), raw, 'utf-8');
      }
    };
    const cases: readonly [string, (root: string) => Promise<string[]>][] = [
      ['wrong target', async (root) => baseArgs(root)],
      ['wrong project', async (root) => { await materialize(root); return baseArgs(root, 'other-project'); }],
      ['stale subject', async (root) => {
        await materialize(root, (records) => {
          const reviewPath = 'docs/assurance/B2/requirements-review.json';
          const review = JSON.parse(records.get(reviewPath) as string) as { subject: { sha256: string } };
          review.subject.sha256 = computeDigest('stale-subject');
          records.set(reviewPath, json(review));
        });
        return baseArgs(root);
      }],
      ['missing decision', async (root) => {
        await materialize(root, (records) => {
          const manifestPath = 'docs/requirements/baselines/B2.json';
          const reviewPath = 'docs/assurance/B2/requirements-review.json';
          const manifest = JSON.parse(records.get(manifestPath) as string) as { requiredDecisionIds: string[] };
          manifest.requiredDecisionIds = ['D-REQUIRED'];
          const manifestRaw = json(manifest);
          records.set(manifestPath, manifestRaw);
          const review = JSON.parse(records.get(reviewPath) as string) as { subject: { sha256: string } };
          review.subject.sha256 = computeDigest(manifestRaw);
          records.set(reviewPath, json(review));
        });
        return baseArgs(root);
      }],
      ['rejected review', async (root) => {
        await materialize(root, (records) => {
          const reviewPath = 'docs/assurance/B2/requirements-review.json';
          const review = JSON.parse(records.get(reviewPath) as string) as { result: string; assessments: { obligationId: string; result: string; findingIds: string[] }[]; findings: unknown[]; report: string };
          review.result = 'refinement-required';
          review.assessments[0] = { ...review.assessments[0] as { obligationId: string; result: string; findingIds: string[] }, result: 'refinement-required', findingIds: ['F-REJECT'] };
          review.findings = [{ findingId: 'F-REJECT', obligationId: review.assessments[0]?.obligationId, category: 'correctness', evidence: 'The candidate is not acceptable.', consequence: 'Approval would bind rejected content.', requiredAction: 'Refine and review again.' }];
          review.report = 'Refinement required.';
          records.set(reviewPath, json(review));
        });
        return baseArgs(root);
      }],
      ['malformed manifest', async (root) => { await materialize(root, (records) => records.set('docs/requirements/baselines/B2.json', '{')); return baseArgs(root); }],
      ['malformed review', async (root) => { await materialize(root, (records) => records.set('docs/assurance/B2/requirements-review.json', '{')); return baseArgs(root); }],
      ['missing authority input', async (root) => { await materialize(root, (records) => records.delete('docs/authority.md')); return baseArgs(root); }],
    ];
    for (const [label, prepare] of cases) {
      target = await mkdtemp('/private/tmp/ASSURANCE-2-cli-approval-negative-');
      const argv = await prepare(target);
      const result = await builtCli(argv);
      expect(result.exitCode).not.toBe(0);
      expect(await exists(join(target, 'docs/assurance/B2/baseline-approval.json'))).toBe(false);
      expect(await exists(join(target, '.agent-manager'))).toBe(false);
      await rm(target, { recursive: true, force: true });
      target = '';
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it('assured dry-run rejects allocation mismatch and omission of explicit --slice without an admission label', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-1-cli-refuse-');
    const closure = validClosure();
    await writeClosure(target, closure);
    await seedAssuranceSlice(target, 'S1', 'implement');
    const statusPath = join(target, '.agent-manager/slices/S1/status.json');
    const status = JSON.parse(await readFile(statusPath, 'utf-8')) as { sliceDoc: string };
    status.sliceDoc = 'docs/slices/other.md';
    await writeFile(statusPath, json(status), 'utf-8');
    const mismatch = await builtCli([target, '--dry-run', '--baseline', closure.manifestPath, '--slice', 'S1']);
    expect(mismatch.exitCode).toBe(1);
    expect(mismatch.stderr).toContain('subject-mismatch');
    expect(mismatch.stdout).not.toContain('Enforcement: baseline-admission');
    const omitted = await builtCli([target, '--dry-run', '--baseline', closure.manifestPath]);
    expect(omitted.exitCode).toBe(1);
    expect(omitted.stderr).toContain('requires an explicit --slice');
    expect(omitted.stdout).not.toContain('Enforcement: baseline-admission');
  });

  it('unknown manifest fields are refused with record identity', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-1-cli-unknown-');
    const closure = validClosure();
    await writeClosure(target, closure);
    const manifestPath = join(target, closure.manifestPath);
    const value = JSON.parse(await readFile(manifestPath, 'utf-8')) as Record<string, unknown>;
    value.futureEvidence = [];
    await writeFile(manifestPath, json(value), 'utf-8');
    const result = await builtCli([target, '--baseline', closure.manifestPath]);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain(`unknown-field: ${closure.manifestPath} /futureEvidence`);
  });

  it('legacy dry-run states its limitation and preserves captured routing lines after target normalization', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-1-cli-legacy-');
    const result = await builtCli([
      target,
      '--slice', 'ASSURANCE-1',
      '--builder', 'codex', '--builder-model', 'gpt-5.6-sol',
      '--supervisor', 'codex', '--supervisor-model', 'gpt-5.6-terra',
      '--shared-prompt', join(process.cwd(), 'SYSTEM.txt'),
      '--max-iter', '3', '--timeout', '120', '--dry-run',
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Enforcement: legacy (requirements assurance not enforced)');
    // The capture predates INPUT-3's ratified SYSTEM.txt amendment. Ignore only
    // the dry-run preview's derived character count; every routing token and
    // the prompt delivery mechanism remain compared byte-for-byte.
    const normalized = routingLines(result.stdout).map((line) =>
      line
        .split(target).join('<target-root>')
        .replace(/\(\d+ chars, TOML-escaped\)/, '(<shared-prompt-length> chars, TOML-escaped)')
    );
    expect(normalized).toEqual(legacyRoutingCapture);
  });

  it('live terminal resume labels the resolved persisted mode rather than flag presence', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-1-cli-resolved-mode-');
    const closure = validClosure();
    await writeClosure(target, closure);
    const manifest = closure.snapshots[0] as AssuranceFileSnapshot;
    const mode = {
      contract: 'requirements-assurance/v1-stage1',
      enforcement: 'baseline-admission',
      manifest: { path: manifest.path, sha256: manifest.sha256 },
    };
    await seedAssuranceSlice(target, 'S1', 'implement', mode);
    const statusPath = join(target, '.agent-manager/slices/S1/status.json');
    const status = JSON.parse(await readFile(statusPath, 'utf-8')) as Record<string, unknown>;
    status.phase = 'done';
    await writeFile(statusPath, json(status), 'utf-8');

    const assured = await builtCli([target, '--slice', 'S1']);
    expect(assured.exitCode).toBe(0);
    expect(assured.stdout).toContain('[assurance] baseline-admission');
    expect(assured.stdout).not.toContain('legacy (requirements assurance not enforced)');

    await seedAssuranceSlice(target, 'S1', 'implement');
    const legacyStatus = JSON.parse(await readFile(statusPath, 'utf-8')) as Record<string, unknown>;
    legacyStatus.phase = 'done';
    await writeFile(statusPath, json(legacyStatus), 'utf-8');

    const legacy = await builtCli([target, '--slice', 'S1']);
    expect(legacy.exitCode).toBe(0);
    expect(legacy.stdout).toContain('[assurance] legacy (requirements assurance not enforced)');
    expect(legacy.stdout).not.toContain('[assurance] baseline-admission');
  });
});

// ---------------------------------------------------------------------------
// 1. Pure units
// ---------------------------------------------------------------------------

describe('hasRatificationDecisions (DR trigger detector)', () => {
  it('triggers on a DECISION_REQUIRED: block header', () => {
    expect(
      hasRatificationDecisions('intro\nDECISION_REQUIRED:\n- ID: D1\n')
    ).toBe(true);
  });

  it('triggers despite leading markdown heading/list decoration', () => {
    expect(hasRatificationDecisions('### DECISION_REQUIRED: x')).toBe(true);
    expect(hasRatificationDecisions('- DECISION_REQUIRED: x')).toBe(true);
    expect(hasRatificationDecisions('> DECISION_REQUIRED:')).toBe(true);
  });

  it('does NOT trigger on a prose mention of the token', () => {
    expect(
      hasRatificationDecisions('I hit no DECISION_REQUIRED stop condition.')
    ).toBe(false);
    expect(
      hasRatificationDecisions('See the DECISION_REQUIRED block convention.')
    ).toBe(false);
  });

  it('does NOT trigger on empty or marker-free artifacts', () => {
    expect(hasRatificationDecisions('')).toBe(false);
    expect(hasRatificationDecisions('# Build summary\nDid the work.')).toBe(false);
  });
});

describe('shouldEnterDecisionReview (DR trigger predicate — TRIGGER-FIX-1)', () => {
  // The marker is a real `DECISION_REQUIRED:` block header; NO_MARKER is a plain
  // build summary. A SLICE_DOC is "build-authored" iff its path is in changedPaths.
  const MARKER = ['DECISION_REQUIRED:', '- ID: D1', '  QUESTION: ...'].join('\n');
  const NO_MARKER = '# Build summary\nImplemented the slice. No decisions surfaced.';

  // CASE 1 — the regression the bug created.
  it('IMPL-shape: marker in a pre-existing SLICE_DOC the build did NOT touch -> FALSE', () => {
    expect(
      shouldEnterDecisionReview({
        buildArtifact: NO_MARKER,
        specArtifact: MARKER, // ratified spec legitimately carries the §8 matrix
        sliceDoc: 'docs/slices/IMPL-1.md',
        changedPaths: ['src/foo.ts', 'src/foo.test.ts'], // SLICE_DOC absent => not build-authored
      })
    ).toBe(false);
  });

  // CASE 2 — a SPEC slice whose deliverable IS the marker-bearing spec.
  it('SPEC-shape: build created/modified the marker-bearing SLICE_DOC -> TRUE', () => {
    expect(
      shouldEnterDecisionReview({
        buildArtifact: NO_MARKER,
        specArtifact: MARKER,
        sliceDoc: 'docs/slices/SPEC-1.md',
        changedPaths: ['docs/slices/SPEC-1.md', 'docs/ROADMAP.md'], // build wrote the spec
      })
    ).toBe(true);
  });

  // CASE 3 — preserved behavior: the build's own summary surfaced the decisions.
  it('build-artifact case: marker in build-<n>.md -> TRUE (preserved)', () => {
    expect(
      shouldEnterDecisionReview({
        buildArtifact: MARKER,
        specArtifact: '',
        sliceDoc: null,
        changedPaths: [],
      })
    ).toBe(true);
  });

  // CASE 4 — preserved behavior: no marker anywhere is a non-decision slice.
  it('marker-absent case: no marker in build OR spec -> FALSE (preserved)', () => {
    expect(
      shouldEnterDecisionReview({
        buildArtifact: NO_MARKER,
        specArtifact: '# spec\nno matrix here',
        sliceDoc: 'docs/slices/X.md',
        changedPaths: ['docs/slices/X.md'], // build touched it, but there's no marker to gate
      })
    ).toBe(false);
  });

  // Guards on the two trigger arms.
  it('SPEC path match tolerates ./ and backslash decoration', () => {
    expect(
      shouldEnterDecisionReview({
        buildArtifact: NO_MARKER,
        specArtifact: MARKER,
        sliceDoc: 'docs/slices/SPEC-2.md',
        changedPaths: ['./docs/slices/SPEC-2.md'],
      })
    ).toBe(true);
  });

  it('build-artifact marker fires independently of whether the SLICE_DOC was touched', () => {
    expect(
      shouldEnterDecisionReview({
        buildArtifact: MARKER,
        specArtifact: MARKER,
        sliceDoc: 'docs/slices/Y.md',
        changedPaths: [], // SLICE_DOC untouched, but the build artifact carries the marker
      })
    ).toBe(true);
  });
});

describe('parse + classify (one-round convergence)', () => {
  const challenge = [
    'Adversarial review.',
    '',
    'DECISION: D-A',
    'ASSESSMENT: agree',
    'Verified against src/foo.ts.',
    '',
    'DECISION: D-B',
    'ASSESSMENT: challenge',
    'Split-brain risk at src/bar.ts.',
    '',
    'DECISION: D-C',
    'ASSESSMENT: challenge',
    'Cheaper option dismissed without basis.',
  ].join('\n');

  const rebuttal = [
    'Rebuttal.',
    '',
    'DECISION: D-B',
    'RESPONSE: concede',
    'Correct; corrected cell: add a per-request epoch.',
    '',
    'DECISION: D-C',
    'RESPONSE: rebut',
    'src/baz.ts confirms the original recommendation holds.',
  ].join('\n');

  it('parses challenger assessments by id', () => {
    expect(parseChallengerAssessments(challenge)).toEqual([
      { id: 'D-A', assessment: 'agree' },
      { id: 'D-B', assessment: 'challenge' },
      { id: 'D-C', assessment: 'challenge' },
    ]);
  });

  it('parses rebutter responses by id', () => {
    expect(parseRebutterResponses(rebuttal)).toEqual([
      { id: 'D-B', response: 'concede' },
      { id: 'D-C', response: 'rebut' },
    ]);
  });

  it('classifies agree -> converged, challenge+concede -> converged, challenge+rebut -> contested', () => {
    const items = classifyRatification(
      ['D-A', 'D-B', 'D-C'],
      parseChallengerAssessments(challenge),
      parseRebutterResponses(rebuttal)
    );
    expect(items).toEqual([
      { id: 'D-A', assessment: 'agree', response: 'none', status: 'converged' },
      { id: 'D-B', assessment: 'challenge', response: 'concede', status: 'converged' },
      { id: 'D-C', assessment: 'challenge', response: 'rebut', status: 'contested' },
    ]);
  });

  it('treats a challenge with no parseable builder response as contested (unresolved)', () => {
    const items = classifyRatification(
      ['D-X'],
      [{ id: 'D-X', assessment: 'challenge' }],
      []
    );
    expect(items).toEqual([
      { id: 'D-X', assessment: 'challenge', response: 'unknown', status: 'contested' },
    ]);
  });

  it('NEVER drops a source decision the challenger omitted: marks it missing -> contested (review-2 fix)', () => {
    // Source surfaced D-A, D-B, D-C; the challenger assessed only D-A and D-C
    // (D-B silently absent). D-B must still appear, marked contested.
    const items = classifyRatification(
      ['D-A', 'D-B', 'D-C'],
      [
        { id: 'D-A', assessment: 'agree' },
        { id: 'D-C', assessment: 'challenge' },
      ],
      [{ id: 'D-C', response: 'rebut' }]
    );
    expect(items).toEqual([
      { id: 'D-A', assessment: 'agree', response: 'none', status: 'converged' },
      { id: 'D-B', assessment: 'missing', response: 'unknown', status: 'contested' },
      { id: 'D-C', assessment: 'challenge', response: 'rebut', status: 'contested' },
    ]);
  });

  it('keeps a challenger-raised decision absent from the source matrix (union, no regression)', () => {
    // Source had only D-A; the challenger additionally flagged D-Z. Both surface.
    const items = classifyRatification(
      ['D-A'],
      [
        { id: 'D-A', assessment: 'agree' },
        { id: 'D-Z', assessment: 'challenge' },
      ],
      [{ id: 'D-Z', response: 'rebut' }]
    );
    expect(items).toEqual([
      { id: 'D-A', assessment: 'agree', response: 'none', status: 'converged' },
      { id: 'D-Z', assessment: 'challenge', response: 'rebut', status: 'contested' },
    ]);
  });
});

describe('per-decision packet extraction (review-0 fix)', () => {
  const challenge = [
    'DECISION: D-A',
    'ASSESSMENT: agree',
    'Holds against src/foo.ts.',
    '',
    'DECISION: D-B',
    'ASSESSMENT: challenge',
    'Split-brain across two stores at src/bar.ts:42.',
  ].join('\n');

  it('groups per-decision reasoning text by id (challenge / rebuttal)', () => {
    const texts = extractDecisionTexts(challenge);
    expect(texts.get('D-A')).toBe('ASSESSMENT: agree\nHolds against src/foo.ts.');
    expect(texts.get('D-B')).toBe(
      'ASSESSMENT: challenge\nSplit-brain across two stores at src/bar.ts:42.'
    );
  });

  it('matches ids case-insensitively (spec ID: vs role DECISION:)', () => {
    const texts = extractDecisionTexts('DECISION: dr-trigger\nASSESSMENT: agree\nok.');
    expect(texts.get('DR-TRIGGER')).toContain('ok.');
  });

  it('extracts per-decision recommendation excerpts from a DECISION_REQUIRED matrix', () => {
    const spec = [
      'DECISION_REQUIRED:',
      '- ID: DR-TRIGGER',
      '  QUESTION: how to detect?',
      '  RECOMMENDED: marker convention',
      '- ID: DR-ROUNDS',
      '  QUESTION: how many rounds?',
      '  RECOMMENDED: one round',
    ].join('\n');
    const recs = extractRecommendations(spec);
    expect(recs.get('DR-TRIGGER')).toContain('RECOMMENDED: marker convention');
    expect(recs.get('DR-TRIGGER')).toContain('QUESTION: how to detect?');
    expect(recs.get('DR-ROUNDS')).toContain('one round');
    // The DR-TRIGGER block must not bleed into DR-ROUNDS.
    expect(recs.get('DR-TRIGGER')).not.toContain('DR-ROUNDS');
  });

  it('returns empty maps for marker-free / empty text', () => {
    expect(extractDecisionTexts('').size).toBe(0);
    expect(extractRecommendations('# Just a summary\nno decisions here').size).toBe(0);
  });

  it('extracts the authoritative decision id set (order + dedup) from a matrix', () => {
    const spec = [
      'DECISION_REQUIRED:',
      '- ID: DR-TRIGGER',
      '  QUESTION: how to detect?',
      '- ID: DR-ROUNDS',
      '  QUESTION: how many rounds?',
      '- ID: DR-TRIGGER', // duplicate id -> kept once
      '  QUESTION: restated',
    ].join('\n');
    expect(extractDecisionIds(spec)).toEqual(['DR-TRIGGER', 'DR-ROUNDS']);
    expect(extractDecisionIds('# summary\nno decisions here')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 2. Headless integration over a temp target tree
// ---------------------------------------------------------------------------

class FixedClock implements ClockPort {
  now(): string {
    return '2026-06-26T00:00:00.000Z';
  }
}

/** Stub provider: canned text per role, records every request for assertions. */
class StubRunner implements ProviderRunnerPort {
  public readonly calls: RunRequest[] = [];
  constructor(private readonly respond: (req: RunRequest) => string) {}
  async run(request: RunRequest): Promise<RunResult> {
    this.calls.push(request);
    const content = this.respond(request);
    return {
      runId: request.runId,
      status: RunStatus.COMPLETED,
      outputArtifacts: content
        ? [{ suggestedPath: `${request.role}-output.md`, type: 'provider-output', content }]
        : [],
      logPath: `/tmp/stub-${request.role}.log`,
      startedAt: '2026-06-26T00:00:00.000Z',
      completedAt: '2026-06-26T00:00:01.000Z',
      deliveryReceipt: receiptFor(request),
    };
  }
  rolesCalled(): string[] {
    return this.calls.map((c) => c.role);
  }
}

function receiptFor(request: RunRequest): RunResult['deliveryReceipt'] {
  return request.delivery.kind === 'legacy-live-inputs'
    ? { kind: 'legacy-live-inputs' }
    : { kind: 'reviewed-input-snapshots', contract: request.delivery.contract, channels: [
      { channel: 'shared-instruction', mechanism: 'stub-shared', sha256: request.delivery.common[0]?.sha256 ?? computeDigest(''), byteLength: request.delivery.common[0]?.bytes.byteLength ?? 0 },
      { channel: 'stdin', mechanism: 'stub-stdin', sha256: computeDigest('stub'), byteLength: 4 },
    ] };
}

function computeDigest(content: string): string {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

/**
 * Build TargetRelayDeps for the integration exercises. `changedPaths` is the
 * stub for the target's uncommitted changed-file set the decision-review trigger
 * reads: pass the SLICE_DOC path to model a SPEC slice (this build wrote the
 * spec), or [] / unrelated paths to model an IMPL slice (the build never touched
 * the pre-ratified spec). The real wiring runs `git status --porcelain`.
 */
function makeDeps(
  builder: ProviderRunnerPort,
  supervisor: ProviderRunnerPort,
  changedPaths: readonly string[] = []
): TargetRelayDeps {
  return {
    clock: new FixedClock(),
    builder,
    supervisor,
    computeDigest,
    changedPaths: async () => changedPaths,
    artifactStore: new FilesystemArtifactStore(),
  };
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Pre-seed a target tree with a slice parked at review-impl (skips selection).
 * When `specArtifact` is given, also writes the SLICE_DOC file in the TARGET tree
 * (so the "marker only in SLICE_DOC" trigger path can be exercised).
 */
async function seedSlice(
  target: string,
  sliceId: string,
  buildArtifact: string,
  specArtifact?: string
): Promise<string> {
  const amDir = join(target, '.agent-manager');
  const sliceDir = join(amDir, 'slices', sliceId);
  await mkdir(join(sliceDir, 'runs'), { recursive: true });
  const sliceDoc = `docs/slices/${sliceId}.md`;
  if (specArtifact !== undefined) {
    await mkdir(join(target, 'docs', 'slices'), { recursive: true });
    await writeFile(join(target, sliceDoc), specArtifact, 'utf-8');
  }
  await writeFile(
    join(sliceDir, 'selection.md'),
    `STATUS: selected\nSLICE_ID: ${sliceId}\nSLICE_DOC: ${sliceDoc}\n`,
    'utf-8'
  );
  await writeFile(join(sliceDir, 'build-0.md'), buildArtifact, 'utf-8');
  await writeFile(
    join(sliceDir, 'status.json'),
    JSON.stringify(
      {
        phase: 'review-impl',
        sliceId,
        sliceDoc,
        iteration: 0,
        updatedAt: '2026-06-26T00:00:00.000Z',
        lastActor: 'claude',
        builderProvider: 'claude',
        supervisorProvider: 'codex',
      },
      null,
      2
    ),
    'utf-8'
  );
  await writeFile(
    join(amDir, 'current.json'),
    JSON.stringify({ sliceId, sliceDoc, updatedAt: '2026-06-26T00:00:00.000Z' }, null, 2),
    'utf-8'
  );
  return sliceDir;
}

function makeInput(target: string): TargetRelayInput {
  return {
    targetDir: target,
    promptRoot: process.cwd(), // jest runs from the repo root; prompt files resolve here
    selectPromptPaths: ['prompts/system/base.md', 'prompts/roles/supervisor-select.md'],
    builderPromptPaths: ['prompts/system/base.md', 'prompts/roles/builder-target.md'],
    reviewerPromptPaths: ['prompts/system/base.md', 'prompts/roles/reviewer-target.md'],
    challengerPromptPaths: ['prompts/system/base.md', 'prompts/roles/decision-challenger.md'],
    rebutterPromptPaths: ['prompts/system/base.md', 'prompts/roles/decision-rebutter.md'],
    builderProvider: 'claude',
    supervisorProvider: 'codex',
    builderModel: 'stub-model',
    builderEffort: 'high',
    supervisorModel: 'stub-model',
    supervisorEffort: 'high',
    maxIterations: 5,
    reselect: false,
  };
}

const CHALLENGE_OUTPUT = [
  'Adversarial decision review.',
  '',
  'DECISION: D-A',
  'ASSESSMENT: agree',
  'Holds against source.',
  '',
  'DECISION: D-B',
  'ASSESSMENT: challenge',
  'Cross-store split-brain at the cited path.',
  '',
  'DECISION: D-C',
  'ASSESSMENT: challenge',
  'A cheaper option was dismissed without basis.',
].join('\n');

const REBUTTAL_OUTPUT = [
  'Rebuttal.',
  '',
  'DECISION: D-B',
  'RESPONSE: concede',
  'Agreed; corrected cell: gate reads on a per-request epoch.',
  '',
  'DECISION: D-C',
  'RESPONSE: rebut',
  'The cheaper option fails the cited constraint; original holds.',
].join('\n');

const MARKER_ARTIFACT = [
  '# Build summary',
  '',
  'Implemented the spec, which surfaces ratification-class decisions:',
  '',
  'DECISION_REQUIRED:',
  '- ID: D-A',
  '  QUESTION: ...',
  '- ID: D-B',
  '  QUESTION: ...',
  '- ID: D-C',
  '  QUESTION: ...',
].join('\n');

/** Challenger that SILENTLY OMITS D-B (only assesses D-A and D-C). */
const CHALLENGE_OMITS_DB = [
  'Adversarial decision review (D-B accidentally skipped).',
  '',
  'DECISION: D-A',
  'ASSESSMENT: agree',
  'Holds against source.',
  '',
  'DECISION: D-C',
  'ASSESSMENT: challenge',
  'A cheaper option was dismissed without basis.',
].join('\n');

const REBUTTAL_DC_ONLY = [
  'Rebuttal.',
  '',
  'DECISION: D-C',
  'RESPONSE: rebut',
  'The cheaper option fails the cited constraint; original holds.',
].join('\n');

const NO_MARKER_ARTIFACT = [
  '# Build summary',
  '',
  'Implemented the slice. I hit no DECISION_REQUIRED stop condition.',
].join('\n');

/** A SPEC whose decision matrix lives in SLICE_DOC, NOT in the build summary. */
const MARKER_SPEC = [
  '# SPEC — decisions live here, not in the build summary',
  '',
  'DECISION_REQUIRED:',
  '- ID: D-A',
  '  QUESTION: which store owns the snapshot?',
  '  RECOMMENDED: single-store ownership',
  '- ID: D-B',
  '  QUESTION: serve last-good during refresh?',
  '  RECOMMENDED: serve last-good',
  '- ID: D-C',
  '  QUESTION: are these paths light?',
  '  RECOMMENDED: treat as light',
].join('\n');

describe('targetRelayLoop decision-review (integration, stub providers)', () => {
  let target: string;

  afterEach(async () => {
    if (target) await rm(target, { recursive: true, force: true });
  });

  it('marker present: approval -> decision-review -> ratification-packet -> halts at awaiting-ratification', async () => {
    target = await mkdtemp(join(tmpdir(), 'am-dr-present-'));
    const sliceDir = await seedSlice(target, 'SPEC-1', MARKER_ARTIFACT);

    const supervisor = new StubRunner((req) =>
      req.role === 'decision-challenger' ? CHALLENGE_OUTPUT : 'STATUS: approved\nGood.'
    );
    const builder = new StubRunner((req) =>
      req.role === 'decision-rebutter' ? REBUTTAL_OUTPUT : 'built'
    );

    // Build-artifact marker path: changedPaths is irrelevant to the trigger here.
    const deps = makeDeps(builder, supervisor);

    const result = await targetRelayLoop(makeInput(target), deps);

    // Halted for the human, not done, not blocked.
    expect(result.phase).toBe('awaiting-ratification');
    expect(result.reason).toContain('ratification-packet.md');

    // Roles actually exercised: reviewer (approve) + challenger (supervisor),
    // rebutter (builder).
    expect(supervisor.rolesCalled()).toEqual(['reviewer', 'decision-challenger']);
    expect(builder.rolesCalled()).toEqual(['decision-rebutter']);

    // Persisted phase halts at awaiting-ratification.
    const status = JSON.parse(
      await readFile(join(sliceDir, 'status.json'), 'utf-8')
    ) as { phase: string };
    expect(status.phase).toBe('awaiting-ratification');

    // Audit trail + the human's packet exist (files are the system of record).
    expect(await exists(join(sliceDir, 'decision-challenge.md'))).toBe(true);
    expect(await exists(join(sliceDir, 'decision-rebuttal.md'))).toBe(true);
    expect(await exists(join(sliceDir, 'runs', 'decision-challenge.json'))).toBe(true);
    expect(await exists(join(sliceDir, 'runs', 'decision-rebuttal.json'))).toBe(true);

    const packet = await readFile(join(sliceDir, 'ratification-packet.md'), 'utf-8');
    expect(packet).toContain('D-A');
    expect(packet).toContain('D-B');
    expect(packet).toContain('D-C');
    expect(packet).toContain('contested'); // D-C
    expect(packet).toContain('converged'); // D-A, D-B
    expect(packet).toContain('1 contested');
    expect(packet).toContain('awaiting-ratification');

    // review-0 fix: the packet groups EACH decision with its recommendation,
    // challenge, rebuttal, and status — not just a coarse 4-column table.
    expect(packet).toContain('Per-decision detail');
    expect(packet).toContain('### D-A — CONVERGED');
    expect(packet).toContain('### D-B — CONVERGED');
    expect(packet).toContain('### D-C — CONTESTED');
    // The per-decision challenge + rebuttal TEXT (not just the verdict enum).
    expect(packet).toContain('Cross-store split-brain at the cited path.'); // D-B challenge
    expect(packet).toContain('gate reads on a per-request epoch.'); // D-B rebuttal
    expect(packet).toContain('The cheaper option fails the cited constraint'); // D-C rebuttal
    // The recommendation excerpt mined from the build artifact's ID: block.
    expect(packet).toContain('Recommendation (from the spec / build artifact)');
  });

  it('challenger OMITS a surfaced decision: it still appears in the packet as missing/contested (review-2 fix)', async () => {
    target = await mkdtemp(join(tmpdir(), 'am-dr-omit-'));
    // Source matrix (build-0.md) surfaces D-A, D-B, D-C.
    const sliceDir = await seedSlice(target, 'SPEC-OMIT', MARKER_ARTIFACT);

    // The challenger assesses only D-A and D-C — D-B is silently dropped.
    const supervisor = new StubRunner((req) =>
      req.role === 'decision-challenger' ? CHALLENGE_OMITS_DB : 'STATUS: approved\nGood.'
    );
    const builder = new StubRunner((req) =>
      req.role === 'decision-rebutter' ? REBUTTAL_DC_ONLY : 'built'
    );

    // Build-artifact marker path: changedPaths is irrelevant to the trigger here.
    const deps = makeDeps(builder, supervisor);

    const result = await targetRelayLoop(makeInput(target), deps);
    expect(result.phase).toBe('awaiting-ratification');

    const packet = await readFile(join(sliceDir, 'ratification-packet.md'), 'utf-8');
    // D-B was NOT dropped: it surfaces as a contested, explicitly-missing section.
    expect(packet).toContain('### D-B — CONTESTED');
    expect(packet).toContain('missing (challenger emitted no assessment');
    expect(packet).toContain('NOT ADDRESSED');
    // D-A converged, D-B + D-C contested -> 2 contested in the overall line.
    expect(packet).toContain('2 contested');
    // The summary table row marks D-B missing/contested.
    expect(packet).toMatch(/\|\s*D-B\s*\|\s*missing\s*\|/);
  });

  it('SPEC-shape: marker in a SLICE_DOC this build WROTE -> decision-review (TRIGGER-FIX-1)', async () => {
    target = await mkdtemp(join(tmpdir(), 'am-dr-slicedoc-'));
    // The build summary carries NO marker; the decision matrix lives in SLICE_DOC,
    // and this slice's build CREATED/MODIFIED that SLICE_DOC (it is in changedPaths)
    // — a SPEC slice whose deliverable is the marker-bearing spec.
    const sliceDir = await seedSlice(target, 'SPEC-2', NO_MARKER_ARTIFACT, MARKER_SPEC);

    const supervisor = new StubRunner((req) =>
      req.role === 'decision-challenger' ? CHALLENGE_OUTPUT : 'STATUS: approved\nGood.'
    );
    const builder = new StubRunner((req) =>
      req.role === 'decision-rebutter' ? REBUTTAL_OUTPUT : 'built'
    );

    // The build touched the SLICE_DOC -> it is in the changed-file set.
    const deps = makeDeps(builder, supervisor, ['docs/slices/SPEC-2.md']);

    const result = await targetRelayLoop(makeInput(target), deps);

    // The phase fired even though build-0.md had NO marker — the build-authored
    // SLICE_DOC did.
    expect(result.phase).toBe('awaiting-ratification');
    expect(supervisor.rolesCalled()).toEqual(['reviewer', 'decision-challenger']);
    expect(builder.rolesCalled()).toEqual(['decision-rebutter']);

    expect(await exists(join(sliceDir, 'ratification-packet.md'))).toBe(true);
    const packet = await readFile(join(sliceDir, 'ratification-packet.md'), 'utf-8');
    // Recommendations were mined from the SLICE_DOC spec, not the build summary.
    expect(packet).toContain('serve last-good'); // D-B RECOMMENDED, from MARKER_SPEC
    expect(packet).toContain('### D-C — CONTESTED');
  });

  it('IMPL-shape: marker in a pre-ratified SLICE_DOC the build did NOT touch -> done (the regression fix)', async () => {
    target = await mkdtemp(join(tmpdir(), 'am-dr-impl-'));
    // Build summary has NO marker; the SLICE_DOC (a frozen spec) DOES carry the
    // §8 matrix — but this slice is an IMPLEMENTATION: its build edited code, not
    // the spec, so the SLICE_DOC is NOT in the changed-file set. Pre-fix this
    // false-fired decision-review on every impl slice; it must now reach `done`.
    const sliceDir = await seedSlice(target, 'IMPL-2', NO_MARKER_ARTIFACT, MARKER_SPEC);

    const supervisor = new StubRunner(() => 'STATUS: approved\nGood.');
    const builder = new StubRunner(() => 'built');

    // The build changed CODE, not the pre-ratified SLICE_DOC.
    const deps = makeDeps(builder, supervisor, ['src/some-impl.ts', 'src/some-impl.test.ts']);

    const result = await targetRelayLoop(makeInput(target), deps);

    // The bug fix: an IMPL slice referencing a ratified spec reaches done, no halt.
    expect(result.phase).toBe('done');
    // Decision-review did NOT fire: only the reviewer ran; the builder never did.
    expect(supervisor.rolesCalled()).toEqual(['reviewer']);
    expect(builder.rolesCalled()).toEqual([]);
    expect(await exists(join(sliceDir, 'ratification-packet.md'))).toBe(false);
    expect(await exists(join(sliceDir, 'decision-challenge.md'))).toBe(false);

    const status = JSON.parse(
      await readFile(join(sliceDir, 'status.json'), 'utf-8')
    ) as { phase: string };
    expect(status.phase).toBe('done');
  });

  it('marker absent: approval -> done (no decision-review fired; additive parity)', async () => {
    target = await mkdtemp(join(tmpdir(), 'am-dr-absent-'));
    const sliceDir = await seedSlice(target, 'IMPL-1', NO_MARKER_ARTIFACT);

    const supervisor = new StubRunner(() => 'STATUS: approved\nGood.');
    const builder = new StubRunner(() => 'built');

    const deps = makeDeps(builder, supervisor);

    const result = await targetRelayLoop(makeInput(target), deps);

    // Exactly the original terminal: done, no halt-for-human.
    expect(result.phase).toBe('done');

    // The new phase did NOT fire: only the reviewer ran; the builder never did.
    expect(supervisor.rolesCalled()).toEqual(['reviewer']);
    expect(builder.rolesCalled()).toEqual([]);

    // No decision-review artifacts were produced.
    expect(await exists(join(sliceDir, 'ratification-packet.md'))).toBe(false);
    expect(await exists(join(sliceDir, 'decision-challenge.md'))).toBe(false);
    expect(await exists(join(sliceDir, 'runs', 'decision-challenge.json'))).toBe(false);

    const status = JSON.parse(
      await readFile(join(sliceDir, 'status.json'), 'utf-8')
    ) as { phase: string };
    expect(status.phase).toBe('done');

    // The generated scaffold README documents the full (additive) phase graph,
    // not the stale select->implement->review-impl->done|blocked one (review-2 #3).
    const readme = await readFile(
      join(target, '.agent-manager', 'README.md'),
      'utf-8'
    );
    expect(readme).toContain('decision-review');
    expect(readme).toContain('awaiting-ratification');
  });
});

// ---------------------------------------------------------------------------
// ASSURANCE-2: v2 reviewed inputs, delivery, document routing and approval
// ---------------------------------------------------------------------------

function requirementTextMany(id: string, lowIds: readonly string[], sourcePath = 'docs/source.md'): string {
  return [
    '<!-- requirements-assurance-v1',
    JSON.stringify({ formatVersion: 1, kind: 'requirement', requirementId: id, sources: [{ kind: 'document-section', path: sourcePath, fragment: 'origin' }], lowLevelRequirements: lowIds.map((lowId) => ({ id: lowId, parentId: id })) }, null, 2),
    '-->',
    `# ${id} — Example`,
    '',
    ...lowIds.flatMap((lowId) => [`### ${lowId} — Rule`, '', 'Bounded behavior with an observable acceptance oracle.', '']),
  ].join('\n');
}

function v2ReviewResult(subject: { path: string; sha256: string }, ids: readonly string[]): RequirementsReviewResult {
  return {
    formatVersion: 2,
    kind: 'requirements-review-result',
    subject,
    result: 'accepted',
    assessments: ids.map((obligationId) => ({ obligationId, result: 'accepted', findingIds: [], decisionIds: [] })),
    findings: [],
    decisions: [],
    report: 'Every submitted bounded obligation is correct, necessary, feasible and independently verifiable.',
  };
}

function provenance(roleLabel: string) {
  const shared = computeDigest('shared');
  return {
    contract: 'requirements-assurance/v2-input-delivery' as const,
    roots: { target: '/target', prompt: '/prompt' },
    baseline: { path: 'docs/requirements/baselines/INPUT.json', sha256: computeDigest('input') },
    commonInputs: [{ origin: 'file' as const, root: 'prompt' as const, purpose: 'shared-instruction', path: 'SYSTEM.txt', sha256: shared, byteLength: 6 }],
    roleSpecificInputs: [{ origin: 'generated' as const, purpose: 'task-directive', label: roleLabel, sha256: computeDigest(roleLabel), byteLength: new TextEncoder().encode(roleLabel).byteLength }],
    channels: [{ channel: 'stdin' as const, mechanism: 'stub-stdin', sha256: computeDigest('stdin'), byteLength: 5 }],
  };
}

function validV2Snapshots(): { manifestPath: string; allocationPath: string; ids: string[]; snapshots: AssuranceSnapshot[] } {
  const manifestPath = 'docs/requirements/baselines/B2.json';
  const allocationPath = 'docs/slices/S2.md';
  const req1 = snapshot('docs/requirements/r1.md', requirementTextMany('EX-REQ-001', ['EX-REQ-001-L01', 'EX-REQ-001-L02']));
  const req2 = snapshot('docs/requirements/r2.md', requirementTextMany('EX-REQ-002', ['EX-REQ-002-L01']));
  const source = snapshot('docs/source.md', '# Origin\n');
  const governance = snapshot('CLAUDE.md', '# Fixture governance\n');
  const allocation = snapshot(allocationPath, '# Allocated slice\n');
  const ids = ['EX-REQ-001', 'EX-REQ-001-L01', 'EX-REQ-002', 'EX-REQ-002-L01'];
  const manifest = snapshot(manifestPath, json({ formatVersion: 2, kind: 'requirements-baseline-manifest', baselineId: 'B2', target: { projectId: 'example', root: '.' }, requirements: [{ path: req1.path, sha256: req1.sha256 }, { path: req2.path, sha256: req2.sha256 }], dependencies: [{ role: 'source', path: source.path, sha256: source.sha256 }, { role: 'governance', path: governance.path, sha256: governance.sha256 }, { role: 'allocation', path: allocation.path, sha256: allocation.sha256 }], reviewObligationIds: ids, requiredDecisionIds: ['D-FIXTURE'] }));
  const result = v2ReviewResult({ path: manifest.path, sha256: manifest.sha256 }, ids);
  const authorProvenance = provenance('author');
  const reviewerProvenance = { ...provenance('reviewer'), commonInputs: authorProvenance.commonInputs, baseline: authorProvenance.baseline };
  const review = snapshot('docs/assurance/B2/requirements-review.json', json({ formatVersion: 2, kind: 'requirements-review', reviewId: 'review-B2-1', subject: result.subject, author: { role: 'requirements-author', provider: 'codex', model: 'sol', effort: 'high', runId: 'build-B2-1' }, reviewer: { role: 'requirements-reviewer', provider: 'codex', model: 'terra', effort: 'high', runId: 'review-B2-1' }, independence: { invocations: 'separate', providerDiversity: 'same-provider' }, authorInputProvenance: authorProvenance, reviewerInputProvenance: reviewerProvenance, result: result.result, assessments: result.assessments, findings: result.findings, decisions: result.decisions, completedAt: '2026-09-12T12:00:00.000Z', report: result.report }));
  const authority = snapshot('docs/authority.md', '# Authority\n');
  const decision = snapshot('docs/decisions/D-FIXTURE.md', '# D-FIXTURE\n\nThe fixture decision is resolved.\n');
  const approval = snapshot('docs/assurance/B2/baseline-approval.json', json({ formatVersion: 2, kind: 'requirements-baseline-approval', approvalId: 'approval-B2-1', target: { projectId: 'example', root: '.' }, subject: result.subject, review: { path: review.path, sha256: review.sha256 }, decision: 'approved', approvedBy: { actorType: 'operator', actorId: 'manager' }, recordedBy: { actorType: 'operator', actorId: 'manager' }, authorityBasis: { path: authority.path, sha256: authority.sha256 }, resolvedDecisions: [{ id: 'D-FIXTURE', record: { path: decision.path, sha256: decision.sha256 } }], decidedAt: '2026-09-12T12:01:00.000Z', rationale: 'The exact reviewed baseline is approved.' }));
  return { manifestPath, allocationPath, ids, snapshots: [manifest, req1, req2, source, governance, allocation, review, approval, authority, decision] };
}

class AsyncStubRunner implements ProviderRunnerPort {
  readonly calls: RunRequest[] = [];
  constructor(private readonly respond: (request: RunRequest) => Promise<string>) {}
  async run(request: RunRequest): Promise<RunResult> {
    this.calls.push(request);
    const content = await this.respond(request);
    return {
      runId: request.runId,
      status: RunStatus.COMPLETED,
      outputArtifacts: content ? [{ suggestedPath: `${request.role}-output.md`, type: 'provider-output', content }] : [],
      logPath: `/tmp/stub-${request.role}.log`,
      startedAt: '2026-09-12T00:00:00.000Z',
      completedAt: '2026-09-12T00:00:01.000Z',
      deliveryReceipt: receiptFor(request),
    };
  }
}

async function seedV1DocumentBridge(target: string, packetFields?: readonly string[]): Promise<{ input: TargetRelayInput; sliceDir: string; inputClosure: ReturnType<typeof validClosure>; packet: string }> {
  const inputClosure = validClosure();
  await writeClosure(target, inputClosure);
  const sliceDir = join(target, '.agent-manager/slices/DOC-NEG');
  await mkdir(join(sliceDir, 'runs'), { recursive: true });
  const fields = packetFields ?? [
    'ARTIFACT_KIND: REQUIREMENTS_DOCUMENT',
    `ADMISSION_ALLOCATION: ${inputClosure.allocationPath}`,
    'REVIEW_BASELINE: docs/requirements/baselines/B2.json',
    'REVIEW_OBLIGATION_IDS: EX-REQ-001,EX-REQ-001-L01',
  ];
  const packet = ['STATUS: selected', 'SLICE_ID: DOC-NEG', 'SLICE_DOC: docs/slices/S2.md', ...fields].join('\n');
  await writeFile(join(sliceDir, 'selection.md'), packet, 'utf-8');
  const state = { sliceId: 'DOC-NEG', sliceDoc: 'docs/slices/S2.md', updatedAt: '2026-09-12T00:00:00.000Z' };
  await writeFile(join(sliceDir, 'status.json'), json({ phase: 'implement', ...state, iteration: 0, lastActor: 'human', builderProvider: 'claude', supervisorProvider: 'codex' }));
  await writeFile(join(target, '.agent-manager/current.json'), json(state));
  for (const path of ['SYSTEM.txt', 'prompts/system/base.md', 'prompts/roles/builder-target.md', 'prompts/roles/reviewer-target.md']) {
    await mkdir(dirname(join(target, path)), { recursive: true });
    await writeFile(join(target, path), `fixture ${path}\n`, 'utf-8');
  }
  return {
    inputClosure,
    sliceDir,
    packet,
    input: { ...makeInput(target), promptRoot: target, commonPromptPaths: ['prompts/system/base.md'], sharedInstruction: { root: 'prompt', path: 'SYSTEM.txt' }, builderPromptPaths: ['prompts/system/base.md', 'prompts/roles/builder-target.md'], reviewerPromptPaths: ['prompts/system/base.md', 'prompts/roles/reviewer-target.md'], sliceId: 'DOC-NEG', baselinePath: inputClosure.manifestPath },
  };
}

async function writeV2DocumentCandidate(target: string, reviewIds: readonly string[] = ['EX-REQ-001', 'EX-REQ-001-L01']): Promise<{ path: string; sha256: string }> {
  const req = snapshot('docs/requirements/r1.md', requirementTextMany('EX-REQ-001', ['EX-REQ-001-L01']));
  const source = snapshot('docs/source.md', '# Origin\n');
  const allocation = snapshot('docs/slices/S2.md', '# ASSURANCE-3 candidate slice\n');
  const manifest = snapshot('docs/requirements/baselines/B2.json', json({ formatVersion: 2, kind: 'requirements-baseline-manifest', baselineId: 'B2', target: { projectId: 'example', root: '.' }, requirements: [{ path: req.path, sha256: req.sha256 }], dependencies: [{ role: 'source', path: source.path, sha256: source.sha256 }, { role: 'allocation', path: allocation.path, sha256: allocation.sha256 }], reviewObligationIds: reviewIds, requiredDecisionIds: [] }));
  for (const item of [req, source, allocation, manifest]) {
    await mkdir(dirname(join(target, item.path)), { recursive: true });
    await writeFile(join(target, item.path), item.bytes);
  }
  return { path: manifest.path, sha256: manifest.sha256 };
}

describe('ASSURANCE-2 pure v2 grammar, coverage and compatibility (A2-C01/C02)', () => {
  it('admits a valid v2 chain while a strict subset excludes an unchanged declared L', () => {
    const fixture = validV2Snapshots();
    const result = validateBaselineAdmission({ manifestPath: fixture.manifestPath, snapshots: fixture.snapshots, allocationPath: fixture.allocationPath });
    expect(result).toEqual(expect.objectContaining({ ok: true, admission: expect.objectContaining({ enforcement: 'reviewed-inputs' }) }));
    const review = fixture.snapshots.find((item) => item.path.endsWith('requirements-review.json')) as AssuranceFileSnapshot;
    expect(parseRequirementsReviewRecord(review, fixture.ids).ok).toBe(true);
  });

  it('rejects missing/unknown coverage, positive-prose override, and wrong aggregate', () => {
    const fixture = validV2Snapshots();
    const manifest = fixture.snapshots[0] as AssuranceFileSnapshot;
    const base = v2ReviewResult({ path: manifest.path, sha256: manifest.sha256 }, fixture.ids);
    const variants: [string, unknown][] = [
      ['review-coverage-missing', { ...base, assessments: base.assessments.slice(1) }],
      ['review-coverage-unknown', { ...base, assessments: [...base.assessments, { obligationId: 'EX-REQ-999', result: 'accepted', findingIds: [], decisionIds: [] }] }],
      ['review-result-mismatch', { ...base, result: 'accepted', assessments: base.assessments.map((item, index) => index === 0 ? { ...item, result: 'refinement-required', findingIds: ['F1'] } : item), findings: [{ findingId: 'F1', obligationId: fixture.ids[0], category: 'correctness', evidence: 'Proxy passes but user outcome fails.', consequence: 'The requirement permits ineffective behavior.', requiredAction: 'Bind acceptance to the user-visible outcome.' }], report: 'Accepted despite the failure.' }],
    ];
    for (const [code, value] of variants) {
      const parsed = parseRequirementsReviewResult(snapshot('provider-result', json(value)), base.subject, fixture.ids);
      expect(parsed.ok ? [] : parsed.errors.map((item) => item.code)).toContain(code);
    }
  });

  it('keeps v1 positive behavior byte-compatible while dispatching v2 explicitly', () => {
    expect(validateBaselineAdmission({ manifestPath: validClosure().manifestPath, snapshots: validClosure().snapshots, allocationPath: validClosure().allocationPath })).toEqual(expect.objectContaining({ ok: true, admission: expect.objectContaining({ enforcement: 'baseline-admission' }) }));
    const v2 = validV2Snapshots();
    expect(parseApprovalRecordV2(v2.snapshots.find((item) => item.path.endsWith('baseline-approval.json')) as AssuranceFileSnapshot).ok).toBe(true);
  });

  it('closes every v2 nested object and stops ambiguous JSON/BOM before dependent checks', () => {
    const fixture = validV2Snapshots();
    const manifest = fixture.snapshots[0] as AssuranceFileSnapshot;
    const review = fixture.snapshots.find((item) => item.path.endsWith('requirements-review.json')) as AssuranceFileSnapshot;
    const approval = fixture.snapshots.find((item) => item.path.endsWith('baseline-approval.json')) as AssuranceFileSnapshot;
    const accepted = v2ReviewResult({ path: manifest.path, sha256: manifest.sha256 }, fixture.ids);
    const resultRaw = json(accepted);
    const parsers: { path: string; raw: string; parse: (value: AssuranceFileSnapshot) => { ok: boolean; errors: { code: string }[] } }[] = [
      { path: manifest.path, raw: snapshotContent(manifest), parse: parseBaselineManifest },
      { path: 'provider-result', raw: resultRaw, parse: (value) => parseRequirementsReviewResult(value, accepted.subject, fixture.ids) },
      { path: review.path, raw: snapshotContent(review), parse: (value) => parseRequirementsReviewRecord(value, fixture.ids) },
      { path: approval.path, raw: snapshotContent(approval), parse: parseApprovalRecordV2 },
    ];
    for (const item of parsers) {
      expect(item.parse(snapshot(item.path, `\uFEFF${item.raw}`)).errors.map((error) => error.code)).toEqual(['malformed-json']);
      expect(item.parse(snapshot(item.path, '{')).errors.map((error) => error.code)).toContain('malformed-json');
      const duplicate = item.raw.replace('{', '{"formatVersion":2,');
      expect(item.parse(snapshot(item.path, duplicate)).errors.map((error) => error.code)).toContain('duplicate-field');
      const missing = JSON.parse(item.raw) as Record<string, unknown>;
      delete missing.kind;
      expect(item.parse(snapshot(item.path, json(missing))).errors.map((error) => error.code)).toContain('invalid-field');
      const wrong = JSON.parse(item.raw) as Record<string, unknown>;
      wrong.formatVersion = '2';
      expect(item.parse(snapshot(item.path, json(wrong))).ok).toBe(false);
    }
    const unknowns: { raw: string; path: (string | number)[]; parse: (value: AssuranceFileSnapshot) => { ok: boolean; errors: { code: string }[] } }[] = [
      { raw: snapshotContent(manifest), path: ['target'], parse: parseBaselineManifest },
      { raw: snapshotContent(manifest), path: ['requirements', 0], parse: parseBaselineManifest },
      { raw: snapshotContent(manifest), path: ['dependencies', 0], parse: parseBaselineManifest },
      { raw: resultRaw, path: ['subject'], parse: (value) => parseRequirementsReviewResult(value, accepted.subject, fixture.ids) },
      { raw: resultRaw, path: ['assessments', 0], parse: (value) => parseRequirementsReviewResult(value, accepted.subject, fixture.ids) },
      { raw: snapshotContent(review), path: ['author'], parse: (value) => parseRequirementsReviewRecord(value, fixture.ids) },
      { raw: snapshotContent(review), path: ['independence'], parse: (value) => parseRequirementsReviewRecord(value, fixture.ids) },
      { raw: snapshotContent(review), path: ['authorInputProvenance', 'roots'], parse: (value) => parseRequirementsReviewRecord(value, fixture.ids) },
      { raw: snapshotContent(review), path: ['authorInputProvenance', 'commonInputs', 0], parse: (value) => parseRequirementsReviewRecord(value, fixture.ids) },
      { raw: snapshotContent(review), path: ['authorInputProvenance', 'channels', 0], parse: (value) => parseRequirementsReviewRecord(value, fixture.ids) },
      { raw: snapshotContent(approval), path: ['target'], parse: parseApprovalRecordV2 },
      { raw: snapshotContent(approval), path: ['approvedBy'], parse: parseApprovalRecordV2 },
    ];
    for (const item of unknowns) expect(item.parse(snapshot('nested-v2', addExtraField(item.raw, item.path))).errors.map((error) => error.code)).toContain('unknown-field');
  });

  it('checks finding/decision linkage and every outcome-shape counterexample', () => {
    const fixture = validV2Snapshots();
    const manifest = fixture.snapshots[0] as AssuranceFileSnapshot;
    const subject = { path: manifest.path, sha256: manifest.sha256 };
    const base = v2ReviewResult(subject, fixture.ids);
    const finding = { findingId: 'F1', obligationId: fixture.ids[0] as string, category: 'verifiability', evidence: 'No observable output is named.', consequence: 'Independent pass or fail is impossible.', requiredAction: 'Name an observable output.' };
    const decision = { decisionId: 'D1', obligationIds: [fixture.ids[0] as string], question: 'Which output is required?', options: [{ option: 'A', reward: 'Deterministic result.', risk: 'Compatibility change.' }, { option: 'B', reward: 'Compatibility retained.', risk: 'Ambiguous acceptance.' }], recommendation: 'A', blockingReason: 'Authority sources do not settle this.' };
    const parse = (value: unknown) => parseRequirementsReviewResult(snapshot('provider-result', json(value)), subject, fixture.ids);
    const acceptedWithRefs = { ...base, assessments: base.assessments.map((item, index) => index === 0 ? { ...item, findingIds: ['F1'] } : item), findings: [finding] };
    const refineWithoutFinding = { ...base, result: 'refinement-required', assessments: base.assessments.map((item, index) => index === 0 ? { ...item, result: 'refinement-required' } : item) };
    const decideWithoutDecision = { ...base, result: 'decision-required', assessments: base.assessments.map((item, index) => index === 0 ? { ...item, result: 'decision-required' } : item) };
    const missingFinding = { ...base, result: 'refinement-required', assessments: base.assessments.map((item, index) => index === 0 ? { ...item, result: 'refinement-required', findingIds: ['F1'] } : item) };
    const unusedDecision = { ...base, decisions: [decision] };
    for (const value of [acceptedWithRefs, refineWithoutFinding, decideWithoutDecision, missingFinding, unusedDecision]) expect(parse(value).errors.map((error) => error.code)).toContain('review-result-mismatch');
    const validDecision = { ...base, result: 'decision-required', assessments: base.assessments.map((item, index) => index === 0 ? { ...item, result: 'decision-required', findingIds: ['F1'], decisionIds: ['D1'] } : item), findings: [finding], decisions: [decision] };
    expect(parse(validDecision).ok).toBe(true);
    expect(parse({ ...validDecision, decisions: [{ ...decision, recommendation: 'C' }] }).errors.map((error) => error.code)).toContain('review-result-mismatch');
    expect(parse({ ...validDecision, findings: [{ ...finding, obligationId: 'EX-REQ-999' }] }).errors.map((error) => error.code)).toContain('review-coverage-unknown');
  });
});

describe('ASSURANCE-2 adapter delivery composition (A2-C05/C06)', () => {
  let root = '';
  afterEach(async () => { if (root) await rm(root, { recursive: true, force: true }); root = ''; });

  it.each(['claude', 'codex', 'copilot'] as const)('%s consumes immutable request bytes and reports actual channels without outputSchema', async (provider) => {
    root = await mkdtemp('/private/tmp/ASSURANCE-2-adapter-');
    const store = new FilesystemArtifactStore();
    const config = { logsDir: join(root, 'logs'), promptRoot: root, command: 'not-spawned' };
    const adapter = provider === 'claude' ? new ClaudeAdapter(config, store, new FixedClock()) : provider === 'codex' ? new CodexAdapter(config, store, new FixedClock()) : new CopilotAdapter(config, store, new FixedClock());
    const text = (origin: 'file' | 'generated', purpose: 'shared-instruction' | 'governance' | 'role-instruction' | 'task-directive', label: string) => {
      const bytes = new TextEncoder().encode(label);
      return origin === 'file'
        ? { origin, root: 'prompt' as const, purpose, path: label, bytes, sha256: computeDigest(label) }
        : { origin, purpose, label, bytes, sha256: computeDigest(label) };
    };
    const request: RunRequest = { runId: 'r1', sliceId: 'S', role: 'builder', mode: 'edit', permission: 'write', workingDir: root, model: 'm', effort: 'high', inputArtifacts: [], delivery: { kind: 'reviewed-input-snapshots', contract: 'requirements-assurance/v2-input-delivery', common: [text('file', 'shared-instruction', 'SYSTEM.txt'), text('file', 'governance', 'CLAUDE.md')], roleSpecific: [text('file', 'role-instruction', 'builder.md'), text('generated', 'task-directive', 'task')] } };
    const prepared = await adapter.prepareRunDelivery(request);
    expect(prepared.receipt).toEqual(expect.objectContaining({ kind: 'reviewed-input-snapshots', channels: expect.arrayContaining([expect.objectContaining({ channel: 'stdin' }), expect.objectContaining({ channel: 'shared-instruction' })]) }));
    expect(new TextDecoder().decode(prepared.stdinBytes)).toContain('AGENT_MANAGER_INPUT_V2');
    expect(prepared.invocation.cwd).toBe(root);
    expect(prepared.invocation.args.join(' ')).not.toContain('outputSchema');
    if (request.delivery.kind !== 'reviewed-input-snapshots') throw new Error('test fixture selected the wrong delivery mode');
    (request.delivery.common[1] as { bytes: Uint8Array }).bytes = new TextEncoder().encode('mutated-copy');
    expect(new TextDecoder().decode(prepared.stdinBytes)).not.toContain('mutated-copy');
    await expect(adapter.prepareRunDelivery(request)).rejects.toThrow('digest mismatch');
    const withoutShared: RunRequest = { ...request, delivery: { ...request.delivery, common: request.delivery.common.filter((item) => item.purpose !== 'shared-instruction').map((item, index) => index === 0 ? { ...item, bytes: new TextEncoder().encode('CLAUDE.md'), sha256: computeDigest('CLAUDE.md') } : item) } };
    await expect(adapter.prepareRunDelivery(withoutShared)).rejects.toThrow('exactly one shared-instruction');
  });
});

describe('ASSURANCE-2 document routing and approval operation (A2-C03/C04/C07)', () => {
  let target = '';
  afterEach(async () => { if (target) await rm(target, { recursive: true, force: true }); target = ''; });

  it('authors then separately reviews a v2 candidate, publishes only accepted review, and awaits approval', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-2-document-');
    const inputClosure = validClosure();
    await writeClosure(target, inputClosure);
    const sliceDir = join(target, '.agent-manager/slices/DOC-1');
    await mkdir(join(sliceDir, 'runs'), { recursive: true });
    const packet = ['STATUS: selected', 'SLICE_ID: DOC-1', 'SLICE_DOC: docs/slices/S2.md', 'ARTIFACT_KIND: REQUIREMENTS_DOCUMENT', `ADMISSION_ALLOCATION: ${inputClosure.allocationPath}`, 'REVIEW_BASELINE: docs/requirements/baselines/B2.json', 'REVIEW_OBLIGATION_IDS: EX-REQ-001,EX-REQ-001-L01'].join('\n');
    await writeFile(join(sliceDir, 'selection.md'), packet, 'utf-8');
    await writeFile(join(sliceDir, 'status.json'), json({ phase: 'implement', sliceId: 'DOC-1', sliceDoc: 'docs/slices/S2.md', iteration: 0, updatedAt: '2026-09-12T00:00:00.000Z', lastActor: 'human', builderProvider: 'claude', supervisorProvider: 'codex' }));
    await writeFile(join(target, '.agent-manager/current.json'), json({ sliceId: 'DOC-1', sliceDoc: 'docs/slices/S2.md', updatedAt: '2026-09-12T00:00:00.000Z' }));
    for (const path of ['SYSTEM.txt', 'prompts/system/base.md', 'prompts/roles/builder-target.md', 'prompts/roles/reviewer-target.md']) { await mkdir(dirname(join(target, path)), { recursive: true }); await writeFile(join(target, path), `fixture ${path}\n`, 'utf-8'); }
    let candidateRef: { path: string; sha256: string } | undefined;
    class Author implements ProviderRunnerPort {
      calls: RunRequest[] = [];
      async run(request: RunRequest): Promise<RunResult> {
        this.calls.push(request);
        const req = snapshot('docs/requirements/r1.md', requirementTextMany('EX-REQ-001', ['EX-REQ-001-L01']));
        const source = snapshot('docs/source.md', '# Origin\n');
        const allocation = snapshot('docs/slices/S2.md', '# ASSURANCE-3 candidate slice\n');
        const manifest = snapshot('docs/requirements/baselines/B2.json', json({ formatVersion: 2, kind: 'requirements-baseline-manifest', baselineId: 'B2', target: { projectId: 'example', root: '.' }, requirements: [{ path: req.path, sha256: req.sha256 }], dependencies: [{ role: 'source', path: source.path, sha256: source.sha256 }, { role: 'allocation', path: allocation.path, sha256: allocation.sha256 }], reviewObligationIds: ['EX-REQ-001', 'EX-REQ-001-L01'], requiredDecisionIds: [] }));
        for (const item of [req, source, allocation, manifest]) { await mkdir(dirname(join(target, item.path)), { recursive: true }); await writeFile(join(target, item.path), item.bytes); }
        candidateRef = { path: manifest.path, sha256: manifest.sha256 };
        return { runId: request.runId, status: RunStatus.COMPLETED, outputArtifacts: [{ suggestedPath: 'author.md', type: 'provider-output', content: 'Document candidate authored.' }], logPath: '/tmp/stub-author', startedAt: '2026-09-12T00:00:00.000Z', completedAt: '2026-09-12T00:00:01.000Z', deliveryReceipt: receiptFor(request) };
      }
    }
    const author = new Author();
    const reviewer = new StubRunner(() => json(v2ReviewResult(candidateRef as { path: string; sha256: string }, ['EX-REQ-001', 'EX-REQ-001-L01'])));
    const configured: TargetRelayInput = { ...makeInput(target), promptRoot: target, commonPromptPaths: ['prompts/system/base.md'], sharedInstruction: { root: 'prompt', path: 'SYSTEM.txt' }, builderPromptPaths: ['prompts/system/base.md', 'prompts/roles/builder-target.md'], reviewerPromptPaths: ['prompts/system/base.md', 'prompts/roles/reviewer-target.md'], sliceId: 'DOC-1', baselinePath: inputClosure.manifestPath };
    const result = await targetRelayLoop(configured, makeDeps(author, reviewer));
    expect(result).toEqual(expect.objectContaining({ phase: 'done', reason: 'reviewed baseline awaiting operator approval' }));
    expect(author.calls[0]?.delivery.kind).toBe('reviewed-input-snapshots');
    expect(reviewer.calls[0]?.delivery.kind).toBe('reviewed-input-snapshots');
    expect(await exists(join(target, 'docs/assurance/B2/requirements-review.json'))).toBe(true);
    expect(await exists(join(target, 'docs/assurance/B2/baseline-approval.json'))).toBe(false);
    const authorRun = JSON.parse(await readFile(join(sliceDir, 'runs/build-0.json'), 'utf-8')) as { inputProvenance: { commonInputs: unknown } };
    const reviewerRun = JSON.parse(await readFile(join(sliceDir, 'runs/review-0.json'), 'utf-8')) as { inputProvenance: { commonInputs: unknown } };
    expect(authorRun.inputProvenance.commonInputs).toEqual(reviewerRun.inputProvenance.commonInputs);

    await writeFile(join(target, 'docs/authority-v2.md'), '# Authority\n', 'utf-8');
    const approval = await recordReviewedBaselineApproval({ targetDir: target, manifestPath: 'docs/requirements/baselines/B2.json', approvalId: 'approval-B2', projectId: 'example', approvedBy: { actorType: 'operator', actorId: 'manager' }, recordedBy: { actorType: 'operator', actorId: 'manager' }, authorityBasisPath: 'docs/authority-v2.md', decisionRecords: [], rationale: 'Approve the exact reviewed candidate.' }, { clock: new FixedClock(), artifactStore: new FilesystemArtifactStore(), computeDigest });
    expect(approval.outputPath).toBe('docs/assurance/B2/baseline-approval.json');
    await expect(recordReviewedBaselineApproval({ targetDir: target, manifestPath: 'docs/requirements/baselines/B2.json', approvalId: 'again', projectId: 'example', approvedBy: { actorType: 'operator', actorId: 'manager' }, recordedBy: { actorType: 'operator', actorId: 'manager' }, authorityBasisPath: 'docs/authority-v2.md', decisionRecords: [], rationale: 'No overwrite.' }, { clock: new FixedClock(), artifactStore: new FilesystemArtifactStore(), computeDigest })).rejects.toThrow('approval-already-exists');
  });

  it('keeps an unadmitted legacy REQUIREMENTS_DOCUMENT label on legacy verdict routing', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-2-legacy-posture-');
    const sliceDir = await seedSlice(target, 'LEGACY-DOC', 'already built');
    await writeFile(join(sliceDir, 'selection.md'), [
      'STATUS: selected',
      'SLICE_ID: LEGACY-DOC',
      'SLICE_DOC: docs/slices/LEGACY-DOC.md',
      'ARTIFACT_KIND: REQUIREMENTS_DOCUMENT',
    ].join('\n'), 'utf-8');
    const builder = new StubRunner(() => 'not called');
    const reviewer = new StubRunner(() => 'STATUS: approved\nLegacy review remains prose.');
    const result = await targetRelayLoop({ ...makeInput(target), sliceId: 'LEGACY-DOC' }, makeDeps(builder, reviewer));
    expect(result.phase).toBe('done');
    expect(builder.calls).toHaveLength(0);
    expect(reviewer.calls).toHaveLength(1);
    expect(reviewer.calls[0]?.delivery.kind).toBe('legacy-live-inputs');
    expect(await exists(join(target, 'docs/assurance/B2/requirements-review.json'))).toBe(false);
  });

  it.each([
    ['invalid JSON', (_subject: { path: string; sha256: string }) => '{'],
    ['stale subject', (subject: { path: string; sha256: string }) => json(v2ReviewResult({ ...subject, sha256: computeDigest('stale') }, ['EX-REQ-001', 'EX-REQ-001-L01']))],
    ['omitted scope ID', (subject: { path: string; sha256: string }) => json(v2ReviewResult(subject, ['EX-REQ-001']))],
    ['unknown scope ID', (subject: { path: string; sha256: string }) => json(v2ReviewResult(subject, ['EX-REQ-001', 'EX-REQ-001-L01', 'EX-REQ-999']))],
  ])('blocks %s review output without publishing a durable review', async (_label, reviewOutput) => {
    target = await mkdtemp('/private/tmp/ASSURANCE-2-document-review-refusal-');
    const seeded = await seedV1DocumentBridge(target);
    let subject: { path: string; sha256: string } | undefined;
    const author = new AsyncStubRunner(async () => {
      subject = await writeV2DocumentCandidate(target);
      return 'candidate authored';
    });
    const reviewer = new StubRunner(() => reviewOutput(subject as { path: string; sha256: string }));
    const result = await targetRelayLoop(seeded.input, makeDeps(author, reviewer));
    expect(result.phase).toBe('blocked');
    expect(author.calls).toHaveLength(1);
    expect(reviewer.calls).toHaveLength(1);
    expect(await exists(join(target, 'docs/assurance/B2/requirements-review.json'))).toBe(false);
  });

  it('detects candidate mutation during review before publishing the stale result', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-2-document-mutation-');
    const seeded = await seedV1DocumentBridge(target);
    let subject: { path: string; sha256: string } | undefined;
    const author = new AsyncStubRunner(async () => {
      subject = await writeV2DocumentCandidate(target);
      return 'candidate authored';
    });
    const reviewer = new AsyncStubRunner(async () => {
      const path = join(target, subject?.path as string);
      await writeFile(path, `${await readFile(path, 'utf-8')}\n`, 'utf-8');
      return json(v2ReviewResult(subject as { path: string; sha256: string }, ['EX-REQ-001', 'EX-REQ-001-L01']));
    });
    const result = await targetRelayLoop(seeded.input, makeDeps(author, reviewer));
    expect(result.phase).toBe('blocked');
    expect(await readFile(join(seeded.sliceDir, 'notes-for-human.md'), 'utf-8')).toContain('subject-mismatch');
    expect(await exists(join(target, 'docs/assurance/B2/requirements-review.json'))).toBe(false);
  });

  it('blocks packet/candidate review-scope mismatch before the reviewer call', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-2-document-scope-');
    const seeded = await seedV1DocumentBridge(target);
    const author = new AsyncStubRunner(async () => {
      await writeV2DocumentCandidate(target, ['EX-REQ-001']);
      return 'candidate authored';
    });
    const reviewer = new StubRunner(() => 'must not run');
    const result = await targetRelayLoop(seeded.input, makeDeps(author, reviewer));
    expect(result.phase).toBe('blocked');
    expect(author.calls).toHaveLength(1);
    expect(reviewer.calls).toHaveLength(0);
    expect(await readFile(join(seeded.sliceDir, 'notes-for-human.md'), 'utf-8')).toMatch(/review-coverage-(?:missing|unknown)/);
    expect(await exists(join(target, 'docs/assurance/B2/requirements-review.json'))).toBe(false);
  });

  it.each([
    ['missing ARTIFACT_KIND', ['ADMISSION_ALLOCATION: docs/slices/S1.md', 'REVIEW_BASELINE: docs/requirements/baselines/B2.json', 'REVIEW_OBLIGATION_IDS: EX-REQ-001,EX-REQ-001-L01']],
    ['duplicate ARTIFACT_KIND', ['ARTIFACT_KIND: REQUIREMENTS_DOCUMENT', 'ARTIFACT_KIND: REQUIREMENTS_DOCUMENT', 'ADMISSION_ALLOCATION: docs/slices/S1.md', 'REVIEW_BASELINE: docs/requirements/baselines/B2.json', 'REVIEW_OBLIGATION_IDS: EX-REQ-001,EX-REQ-001-L01']],
    ['unknown ARTIFACT_KIND', ['ARTIFACT_KIND: OTHER', 'ADMISSION_ALLOCATION: docs/slices/S1.md', 'REVIEW_BASELINE: docs/requirements/baselines/B2.json', 'REVIEW_OBLIGATION_IDS: EX-REQ-001,EX-REQ-001-L01']],
    ['missing ADMISSION_ALLOCATION', ['ARTIFACT_KIND: REQUIREMENTS_DOCUMENT', 'REVIEW_BASELINE: docs/requirements/baselines/B2.json', 'REVIEW_OBLIGATION_IDS: EX-REQ-001,EX-REQ-001-L01']],
    ['duplicate ADMISSION_ALLOCATION', ['ARTIFACT_KIND: REQUIREMENTS_DOCUMENT', 'ADMISSION_ALLOCATION: docs/slices/S1.md', 'ADMISSION_ALLOCATION: docs/slices/S1.md', 'REVIEW_BASELINE: docs/requirements/baselines/B2.json', 'REVIEW_OBLIGATION_IDS: EX-REQ-001,EX-REQ-001-L01']],
    ['missing REVIEW_BASELINE', ['ARTIFACT_KIND: REQUIREMENTS_DOCUMENT', 'ADMISSION_ALLOCATION: docs/slices/S1.md', 'REVIEW_OBLIGATION_IDS: EX-REQ-001,EX-REQ-001-L01']],
    ['duplicate REVIEW_BASELINE', ['ARTIFACT_KIND: REQUIREMENTS_DOCUMENT', 'ADMISSION_ALLOCATION: docs/slices/S1.md', 'REVIEW_BASELINE: docs/requirements/baselines/B2.json', 'REVIEW_BASELINE: docs/requirements/baselines/B3.json', 'REVIEW_OBLIGATION_IDS: EX-REQ-001,EX-REQ-001-L01']],
    ['missing REVIEW_OBLIGATION_IDS', ['ARTIFACT_KIND: REQUIREMENTS_DOCUMENT', 'ADMISSION_ALLOCATION: docs/slices/S1.md', 'REVIEW_BASELINE: docs/requirements/baselines/B2.json']],
    ['duplicate REVIEW_OBLIGATION_IDS field', ['ARTIFACT_KIND: REQUIREMENTS_DOCUMENT', 'ADMISSION_ALLOCATION: docs/slices/S1.md', 'REVIEW_BASELINE: docs/requirements/baselines/B2.json', 'REVIEW_OBLIGATION_IDS: EX-REQ-001', 'REVIEW_OBLIGATION_IDS: EX-REQ-001-L01']],
    ['duplicate REVIEW_OBLIGATION_IDS value', ['ARTIFACT_KIND: REQUIREMENTS_DOCUMENT', 'ADMISSION_ALLOCATION: docs/slices/S1.md', 'REVIEW_BASELINE: docs/requirements/baselines/B2.json', 'REVIEW_OBLIGATION_IDS: EX-REQ-001,EX-REQ-001']],
    ['invalid ADMISSION_ALLOCATION', ['ARTIFACT_KIND: REQUIREMENTS_DOCUMENT', 'ADMISSION_ALLOCATION: ../S1.md', 'REVIEW_BASELINE: docs/requirements/baselines/B2.json', 'REVIEW_OBLIGATION_IDS: EX-REQ-001,EX-REQ-001-L01']],
    ['non-admitted ADMISSION_ALLOCATION', ['ARTIFACT_KIND: REQUIREMENTS_DOCUMENT', 'ADMISSION_ALLOCATION: docs/slices/other.md', 'REVIEW_BASELINE: docs/requirements/baselines/B2.json', 'REVIEW_OBLIGATION_IDS: EX-REQ-001,EX-REQ-001-L01']],
  ])('rejects %s before the document author', async (_label, fields) => {
    target = await mkdtemp('/private/tmp/ASSURANCE-2-document-posture-');
    const seeded = await seedV1DocumentBridge(target, fields);
    const author = new StubRunner(() => 'must not run');
    const reviewer = new StubRunner(() => 'must not run');
    const result = await targetRelayLoop(seeded.input, makeDeps(author, reviewer));
    expect(result.phase).toBe('blocked');
    expect(author.calls).toHaveLength(0);
    expect(reviewer.calls).toHaveLength(0);
    expect(await exists(join(target, 'docs/requirements/baselines/B2.json'))).toBe(false);
  });

  it('retains refinement findings for the next author cycle and blocks decisions without durable acceptance', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-2-document-outcomes-');
    const seeded = await seedV1DocumentBridge(target);
    let subject: { path: string; sha256: string } | undefined;
    const author = new AsyncStubRunner(async () => {
      subject = await writeV2DocumentCandidate(target);
      return 'candidate authored';
    });
    const finding = { findingId: 'F1', obligationId: 'EX-REQ-001-L01', category: 'correctness', evidence: 'The stated proxy can pass while the user outcome fails.', consequence: 'An ineffective requirement could be accepted.', requiredAction: 'Bind the oracle to the user-visible result.' };
    let reviews = 0;
    const reviewer = new StubRunner(() => {
      reviews += 1;
      const base = v2ReviewResult(subject as { path: string; sha256: string }, ['EX-REQ-001', 'EX-REQ-001-L01']);
      return reviews === 1
        ? json({ ...base, result: 'refinement-required', assessments: base.assessments.map((item) => item.obligationId === 'EX-REQ-001-L01' ? { ...item, result: 'refinement-required', findingIds: ['F1'] } : item), findings: [finding], report: 'Refinement is required.' })
        : json(base);
    });
    expect((await targetRelayLoop(seeded.input, makeDeps(author, reviewer))).phase).toBe('done');
    expect(author.calls).toHaveLength(2);
    expect(reviewer.calls).toHaveLength(2);
    expect((author.calls[1]?.delivery.kind === 'reviewed-input-snapshots' ? author.calls[1].delivery.roleSpecific : []).some((item) => item.purpose === 'prior-review')).toBe(true);

    await rm(target, { recursive: true, force: true });
    target = await mkdtemp('/private/tmp/ASSURANCE-2-document-decision-');
    const decisionSeed = await seedV1DocumentBridge(target);
    let decisionSubject: { path: string; sha256: string } | undefined;
    const decisionAuthor = new AsyncStubRunner(async () => { decisionSubject = await writeV2DocumentCandidate(target); return 'candidate authored'; });
    const decisionReviewer = new StubRunner(() => {
      const base = v2ReviewResult(decisionSubject as { path: string; sha256: string }, ['EX-REQ-001', 'EX-REQ-001-L01']);
      const decision = { decisionId: 'D-OUTPUT', obligationIds: ['EX-REQ-001-L01'], question: 'Which observable output binds acceptance?', options: [{ option: 'A', reward: 'Direct user-outcome evidence.', risk: 'Requires a stronger fixture.' }, { option: 'B', reward: 'Keeps the current fixture.', risk: 'Can accept ineffective behavior.' }], recommendation: 'A', blockingReason: 'Existing authority does not choose the output.' };
      return json({ ...base, result: 'decision-required', assessments: base.assessments.map((item) => item.obligationId === 'EX-REQ-001-L01' ? { ...item, result: 'decision-required', decisionIds: ['D-OUTPUT'] } : item), decisions: [decision], report: 'Authority decision required.' });
    });
    const decisionResult = await targetRelayLoop(decisionSeed.input, makeDeps(decisionAuthor, decisionReviewer));
    expect(decisionResult.phase).toBe('blocked');
    expect(await readFile(join(decisionSeed.sliceDir, 'notes-for-human.md'), 'utf-8')).toContain('DECISION_REQUIRED');
    expect(await exists(join(target, 'docs/assurance/B2/requirements-review.json'))).toBe(false);
  });
});

async function seedV2Implementation(target: string, packetTail = 'ARTIFACT_KIND: IMPLEMENTATION\nIMPLEMENT_OBLIGATION_IDS: EX-REQ-001,EX-REQ-001-L01\n'): Promise<TargetRelayInput> {
  const closure = validV2Snapshots();
  await writeClosure(target, closure);
  const sliceDir = join(target, '.agent-manager/slices/S2');
  await mkdir(join(sliceDir, 'runs'), { recursive: true });
  const packet = `STATUS: selected\nSLICE_ID: S2\nSLICE_DOC: ${closure.allocationPath}\n${packetTail}`;
  await writeFile(join(sliceDir, 'selection.md'), packet, 'utf-8');
  await writeFile(join(sliceDir, 'status.json'), json({ phase: 'implement', sliceId: 'S2', sliceDoc: closure.allocationPath, iteration: 0, updatedAt: '2026-09-12T00:00:00.000Z', lastActor: 'human', builderProvider: 'claude', supervisorProvider: 'codex' }));
  await writeFile(join(target, '.agent-manager/current.json'), json({ sliceId: 'S2', sliceDoc: closure.allocationPath, updatedAt: '2026-09-12T00:00:00.000Z' }));
  for (const path of ['SYSTEM.txt', 'prompts/system/base.md', 'prompts/roles/supervisor-select.md', 'prompts/roles/builder-target.md', 'prompts/roles/reviewer-target.md', 'prompts/roles/decision-challenger.md', 'prompts/roles/decision-rebutter.md']) {
    await mkdir(dirname(join(target, path)), { recursive: true });
    await writeFile(join(target, path), `fixture ${path}\n`, 'utf-8');
  }
  return {
    ...makeInput(target),
    promptRoot: target,
    commonPromptPaths: ['prompts/system/base.md'],
    sharedInstruction: { root: 'prompt', path: 'SYSTEM.txt' },
    sliceId: 'S2',
    baselinePath: closure.manifestPath,
  };
}

describe('ASSURANCE-2 v2 resume/refusal gates (A2-C05/C07)', () => {
  let target = '';
  afterEach(async () => { if (target) await rm(target, { recursive: true, force: true }); target = ''; });

  it('delivers equal common bytes with intentional role differences and persists v2 on an implementation run', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-2-v2-');
    const input = await seedV2Implementation(target);
    const builder = new StubRunner(() => 'built');
    const reviewer = new StubRunner(() => 'STATUS: approved\nReviewed.');
    const result = await targetRelayLoop(input, makeDeps(builder, reviewer));
    expect(result.phase).toBe('done');
    expect(builder.calls).toHaveLength(1);
    expect(reviewer.calls).toHaveLength(1);
    const builderDelivery = builder.calls[0]?.delivery;
    const reviewerDelivery = reviewer.calls[0]?.delivery;
    expect(builderDelivery?.kind).toBe('reviewed-input-snapshots');
    expect(reviewerDelivery?.kind).toBe('reviewed-input-snapshots');
    if (builderDelivery?.kind !== 'reviewed-input-snapshots' || reviewerDelivery?.kind !== 'reviewed-input-snapshots') throw new Error('wrong test delivery mode');
    expect(builderDelivery.common.map((item) => item.sha256)).toEqual(reviewerDelivery.common.map((item) => item.sha256));
    expect(builderDelivery.roleSpecific.map((item) => item.sha256)).not.toEqual(reviewerDelivery.roleSpecific.map((item) => item.sha256));
    const status = JSON.parse(await readFile(join(target, '.agent-manager/slices/S2/status.json'), 'utf-8')) as { assurance: { contract: string; enforcement: string } };
    const current = JSON.parse(await readFile(join(target, '.agent-manager/current.json'), 'utf-8')) as { assurance: unknown };
    expect(status.assurance).toEqual(expect.objectContaining({ contract: 'requirements-assurance/v2-stage2', enforcement: 'reviewed-inputs' }));
    expect(current.assurance).toEqual(status.assurance);
  });

  it('blocks changed persisted instructions before the reviewer provider call', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-2-drift-');
    const input = await seedV2Implementation(target);
    class MutatingBuilder extends StubRunner {
      override async run(request: RunRequest): Promise<RunResult> {
        const result = await super.run(request);
        await writeFile(join(target, 'prompts/roles/reviewer-target.md'), 'mutated after builder\n', 'utf-8');
        return result;
      }
    }
    const builder = new MutatingBuilder(() => 'built');
    const reviewer = new StubRunner(() => 'STATUS: approved\nShould not run.');
    const result = await targetRelayLoop(input, makeDeps(builder, reviewer));
    expect(result.phase).toBe('blocked');
    expect(builder.calls).toHaveLength(1);
    expect(reviewer.calls).toHaveLength(0);
    expect(await readFile(join(target, '.agent-manager/slices/S2/notes-for-human.md'), 'utf-8')).toContain('instruction identities changed');
  });

  it('blocks a missing v2 ARTIFACT_KIND and a mismatched provider receipt before dependent review', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-2-refusal-');
    const missingKind = await seedV2Implementation(target, 'IMPLEMENT_OBLIGATION_IDS: EX-REQ-001\n');
    const untouchedBuilder = new StubRunner(() => 'built');
    const untouchedReviewer = new StubRunner(() => 'STATUS: approved');
    expect((await targetRelayLoop(missingKind, makeDeps(untouchedBuilder, untouchedReviewer))).phase).toBe('blocked');
    expect(untouchedBuilder.calls).toHaveLength(0);
    await rm(target, { recursive: true, force: true });
    target = await mkdtemp('/private/tmp/ASSURANCE-2-receipt-');
    const input = await seedV2Implementation(target);
    class MismatchedReceiptRunner extends StubRunner {
      override async run(request: RunRequest): Promise<RunResult> {
        const result = await super.run(request);
        return { ...result, deliveryReceipt: { kind: 'reviewed-input-snapshots', contract: 'requirements-assurance/v2-input-delivery', channels: [
          { channel: 'shared-instruction', mechanism: 'wrong', sha256: computeDigest('wrong'), byteLength: 5 },
          { channel: 'stdin', mechanism: 'stub', sha256: computeDigest('stub'), byteLength: 4 },
        ] } };
      }
    }
    const badBuilder = new MismatchedReceiptRunner(() => 'built');
    const reviewer = new StubRunner(() => 'STATUS: approved');
    expect((await targetRelayLoop(input, makeDeps(badBuilder, reviewer))).phase).toBe('blocked');
    expect(reviewer.calls).toHaveLength(0);
  });

  it('resumes persisted v2 without --baseline and rejects an explicit v1/v2 mode conflict', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-2-v2-resume-');
    const input = await seedV2Implementation(target);
    const builder = new StubRunner(() => 'built');
    const reviewer = new StubRunner(() => 'STATUS: approved');
    expect((await targetRelayLoop({ ...input, maxIterations: 0 }, makeDeps(builder, reviewer))).phase).toBe('blocked');
    expect(builder.calls).toHaveLength(0);
    const { baselinePath: _resumeBaseline, ...resumeInput } = input;
    const resumed = await targetRelayLoop({ ...resumeInput, maxIterations: 1 }, makeDeps(builder, reviewer));
    expect(resumed.phase).toBe('done');
    expect(builder.calls).toHaveLength(1);
    expect(builder.calls[0]?.delivery.kind).toBe('reviewed-input-snapshots');

    await rm(target, { recursive: true, force: true });
    target = await mkdtemp('/private/tmp/ASSURANCE-2-v2-conflict-');
    const conflictInput = await seedV2Implementation(target);
    const untouchedBuilder = new StubRunner(() => 'must not run');
    const untouchedReviewer = new StubRunner(() => 'must not run');
    await targetRelayLoop({ ...conflictInput, maxIterations: 0 }, makeDeps(untouchedBuilder, untouchedReviewer));
    const v1 = validClosure();
    await writeClosure(target, v1);
    const conflict = await targetRelayLoop({ ...conflictInput, baselinePath: v1.manifestPath, maxIterations: 1 }, makeDeps(untouchedBuilder, untouchedReviewer));
    expect(conflict.phase).toBe('blocked');
    expect(conflict.reason).toContain('Baseline conflict');
    expect(untouchedBuilder.calls).toHaveLength(0);
    expect(untouchedReviewer.calls).toHaveLength(0);
  });

  it('rejects partial and mismatched persisted v2 mode before dispatch', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-2-v2-mode-record-');
    const input = await seedV2Implementation(target);
    const builder = new StubRunner(() => 'must not run');
    const reviewer = new StubRunner(() => 'must not run');
    await targetRelayLoop({ ...input, maxIterations: 0 }, makeDeps(builder, reviewer));
    const statusPath = join(target, '.agent-manager/slices/S2/status.json');
    const status = JSON.parse(await readFile(statusPath, 'utf-8')) as { assurance: Record<string, unknown> };
    delete status.assurance.instructions;
    await writeFile(statusPath, json(status), 'utf-8');
    const { baselinePath: _partialBaseline, ...resumePartial } = input;
    expect((await targetRelayLoop({ ...resumePartial, maxIterations: 1 }, makeDeps(builder, reviewer))).phase).toBe('blocked');
    expect(builder.calls).toHaveLength(0);

    await rm(target, { recursive: true, force: true });
    target = await mkdtemp('/private/tmp/ASSURANCE-2-v2-mode-mismatch-');
    const mismatchInput = await seedV2Implementation(target);
    await targetRelayLoop({ ...mismatchInput, maxIterations: 0 }, makeDeps(builder, reviewer));
    const currentPath = join(target, '.agent-manager/current.json');
    const current = JSON.parse(await readFile(currentPath, 'utf-8')) as { assurance: { instructions: { shared: { sha256: string } } } };
    current.assurance.instructions.shared.sha256 = computeDigest('different-valid-identity');
    await writeFile(currentPath, json(current), 'utf-8');
    const { baselinePath: _mismatchBaseline, ...resumeMismatch } = mismatchInput;
    const result = await targetRelayLoop({ ...resumeMismatch, maxIterations: 1 }, makeDeps(builder, reviewer));
    expect(result.phase).toBe('blocked');
    expect(result.reason).toContain('Assurance state mismatch');
    expect(builder.calls).toHaveLength(0);
    expect(reviewer.calls).toHaveLength(0);
  });

  it.each([
    ['shared instruction', 'SYSTEM.txt'],
    ['governance input', 'CLAUDE.md'],
    ['baseline requirement', 'docs/requirements/r1.md'],
  ])('blocks %s drift after persisted v2 admission with zero provider calls', async (_label, path) => {
    target = await mkdtemp('/private/tmp/ASSURANCE-2-v2-input-drift-');
    const input = await seedV2Implementation(target);
    const builder = new StubRunner(() => 'must not run');
    const reviewer = new StubRunner(() => 'must not run');
    await targetRelayLoop({ ...input, maxIterations: 0 }, makeDeps(builder, reviewer));
    await writeFile(join(target, path), `mutated ${path}\n`, 'utf-8');
    const { baselinePath: _resumeBaseline, ...resumeInput } = input;
    const result = await targetRelayLoop({ ...resumeInput, maxIterations: 1 }, makeDeps(builder, reviewer));
    expect(result.phase).toBe('blocked');
    expect(builder.calls).toHaveLength(0);
    expect(reviewer.calls).toHaveLength(0);
  });

  it.each([
    ['missing implementation IDs', 'ARTIFACT_KIND: IMPLEMENTATION\n'],
    ['duplicate implementation ID field', 'ARTIFACT_KIND: IMPLEMENTATION\nIMPLEMENT_OBLIGATION_IDS: EX-REQ-001\nIMPLEMENT_OBLIGATION_IDS: EX-REQ-001-L01\n'],
    ['unknown implementation ID', 'ARTIFACT_KIND: IMPLEMENTATION\nIMPLEMENT_OBLIGATION_IDS: EX-REQ-001,EX-REQ-999\n'],
  ])('rejects %s before the v2 implementation builder', async (_label, tail) => {
    target = await mkdtemp('/private/tmp/ASSURANCE-2-v2-implementation-posture-');
    const input = await seedV2Implementation(target, tail);
    const builder = new StubRunner(() => 'must not run');
    const reviewer = new StubRunner(() => 'must not run');
    expect((await targetRelayLoop(input, makeDeps(builder, reviewer))).phase).toBe('blocked');
    expect(builder.calls).toHaveLength(0);
    expect(reviewer.calls).toHaveLength(0);
  });

  it.each(['missing', 'unreadable'] as const)('blocks a %s active selection packet instead of constructing an empty one', async (failure) => {
    target = await mkdtemp('/private/tmp/ASSURANCE-2-v2-selection-');
    const input = await seedV2Implementation(target);
    const path = join(target, '.agent-manager/slices/S2/selection.md');
    await rm(path, { force: true });
    if (failure === 'unreadable') await mkdir(path);
    const builder = new StubRunner(() => 'must not run');
    const reviewer = new StubRunner(() => 'must not run');
    expect((await targetRelayLoop(input, makeDeps(builder, reviewer))).phase).toBe('blocked');
    expect(builder.calls).toHaveLength(0);
    expect(reviewer.calls).toHaveLength(0);
  });

  it('resumes the admitted v1 document bridge using ADMISSION_ALLOCATION while output paths are absent', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-2-v1-document-resume-');
    const seeded = await seedV1DocumentBridge(target);
    const author = new AsyncStubRunner(async () => { const subject = await writeV2DocumentCandidate(target); return `authored ${subject.sha256}`; });
    let candidate: { path: string; sha256: string } | undefined;
    const capturingAuthor = new AsyncStubRunner(async () => { candidate = await writeV2DocumentCandidate(target); return 'authored'; });
    const reviewer = new StubRunner(() => json(v2ReviewResult(candidate as { path: string; sha256: string }, ['EX-REQ-001', 'EX-REQ-001-L01'])));
    expect((await targetRelayLoop({ ...seeded.input, maxIterations: 0 }, makeDeps(author, reviewer))).phase).toBe('blocked');
    expect(await exists(join(target, 'docs/slices/S2.md'))).toBe(false);
    const { baselinePath: _resumeBaseline, ...resumeInput } = seeded.input;
    const resumed = await targetRelayLoop({ ...resumeInput, maxIterations: 1 }, makeDeps(capturingAuthor, reviewer));
    expect(resumed.phase).toBe('done');
    expect(capturingAuthor.calls).toHaveLength(1);
    expect(reviewer.calls).toHaveLength(1);
  });

  it('reads the complete accepted closure once per live role snapshot attempt', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-2-live-read-once-');
    const input = await seedV2Implementation(target);
    const fixture = validV2Snapshots();
    const reads = new Map<string, number>();
    const filesystem = new FilesystemArtifactStore();
    class CountingStore extends FilesystemArtifactStore {
      override async readContainedFile(root: string, path: string) {
        const key = `${root}\0${path}`;
        reads.set(key, (reads.get(key) ?? 0) + 1);
        return filesystem.readContainedFile(root, path);
      }
    }
    const builder = new StubRunner(() => 'built');
    const reviewer = new StubRunner(() => 'STATUS: approved\nReviewed.');
    const deps = { ...makeDeps(builder, reviewer), artifactStore: new CountingStore() };

    expect((await targetRelayLoop(input, deps)).phase).toBe('done');
    expect(builder.calls).toHaveLength(1);
    expect(reviewer.calls).toHaveLength(1);

    // Target closure reads comprise two whole-run eligibility checks followed
    // by one capture for the builder and one fresh capture for the reviewer.
    // Within either role, its guard and delivered DTO reuse the same bytes.
    for (const item of fixture.snapshots) {
      expect(reads.get(`${target}\0${item.path}`)).toBe(4);
    }
    // Instruction identity is established initially, then freshly revalidated
    // once for each role. The active selection packet is role-specific only.
    for (const path of ['SYSTEM.txt', 'prompts/system/base.md', 'prompts/roles/supervisor-select.md', 'prompts/roles/builder-target.md', 'prompts/roles/reviewer-target.md', 'prompts/roles/decision-challenger.md', 'prompts/roles/decision-rebutter.md']) {
      expect(reads.get(`${target}\0${path}`)).toBe(3);
    }
    expect(reads.get(`${target}\0.agent-manager/slices/S2/selection.md`)).toBe(2);

    const builderDelivery = builder.calls[0]?.delivery;
    if (builderDelivery?.kind !== 'reviewed-input-snapshots') throw new Error('builder did not receive reviewed snapshots');
    expect(builderDelivery.common.map((item) => item.purpose)).toEqual([
      'shared-instruction',
      'common-role-instruction',
      'baseline-manifest',
      'requirement',
      'requirement',
      'source',
      'governance',
      'allocation',
      'review',
      'approval',
      'authority',
      'decision',
    ]);
  });

  it('reuses one admitted capture for each v2 decision role and refreshes it between roles', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-2-live-decision-read-once-');
    const input = await seedV2Implementation(target);
    const fixture = validV2Snapshots();
    const reads = new Map<string, number>();
    const filesystem = new FilesystemArtifactStore();
    class CountingStore extends FilesystemArtifactStore {
      override async readContainedFile(root: string, path: string) {
        const key = `${root}\0${path}`;
        reads.set(key, (reads.get(key) ?? 0) + 1);
        return filesystem.readContainedFile(root, path);
      }
    }
    const builder = new StubRunner((request) => request.role === 'decision-rebutter' ? REBUTTAL_OUTPUT : MARKER_ARTIFACT);
    const reviewer = new StubRunner((request) => request.role === 'decision-challenger' ? CHALLENGE_OUTPUT : 'STATUS: approved\nReviewed.');
    const deps = { ...makeDeps(builder, reviewer), artifactStore: new CountingStore() };

    expect((await targetRelayLoop(input, deps)).phase).toBe('awaiting-ratification');
    expect(builder.rolesCalled()).toEqual(['builder', 'decision-rebutter']);
    expect(reviewer.rolesCalled()).toEqual(['reviewer', 'decision-challenger']);
    for (const request of [...builder.calls, ...reviewer.calls]) {
      expect(request.delivery.kind).toBe('reviewed-input-snapshots');
    }
    // Two whole-run checks plus builder, reviewer, challenger and rebutter.
    // Six reads therefore mean one, not two, for each live role attempt.
    for (const item of fixture.snapshots) {
      expect(reads.get(`${target}\0${item.path}`)).toBe(6);
    }
    expect(reads.get(`${target}\0.agent-manager/slices/S2/selection.md`)).toBe(4);
  });

  it('delivers one admitted role snapshot, then blocks the next role when live baseline bytes drift', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-2-live-snapshot-drift-');
    const input = await seedV2Implementation(target);
    const filesystem = new FilesystemArtifactStore();
    let requirementReads = 0;
    class MutatingStore extends FilesystemArtifactStore {
      override async readContainedFile(root: string, path: string) {
        const captured = await filesystem.readContainedFile(root, path);
        if (root === target && path === 'docs/requirements/r1.md') {
          requirementReads += 1;
          if (requirementReads === 3) {
            // This mutation occurs after the builder's role-local snapshot was
            // captured. Its guard and DTO must retain that exact snapshot; the
            // reviewer's fresh attempt must see and reject the changed bytes.
            await writeFile(join(target, path), 'mutated after builder snapshot\n', 'utf-8');
          }
        }
        return captured;
      }
    }
    const builder = new StubRunner(() => 'built');
    const reviewer = new StubRunner(() => 'STATUS: approved\nMust not run.');
    const deps = { ...makeDeps(builder, reviewer), artifactStore: new MutatingStore() };

    const result = await targetRelayLoop(input, deps);
    expect(result.phase).toBe('blocked');
    expect(builder.calls).toHaveLength(1);
    expect(reviewer.calls).toHaveLength(0);
    expect(requirementReads).toBe(4);
    const delivered = builder.calls[0]?.delivery;
    if (delivered?.kind !== 'reviewed-input-snapshots') throw new Error('builder did not receive reviewed snapshots');
    const requirement = delivered.common.find((item) => item.origin === 'file' && item.path === 'docs/requirements/r1.md');
    expect(requirement && new TextDecoder().decode(requirement.bytes)).toContain('# EX-REQ-001');
    expect(await readFile(join(target, '.agent-manager/slices/S2/notes-for-human.md'), 'utf-8')).toContain('digest-mismatch');
  });

  it('captures each rooted prompt/selection input once while composing both reviewed dry-run deliveries', async () => {
    target = await mkdtemp('/private/tmp/ASSURANCE-2-read-once-');
    const input = await seedV2Implementation(target);
    const reads = new Map<string, number>();
    const filesystem = new FilesystemArtifactStore();
    class CountingStore extends FilesystemArtifactStore {
      override async readContainedFile(root: string, path: string) {
        const key = `${root}\0${path}`;
        reads.set(key, (reads.get(key) ?? 0) + 1);
        return filesystem.readContainedFile(root, path);
      }
    }
    const countingStore: ArtifactStorePort = new CountingStore();
    const packet = await readFile(join(target, '.agent-manager/slices/S2/selection.md'), 'utf-8');
    await prepareReviewedTargetDryRunDeliveries({ input, deps: { artifactStore: countingStore, computeDigest }, baselinePath: input.baselinePath as string, sliceId: 'S2', sliceDoc: 'docs/slices/S2.md', packetRaw: packet, documentCandidateAvailability: 'expected' });
    for (const path of ['SYSTEM.txt', 'prompts/system/base.md', 'prompts/roles/builder-target.md', 'prompts/roles/reviewer-target.md', '.agent-manager/slices/S2/selection.md']) {
      const root = path.startsWith('.agent-manager/') ? target : input.promptRoot;
      expect(reads.get(`${root}\0${path}`)).toBe(1);
    }
  });
});
