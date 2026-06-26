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
import { mkdtemp, mkdir, writeFile, readFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ClockPort } from '../ports/clock.js';
import type {
  ProviderRunnerPort,
  RunRequest,
  RunResult,
} from '../ports/provider-runner.js';
import { RunStatus } from '../../core/run-record.js';
import {
  targetRelayLoop,
  hasRatificationDecisions,
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
    };
  }
  rolesCalled(): string[] {
    return this.calls.map((c) => c.role);
  }
}

function computeDigest(content: string): string {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
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

    const deps: TargetRelayDeps = {
      clock: new FixedClock(),
      builder,
      supervisor,
      computeDigest,
    };

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

    const deps: TargetRelayDeps = {
      clock: new FixedClock(),
      builder,
      supervisor,
      computeDigest,
    };

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

  it('marker ONLY in SLICE_DOC: approval -> decision-review (trigger reads the spec; review-0 fix)', async () => {
    target = await mkdtemp(join(tmpdir(), 'am-dr-slicedoc-'));
    // The build summary carries NO marker; the decision matrix lives in SLICE_DOC.
    const sliceDir = await seedSlice(target, 'SPEC-2', NO_MARKER_ARTIFACT, MARKER_SPEC);

    const supervisor = new StubRunner((req) =>
      req.role === 'decision-challenger' ? CHALLENGE_OUTPUT : 'STATUS: approved\nGood.'
    );
    const builder = new StubRunner((req) =>
      req.role === 'decision-rebutter' ? REBUTTAL_OUTPUT : 'built'
    );

    const deps: TargetRelayDeps = {
      clock: new FixedClock(),
      builder,
      supervisor,
      computeDigest,
    };

    const result = await targetRelayLoop(makeInput(target), deps);

    // The phase fired even though build-0.md had NO marker — SLICE_DOC did.
    expect(result.phase).toBe('awaiting-ratification');
    expect(supervisor.rolesCalled()).toEqual(['reviewer', 'decision-challenger']);
    expect(builder.rolesCalled()).toEqual(['decision-rebutter']);

    expect(await exists(join(sliceDir, 'ratification-packet.md'))).toBe(true);
    const packet = await readFile(join(sliceDir, 'ratification-packet.md'), 'utf-8');
    // Recommendations were mined from the SLICE_DOC spec, not the build summary.
    expect(packet).toContain('serve last-good'); // D-B RECOMMENDED, from MARKER_SPEC
    expect(packet).toContain('### D-C — CONTESTED');
  });

  it('marker absent: approval -> done (no decision-review fired; additive parity)', async () => {
    target = await mkdtemp(join(tmpdir(), 'am-dr-absent-'));
    const sliceDir = await seedSlice(target, 'IMPL-1', NO_MARKER_ARTIFACT);

    const supervisor = new StubRunner(() => 'STATUS: approved\nGood.');
    const builder = new StubRunner(() => 'built');

    const deps: TargetRelayDeps = {
      clock: new FixedClock(),
      builder,
      supervisor,
      computeDigest,
    };

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
