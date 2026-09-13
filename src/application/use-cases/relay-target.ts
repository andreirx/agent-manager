/**
 * Target-owned relay use case.
 *
 * Drives a select -> build -> review loop on an EXTERNAL target repository.
 * The target repo is the system of record:
 *  - the builder edits the target's working tree (agentic file edits),
 *  - the reviewer inspects the builder's UNCOMMITTED `git diff` in that tree,
 *  - all workflow metadata is written under <target>/.agent-manager/.
 *
 * The target is supplied by the composition root; this module never names a
 * specific repository or provider.
 *
 * Distinct from the self-host relay (relay.ts):
 *  1. promptRoot (agent-manager, pinned prompts) and workingDir (target repo)
 *     are separate roots.
 *  2. The phase graph starts at `select-slice` (READ-ONLY: the supervisor picks
 *     an existing slice; Agent Manager, not the provider, writes selection.json).
 *  3. Work product is the target git working tree, not a `current.md` document.
 *
 * @module application/use-cases
 * @maturity PROTOTYPE
 */

import { join, sep } from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

import type { ArtifactStorePort, ClockPort, ProviderRunnerPort } from '../ports/index.js';
import type { RunRequest, RunResult } from '../ports/provider-runner.js';
import type { RunTextInput } from '../ports/provider-runner.js';
import type { PromptRef } from '../../core/run-record.js';
import type { RunInputProvenance } from '../../core/run-record.js';
import { RunStatus } from '../../core/run-record.js';
import {
  parseApprovalRecord,
  parseApprovalRecordV2,
  parseAssuranceJson,
  parseBaselineManifest,
  parsePersistedAssurance,
  persistedAssuranceV2,
  parseRequirementsReviewResult,
  parseRequirementsReviewRecord,
  parseImplementationAllocation,
  parseImplementationEvidenceResult,
  parseImplementationReviewResult,
  makeCandidateCheckpoint,
  validateBaselineCandidate,
  persistedAssurance,
  renderAssuranceError,
  validateBaselineAdmission,
  type AssuranceFileSnapshot,
  type AssuranceSnapshot,
  type BaselineAdmissionResult,
  type BaselineManifest,
  type BaselineManifestV2,
  type ContentRef,
  type PersistedAssuranceV2,
  type RequirementsReviewRecord,
  type ApprovalRecordV2,
  type AnyPersistedAssurance,
  type ImplementationAllocation,
  type CandidateTreeObservation,
  type CandidateCheckpoint,
  type CandidateTracking,
  type ImplementationEvidenceResult,
  type ImplementationReviewResult,
  extractProviderResultJson,
} from '../../core/assurance.js';
import { parseVerdict } from './relay-shared.js';

/**
 * Phase in the target-owned relay.
 *
 * `decision-review` and `awaiting-ratification` are the ADDITIVE phases for the
 * two-agent adversarial decision review (DECISION-REVIEW-MODE-1, PROTOTYPE).
 * They are reachable ONLY after `review-impl` approves a slice whose BUILD
 * surfaced operator-ratification decisions — the `DECISION_REQUIRED` marker in
 * the build artifact, or in a SLICE_DOC this slice's build wrote (see
 * shouldEnterDecisionReview). The existing select -> implement -> review-impl ->
 * done|blocked flow is unchanged for every slice that did NOT surface them.
 */
export type TargetPhase =
  | 'select-slice'
  | 'implement'
  | 'review-impl'
  | 'decision-review'
  | 'awaiting-ratification'
  | 'blocked'
  | 'done';

/** Actor identity (provider playing a role, or a human). */
export type TargetActor = 'claude' | 'codex' | 'copilot' | 'human';

/** Status persisted to <target>/.agent-manager/slices/<id>/status.json. */
export interface TargetRelayStatus {
  phase: TargetPhase;
  sliceId: string;
  sliceDoc: string | null;
  /** Build/review cycle index (0-based). Bounds maxIterations across resumes. */
  iteration: number;
  updatedAt: string;
  lastActor: TargetActor;
  builderProvider: TargetActor;
  supervisorProvider: TargetActor;
  /** Present only for explicit stage-1 baseline-admission operation. */
  assurance?: AnyPersistedAssurance;
  /** Present only while a stage-3 implementation candidate is being built/reviewed. */
  candidateTracking?: CandidateTracking;
}

/** Pointer to the active slice, so a later invocation resumes (not reselects). */
interface CurrentPointer {
  sliceId: string;
  sliceDoc: string | null;
  updatedAt: string;
  assurance?: AnyPersistedAssurance;
}

/** Authoritative per-run record (traceability: run -> log path). */
interface TargetRunRecord {
  runId: string;
  phase: TargetPhase;
  role: string;
  provider: TargetActor;
  model: string;
  effort: string;
  mode: NonNullable<RunRequest['mode']>;
  permission: NonNullable<RunRequest['permission']>;
  status: string;
  startedAt: string;
  completedAt: string;
  /** Target-relative when under the target tree, else absolute. */
  logPath: string;
  prompts: { path: string; digest: string }[];
  workingDir: string;
  error?: string;
  inputProvenance?: RunInputProvenance;
}

/** Input for a full target relay run. */
export interface TargetRelayInput {
  /** Absolute path to the target repository (working dir for both agents). */
  targetDir: string;
  /** Absolute path to the prompt-asset root (agent-manager). */
  promptRoot: string;
  /** Prompt files (promptRoot-relative) for the select-slice step. */
  selectPromptPaths: readonly string[];
  /** Prompt files (promptRoot-relative) for the implement step. */
  builderPromptPaths: readonly string[];
  /** Prompt files (promptRoot-relative) for the review step. */
  reviewerPromptPaths: readonly string[];
  /**
   * Prompt files (promptRoot-relative) for the decision-review CHALLENGE step
   * (supervisor, adversarial decision posture). Read only when the additive
   * `decision-review` phase fires; never read for non-DECISION_REQUIRED slices.
   */
  challengerPromptPaths: readonly string[];
  /**
   * Prompt files (promptRoot-relative) for the decision-review REBUTTAL step
   * (builder, rebuttal posture). Read only when `decision-review` fires.
   */
  rebutterPromptPaths: readonly string[];
  /** Which provider plays the builder. */
  builderProvider: TargetActor;
  /** Which provider plays the supervisor (planner + reviewer). */
  supervisorProvider: TargetActor;
  /** Model/effort are volatile provider details, chosen by the composition root
   *  and recorded for traceability; the core never decides them. */
  builderModel: string;
  builderEffort: string;
  supervisorModel: string;
  supervisorEffort: string;
  /** Max build/review CYCLES (each cycle = one implement + one review). */
  maxIterations?: number;
  /**
   * Sandbox posture for the REVIEW phase. Default 'read-only' (the reviewer must
   * not edit the work it judges). 'write' (codex `--sandbox workspace-write`)
   * lets the reviewer run tools that need to write state, e.g. `rmap`. Selection
   * stays read-only regardless.
   */
  reviewerPermission?: 'read-only' | 'write';
  /** Resume this specific slice id (skip selection). */
  sliceId?: string;
  /** Force a fresh selection even if an active slice exists. */
  reselect?: boolean;
  /** Early stop after selection (no building). Only 'select-slice' supported. */
  until?: TargetPhase;
  /** Target-relative requirements baseline manifest (explicit stage-1 opt-in). */
  baselinePath?: string;
  /** Selected shared instruction, identified relative to one accepted root. */
  sharedInstruction?: { root: 'target' | 'prompt'; path: string };
  /** Prompt instructions intentionally common to every target role. */
  commonPromptPaths?: readonly string[];
}

/** Dependencies for the target relay. */
export interface TargetRelayDeps {
  clock: ClockPort;
  builder: ProviderRunnerPort;
  supervisor: ProviderRunnerPort;
  computeDigest: (content: string) => string;
  /**
   * The target working tree's UNCOMMITTED changed-file set (target-relative
   * paths). Sole consumer is the decision-review trigger: it tells whether THIS
   * slice's build created/modified the SLICE_DOC (the builder leaves changes
   * uncommitted, so a written SLICE_DOC shows up here). Injected as a plain
   * function — exactly like `computeDigest` — NOT a port: the use case stays
   * git-agnostic and headlessly testable (composition root wires real
   * `git status --porcelain`; tests pass a deterministic stub). Best-effort: an
   * implementation that cannot determine the set returns [] (no false trigger).
   */
  changedPaths: (targetDir: string) => Promise<readonly string[]>;
  /** Existing filesystem boundary used for contained baseline snapshots. */
  artifactStore: ArtifactStorePort;
  /** Stage-3 Git/index/working-tree mechanism; required only for a v3 allocation. */
  observeCandidateTree?: (targetDir: string) => Promise<CandidateTreeObservation>;
  /** Complete reviewer-facing diff for a stage-3 candidate. */
  candidateDiff?: (targetDir: string, checkpoint: CandidateCheckpoint) => Promise<string>;
  /** Create-only durable publication mechanism; required only for stage 3. */
  createTrackedFileExclusively?: (targetDir: string, path: string, bytes: Uint8Array) => Promise<void>;
}

/** Result of a full target relay run. */
export interface TargetRelayResult {
  phase: TargetPhase;
  sliceId?: string;
  stopped: boolean;
  reason?: string;
}

/**
 * Load one complete closure through the filesystem port, then run the pure
 * stage-1 validator. Live dispatch and assured dry-run call this same operation.
 */
export async function admitBaseline(
  targetDir: string,
  manifestPath: string,
  artifactStore: ArtifactStorePort,
  options: { expectedManifest?: AnyPersistedAssurance['manifest']; allocationPath?: string } = {}
): Promise<BaselineAdmissionResult> {
  return (await loadBaselineClosure(targetDir, manifestPath, artifactStore, options)).result;
}

interface LoadedBaselineClosure {
  result: BaselineAdmissionResult;
  snapshots: readonly AssuranceSnapshot[];
  manifest?: BaselineManifest;
}

type WorkItemPosture =
  | { kind: 'legacy' }
  | { kind: 'implementation'; implementObligationIds?: readonly string[] }
  | { kind: 'requirements-document'; admissionAllocation: string; reviewBaseline: string; reviewObligationIds: readonly string[] };

interface Stage3Context {
  allocation: ImplementationAllocation;
  allocationRef: ContentRef;
}

type RoleOutputContract =
  | 'legacy-implementation-report'
  | 'legacy-status-verdict'
  | 'requirements-assurance/v2-requirements-review'
  | 'requirements-assurance/v3-implementation-evidence'
  | 'requirements-assurance/v3-implementation-review';

function packetFieldValues(raw: string, name: string): string[] {
  return raw.split('\n').flatMap((line) => {
    const match = line.match(new RegExp(`^${name}:\\s*(.*)$`));
    return match?.[1] !== undefined ? [match[1].replace(/^ +| +$/g, '')] : [];
  });
}

function parseObligationList(value: string, field: string): readonly string[] {
  const ids = value.split(',').map((item) => item.replace(/^ +| +$/g, ''));
  if (ids.length === 0 || ids.some((id) => !/^[A-Z][A-Z0-9-]*-REQ-[0-9]{3}(?:-L[0-9]{2})?$/.test(id))) throw new Error(`invalid-field: selection.md ${field}: expected a non-empty comma-separated H/L ID list`);
  if (new Set(ids).size !== ids.length) throw new Error(`duplicate-identity: selection.md ${field}: duplicate obligation ID`);
  return ids;
}

function parseTargetRelativePacketPath(value: string, field: string): string {
  const segments = value.split('/');
  if (value.length === 0 || value.startsWith('/') || value.includes('\\') || segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')) {
    throw new Error(`invalid-field: selection.md ${field}: expected a target-relative POSIX file path`);
  }
  return value;
}

function parseWorkItemPosture(raw: string, assurance: AnyPersistedAssurance | undefined): WorkItemPosture {
  // Stage-2 posture is an admitted-mode contract. A legacy packet may contain
  // similarly named prose/fields, but those bytes did not previously change
  // routing and must not opt themselves into document review.
  if (!assurance) return { kind: 'legacy' };
  const kinds = packetFieldValues(raw, 'ARTIFACT_KIND');
  if (kinds.length === 0) {
    if (assurance?.contract === 'requirements-assurance/v2-stage2') throw new Error('invalid-field: v2 selection.md requires exactly one ARTIFACT_KIND');
    return { kind: 'legacy' };
  }
  if (kinds.length !== 1) throw new Error('duplicate-field: selection.md ARTIFACT_KIND must occur exactly once');
  if (kinds[0] === 'REQUIREMENTS_DOCUMENT') {
    const admission = packetFieldValues(raw, 'ADMISSION_ALLOCATION');
    const baseline = packetFieldValues(raw, 'REVIEW_BASELINE');
    const obligations = packetFieldValues(raw, 'REVIEW_OBLIGATION_IDS');
    if (admission.length !== 1 || baseline.length !== 1 || obligations.length !== 1) throw new Error('invalid-field: requirements document requires exactly one ADMISSION_ALLOCATION, REVIEW_BASELINE and REVIEW_OBLIGATION_IDS');
    return {
      kind: 'requirements-document',
      admissionAllocation: parseTargetRelativePacketPath(admission[0] as string, 'ADMISSION_ALLOCATION'),
      reviewBaseline: parseTargetRelativePacketPath(baseline[0] as string, 'REVIEW_BASELINE'),
      reviewObligationIds: parseObligationList(obligations[0] as string, 'REVIEW_OBLIGATION_IDS'),
    };
  }
  if (kinds[0] === 'IMPLEMENTATION') {
    const obligations = packetFieldValues(raw, 'IMPLEMENT_OBLIGATION_IDS');
    if (assurance?.contract === 'requirements-assurance/v2-stage2') {
      if (obligations.length !== 1) throw new Error('invalid-field: v2 implementation requires exactly one IMPLEMENT_OBLIGATION_IDS');
      return { kind: 'implementation', implementObligationIds: parseObligationList(obligations[0] as string, 'IMPLEMENT_OBLIGATION_IDS') };
    }
    if (obligations.length > 1) throw new Error('duplicate-field: selection.md IMPLEMENT_OBLIGATION_IDS occurs more than once');
    return { kind: 'implementation', ...(obligations[0] ? { implementObligationIds: parseObligationList(obligations[0], 'IMPLEMENT_OBLIGATION_IDS') } : {}) };
  }
  throw new Error(`invalid-field: selection.md ARTIFACT_KIND: unsupported value '${kinds[0]}'`);
}

async function loadStage3Context(args: {
  workItemId: string;
  sliceDoc: string;
  assurance: AnyPersistedAssurance;
  posture: WorkItemPosture;
  manifest: BaselineManifest | undefined;
  admittedSnapshots: readonly AssuranceSnapshot[];
}): Promise<Stage3Context | undefined> {
  if (args.assurance.contract !== 'requirements-assurance/v2-stage2' || args.posture.kind !== 'implementation' || args.manifest?.formatVersion !== 2) return undefined;
  const admittedAllocations = args.manifest.dependencies.filter((dependency) => dependency.role === 'allocation' && dependency.path === args.sliceDoc);
  if (admittedAllocations.length !== 1) throw new Error(`subject-mismatch: stage-3 SLICE_DOC '${args.sliceDoc}' is not the unique admitted allocation dependency`);
  const snapshot = args.admittedSnapshots.find((item): item is AssuranceFileSnapshot => item.status === 'ok' && item.path === args.sliceDoc);
  if (!snapshot || snapshot.sha256 !== admittedAllocations[0]?.sha256) throw new Error(`digest-mismatch: admitted stage-3 allocation '${args.sliceDoc}' is unavailable or does not match its manifest identity`);
  const raw = decoded(snapshot);
  if (!raw.startsWith('<!-- requirements-assurance-implementation-v1\n')) return undefined;
  const parsed = parseImplementationAllocation({
    snapshot,
    expectedWorkItemId: args.workItemId,
    expectedBaselinePath: args.assurance.manifest.path,
    expectedPacketObligationIds: args.posture.implementObligationIds ?? [],
    reviewedObligationIds: args.manifest.reviewObligationIds,
  });
  if (!parsed.ok) throw new Error(`Invalid implementation allocation:\n${parsed.errors.map(renderAssuranceError).join('\n')}`);
  return { allocation: parsed.value, allocationRef: { path: snapshot.path, sha256: snapshot.sha256 } };
}

function sameCheckpoint(a: CandidateCheckpoint, b: CandidateCheckpoint): boolean {
  return a.sha256 === b.sha256 && a.baseRevision === b.baseRevision;
}

async function observeStage3Checkpoint(input: TargetRelayInput, deps: TargetRelayDeps, stage3: Stage3Context): Promise<CandidateCheckpoint> {
  if (!deps.observeCandidateTree) throw new Error('invalid-field: stage-3 candidate observation mechanism is unavailable');
  const parsed = makeCandidateCheckpoint({ observation: await deps.observeCandidateTree(input.targetDir), allocation: stage3.allocation, computeDigest: deps.computeDigest });
  if (!parsed.ok) throw new Error(`Invalid candidate checkpoint:\n${parsed.errors.map(renderAssuranceError).join('\n')}`);
  return parsed.value;
}

interface Stage3EvidenceState {
  checkpoint: CandidateCheckpoint;
  evidence: ImplementationEvidenceResult;
  verification: Record<string, unknown>;
  verificationBytes: Uint8Array;
  verificationSha256: string;
}

function makeVerificationDraft(args: {
  input: TargetRelayInput;
  status: TargetRelayStatus;
  stage3: Stage3Context;
  checkpoint: CandidateCheckpoint;
  evidence: ImplementationEvidenceResult;
  result: RunResult;
}): Record<string, unknown> {
  return {
    formatVersion: 3,
    kind: 'implementation-verification',
    verificationId: `verification-${args.status.sliceId}-${args.status.iteration}`,
    workItemId: args.stage3.allocation.workItemId,
    baseline: args.status.assurance?.manifest,
    allocation: args.stage3.allocationRef,
    candidateCheckpoint: args.checkpoint,
    performer: { role: 'builder', provider: args.input.builderProvider, model: args.input.builderModel, effort: args.input.builderEffort, runId: args.result.runId },
    checks: args.stage3.allocation.checks.map((plan) => {
      const result = args.evidence.checks.find((item) => item.checkId === plan.checkId);
      return { ...plan, candidateSha256: args.checkpoint.sha256, basis: 'provider-run-report', outcome: result?.outcome };
    }),
    changeJustifications: args.evidence.changeJustifications,
    completedAt: args.result.completedAt,
    limitations: args.evidence.limitations,
    report: args.evidence.report,
  };
}

async function readStage3Evidence(
  sliceDir: string,
  iteration: number,
  stage3: Stage3Context,
  deps: Pick<TargetRelayDeps, 'computeDigest'>
): Promise<Stage3EvidenceState> {
  const state = await readJsonState(join(sliceDir, `implementation-evidence-${iteration}.json`));
  if (state.status !== 'ok' || !state.value || typeof state.value !== 'object' || Array.isArray(state.value)) throw new Error('invalid-field: stage-3 evidence state is unavailable or malformed');
  const value = state.value as Record<string, unknown>;
  if (Object.keys(value).sort().join(',') !== 'checkpoint,evidence,verification,verificationSha256' || !value.checkpoint || !value.evidence || !value.verification || typeof value.verificationSha256 !== 'string') throw new Error('invalid-field: stage-3 evidence state is incomplete or has unknown fields');
  if (typeof value.checkpoint !== 'object' || value.checkpoint === null || Array.isArray(value.checkpoint)) throw new Error('invalid-field: stored candidate checkpoint is malformed');
  const storedCheckpoint = value.checkpoint as Record<string, unknown>;
  const checkpoint = makeCandidateCheckpoint({
    observation: { baseRevision: storedCheckpoint.baseRevision as string, entries: storedCheckpoint.entries as CandidateTreeObservation['entries'] },
    allocation: stage3.allocation,
    computeDigest: deps.computeDigest,
  });
  if (!checkpoint.ok || storedCheckpoint.contract !== checkpoint.value.contract || storedCheckpoint.sha256 !== checkpoint.value.sha256 || JSON.stringify(storedCheckpoint.entries) !== JSON.stringify(checkpoint.value.entries)) {
    throw new Error(`invalid-field: stored candidate checkpoint failed validation${checkpoint.ok ? '' : `\n${checkpoint.errors.map(renderAssuranceError).join('\n')}`}`);
  }
  const evidenceRaw = JSON.stringify(value.evidence);
  const evidence = parseImplementationEvidenceResult({
    snapshot: { status: 'ok', path: 'implementation-evidence-state', bytes: new TextEncoder().encode(evidenceRaw), sha256: deps.computeDigest(evidenceRaw) },
    allocation: stage3.allocation,
    allocationRef: stage3.allocationRef,
    checkpoint: checkpoint.value,
  });
  if (!evidence.ok) throw new Error(`invalid-field: stored implementation evidence failed validation\n${evidence.errors.map(renderAssuranceError).join('\n')}`);
  if (typeof value.verification !== 'object' || value.verification === null || Array.isArray(value.verification)) throw new Error('invalid-field: stored verification draft is malformed');
  const verification = value.verification as Record<string, unknown>;
  const verificationBytes = new TextEncoder().encode(`${JSON.stringify(value.verification, null, 2)}\n`);
  const verificationSha256 = deps.computeDigest(new TextDecoder().decode(verificationBytes));
  if (value.verificationSha256 !== verificationSha256 || verification.kind !== 'implementation-verification' || verification.formatVersion !== 3 || JSON.stringify(verification.candidateCheckpoint) !== JSON.stringify(checkpoint.value) || JSON.stringify(verification.allocation) !== JSON.stringify(stage3.allocationRef)) {
    throw new Error('subject-mismatch: stored verification draft does not match its digest, allocation, or candidate checkpoint');
  }
  return { checkpoint: checkpoint.value, evidence: evidence.value, verification, verificationBytes, verificationSha256 };
}

function renderDecisionMatrix(decisions: readonly { decisionId: string; question: string; options: readonly { option: string; reward: string; risk: string }[]; recommendation: string; blockingReason: string }[]): string {
  return decisions.map((decision) => [
    `- ID: ${decision.decisionId}`,
    `  QUESTION: ${decision.question}`,
    '  OPTIONS:',
    ...decision.options.map((option) => `  - ${option.option}: REWARD ${option.reward}; RISK ${option.risk}`),
    `  RECOMMENDED: ${decision.recommendation}`,
    `  BLOCKING_REASON: ${decision.blockingReason}`,
  ].join('\n')).join('\n');
}

async function loadBaselineClosure(
  targetDir: string,
  manifestPath: string,
  artifactStore: ArtifactStorePort,
  options: { expectedManifest?: AnyPersistedAssurance['manifest']; allocationPath?: string } = {},
  readTargetSnapshot?: (path: string) => Promise<AssuranceSnapshot>
): Promise<LoadedBaselineClosure> {
  const manifestSegments = manifestPath.split('/');
  if (
    manifestPath.length === 0 ||
    manifestPath.startsWith('/') ||
    manifestPath.includes('\\') ||
    manifestSegments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')
  ) {
    const code = manifestPath.includes('\\') || manifestPath.length === 0 ? 'invalid-field' : 'path-escape';
    return { result: { ok: false, errors: [{ code, recordPath: manifestPath, location: '/', detail: 'baseline path must be a target-relative POSIX file path' }] }, snapshots: [] };
  }
  const snapshots = new Map<string, AssuranceSnapshot>();
  const readOnce = async (path: string): Promise<AssuranceSnapshot> => {
    const existing = snapshots.get(path);
    if (existing) return existing;
    const snapshot = readTargetSnapshot
      ? await readTargetSnapshot(path)
      : await artifactStore.readContainedFile(targetDir, path);
    snapshots.set(path, snapshot);
    return snapshot;
  };

  const manifestSnapshot = await readOnce(manifestPath);
  let parsedManifestValue: BaselineManifest | undefined;
  if (manifestSnapshot.status === 'ok') {
    const manifest = parseBaselineManifest(manifestSnapshot as AssuranceFileSnapshot);
    if (manifest.ok) {
      parsedManifestValue = manifest.value;
      for (const ref of [...manifest.value.requirements, ...manifest.value.dependencies]) {
        await readOnce(ref.path);
      }
      const reviewPath = `docs/assurance/${manifest.value.baselineId}/requirements-review.json`;
      const approvalPath = `docs/assurance/${manifest.value.baselineId}/baseline-approval.json`;
      await readOnce(reviewPath);
      const approvalSnapshot = await readOnce(approvalPath);
      if (approvalSnapshot.status === 'ok') {
        const approval = manifest.value.formatVersion === 1
          ? parseApprovalRecord(approvalSnapshot as AssuranceFileSnapshot)
          : parseApprovalRecordV2(approvalSnapshot as AssuranceFileSnapshot);
        if (approval.ok) {
          await readOnce(approval.value.authorityBasis.path);
          for (const decision of approval.value.resolvedDecisions) {
            await readOnce(decision.record.path);
          }
        }
      }
    }
  }
  const result = validateBaselineAdmission({
    manifestPath,
    snapshots: [...snapshots.values()],
    ...(options.expectedManifest ? { expectedManifest: options.expectedManifest } : {}),
    ...(options.allocationPath !== undefined ? { allocationPath: options.allocationPath } : {}),
  });
  return { result, snapshots: [...snapshots.values()], ...(parsedManifestValue ? { manifest: parsedManifestValue } : {}) };
}

function renderAdmissionFailure(result: Extract<BaselineAdmissionResult, { ok: false }>): string {
  return result.errors.map(renderAssuranceError).join('\n');
}

function assuranceFromUnknown(
  container: unknown,
  recordPath: string
): { present: false } | { present: true; valid: true; value: AnyPersistedAssurance } | { present: true; valid: false; reason: string } {
  if (!container || typeof container !== 'object' || Array.isArray(container)) {
    return { present: false };
  }
  if (!Object.prototype.hasOwnProperty.call(container, 'assurance')) return { present: false };
  const parsed = parsePersistedAssurance((container as Record<string, unknown>).assurance, recordPath);
  return parsed.ok
    ? { present: true, valid: true, value: parsed.value }
    : { present: true, valid: false, reason: parsed.errors.map(renderAssuranceError).join('\n') };
}

async function assuredDispatchFailure(
  input: TargetRelayInput,
  deps: TargetRelayDeps,
  status: TargetRelayStatus,
  posture: WorkItemPosture,
  capture: ReviewedInputCapture | undefined
): Promise<string | undefined> {
  if (!status.assurance) return undefined;
  const loaded = await loadBaselineClosure(
    input.targetDir,
    status.assurance.manifest.path,
    deps.artifactStore,
    {
      expectedManifest: status.assurance.manifest,
      allocationPath: posture.kind === 'requirements-document' ? posture.admissionAllocation : status.sliceDoc ?? '',
    },
    capture ? (path) => capture.read('target', path) : undefined
  );
  return loaded.result.ok ? undefined : renderAdmissionFailure(loaded.result);
}

// ---------------------------------------------------------------------------
// Small pure / IO helpers
// ---------------------------------------------------------------------------

/** Read prompt files and pin their digests (reproducibility contract). */
async function loadPrompts(
  promptRoot: string,
  paths: readonly string[],
  computeDigest: (content: string) => string
): Promise<PromptRef[]> {
  const prompts: PromptRef[] = [];
  for (const path of paths) {
    const content = await readFile(join(promptRoot, path), 'utf-8');
    prompts.push({ path, digest: computeDigest(content) });
  }
  return prompts;
}

function decoded(snapshot: AssuranceFileSnapshot): string {
  return new TextDecoder('utf-8', { fatal: true }).decode(snapshot.bytes);
}

interface ReviewedInputCapture {
  read(root: 'target' | 'prompt', path: string): Promise<AssuranceSnapshot>;
}

/**
 * One dispatch-attempt cache for exact reviewed bytes. Target and prompt roots
 * are separate namespaces; every rooted path is read at most once, and all
 * policy checks plus provider DTO construction reuse that captured result.
 */
function captureReviewedInputs(
  input: TargetRelayInput,
  deps: Pick<TargetRelayDeps, 'artifactStore'>
): ReviewedInputCapture {
  const snapshots = new Map<string, Promise<AssuranceSnapshot>>();
  return {
    read(root, path) {
      const key = `${root}\0${path}`;
      const existing = snapshots.get(key);
      if (existing) return existing;
      const loaded = deps.artifactStore.readContainedFile(root === 'target' ? input.targetDir : input.promptRoot, path);
      snapshots.set(key, loaded);
      return loaded;
    },
  };
}

function fileRunInput(snapshot: AssuranceFileSnapshot, root: 'target' | 'prompt', purpose: RunTextInput['purpose']): RunTextInput {
  return { origin: 'file', root, purpose, path: snapshot.path, bytes: snapshot.bytes, sha256: snapshot.sha256 };
}

function generatedRunInput(label: string, purpose: RunTextInput['purpose'], content: string, computeDigest: (content: string) => string): RunTextInput {
  return { origin: 'generated', purpose, label, bytes: new TextEncoder().encode(content), sha256: computeDigest(content) };
}

async function readRequiredCapturedSnapshot(capture: ReviewedInputCapture, root: 'target' | 'prompt', path: string): Promise<AssuranceFileSnapshot> {
  const snapshot = await capture.read(root, path);
  if (snapshot.status === 'error') throw new Error(`${snapshot.code}: ${path}: ${snapshot.detail}`);
  // Enforce the reviewed-delivery UTF-8 rule before any provider call.
  decoded(snapshot);
  return snapshot;
}

async function readRequiredSnapshot(root: string, path: string, store: ArtifactStorePort): Promise<AssuranceFileSnapshot> {
  const snapshot = await store.readContainedFile(root, path);
  if (snapshot.status === 'error') throw new Error(`${snapshot.code}: ${path}: ${snapshot.detail}`);
  decoded(snapshot);
  return snapshot;
}

async function resolveInstructionSet(
  input: TargetRelayInput,
  deps: Pick<TargetRelayDeps, 'artifactStore'>,
  capture = captureReviewedInputs(input, deps)
): Promise<PersistedAssuranceV2['instructions']> {
  if (!input.sharedInstruction) throw new Error('missing: reviewed-inputs requires a contained shared instruction');
  const readRef = async (root: 'target' | 'prompt', path: string) => {
    const snapshot = await readRequiredCapturedSnapshot(capture, root, path);
    return { root, path, sha256: snapshot.sha256 } as const;
  };
  const common = input.commonPromptPaths ?? [];
  const roleOnly = (paths: readonly string[]) => paths.filter((path) => !common.includes(path));
  return {
    shared: await readRef(input.sharedInstruction.root, input.sharedInstruction.path),
    commonRole: await Promise.all(common.map((path) => readRef('prompt', path))),
    selectorRole: await Promise.all(roleOnly(input.selectPromptPaths).map((path) => readRef('prompt', path))),
    builderRole: await Promise.all(roleOnly(input.builderPromptPaths).map((path) => readRef('prompt', path))),
    reviewerRole: await Promise.all(roleOnly(input.reviewerPromptPaths).map((path) => readRef('prompt', path))),
    challengerRole: await Promise.all(roleOnly(input.challengerPromptPaths).map((path) => readRef('prompt', path))),
    rebutterRole: await Promise.all(roleOnly(input.rebutterPromptPaths).map((path) => readRef('prompt', path))),
  };
}

function sameInstructions(a: PersistedAssuranceV2['instructions'], b: PersistedAssuranceV2['instructions']): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function acceptedCommonInputs(
  input: TargetRelayInput,
  deps: Pick<TargetRelayDeps, 'artifactStore'>,
  assurance: AnyPersistedAssurance,
  allocationPath?: string,
  capture = captureReviewedInputs(input, deps)
): Promise<readonly RunTextInput[]> {
  const loaded = await loadBaselineClosure(input.targetDir, assurance.manifest.path, deps.artifactStore, {
    expectedManifest: assurance.manifest,
    ...(allocationPath !== undefined ? { allocationPath } : {}),
  }, (path) => capture.read('target', path));
  if (!loaded.result.ok || !loaded.manifest) throw new Error(loaded.result.ok ? 'invalid-field: admitted manifest was not decoded' : renderAdmissionFailure(loaded.result));
  if (assurance.contract === 'requirements-assurance/v2-stage2') {
    const current = await resolveInstructionSet(input, deps, capture);
    if (!sameInstructions(current, assurance.instructions)) throw new Error('digest-mismatch: persisted reviewed-input instruction identities changed');
  }
  if (!input.sharedInstruction) throw new Error('missing: reviewed input delivery requires a shared instruction');
  const shared = await readRequiredCapturedSnapshot(capture, input.sharedInstruction.root, input.sharedInstruction.path);
  const commonPrompts = await Promise.all((input.commonPromptPaths ?? []).map((path) => readRequiredCapturedSnapshot(capture, 'prompt', path)));
  const manifest = loaded.manifest;
  const requirementPaths = new Set(manifest.requirements.map((ref) => ref.path));
  const roles = new Map(manifest.dependencies.map((ref) => [ref.path, ref.role]));
  const reviewPath = `docs/assurance/${manifest.baselineId}/requirements-review.json`;
  const approvalPath = `docs/assurance/${manifest.baselineId}/baseline-approval.json`;
  const approvalSnapshot = loaded.snapshots.find((snapshot) => snapshot.path === approvalPath && snapshot.status === 'ok') as AssuranceFileSnapshot | undefined;
  const authorityPaths = new Set<string>();
  const decisionPaths = new Set<string>();
  if (approvalSnapshot) {
    const approval = manifest.formatVersion === 1 ? parseApprovalRecord(approvalSnapshot) : parseApprovalRecordV2(approvalSnapshot);
    if (approval.ok) {
      authorityPaths.add(approval.value.authorityBasis.path);
      for (const item of approval.value.resolvedDecisions) decisionPaths.add(item.record.path);
    }
  }
  const ordered: RunTextInput[] = [fileRunInput(shared, input.sharedInstruction.root, 'shared-instruction')];
  ordered.push(...commonPrompts.map((snapshot) => fileRunInput(snapshot, 'prompt', 'common-role-instruction')));
  for (const snapshot of loaded.snapshots) {
    if (snapshot.status === 'error') continue;
    let purpose: RunTextInput['purpose'];
    if (snapshot.path === assurance.manifest.path) purpose = 'baseline-manifest';
    else if (requirementPaths.has(snapshot.path)) purpose = 'requirement';
    else if (roles.has(snapshot.path)) purpose = roles.get(snapshot.path) as 'source' | 'governance' | 'design' | 'allocation';
    else if (snapshot.path === reviewPath) purpose = 'review';
    else if (snapshot.path === approvalPath) purpose = 'approval';
    else if (decisionPaths.has(snapshot.path)) purpose = 'decision';
    else if (authorityPaths.has(snapshot.path)) purpose = 'authority';
    else continue;
    ordered.push(fileRunInput(snapshot, 'target', purpose));
  }
  return ordered;
}

async function roleSpecificInputs(args: {
  input: TargetRelayInput;
  deps: Pick<TargetRelayDeps, 'artifactStore' | 'computeDigest'>;
  sliceDir: string;
  packetRaw: string;
  promptPaths: readonly string[];
  directiveLabel: string;
  directive: string;
  extra?: readonly RunTextInput[];
  capture?: ReviewedInputCapture;
}): Promise<readonly RunTextInput[]> {
  const capture = args.capture ?? captureReviewedInputs(args.input, args.deps);
  const common = args.input.commonPromptPaths ?? [];
  const rolePrompts = await Promise.all(args.promptPaths.filter((path) => !common.includes(path)).map((path) => readRequiredCapturedSnapshot(capture, 'prompt', path)));
  const selectionPath = `.agent-manager/slices/${args.sliceDir.split(sep).pop() as string}/selection.md`;
  const selection = await readRequiredCapturedSnapshot(capture, 'target', selectionPath);
  if (decoded(selection) !== args.packetRaw) throw new Error(`digest-mismatch: ${selectionPath}: active selection packet changed during dispatch`);
  return [
    ...rolePrompts.map((snapshot) => fileRunInput(snapshot, 'prompt', 'role-instruction')),
    fileRunInput(selection, 'target', 'selection-packet'),
    ...(args.extra ?? []),
    generatedRunInput(args.directiveLabel, 'task-directive', args.directive, args.deps.computeDigest),
  ];
}

async function loadCandidateClosure(args: {
  input: TargetRelayInput;
  deps: Pick<TargetRelayDeps, 'artifactStore'>;
  posture: Extract<WorkItemPosture, { kind: 'requirements-document' }>;
  sliceDoc: string;
  capture?: ReviewedInputCapture;
}): Promise<{ manifest: BaselineManifestV2; manifestRef: ContentRef; inputs: readonly RunTextInput[] }> {
  const snapshots = new Map<string, AssuranceSnapshot>();
  const readOnce = async (path: string) => {
    const existing = snapshots.get(path);
    if (existing) return existing;
    const value = args.capture
      ? await args.capture.read('target', path)
      : await args.deps.artifactStore.readContainedFile(args.input.targetDir, path);
    snapshots.set(path, value);
    return value;
  };
  const first = await readOnce(args.posture.reviewBaseline);
  if (first.status === 'ok') {
    const parsed = parseBaselineManifest(first);
    if (parsed.ok) for (const ref of [...parsed.value.requirements, ...parsed.value.dependencies]) await readOnce(ref.path);
  }
  const result = validateBaselineCandidate({ manifestPath: args.posture.reviewBaseline, snapshots: [...snapshots.values()], allocationPath: args.sliceDoc, submittedObligationIds: args.posture.reviewObligationIds });
  if (!result.ok) throw new Error(result.errors.map(renderAssuranceError).join('\n'));
  const inputs = [...snapshots.values()].flatMap((snapshot) => snapshot.status === 'ok' ? [fileRunInput(snapshot, 'target', 'review-subject')] : []);
  return { manifest: result.candidate.manifest, manifestRef: result.candidate.manifestRef, inputs };
}

/**
 * Prepare the no-spawn reviewed deliveries an explicit assured slice can reach.
 * A pre-author document item has real builder delivery but only a pending
 * reviewer subject; ordinary v1 work returns undefined. This reuses the live
 * snapshot/closure rules, and the CLI passes each available value through the
 * selected adapter's public `prepareRunDelivery` seam.
 */
export async function prepareReviewedTargetDryRunDeliveries(args: {
  input: TargetRelayInput;
  deps: Pick<TargetRelayDeps, 'artifactStore' | 'computeDigest'>;
  baselinePath: string;
  sliceId: string;
  sliceDoc: string;
  packetRaw: string;
  documentCandidateAvailability: 'not-yet-authored' | 'expected';
}): Promise<{
  manifest: ContentRef;
  builder: Extract<RunRequest['delivery'], { kind: 'reviewed-input-snapshots' }>;
  reviewer:
    | {
        kind: 'available';
        delivery: Extract<RunRequest['delivery'], { kind: 'reviewed-input-snapshots' }>;
      }
    | {
        kind: 'pending-authored-review-subject';
        reviewBaseline: string;
        sliceDoc: string;
      };
} | undefined> {
  const admitted = await admitBaseline(args.input.targetDir, args.baselinePath, args.deps.artifactStore);
  if (!admitted.ok) throw new Error(renderAdmissionFailure(admitted));
  const capture = captureReviewedInputs(args.input, args.deps);
  const assurance: AnyPersistedAssurance = admitted.admission.enforcement === 'reviewed-inputs'
    ? persistedAssuranceV2(admitted.admission, await resolveInstructionSet(args.input, args.deps, capture))
    : persistedAssurance(admitted.admission);
  const posture = parseWorkItemPosture(args.packetRaw, assurance);
  if (assurance.contract !== 'requirements-assurance/v2-stage2' && posture.kind !== 'requirements-document') {
    return undefined;
  }
  const allocationPath = posture.kind === 'requirements-document' ? posture.admissionAllocation : args.sliceDoc;
  const loadedAllocation = await loadBaselineClosure(
    args.input.targetDir,
    assurance.manifest.path,
    args.deps.artifactStore,
    { expectedManifest: assurance.manifest, allocationPath },
    (path) => capture.read('target', path)
  );
  if (!loadedAllocation.result.ok) throw new Error(renderAdmissionFailure(loadedAllocation.result));
  const stage3 = await loadStage3Context({
    workItemId: args.sliceId,
    sliceDoc: args.sliceDoc,
    assurance,
    posture,
    manifest: loadedAllocation.manifest,
    admittedSnapshots: loadedAllocation.snapshots,
  });
  const common = await acceptedCommonInputs(args.input, args.deps, assurance, allocationPath, capture);
  const sliceDir = join(args.input.targetDir, '.agent-manager', 'slices', args.sliceId);
  const builderDirective = buildBuilderContext(
    args.input.targetDir,
    args.packetRaw,
    0,
    posture.kind === 'requirements-document'
      ? 'requirements-assurance/v2-requirements-review'
      : stage3
        ? 'requirements-assurance/v3-implementation-evidence'
        : 'legacy-implementation-report'
  );
  const builder = {
    kind: 'reviewed-input-snapshots' as const,
    contract: 'requirements-assurance/v2-input-delivery' as const,
    common,
    roleSpecific: await roleSpecificInputs({ input: args.input, deps: args.deps, sliceDir, packetRaw: args.packetRaw, promptPaths: args.input.builderPromptPaths, directiveLabel: posture.kind === 'requirements-document' ? 'requirements-author-task' : 'implementation-builder-task', directive: builderDirective, capture }),
  };
  const reviewerExtra: RunTextInput[] = [];
  if (posture.kind === 'requirements-document') {
    const candidateManifest = await capture.read('target', posture.reviewBaseline);
    if (candidateManifest.status === 'error') {
      if (candidateManifest.code !== 'missing' || args.documentCandidateAvailability === 'expected') {
        throw new Error(`${candidateManifest.code}: ${posture.reviewBaseline}: ${candidateManifest.detail}`);
      }
      return {
        manifest: assurance.manifest,
        builder,
        reviewer: {
          kind: 'pending-authored-review-subject',
          reviewBaseline: posture.reviewBaseline,
          sliceDoc: args.sliceDoc,
        },
      };
    }
    const candidate = await loadCandidateClosure({ input: args.input, deps: args.deps, posture, sliceDoc: args.sliceDoc, capture });
    reviewerExtra.push(...candidate.inputs);
  }
  const reviewerDirective = buildReviewerContext(
    args.input.targetDir,
    args.packetRaw,
    undefined,
    posture.kind === 'requirements-document'
      ? 'requirements-assurance/v2-requirements-review'
      : stage3
        ? 'requirements-assurance/v3-implementation-review'
        : 'legacy-status-verdict'
  );
  const reviewer = {
    kind: 'reviewed-input-snapshots' as const,
    contract: 'requirements-assurance/v2-input-delivery' as const,
    common,
    roleSpecific: await roleSpecificInputs({ input: args.input, deps: args.deps, sliceDir, packetRaw: args.packetRaw, promptPaths: args.input.reviewerPromptPaths, directiveLabel: posture.kind === 'requirements-document' ? 'requirements-reviewer-task' : 'implementation-reviewer-task', directive: reviewerDirective, extra: reviewerExtra, capture }),
  };
  return { manifest: assurance.manifest, builder, reviewer: { kind: 'available', delivery: reviewer } };
}

export interface RecordReviewedBaselineApprovalInput {
  targetDir: string;
  manifestPath: string;
  approvalId: string;
  projectId: string;
  approvedBy: { actorType: 'human' | 'operator'; actorId: string };
  recordedBy: { actorType: 'human' | 'operator'; actorId: string };
  authorityBasisPath: string;
  decisionRecords: readonly { id: string; path: string }[];
  rationale: string;
}

/** Validate and create only the fixed v2 approval record; never dispatches a role. */
export async function recordReviewedBaselineApproval(
  input: RecordReviewedBaselineApprovalInput,
  deps: { clock: ClockPort; artifactStore: ArtifactStorePort; computeDigest: (content: string) => string }
): Promise<{ outputPath: string; approval: ApprovalRecordV2 }> {
  const manifestSnapshot = await readRequiredSnapshot(input.targetDir, input.manifestPath, deps.artifactStore);
  const parsedManifest = parseBaselineManifest(manifestSnapshot);
  if (!parsedManifest.ok) throw new Error(parsedManifest.errors.map(renderAssuranceError).join('\n'));
  if (parsedManifest.value.formatVersion !== 2) throw new Error('unsupported-version: reviewed-baseline approval requires a v2 manifest');
  const manifest = parsedManifest.value;
  if (manifest.target.projectId !== input.projectId) throw new Error(`subject-mismatch: project '${input.projectId}' does not equal manifest project '${manifest.target.projectId}'`);
  const snapshots: AssuranceSnapshot[] = [manifestSnapshot];
  for (const ref of [...manifest.requirements, ...manifest.dependencies]) snapshots.push(await deps.artifactStore.readContainedFile(input.targetDir, ref.path));
  const allocation = manifest.dependencies.find((item) => item.role === 'allocation');
  if (!allocation) throw new Error('invalid-field: v2 candidate contains no allocation dependency');
  const candidate = validateBaselineCandidate({ manifestPath: input.manifestPath, snapshots, allocationPath: allocation.path, submittedObligationIds: manifest.reviewObligationIds });
  if (!candidate.ok) throw new Error(candidate.errors.map(renderAssuranceError).join('\n'));
  const reviewPath = `docs/assurance/${manifest.baselineId}/requirements-review.json`;
  const reviewSnapshot = await readRequiredSnapshot(input.targetDir, reviewPath, deps.artifactStore);
  const review = parseRequirementsReviewRecord(reviewSnapshot, manifest.reviewObligationIds);
  if (!review.ok) throw new Error(review.errors.map(renderAssuranceError).join('\n'));
  if (review.value.subject.path !== input.manifestPath || review.value.subject.sha256 !== manifestSnapshot.sha256) throw new Error('subject-mismatch: durable review does not bind the selected manifest');
  const authority = await readRequiredSnapshot(input.targetDir, input.authorityBasisPath, deps.artifactStore);
  const duplicateDecisionIds = input.decisionRecords.map((item) => item.id);
  if (new Set(duplicateDecisionIds).size !== duplicateDecisionIds.length) throw new Error('duplicate-identity: duplicate --decision-record ID');
  const required = new Set(manifest.requiredDecisionIds);
  const provided = new Set(duplicateDecisionIds);
  for (const id of required) if (!provided.has(id)) throw new Error(`subject-mismatch: required decision '${id}' was not provided`);
  for (const id of provided) if (!required.has(id)) throw new Error(`subject-mismatch: decision '${id}' is not required by the manifest`);
  const resolvedDecisions: ApprovalRecordV2['resolvedDecisions'] = [];
  for (const decision of input.decisionRecords) {
    const snapshot = await readRequiredSnapshot(input.targetDir, decision.path, deps.artifactStore);
    resolvedDecisions.push({ id: decision.id, record: { path: decision.path, sha256: snapshot.sha256 } });
  }
  const approval: ApprovalRecordV2 = {
    formatVersion: 2,
    kind: 'requirements-baseline-approval',
    approvalId: input.approvalId,
    target: manifest.target,
    subject: { path: input.manifestPath, sha256: manifestSnapshot.sha256 },
    review: { path: reviewPath, sha256: reviewSnapshot.sha256 },
    decision: 'approved',
    approvedBy: input.approvedBy,
    recordedBy: input.recordedBy,
    authorityBasis: { path: input.authorityBasisPath, sha256: authority.sha256 },
    resolvedDecisions,
    decidedAt: deps.clock.now(),
    rationale: input.rationale,
  };
  const raw = `${JSON.stringify(approval, null, 2)}\n`;
  const structural = parseApprovalRecordV2({ status: 'ok', path: 'approval-candidate', bytes: new TextEncoder().encode(raw), sha256: deps.computeDigest(raw) });
  if (!structural.ok) throw new Error(structural.errors.map(renderAssuranceError).join('\n'));
  const outputPath = `docs/assurance/${manifest.baselineId}/baseline-approval.json`;
  await mkdir(join(input.targetDir, 'docs', 'assurance', manifest.baselineId), { recursive: true });
  try { await writeFile(join(input.targetDir, outputPath), raw, { encoding: 'utf-8', flag: 'wx' }); }
  catch (cause) { throw new Error(`approval-already-exists: ${outputPath}: ${cause instanceof Error ? cause.message : String(cause)}`); }
  return { outputPath, approval };
}

function parseSelectionStatus(raw: string): 'selected' | 'blocked' | 'unknown' {
  for (const line of raw.split('\n').slice(0, 20)) {
    const t = line.trim().toUpperCase();
    if (t.startsWith('STATUS:')) {
      const v = t.replace('STATUS:', '').trim();
      if (v.startsWith('SELECTED')) return 'selected';
      if (v.startsWith('BLOCKED')) return 'blocked';
    }
  }
  return 'unknown';
}

function extractField(raw: string, field: string): string | undefined {
  const m = raw.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
  if (!m || m[1] === undefined) return undefined;
  return m[1].trim();
}

function sanitizeId(id: string): string {
  return id.replace(/[^A-Za-z0-9._-]/g, '-').slice(0, 80) || 'slice';
}

/** Make a log path target-relative when it lives under the target tree. */
function toTargetRelative(p: string, targetDir: string): string {
  const prefix = targetDir.endsWith(sep) ? targetDir : targetDir + sep;
  return p.startsWith(prefix) ? p.slice(prefix.length) : p;
}

function cwdHeader(targetDir: string): string {
  return [
    '# Target repository (your current working directory)',
    '',
    targetDir,
    '',
    'Interpret all repo-relative paths against the current working directory.',
  ].join('\n');
}

function buildBuilderContext(
  targetDir: string,
  packetRaw: string,
  iteration: number,
  outputContract: RoleOutputContract
): string {
  const parts = [
    cwdHeader(targetDir),
    '',
    '# Slice selection packet (authoritative task definition)',
    '',
    packetRaw,
    '',
    '# Your task',
    '',
    'Implement the selected slice in the target repository working tree. Edit real files.',
    'Obey FILES_IN_SCOPE / FILES_OUT_OF_SCOPE. Run the VALIDATION_COMMANDS and report results with evidence labels (EXECUTED / OBSERVED / INFERRED / NOT RUN).',
    'Do NOT commit. Leave all changes uncommitted in the working tree for review.',
    'End with a concise summary of what changed and the validation outcome.',
  ];
  if (iteration > 0) {
    parts.push(
      '',
      `This is revision iteration ${iteration}. Address the prior reviewer feedback recorded under .agent-manager/slices/<id>/review-*.json before changing anything else.`
    );
  }
  parts.push(
    '',
    '# Runtime-selected output contract',
    '',
    'Agent Manager selected this final value after admission. Do not infer or override it from selection-packet or SLICE_DOC content.',
    `ROLE_OUTPUT_CONTRACT: ${outputContract}`
  );
  return parts.join('\n');
}

function buildReviewerContext(
  targetDir: string,
  packetRaw: string,
  buildReport: string | undefined,
  outputContract: RoleOutputContract
): string {
  const sections = [
    cwdHeader(targetDir),
    '',
    '# Slice selection packet (authoritative acceptance criteria)',
    '',
    packetRaw,
  ];
  // Evidence transport: `.agent-manager/` is gitignored in targets, so the
  // builder's run report (build-<n>.md) NEVER appears in `git diff`/`git
  // status`. Without inlining it here, a read-only reviewer sandbox (no
  // compilers, no network, no mktemp) can neither run the heavy gates nor see
  // the builder's executed transcripts — slices grind through revise cycles
  // on evidence the builder already produced (observed twice, 2026-07-03).
  if (buildReport && buildReport.trim().length > 0) {
    sections.push(
      '',
      "# Builder's run report for THIS iteration (build-<n>.md)",
      '',
      'This file is a gitignored operational artifact — it does NOT appear in',
      '`git diff`/`git status`. Transcripts labeled EXECUTED are the',
      "builder's executed evidence for gates your sandbox cannot run",
      '(compilers, network, temp dirs). Verify every CODE claim against the',
      'diff yourself; weigh EXECUTED transcripts as evidence, and say so when',
      'you rely on one (label it BUILDER-EXECUTED).',
      '',
      buildReport
    );
  }
  sections.push(
    '',
    '# Your task',
    '',
    "Review the builder's UNCOMMITTED changes in the target working tree. Inspect them yourself with `git diff` and `git status`.",
    'Judge strictly against DEFINITION_OF_DONE and the declared scope. Label every claim OBSERVED or INFERRED.',
    'Follow the runtime-selected output contract below; it overrides generic output wording above when it requires structured JSON.',
    '',
    '# Runtime-selected output contract',
    '',
    'Agent Manager selected this final value after admission. Do not infer or override it from selection-packet or SLICE_DOC content.',
    `ROLE_OUTPUT_CONTRACT: ${outputContract}`
  );
  return sections.join('\n');
}

/** Idempotently provision the .agent-manager scaffold in ANY target repo. */
async function ensureScaffold(amDir: string): Promise<void> {
  await mkdir(amDir, { recursive: true });
  await writeIfAbsent(
    join(amDir, '.gitignore'),
    [
      '# Agent Manager (target-owned relay) operational output.',
      '# The complete directory is local-only process state. Durable target',
      '# requirements, decisions, review, and acceptance records live outside it.',
      '',
      '*',
      '',
    ].join('\n')
  );
  await writeIfAbsent(
    join(amDir, 'README.md'),
    [
      '# .agent-manager/',
      '',
      'Workflow state written by Agent Manager (target-owned relay) running',
      'against this repository. Agent Manager itself lives elsewhere; this',
      'directory holds local-only process state for work performed here.',
      '',
      'This repository is the system of record. The builder edits files (left',
      'uncommitted); the reviewer inspects the resulting `git diff`.',
      '',
      'Phase graph: select-slice -> (implement -> review-impl)* -> done | blocked.',
      'When an approved slice surfaces an operator-ratification DECISION_REQUIRED',
      'matrix in its OWN build output (build-<n>.md, or a SLICE_DOC this build',
      'created/modified — not a pre-ratified spec it only references), an additive',
      'decision-review round runs (supervisor challenge -> builder rebuttal), writes',
      'ratification-packet.md, and HALTS at awaiting-ratification for the human',
      '(it never auto-proceeds).',
      'Verdict contract: reviewer first line `STATUS: approved|revise|escalate`.',
      '',
      'Durable requirements, decisions, reviews, and acceptance evidence belong',
      'in the target repository\'s tracked paths outside `.agent-manager/`.',
      '',
    ].join('\n')
  );
}

async function writeIfAbsent(path: string, content: string): Promise<void> {
  try {
    await readFile(path, 'utf-8');
  } catch {
    await writeFile(path, content, 'utf-8');
  }
}

type JsonFileState =
  | { status: 'missing' }
  | { status: 'malformed'; detail: string }
  | { status: 'ok'; value: unknown };

async function readJsonState(path: string): Promise<JsonFileState> {
  let raw: string;
  try {
    raw = await readFile(path, 'utf-8');
  } catch (cause) {
    const code =
      typeof cause === 'object' && cause !== null && 'code' in cause
        ? String((cause as { code: unknown }).code)
        : '';
    if (code === 'ENOENT' || code === 'ENOTDIR') return { status: 'missing' };
    return { status: 'malformed', detail: cause instanceof Error ? cause.message : String(cause) };
  }
  const parsed = parseAssuranceJson(raw, path);
  return parsed.ok
    ? { status: 'ok', value: parsed.value }
    : { status: 'malformed', detail: parsed.errors.map(renderAssuranceError).join('\n') };
}

function sameAssurance(a: AnyPersistedAssurance, b: AnyPersistedAssurance): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function sameInputProvenanceContext(a: RunInputProvenance, b: RunInputProvenance): boolean {
  return a.baseline.path === b.baseline.path && a.baseline.sha256 === b.baseline.sha256 && JSON.stringify(a.commonInputs) === JSON.stringify(b.commonInputs);
}

const TARGET_PHASE_VALUES: Readonly<Record<TargetPhase, true>> = {
  'select-slice': true,
  implement: true,
  'review-impl': true,
  'decision-review': true,
  'awaiting-ratification': true,
  blocked: true,
  done: true,
};

const TARGET_ACTOR_VALUES: Readonly<Record<TargetActor, true>> = {
  claude: true,
  codex: true,
  copilot: true,
  human: true,
};

function isTargetRelayStatusShape(value: unknown): value is TargetRelayStatus {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const tracking = record.candidateTracking;
  const trackingOk = tracking === undefined || (
    tracking !== null && typeof tracking === 'object' && !Array.isArray(tracking) &&
    (tracking as Record<string, unknown>).contract === 'requirements-assurance/v3-candidate-tracking' &&
    ((tracking as Record<string, unknown>).state === 'building' || (tracking as Record<string, unknown>).state === 'evidence-bound') &&
    typeof (tracking as Record<string, unknown>).baseRevision === 'string' &&
    /^[0-9a-f]{40}$/.test((tracking as Record<string, unknown>).baseRevision as string) &&
    ((tracking as Record<string, unknown>).state === 'building'
      ? Object.keys(tracking as Record<string, unknown>).sort().join(',') === 'baseRevision,contract,state'
      : typeof (tracking as Record<string, unknown>).candidateSha256 === 'string' && /^sha256:[0-9a-f]{64}$/.test((tracking as Record<string, unknown>).candidateSha256 as string) && Object.keys(tracking as Record<string, unknown>).sort().join(',') === 'baseRevision,candidateSha256,contract,state')
  );
  return (
    typeof record.phase === 'string' &&
    Object.prototype.hasOwnProperty.call(TARGET_PHASE_VALUES, record.phase) &&
    typeof record.sliceId === 'string' &&
    (typeof record.sliceDoc === 'string' || record.sliceDoc === null) &&
    typeof record.iteration === 'number' &&
    Number.isInteger(record.iteration) &&
    record.iteration >= 0 &&
    typeof record.updatedAt === 'string' &&
    typeof record.lastActor === 'string' &&
    Object.prototype.hasOwnProperty.call(TARGET_ACTOR_VALUES, record.lastActor) &&
    typeof record.builderProvider === 'string' &&
    Object.prototype.hasOwnProperty.call(TARGET_ACTOR_VALUES, record.builderProvider) &&
    typeof record.supervisorProvider === 'string' &&
    Object.prototype.hasOwnProperty.call(TARGET_ACTOR_VALUES, record.supervisorProvider) &&
    trackingOk
  );
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await readFile(path, 'utf-8');
    return true;
  } catch {
    return false;
  }
}

async function writeStatus(
  sliceDir: string,
  status: TargetRelayStatus
): Promise<void> {
  await writeFile(
    join(sliceDir, 'status.json'),
    JSON.stringify(status, null, 2),
    'utf-8'
  );
}

async function writeCurrent(
  amDir: string,
  ptr: CurrentPointer
): Promise<void> {
  await writeFile(
    join(amDir, 'current.json'),
    JSON.stringify(ptr, null, 2),
    'utf-8'
  );
}

function assertRunDeliveryConsistency(request: RunRequest, result: RunResult): void {
  if (request.runId !== result.runId) throw new Error('role-context-mismatch: provider result runId does not match request');
  if (request.delivery.kind !== result.deliveryReceipt.kind) throw new Error('role-context-mismatch: provider delivery receipt kind does not match request');
  if (request.delivery.kind === 'reviewed-input-snapshots') {
    if (result.deliveryReceipt.kind !== 'reviewed-input-snapshots' || result.deliveryReceipt.contract !== request.delivery.contract) throw new Error('role-context-mismatch: reviewed request completed without matching delivery contract');
    const sharedInputs = request.delivery.common.filter((item) => item.purpose === 'shared-instruction');
    const sharedChannels = result.deliveryReceipt.channels.filter((item) => item.channel === 'shared-instruction');
    const stdinChannels = result.deliveryReceipt.channels.filter((item) => item.channel === 'stdin');
    const channelIdentityValid = result.deliveryReceipt.channels.every((item) => item.mechanism.length > 0 && /^sha256:[0-9a-f]{64}$/.test(item.sha256) && Number.isInteger(item.byteLength) && item.byteLength >= 0);
    if (sharedInputs.length !== 1 || sharedChannels.length !== 1 || stdinChannels.length !== 1 || result.deliveryReceipt.channels.length !== 2 || !channelIdentityValid || sharedChannels[0]?.sha256 !== sharedInputs[0]?.sha256 || sharedChannels[0]?.byteLength !== sharedInputs[0]?.bytes.byteLength) {
      throw new Error('role-context-mismatch: provider delivery receipt does not identify the requested shared and stdin channels');
    }
  }
}

/** Build a run record from a request/result pair. */
function makeRunRecord(
  phase: TargetPhase,
  provider: TargetActor,
  request: RunRequest,
  result: RunResult,
  targetDir: string,
  promptRoot?: string,
  baseline?: ContentRef
): TargetRunRecord {
  assertRunDeliveryConsistency(request, result);
  const base: TargetRunRecord = {
    runId: request.runId,
    phase,
    role: request.role,
    provider,
    model: request.model ?? '',
    effort: request.effort ?? '',
    mode: request.mode ?? 'edit',
    permission: request.permission ?? 'write',
    status: result.status,
    startedAt: result.startedAt,
    completedAt: result.completedAt,
    logPath: toTargetRelative(result.logPath, targetDir),
    prompts: request.delivery.kind === 'legacy-live-inputs'
      ? request.delivery.prompts.map((p) => ({ path: p.path, digest: p.digest }))
      : [...request.delivery.common, ...request.delivery.roleSpecific]
        .filter((p) => p.origin === 'file' && (p.purpose === 'shared-instruction' || p.purpose === 'common-role-instruction' || p.purpose === 'role-instruction'))
        .map((p) => ({ path: p.origin === 'file' ? p.path : '', digest: p.sha256 })),
    workingDir: targetDir,
  };
  let record = result.error !== undefined ? { ...base, error: result.error } : base;
  if (request.delivery.kind === 'reviewed-input-snapshots') {
    if (result.deliveryReceipt.kind !== 'reviewed-input-snapshots' || !promptRoot || !baseline) throw new Error('role-context-mismatch: reviewed request completed without identified roots/baseline');
    const project = (item: RunTextInput): RunInputProvenance['commonInputs'][number] => item.origin === 'file'
      ? { origin: 'file', root: item.root, purpose: item.purpose, path: item.path, sha256: item.sha256, byteLength: item.bytes.byteLength }
      : { origin: 'generated', purpose: item.purpose, label: item.label, sha256: item.sha256, byteLength: item.bytes.byteLength };
    record = {
      ...record,
      inputProvenance: {
        contract: request.delivery.contract,
        roots: { target: targetDir, prompt: promptRoot },
        baseline,
        commonInputs: request.delivery.common.map(project),
        roleSpecificInputs: request.delivery.roleSpecific.map(project),
        channels: result.deliveryReceipt.channels,
      },
    };
  }
  return record;
}

async function writeRunRecord(
  sliceDir: string,
  name: string,
  record: TargetRunRecord
): Promise<void> {
  await mkdir(join(sliceDir, 'runs'), { recursive: true });
  await writeFile(
    join(sliceDir, 'runs', `${name}.json`),
    JSON.stringify(record, null, 2),
    'utf-8'
  );
}

async function blockSlice(
  sliceDir: string,
  status: TargetRelayStatus,
  clock: ClockPort,
  actor: TargetActor,
  reason: string
): Promise<TargetRelayStatus> {
  const blocked: TargetRelayStatus = {
    ...status,
    phase: 'blocked',
    updatedAt: clock.now(),
    lastActor: actor,
  };
  await writeStatus(sliceDir, blocked);
  await writeFile(
    join(sliceDir, 'notes-for-human.md'),
    `# Blocked\n\n${reason}\n`,
    'utf-8'
  );
  return blocked;
}

// ---------------------------------------------------------------------------
// Phases
// ---------------------------------------------------------------------------

/** Max total attempts for a provider run when it hits a transient infra failure. */
const TRANSIENT_RETRY_ATTEMPTS = 4;

/**
 * Backoff (ms) before retry attempts 2..N. Server-side rate limits ("Server is
 * temporarily limiting requests") can be SUSTAINED — short spacing re-hits the
 * same throttle window. These escalate so a single run waits out a multi-minute
 * throttle (~5 min total) before giving up. Crashes tolerate the wait harmlessly.
 */
const RETRY_BACKOFF_MS = [30_000, 90_000, 180_000];

/**
 * A provider run that FAILED or was CANCELLED is a transient infra failure
 * (process crash, "model at capacity", killed) — distinct from a TIMEOUT (the
 * work exceeded its budget; retrying the same budget would just time out again)
 * and from a COMPLETED run (the real outcome). Only transient failures are
 * auto-retried.
 */
function isTransientFailure(status: RunStatus): boolean {
  return status === RunStatus.FAILED || status === RunStatus.CANCELLED;
}

/**
 * Run a provider, auto-retrying transient infra failures in-loop so a blip
 * (crash / capacity) does not block the slice as if a human decision were
 * needed. TIMEOUT and COMPLETED are returned as-is. Logs are timestamped per
 * run, so each attempt's transcript is preserved.
 */
async function runWithRetry(
  runner: ProviderRunnerPort,
  request: RunRequest,
  label: string
): Promise<RunResult> {
  let result = await runner.run(request);
  let attempt = 1;
  while (attempt < TRANSIENT_RETRY_ATTEMPTS && isTransientFailure(result.status)) {
    const delayMs = RETRY_BACKOFF_MS[attempt - 1] ?? 60_000;
    console.log(
      `  [retry] ${label}: transient provider failure (status=${result.status}); backing off ${Math.round(delayMs / 1000)}s, then re-running (attempt ${attempt + 1}/${TRANSIENT_RETRY_ATTEMPTS})`
    );
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    result = await runner.run(request);
    attempt += 1;
  }
  return result;
}

/** Run the READ-ONLY select-slice step. */
async function runSelectSlice(
  input: TargetRelayInput,
  deps: TargetRelayDeps,
  amDir: string,
  assurance?: AnyPersistedAssurance
): Promise<{
  status: 'selected' | 'blocked';
  sliceId?: string;
  sliceDoc?: string;
  raw: string;
  reason?: string;
  result: RunResult;
  request: RunRequest;
}> {
  let delivery: RunRequest['delivery'];
  if (assurance?.contract === 'requirements-assurance/v2-stage2') {
    const capture = captureReviewedInputs(input, deps);
    const common = await acceptedCommonInputs(input, deps, assurance, undefined, capture);
    const commonPaths = input.commonPromptPaths ?? [];
    const roleSnapshots = await Promise.all(input.selectPromptPaths.filter((path) => !commonPaths.includes(path)).map((path) => readRequiredCapturedSnapshot(capture, 'prompt', path)));
    delivery = {
      kind: 'reviewed-input-snapshots',
      contract: 'requirements-assurance/v2-input-delivery',
      common,
      roleSpecific: [
        ...roleSnapshots.map((snapshot) => fileRunInput(snapshot, 'prompt', 'role-instruction')),
        generatedRunInput('selection-task', 'task-directive', cwdHeader(input.targetDir), deps.computeDigest),
      ],
    };
  } else {
    const prompts = await loadPrompts(input.promptRoot, input.selectPromptPaths, deps.computeDigest);
    delivery = { kind: 'legacy-live-inputs', prompts, contextText: cwdHeader(input.targetDir) };
  }

  const request: RunRequest = {
    runId: `select-${deps.clock.now()}`,
    sliceId: 'selection',
    role: 'supervisor',
    mode: 'plan',
    // READ-ONLY: selection must not modify code. Agent Manager writes
    // selection.json from the supervisor's stdout.
    permission: 'read-only',
    workingDir: input.targetDir,
    model: input.supervisorModel,
    effort: input.supervisorEffort,
    delivery,
    inputArtifacts: [],
  };
  const result = await runWithRetry(deps.supervisor, request, 'select-slice');
  assertRunDeliveryConsistency(request, result);

  if (result.status !== RunStatus.COMPLETED) {
    return {
      status: 'blocked',
      raw: '',
      reason: `Supervisor failed during select-slice: ${result.error ?? 'unknown error'}`,
      result,
      request,
    };
  }

  const raw = String(result.outputArtifacts[0]?.content ?? '');
  const selStatus = parseSelectionStatus(raw);
  if (selStatus !== 'selected') {
    return {
      status: 'blocked',
      raw,
      reason: `Supervisor did not select a slice (parsed STATUS: ${selStatus}).`,
      result,
      request,
    };
  }

  const sliceId = extractField(raw, 'SLICE_ID');
  const sliceDoc = extractField(raw, 'SLICE_DOC');
  if (!sliceId) {
    return {
      status: 'blocked',
      raw,
      reason: 'Selection packet missing SLICE_ID.',
      result,
      request,
    };
  }

  const selected = { status: 'selected' as const, sliceId, raw, result, request };
  return sliceDoc !== undefined ? { ...selected, sliceDoc } : selected;
}

/** Run one implement step. Returns updated status or blocked. */
async function runImplement(
  input: TargetRelayInput,
  deps: TargetRelayDeps,
  sliceDir: string,
  status: TargetRelayStatus,
  packetRaw: string,
  posture: WorkItemPosture,
  dispatchCapture: ReviewedInputCapture | undefined,
  stage3?: Stage3Context
): Promise<TargetRelayStatus> {
  if (stage3) {
    const before = await observeStage3Checkpoint(input, deps, stage3);
    if (!status.candidateTracking) {
      if (before.entries.length !== 0) throw new Error(`subject-mismatch: stage-3 implementation must start from a clean non-excluded tree; found ${before.entries.map((entry) => entry.path).join(', ')}`);
      status = { ...status, candidateTracking: { contract: 'requirements-assurance/v3-candidate-tracking', state: 'building', baseRevision: before.baseRevision } };
      await writeStatus(sliceDir, status);
    } else {
      if (before.baseRevision !== status.candidateTracking.baseRevision) throw new Error('subject-mismatch: candidate HEAD changed from the persisted implementation base');
      if (status.candidateTracking.state !== 'building') throw new Error('subject-mismatch: evidence-bound candidate cannot re-enter the builder without explicit evidence invalidation');
    }
  }
  let delivery: RunRequest['delivery'];
  const useSnapshots = status.assurance !== undefined && (status.assurance.contract === 'requirements-assurance/v2-stage2' || posture.kind === 'requirements-document');
  if (useSnapshots && status.assurance) {
    if (!dispatchCapture) throw new Error('invalid-field: reviewed builder dispatch has no admitted input capture');
    const capture = dispatchCapture;
    const allocationPath = posture.kind === 'requirements-document' ? posture.admissionAllocation : status.sliceDoc ?? '';
    const common = await acceptedCommonInputs(input, deps, status.assurance, allocationPath, capture);
    const prior: RunTextInput[] = [];
    if (status.iteration > 0) {
      const priorIterations = stage3
        ? Array.from({ length: status.iteration }, (_, index) => index)
        : [status.iteration - 1];
      for (const priorIteration of priorIterations) {
        const priorPath = `.agent-manager/slices/${status.sliceId}/review-${priorIteration}.json`;
        const priorSnapshot = await capture.read('target', priorPath);
        // A failed builder can advance the retry index without producing a
        // review. Preserve every review that exists; absence is not a finding
        // and must not make the partial candidate impossible to resume.
        if (priorSnapshot.status === 'error' && priorSnapshot.code === 'missing') continue;
        if (priorSnapshot.status === 'error') throw new Error(`${priorSnapshot.code}: ${priorPath}: ${priorSnapshot.detail}`);
        decoded(priorSnapshot);
        prior.push(fileRunInput(priorSnapshot, 'target', 'prior-review'));
      }
    }
    const roleSpecific = await roleSpecificInputs({
      input,
      deps,
      sliceDir,
      packetRaw,
      promptPaths: input.builderPromptPaths,
      directiveLabel: posture.kind === 'requirements-document' ? 'requirements-author-task' : 'implementation-builder-task',
      directive: buildBuilderContext(
        input.targetDir,
        packetRaw,
        status.iteration,
        posture.kind === 'requirements-document'
          ? 'requirements-assurance/v2-requirements-review'
          : stage3
            ? 'requirements-assurance/v3-implementation-evidence'
            : 'legacy-implementation-report'
      ),
      extra: prior,
      capture,
    });
    delivery = { kind: 'reviewed-input-snapshots', contract: 'requirements-assurance/v2-input-delivery', common, roleSpecific };
  } else {
    const prompts = await loadPrompts(input.promptRoot, input.builderPromptPaths, deps.computeDigest);
    delivery = {
      kind: 'legacy-live-inputs',
      prompts,
      contextText: buildBuilderContext(input.targetDir, packetRaw, status.iteration, 'legacy-implementation-report'),
    };
  }
  const request: RunRequest = {
    runId: `build-${status.sliceId}-${status.iteration}`,
    sliceId: status.sliceId,
    role: 'builder',
    mode: 'edit',
    permission: 'write',
    workingDir: input.targetDir,
    model: input.builderModel,
    effort: input.builderEffort,
    delivery,
    inputArtifacts: [],
  };
  const result = await runWithRetry(
    deps.builder,
    request,
    `build ${status.sliceId} iter ${status.iteration}`
  );

  await writeRunRecord(
    sliceDir,
    `build-${status.iteration}`,
    makeRunRecord('implement', input.builderProvider, request, result, input.targetDir, input.promptRoot, status.assurance?.manifest)
  );

  if (result.status !== RunStatus.COMPLETED) {
    return blockSlice(
      sliceDir,
      status,
      deps.clock,
      input.builderProvider,
      `Builder run did not complete (provider ${result.status}) after retries at iteration ${status.iteration}: ${result.error ?? 'unknown error'}. Transient/infra failure or timeout — resume the slice (raise --timeout if it timed out).`
    );
  }

  await writeFile(
    join(sliceDir, `build-${status.iteration}.md`),
    String(result.outputArtifacts[0]?.content ?? ''),
    'utf-8'
  );

  if (stage3) {
    if (result.outputArtifacts.length !== 1 || typeof result.outputArtifacts[0]?.content !== 'string') throw new Error('invalid-field: stage-3 builder must return exactly one text artifact');
    const checkpoint = await observeStage3Checkpoint(input, deps, stage3);
    if (checkpoint.baseRevision !== status.candidateTracking?.baseRevision) throw new Error('subject-mismatch: candidate HEAD changed during builder execution');
    // Framing around the object is not an error (TD-020); the extracted object meets the identical strict parse.
    const raw = extractProviderResultJson(result.outputArtifacts[0].content);
    const parsed = parseImplementationEvidenceResult({ snapshot: { status: 'ok', path: 'provider-result', bytes: new TextEncoder().encode(raw), sha256: deps.computeDigest(raw) }, allocation: stage3.allocation, allocationRef: stage3.allocationRef, checkpoint });
    if (!parsed.ok) throw new Error(`Invalid structured implementation evidence:\n${parsed.errors.map(renderAssuranceError).join('\n')}`);
    const verification = makeVerificationDraft({ input, status, stage3, checkpoint, evidence: parsed.value, result });
    const verificationBytes = new TextEncoder().encode(`${JSON.stringify(verification, null, 2)}\n`);
    const verificationSha256 = deps.computeDigest(new TextDecoder().decode(verificationBytes));
    await writeFile(join(sliceDir, `implementation-evidence-${status.iteration}.json`), JSON.stringify({ checkpoint, evidence: parsed.value, verification, verificationSha256 }, null, 2), 'utf-8');
    status = { ...status, candidateTracking: { contract: 'requirements-assurance/v3-candidate-tracking', state: 'evidence-bound', baseRevision: checkpoint.baseRevision, candidateSha256: checkpoint.sha256 } };
  }

  const next: TargetRelayStatus = {
    ...status,
    phase: 'review-impl',
    updatedAt: deps.clock.now(),
    lastActor: input.builderProvider,
  };
  await writeStatus(sliceDir, next);
  return next;
}

/** Run one review step. Returns updated status. */
async function runReview(
  input: TargetRelayInput,
  deps: TargetRelayDeps,
  sliceDir: string,
  status: TargetRelayStatus,
  packetRaw: string,
  posture: WorkItemPosture,
  dispatchCapture: ReviewedInputCapture | undefined,
  stage3?: Stage3Context
): Promise<TargetRelayStatus> {
  // Inline this iteration's build report (gitignored — invisible to the
  // reviewer's git-based inspection). Absent file (e.g. legacy resume) is fine.
  let buildReport: string | undefined;
  try {
    buildReport = await readFile(
      join(sliceDir, `build-${status.iteration}.md`),
      'utf-8'
    );
  } catch {
    buildReport = undefined;
  }
  let candidate: Awaited<ReturnType<typeof loadCandidateClosure>> | undefined;
  let stage3Evidence: Stage3EvidenceState | undefined;
  let delivery: RunRequest['delivery'];
  const useSnapshots = status.assurance !== undefined && (status.assurance.contract === 'requirements-assurance/v2-stage2' || posture.kind === 'requirements-document');
  if (useSnapshots && status.assurance) {
    if (!dispatchCapture) throw new Error('invalid-field: reviewed reviewer dispatch has no admitted input capture');
    const capture = dispatchCapture;
    const allocationPath = posture.kind === 'requirements-document' ? posture.admissionAllocation : status.sliceDoc ?? '';
    const common = await acceptedCommonInputs(input, deps, status.assurance, allocationPath, capture);
    const extra: RunTextInput[] = [];
    if (buildReport !== undefined) extra.push(generatedRunInput(`build-report-${status.iteration}`, 'build-report', buildReport, deps.computeDigest));
    if (stage3 && status.iteration > 0) {
      for (let priorIteration = 0; priorIteration < status.iteration; priorIteration += 1) {
        const priorPath = `.agent-manager/slices/${status.sliceId}/review-${priorIteration}.json`;
        const priorSnapshot = await capture.read('target', priorPath);
        if (priorSnapshot.status === 'error' && priorSnapshot.code === 'missing') continue;
        if (priorSnapshot.status === 'error') throw new Error(`${priorSnapshot.code}: ${priorPath}: ${priorSnapshot.detail}`);
        decoded(priorSnapshot);
        extra.push(fileRunInput(priorSnapshot, 'target', 'prior-review'));
      }
    }
    if (posture.kind === 'requirements-document') {
      if (!status.sliceDoc) throw new Error('invalid-field: requirements document status has no SLICE_DOC');
      candidate = await loadCandidateClosure({ input, deps, posture, sliceDoc: status.sliceDoc, capture });
      extra.push(...candidate.inputs);
    }
    if (stage3) {
      stage3Evidence = await readStage3Evidence(sliceDir, status.iteration, stage3, deps);
      const current = await observeStage3Checkpoint(input, deps, stage3);
      if (status.candidateTracking?.state !== 'evidence-bound' || status.candidateTracking.candidateSha256 !== stage3Evidence.checkpoint.sha256 || !sameCheckpoint(current, stage3Evidence.checkpoint)) throw new Error('subject-mismatch: evidence-bound candidate changed before implementation review');
      if (!deps.candidateDiff) throw new Error('invalid-field: stage-3 candidate diff mechanism is unavailable');
      extra.push(
        generatedRunInput(`implementation-allocation-${status.iteration}`, 'review-subject', JSON.stringify(stage3.allocation), deps.computeDigest),
        generatedRunInput(`candidate-checkpoint-${status.iteration}`, 'review-subject', JSON.stringify(stage3Evidence.checkpoint), deps.computeDigest),
        generatedRunInput(`verification-draft-${status.iteration}`, 'review-subject', new TextDecoder().decode(stage3Evidence.verificationBytes), deps.computeDigest),
        generatedRunInput(`candidate-diff-${status.iteration}`, 'review-subject', await deps.candidateDiff(input.targetDir, stage3Evidence.checkpoint), deps.computeDigest),
      );
    }
    const roleSpecific = await roleSpecificInputs({
      input,
      deps,
      sliceDir,
      packetRaw,
      promptPaths: input.reviewerPromptPaths,
      directiveLabel: posture.kind === 'requirements-document' ? 'requirements-reviewer-task' : 'implementation-reviewer-task',
      directive: buildReviewerContext(
        input.targetDir,
        packetRaw,
        buildReport,
        posture.kind === 'requirements-document'
          ? 'requirements-assurance/v2-requirements-review'
          : stage3
            ? 'requirements-assurance/v3-implementation-review'
            : 'legacy-status-verdict'
      ),
      extra,
      capture,
    });
    delivery = { kind: 'reviewed-input-snapshots', contract: 'requirements-assurance/v2-input-delivery', common, roleSpecific };
  } else {
    const prompts = await loadPrompts(input.promptRoot, input.reviewerPromptPaths, deps.computeDigest);
    delivery = {
      kind: 'legacy-live-inputs',
      prompts,
      contextText: buildReviewerContext(input.targetDir, packetRaw, buildReport, 'legacy-status-verdict'),
    };
  }
  const request: RunRequest = {
    runId: `review-${status.sliceId}-${status.iteration}`,
    sliceId: status.sliceId,
    role: 'reviewer',
    mode: 'review',
    permission: input.reviewerPermission ?? 'read-only',
    workingDir: input.targetDir,
    model: input.supervisorModel,
    effort: input.supervisorEffort,
    delivery,
    inputArtifacts: [],
  };
  const result = await runWithRetry(
    deps.supervisor,
    request,
    `review ${status.sliceId} iter ${status.iteration}`
  );

  const reviewRunRecord = makeRunRecord('review-impl', input.supervisorProvider, request, result, input.targetDir, input.promptRoot, status.assurance?.manifest);
  await writeRunRecord(
    sliceDir,
    `review-${status.iteration}`,
    reviewRunRecord
  );

  if (result.status !== RunStatus.COMPLETED) {
    // Persistent provider-INFRA failure (timeout / crash / capacity) after
    // retries — NOT a real escalate verdict. Block with a retryable reason so
    // the operator resumes rather than treating it as a human decision.
    return blockSlice(
      sliceDir,
      status,
      deps.clock,
      input.supervisorProvider,
      `Reviewer run did not complete (provider ${result.status}) after retries: ${result.error ?? 'unknown error'}. Transient/infra failure, not a decision — resume the slice (raise --timeout if it timed out).`
    );
  }

  if (posture.kind === 'requirements-document' && (result.outputArtifacts.length !== 1 || typeof result.outputArtifacts[0]?.content !== 'string')) {
    return blockSlice(sliceDir, status, deps.clock, input.supervisorProvider, 'invalid-field: provider-result /: requirements reviewer must return exactly one text artifact');
  }
  const raw = String(result.outputArtifacts[0]?.content ?? '');
  // Framing around the object is not an error (TD-020); `raw` stays in the trail, the extracted object is what is parsed.
  const resultJson = extractProviderResultJson(raw);
  if (stage3) {
    if (!stage3Evidence) throw new Error('invalid-field: implementation review has no evidence-bound candidate');
    if (result.outputArtifacts.length !== 1 || typeof result.outputArtifacts[0]?.content !== 'string') return blockSlice(sliceDir, status, deps.clock, input.supervisorProvider, 'invalid-field: stage-3 reviewer must return exactly one text artifact');
    const afterReview = await observeStage3Checkpoint(input, deps, stage3);
    if (!sameCheckpoint(afterReview, stage3Evidence.checkpoint)) return blockSlice(sliceDir, status, deps.clock, input.supervisorProvider, 'subject-mismatch: candidate changed during implementation review');
    const parsed = parseImplementationReviewResult({ snapshot: { status: 'ok', path: 'provider-result', bytes: new TextEncoder().encode(resultJson), sha256: deps.computeDigest(resultJson) }, allocation: stage3.allocation, checkpoint: stage3Evidence.checkpoint, verificationSha256: stage3Evidence.verificationSha256, evidence: stage3Evidence.evidence });
    await writeFile(join(sliceDir, `review-${status.iteration}.json`), JSON.stringify({ iteration: status.iteration, raw, parsed: parsed.ok ? parsed.value : { errors: parsed.errors } }, null, 2), 'utf-8');
    if (!parsed.ok) return blockSlice(sliceDir, status, deps.clock, input.supervisorProvider, `Invalid structured implementation review:\n${parsed.errors.map(renderAssuranceError).join('\n')}`);
    if (parsed.value.result === 'refinement-required') {
      const revise: TargetRelayStatus = { ...status, phase: 'implement', iteration: status.iteration + 1, updatedAt: deps.clock.now(), lastActor: input.supervisorProvider, candidateTracking: { contract: 'requirements-assurance/v3-candidate-tracking', state: 'building', baseRevision: stage3Evidence.checkpoint.baseRevision } };
      await writeStatus(sliceDir, revise);
      return revise;
    }
    if (parsed.value.result === 'decision-required') return blockSlice(sliceDir, status, deps.clock, input.supervisorProvider, `DECISION_REQUIRED:\n${renderDecisionMatrix(parsed.value.decisions)}`);
    const builderState = await readJsonState(join(sliceDir, 'runs', `build-${status.iteration}.json`));
    const builderRecord = builderState.status === 'ok' && builderState.value && typeof builderState.value === 'object' && !Array.isArray(builderState.value) ? builderState.value as Partial<TargetRunRecord> : undefined;
    if (!builderRecord?.inputProvenance || !reviewRunRecord.inputProvenance || !sameInputProvenanceContext(builderRecord.inputProvenance, reviewRunRecord.inputProvenance)) return blockSlice(sliceDir, status, deps.clock, input.supervisorProvider, 'role-context-mismatch: builder and implementation reviewer common input identities differ');
    const beforePublication = await observeStage3Checkpoint(input, deps, stage3);
    if (!sameCheckpoint(beforePublication, stage3Evidence.checkpoint)) return blockSlice(sliceDir, status, deps.clock, input.supervisorProvider, 'subject-mismatch: candidate changed before evidence publication');
    const [verificationPath, reviewPath] = stage3.allocation.postReviewRecordPaths;
    if (!verificationPath || !reviewPath) throw new Error('invalid-field: stage-3 allocation requires verification and implementation-review paths');
    for (const path of [verificationPath, reviewPath]) {
      const existing = await deps.artifactStore.readContainedFile(input.targetDir, path);
      if (existing.status !== 'error' || existing.code !== 'missing') return blockSlice(sliceDir, status, deps.clock, input.supervisorProvider, `approval-already-exists: post-review path '${path}' is not provably absent`);
    }
    if (!deps.createTrackedFileExclusively) throw new Error('invalid-field: stage-3 exclusive publication mechanism is unavailable');
    const verificationRef = { path: verificationPath, sha256: stage3Evidence.verificationSha256 };
    const durableReview = {
      formatVersion: 3,
      kind: 'implementation-review',
      reviewId: request.runId,
      workItemId: stage3.allocation.workItemId,
      baseline: status.assurance?.manifest,
      allocation: stage3.allocationRef,
      subject: { candidateSha256: stage3Evidence.checkpoint.sha256, verification: verificationRef },
      reviewer: { role: 'reviewer', provider: input.supervisorProvider, model: input.supervisorModel, effort: input.supervisorEffort, runId: request.runId },
      independence: { invocations: 'separate', providerDiversity: builderRecord.provider === input.supervisorProvider ? 'same-provider' : 'different-provider' },
      reviewerInputProvenance: reviewRunRecord.inputProvenance,
      result: 'accepted',
      obligationAssessments: parsed.value.obligationAssessments,
      checkAssessments: parsed.value.checkAssessments,
      changedPathAssessments: parsed.value.changedPathAssessments,
      findings: parsed.value.findings,
      decisions: parsed.value.decisions,
      completedAt: result.completedAt,
      acceptanceStatus: 'not-recorded',
      report: 'Implementation review passed; operator acceptance remains separate.',
    };
    const reviewText = `${JSON.stringify(durableReview, null, 2)}\n`;
    const reviewBytes = new TextEncoder().encode(reviewText);
    const reviewSha256 = deps.computeDigest(reviewText);
    const created: string[] = [];
    try {
      await deps.createTrackedFileExclusively(input.targetDir, verificationPath, stage3Evidence.verificationBytes);
      created.push(verificationPath);
      await deps.createTrackedFileExclusively(input.targetDir, reviewPath, reviewBytes);
      created.push(reviewPath);
    } catch (cause) {
      return blockSlice(sliceDir, status, deps.clock, input.supervisorProvider, `publication failure: review activity completion withheld; unaccepted partial publication: ${created.length ? created.join(', ') : 'none'}; ${cause instanceof Error ? cause.message : String(cause)}`);
    }
    console.log(`  [evidence] verification record: ${verificationPath} ${verificationRef.sha256}`);
    console.log(`  [evidence] implementation review record: ${reviewPath} ${reviewSha256}`);
    const done: TargetRelayStatus = { ...status, phase: 'done', updatedAt: deps.clock.now(), lastActor: input.supervisorProvider };
    await writeStatus(sliceDir, done);
    return done;
  }
  if (posture.kind === 'requirements-document') {
    if (!candidate) throw new Error('invalid-field: requirements review has no candidate snapshot');
    // The provider assessed the pre-dispatch snapshot. Re-read the complete
    // candidate before consuming its result so an edit made during the review
    // cannot be published under a stale subject identity.
    const currentCandidate = await loadCandidateClosure({ input, deps, posture, sliceDoc: status.sliceDoc ?? '' });
    if (currentCandidate.manifestRef.path !== candidate.manifestRef.path || currentCandidate.manifestRef.sha256 !== candidate.manifestRef.sha256) {
      return blockSlice(sliceDir, status, deps.clock, input.supervisorProvider, 'subject-mismatch: requirements candidate changed during review');
    }
    const parsed = parseRequirementsReviewResult({ status: 'ok', path: 'provider-result', bytes: new TextEncoder().encode(resultJson), sha256: deps.computeDigest(resultJson) }, candidate.manifestRef, posture.reviewObligationIds);
    await writeFile(join(sliceDir, `review-${status.iteration}.json`), JSON.stringify({ iteration: status.iteration, raw, parsed: parsed.ok ? parsed.value : { errors: parsed.errors } }, null, 2), 'utf-8');
    if (!parsed.ok) return blockSlice(sliceDir, status, deps.clock, input.supervisorProvider, `Invalid structured requirements review:\n${parsed.errors.map(renderAssuranceError).join('\n')}`);
    if (parsed.value.result === 'refinement-required') {
      const revise: TargetRelayStatus = { ...status, phase: 'implement', iteration: status.iteration + 1, updatedAt: deps.clock.now(), lastActor: input.supervisorProvider };
      await writeStatus(sliceDir, revise);
      return revise;
    }
    if (parsed.value.result === 'decision-required') {
      const matrix = parsed.value.decisions.map((decision) => [
        `- ID: ${decision.decisionId}`,
        `  QUESTION: ${decision.question}`,
        '  OPTIONS:',
        ...decision.options.map((option) => `  - ${option.option}: REWARD ${option.reward}; RISK ${option.risk}`),
        `  RECOMMENDED: ${decision.recommendation}`,
        `  BLOCKING_REASON: ${decision.blockingReason}`,
      ].join('\n')).join('\n');
      return blockSlice(sliceDir, status, deps.clock, input.supervisorProvider, `DECISION_REQUIRED:\n${matrix}`);
    }
    const authorState = await readJsonState(join(sliceDir, 'runs', `build-${status.iteration}.json`));
    if (authorState.status !== 'ok' || !authorState.value || typeof authorState.value !== 'object' || Array.isArray(authorState.value)) return blockSlice(sliceDir, status, deps.clock, input.supervisorProvider, 'role-context-mismatch: completed requirements author run record is unavailable');
    const authorRecord = authorState.value as Partial<TargetRunRecord>;
    if (!authorRecord.inputProvenance || !reviewRunRecord.inputProvenance || !sameInputProvenanceContext(authorRecord.inputProvenance, reviewRunRecord.inputProvenance)) return blockSlice(sliceDir, status, deps.clock, input.supervisorProvider, 'role-context-mismatch: requirements author and reviewer common input identities differ');
    const durable: RequirementsReviewRecord = {
      formatVersion: 2,
      kind: 'requirements-review',
      reviewId: request.runId,
      subject: candidate.manifestRef,
      author: { role: 'requirements-author', provider: authorRecord.provider ?? '', model: authorRecord.model ?? '', effort: authorRecord.effort ?? '', runId: authorRecord.runId ?? '' },
      reviewer: { role: 'requirements-reviewer', provider: input.supervisorProvider, model: input.supervisorModel, effort: input.supervisorEffort, runId: request.runId },
      independence: { invocations: 'separate', providerDiversity: authorRecord.provider === input.supervisorProvider ? 'same-provider' : 'different-provider' },
      authorInputProvenance: authorRecord.inputProvenance,
      reviewerInputProvenance: reviewRunRecord.inputProvenance,
      result: 'accepted', assessments: parsed.value.assessments, findings: parsed.value.findings, decisions: parsed.value.decisions,
      completedAt: result.completedAt,
      report: parsed.value.report,
    };
    const durablePath = join(input.targetDir, 'docs', 'assurance', candidate.manifest.baselineId, 'requirements-review.json');
    await mkdir(join(input.targetDir, 'docs', 'assurance', candidate.manifest.baselineId), { recursive: true });
    try { await writeFile(durablePath, `${JSON.stringify(durable, null, 2)}\n`, { encoding: 'utf-8', flag: 'wx' }); }
    catch (cause) { return blockSlice(sliceDir, status, deps.clock, input.supervisorProvider, `approval-already-exists: requirements review output is create-only: ${cause instanceof Error ? cause.message : String(cause)}`); }
    const done: TargetRelayStatus = { ...status, phase: 'done', updatedAt: deps.clock.now(), lastActor: input.supervisorProvider };
    await writeStatus(sliceDir, done);
    return done;
  }
  const verdict = parseVerdict(raw);

  await writeFile(
    join(sliceDir, `review-${status.iteration}.json`),
    JSON.stringify({ iteration: status.iteration, verdict, raw }, null, 2),
    'utf-8'
  );

  if (verdict === 'approved') {
    // ADDITIVE (DECISION-REVIEW-MODE-1; trigger fixed by
    // DECISION-REVIEW-TRIGGER-FIX-1): route an approved slice to the adversarial
    // `decision-review` phase ONLY when THIS slice's BUILD surfaced operator-
    // ratification-class decisions — the `DECISION_REQUIRED:` marker is in the
    // builder's approved run summary (build-<n>.md), OR in the SLICE_DOC spec that
    // this build itself created/modified (a SPEC slice writing its matrix). A
    // pre-ratified SLICE_DOC the build did NOT touch (an IMPL slice referencing a
    // frozen spec whose §8 matrices are legitimately present) does NOT fire — that
    // systematic false-fire on every impl slice was the bug. "Build touched the
    // SLICE_DOC" is read from the target's uncommitted changed-file set
    // (deps.changedPaths); the builder leaves changes uncommitted, so a SLICE_DOC
    // it wrote appears there. See shouldEnterDecisionReview for the predicate.
    //
    // Additive parity holds: a slice WITHOUT the marker in EITHER source is a
    // non-decision by definition, so nextPhase === 'done' — the byte-for-byte
    // original transition, same status shape, same run records.
    const { buildArtifact, specArtifact } = await readDecisionSources(
      sliceDir,
      status.iteration,
      input.targetDir,
      status.sliceDoc
    );
    const changedPaths = await deps.changedPaths(input.targetDir);
    const nextPhase: TargetPhase = shouldEnterDecisionReview({
      buildArtifact,
      specArtifact,
      sliceDoc: status.sliceDoc,
      changedPaths,
    })
      ? 'decision-review'
      : 'done';
    const advanced: TargetRelayStatus = {
      ...status,
      phase: nextPhase,
      updatedAt: deps.clock.now(),
      lastActor: input.supervisorProvider,
    };
    await writeStatus(sliceDir, advanced);
    return advanced;
  }
  if (verdict === 'revise') {
    const revise: TargetRelayStatus = {
      ...status,
      phase: 'implement',
      iteration: status.iteration + 1,
      updatedAt: deps.clock.now(),
      lastActor: input.supervisorProvider,
    };
    await writeStatus(sliceDir, revise);
    return revise;
  }
  // escalate | unknown: do not self-resolve.
  return blockSlice(
    sliceDir,
    status,
    deps.clock,
    input.supervisorProvider,
    `Reviewer verdict '${verdict}' at iteration ${status.iteration}.\n\n${raw}`
  );
}

// ---------------------------------------------------------------------------
// Decision review (ADDITIVE phase — DECISION-REVIEW-MODE-1, @maturity PROTOTYPE)
//
// After review-impl APPROVES a slice whose approved artifact surfaces
// operator-ratification-class decisions, both roles debate the DECISIONS (not
// the artifact) in ONE round: supervisor challenges -> builder rebuts. The
// result is a ratification-packet for the human; the relay then HALTS at
// `awaiting-ratification` (it never auto-proceeds). Contracts still shaping.
// ---------------------------------------------------------------------------

/**
 * Does an approved artifact surface operator-ratification-class decisions?
 *
 * This is the trigger for the additive `decision-review` phase (DR-TRIGGER =
 * marker convention). Returns true iff some line is a `DECISION_REQUIRED:` block
 * header — the convention the builder prompt and the non-interactive contract
 * already use. The marker must START a line (after stripping leading markdown
 * heading/list/quote decoration) and be immediately followed by a colon, so a
 * prose mention (e.g. "I hit no DECISION_REQUIRED condition") does NOT trigger.
 *
 * Pure; exported for unit tests.
 */
export function hasRatificationDecisions(artifactText: string): boolean {
  for (const line of artifactText.split('\n')) {
    const stripped = line.replace(/^[\s>#*-]+/, '');
    if (/^DECISION_REQUIRED\s*:/.test(stripped)) return true;
  }
  return false;
}

/**
 * Normalize a repo-relative path for set membership: trim, unify separators,
 * drop a leading `./`. `git status --porcelain` emits forward-slash,
 * repo-root-relative paths and the supervisor writes SLICE_DOC the same way, so
 * this only absorbs incidental decoration before an exact compare.
 */
function normalizeRepoPath(p: string): string {
  return p.trim().replace(/\\/g, '/').replace(/^\.\//, '');
}

/** Is the SLICE_DOC among the build's changed-file set? (null/blank doc => no). */
function sliceDocInChangedSet(
  sliceDoc: string | null,
  changedPaths: readonly string[]
): boolean {
  if (!sliceDoc || !sliceDoc.trim()) return false;
  const target = normalizeRepoPath(sliceDoc);
  return changedPaths.some((p) => normalizeRepoPath(p) === target);
}

/**
 * Trigger predicate for the additive `decision-review` phase (DR-TRIGGER, fixed
 * by DECISION-REVIEW-TRIGGER-FIX-1). Fires IFF THIS slice's BUILD surfaced the
 * operator-ratification-class decisions — never on a pre-ratified spec the build
 * merely references:
 *
 *  - the `DECISION_REQUIRED:` marker is in the BUILD ARTIFACT (`build-<n>.md`):
 *    the build itself surfaced the decisions; OR
 *  - the marker is in the SLICE_DOC spec AND this build CREATED/MODIFIED that
 *    SLICE_DOC (its path is in the build's changed-file set): a SPEC slice whose
 *    deliverable IS the marker-bearing spec.
 *
 * Does NOT fire when the SLICE_DOC carries the marker but the build did not touch
 * it — an IMPLEMENTATION slice referencing an already-ratified spec whose §8
 * decision matrices are legitimately present. That systematic false-fire on every
 * impl slice (a wasted supervisor challenge + a spurious `awaiting-ratification`
 * halt) was the bug (TD: DECISION-REVIEW-MODE-1 trigger over-fires; recorded P2).
 *
 * Pure; exported for unit tests (the four acceptance cases).
 */
export function shouldEnterDecisionReview(args: {
  buildArtifact: string;
  specArtifact: string;
  sliceDoc: string | null;
  changedPaths: readonly string[];
}): boolean {
  if (hasRatificationDecisions(args.buildArtifact)) return true;
  if (
    hasRatificationDecisions(args.specArtifact) &&
    sliceDocInChangedSet(args.sliceDoc, args.changedPaths)
  ) {
    return true;
  }
  return false;
}

/**
 * The two artifacts that may carry the ratification decision matrix:
 *  - `buildArtifact`: the builder's approved run summary (`build-<iteration>.md`,
 *    under the slice dir), and
 *  - `specArtifact`: the slice's committed spec in the TARGET tree named by
 *    SLICE_DOC.
 *
 * DR-TRIGGER is the marker convention, and the matrix can land in EITHER: a SPEC
 * slice writes its `DECISION_REQUIRED:` matrix into SLICE_DOC and may only
 * reference it from the build summary. (review-0 fix: the prior build scanned
 * only `build-<n>.md`, so a SLICE_DOC-only matrix never triggered the phase.)
 *
 * Both are read best-effort: a missing/unnamed file yields ''. SLICE_DOC is
 * resolved under the target tree; it is read READ-ONLY and discarded when it
 * carries no marker, so for a non-decision slice this is harmless I/O that cannot
 * change the existing flow (additive-parity invariant). Never throws.
 */
async function readDecisionSources(
  sliceDir: string,
  iteration: number,
  targetDir: string,
  sliceDoc: string | null
): Promise<{ buildArtifact: string; specArtifact: string }> {
  const buildArtifact = await readFile(
    join(sliceDir, `build-${iteration}.md`),
    'utf-8'
  ).catch(() => '');
  const specArtifact =
    sliceDoc && sliceDoc.trim()
      ? await readFile(join(targetDir, sliceDoc), 'utf-8').catch(() => '')
      : '';
  return { buildArtifact, specArtifact };
}

/** Challenger's per-decision stance. */
export type ChallengeAssessment = 'agree' | 'challenge';
/** Builder's per-decision response to a challenge. */
export type RebuttalResponse = 'concede' | 'rebut';

export interface DecisionAssessment {
  id: string;
  assessment: ChallengeAssessment;
}
export interface DecisionResponse {
  id: string;
  response: RebuttalResponse;
}

/** One decision's resolution in the ratification packet. */
export type RatificationStatus = 'converged' | 'contested';
export interface RatificationItem {
  id: string;
  /** 'agree'/'challenge' come from the challenger. 'missing' means the decision
   *  was surfaced by the source DECISION_REQUIRED matrix but the challenger
   *  emitted NO assessment for it (omitted or misformatted its block) — it is
   *  still reported (as contested), never silently dropped (review-2 fix). */
  assessment: ChallengeAssessment | 'missing';
  /** 'none' when the challenger agreed (no rebuttal needed); 'unknown' when a
   *  challenge — or a 'missing' assessment — drew no parseable builder response. */
  response: RebuttalResponse | 'none' | 'unknown';
  status: RatificationStatus;
}

/** Read a `FIELD: value` line (tolerating markdown decoration). */
function parseLabeledField(line: string, field: string): string | undefined {
  const stripped = line.replace(/^[\s>#*-]+/, '');
  const m = stripped.match(new RegExp(`^${field}\\s*:\\s*(.+)$`, 'i'));
  return m && m[1] !== undefined ? m[1].trim() : undefined;
}

/**
 * Parse the challenger's per-decision assessments from its structured output:
 *
 *   DECISION: <id>
 *   ASSESSMENT: agree|challenge
 *
 * Pure; exported for unit tests.
 */
export function parseChallengerAssessments(raw: string): DecisionAssessment[] {
  const out: DecisionAssessment[] = [];
  let currentId: string | undefined;
  for (const line of raw.split('\n')) {
    const id = parseLabeledField(line, 'DECISION');
    if (id !== undefined) {
      currentId = id;
      continue;
    }
    const a = parseLabeledField(line, 'ASSESSMENT');
    if (a !== undefined && currentId !== undefined) {
      const v = a.toLowerCase();
      const norm: ChallengeAssessment | undefined = v.startsWith('agree')
        ? 'agree'
        : v.startsWith('challeng')
          ? 'challenge'
          : undefined;
      if (norm) {
        out.push({ id: currentId, assessment: norm });
        currentId = undefined;
      }
    }
  }
  return out;
}

/**
 * Parse the builder's per-decision responses from its structured output:
 *
 *   DECISION: <id>
 *   RESPONSE: concede|rebut
 *
 * Pure; exported for unit tests.
 */
export function parseRebutterResponses(raw: string): DecisionResponse[] {
  const out: DecisionResponse[] = [];
  let currentId: string | undefined;
  for (const line of raw.split('\n')) {
    const id = parseLabeledField(line, 'DECISION');
    if (id !== undefined) {
      currentId = id;
      continue;
    }
    const r = parseLabeledField(line, 'RESPONSE');
    if (r !== undefined && currentId !== undefined) {
      const v = r.toLowerCase();
      const norm: RebuttalResponse | undefined = v.startsWith('conced')
        ? 'concede'
        : v.startsWith('rebut')
          ? 'rebut'
          : undefined;
      if (norm) {
        out.push({ id: currentId, response: norm });
        currentId = undefined;
      }
    }
  }
  return out;
}

/**
 * Classify each decision as converged or contested (DR-ROUNDS = one round):
 *  - challenger AGREES                         -> converged (no dispute)
 *  - challenger CHALLENGES, builder CONCEDES   -> converged (corrected cell)
 *  - challenger CHALLENGES, builder REBUTS     -> contested (human adjudicates)
 *  - challenger CHALLENGES, no parseable reply -> contested (unresolved)
 *  - challenger emitted NO assessment for a    -> contested (NOT dropped:
 *    decision present in the source matrix         'missing', fail-loud)
 *
 * The AUTHORITATIVE decision set is `sourceDecisionIds` — the ids the source
 * DECISION_REQUIRED matrix surfaced (spec and/or build summary). Every one of
 * them appears in the result even if the challenger omitted or misformatted its
 * `DECISION:` block: that is the safety property the whole phase exists for (a
 * load-bearing decision must reach the human, never vanish because one model
 * skipped it — review-2 fix). The set is UNIONed with any extra ids the
 * challenger or builder raised (so a challenger-found decision absent from the
 * matrix is also kept — no regression). Order: source first (its raw casing
 * wins for display), then challenger-only, then builder-only; de-duped by
 * normalized id. Cross-source id matching is case-insensitive. Pure; exported
 * for unit tests.
 */
export function classifyRatification(
  sourceDecisionIds: readonly string[],
  assessments: readonly DecisionAssessment[],
  responses: readonly DecisionResponse[]
): RatificationItem[] {
  const assessmentByNorm = new Map<string, ChallengeAssessment>();
  for (const a of assessments) {
    if (!assessmentByNorm.has(normId(a.id))) assessmentByNorm.set(normId(a.id), a.assessment);
  }
  const responseByNorm = new Map<string, RebuttalResponse>();
  for (const r of responses) {
    if (!responseByNorm.has(normId(r.id))) responseByNorm.set(normId(r.id), r.response);
  }

  // Build the ordered, de-duplicated id spine: source ids first, then any extra
  // ids the roles raised. A decision is never dropped because a role omitted it.
  const orderedRawIds: string[] = [];
  const seen = new Set<string>();
  const add = (rawId: string): void => {
    const key = normId(rawId);
    if (!seen.has(key)) {
      seen.add(key);
      orderedRawIds.push(rawId);
    }
  };
  for (const id of sourceDecisionIds) add(id);
  for (const a of assessments) add(a.id);
  for (const r of responses) add(r.id);

  return orderedRawIds.map((rawId): RatificationItem => {
    const key = normId(rawId);
    const assessment = assessmentByNorm.get(key);
    if (assessment === undefined) {
      // Surfaced by the source matrix but the challenger never assessed it.
      // Fail-loud: visible to the human, marked contested, gap made explicit.
      return { id: rawId, assessment: 'missing', response: 'unknown', status: 'contested' };
    }
    if (assessment === 'agree') {
      return { id: rawId, assessment: 'agree', response: 'none', status: 'converged' };
    }
    const resp = responseByNorm.get(key);
    if (resp === 'concede') {
      return { id: rawId, assessment: 'challenge', response: 'concede', status: 'converged' };
    }
    if (resp === 'rebut') {
      return { id: rawId, assessment: 'challenge', response: 'rebut', status: 'contested' };
    }
    return { id: rawId, assessment: 'challenge', response: 'unknown', status: 'contested' };
  });
}

/** Normalize a decision id for cross-source matching (spec `ID:` vs role `DECISION:`). */
function normId(id: string): string {
  return id.trim().toUpperCase();
}

/**
 * Match a DECISION_REQUIRED matrix `ID:` / `- ID:` line (markdown decoration
 * tolerated) and return the raw id, else undefined. Shared by the two functions
 * that scan the matrix (`extractDecisionIds`, `extractRecommendations`) so the
 * id pattern can never drift between "the decision set" and "its text".
 */
function parseDecisionIdLine(line: string): string | undefined {
  const stripped = line.replace(/^[\s>#*-]+/, '');
  const m = stripped.match(/^ID:\s*([A-Za-z0-9][A-Za-z0-9._-]*)/);
  return m && m[1] !== undefined ? m[1] : undefined;
}

/**
 * The decision ids a DECISION_REQUIRED matrix surfaces, in document order, raw
 * casing preserved, de-duplicated by normalized id.
 *
 * This is the AUTHORITATIVE decision set the ratification packet must cover in
 * full: `classifyRatification` uses it as the spine so the human sees every
 * surfaced decision even when the challenger drops one (review-2 fix). Pure;
 * exported for unit tests.
 */
export function extractDecisionIds(artifactText: string): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const line of artifactText.split('\n')) {
    const id = parseDecisionIdLine(line);
    if (id !== undefined && !seen.has(normId(id))) {
      seen.add(normId(id));
      ids.push(id);
    }
  }
  return ids;
}

/**
 * Per-decision reasoning blocks from a role output (challenger OR rebutter),
 * keyed by normalized decision id. A block is the text AFTER a `DECISION: <id>`
 * line up to the next `DECISION:` line — it includes the `ASSESSMENT:`/`RESPONSE:`
 * line and the agent's cites. First block wins on a duplicate id. This is the
 * per-decision challenge/rebuttal text the ratification packet groups by decision
 * (review-0 fix). Pure; exported for unit tests.
 */
export function extractDecisionTexts(raw: string): Map<string, string> {
  const out = new Map<string, string>();
  let curId: string | undefined;
  let curLines: string[] = [];
  const flush = (): void => {
    if (curId !== undefined && !out.has(normId(curId))) {
      out.set(normId(curId), curLines.join('\n').trim());
    }
  };
  for (const line of raw.split('\n')) {
    const id = parseLabeledField(line, 'DECISION');
    if (id !== undefined) {
      flush();
      curId = id;
      curLines = [];
    } else if (curId !== undefined) {
      curLines.push(line);
    }
  }
  flush();
  return out;
}

/** Cap a recommendation excerpt so a block does not run into the next section. */
const RECOMMENDATION_EXCERPT_LINES = 12;

/**
 * Per-decision recommendation excerpts from a spec/artifact that uses the
 * `DECISION_REQUIRED:` convention (`- ID: <id> … QUESTION/OPTIONS/RECOMMENDED`).
 * A block runs from an `ID:`/`- ID:` line to the next `ID:` line, capped at
 * RECOMMENDATION_EXCERPT_LINES. Keyed by normalized id; first block wins. This is
 * the "recommendation" column the packet pairs with each challenge/rebuttal
 * (review-0 fix). Best-effort and format-tolerant; pure; exported for unit tests.
 */
export function extractRecommendations(artifactText: string): Map<string, string> {
  const out = new Map<string, string>();
  let curId: string | undefined;
  let curLines: string[] = [];
  const flush = (): void => {
    if (curId !== undefined && !out.has(normId(curId))) {
      out.set(
        normId(curId),
        curLines.slice(0, RECOMMENDATION_EXCERPT_LINES).join('\n').trim()
      );
    }
  };
  for (const line of artifactText.split('\n')) {
    const id = parseDecisionIdLine(line);
    if (id !== undefined) {
      flush();
      curId = id;
      curLines = [line.replace(/^[\s>#*-]+/, '')];
    } else if (curId !== undefined) {
      // A markdown heading ends the block: the DECISION_REQUIRED matrix uses
      // FIELDS (QUESTION:/RECOMMENDED:/…), never headings, so a heading reliably
      // marks the start of an unrelated section (e.g. a build summary appended
      // after the matrix). Stops a trailing-content bleed into the last block.
      if (/^\s{0,3}#{1,6}\s/.test(line)) {
        flush();
        curId = undefined;
        continue;
      }
      curLines.push(line);
    }
  }
  flush();
  return out;
}

/** A blockquote-free excerpt, defaulting to a placeholder when empty. */
function excerptOr(text: string | undefined, placeholder: string): string {
  return text && text.trim() ? text.trim() : `_${placeholder}_`;
}

/**
 * Render the human-facing ratification packet (system of record for the gate).
 *
 * Per the slice DoD and review-0, each decision is packaged as a section with its
 * {recommendation, reviewer challenge, builder rebuttal, status} so the human can
 * adjudicate a contested decision from one place. The summary table is the index;
 * the per-decision sections are the substance; the raw role outputs are kept as an
 * audit appendix (also written verbatim as `decision-challenge.md` /
 * `decision-rebuttal.md`). `recommendationSources` are the artifacts the
 * recommendations are mined from (spec first, then build) — mined INDEPENDENTLY
 * and merged first-wins so a trailing source never bleeds into the prior's last
 * decision block.
 */
function renderRatificationPacket(args: {
  sliceId: string;
  generatedAt: string;
  challenger: TargetActor;
  rebutter: TargetActor;
  items: readonly RatificationItem[];
  recommendationSources: readonly string[];
  challengeRaw: string;
  rebuttalRaw: string;
}): string {
  const recommendations = new Map<string, string>();
  for (const source of args.recommendationSources) {
    for (const [id, rec] of extractRecommendations(source)) {
      if (!recommendations.has(id)) recommendations.set(id, rec);
    }
  }
  const challengeTexts = extractDecisionTexts(args.challengeRaw);
  const rebuttalTexts = extractDecisionTexts(args.rebuttalRaw);

  const contested = args.items.filter((i) => i.status === 'contested');
  const converged = args.items.filter((i) => i.status === 'converged');
  const overall =
    args.items.length === 0
      ? 'no-decisions-parsed'
      : contested.length === 0
        ? 'all-converged'
        : 'contested-present';

  const table =
    args.items.length === 0
      ? '_No structured `DECISION:` blocks were parsed from the challenge; read the raw challenge and rebuttal below._'
      : [
          '| Decision | Reviewer | Builder | Status |',
          '|----------|----------|---------|--------|',
          ...args.items.map(
            (i) => `| ${i.id} | ${i.assessment} | ${i.response} | **${i.status}** |`
          ),
        ].join('\n');

  // Per-decision sections: recommendation × challenge × rebuttal × status.
  const perDecision =
    args.items.length === 0
      ? ['_No structured decisions parsed; see the raw role outputs below._']
      : args.items.flatMap((i) => {
          const missing = i.assessment === 'missing';
          return [
            `### ${i.id} — ${i.status.toUpperCase()}`,
            '',
            `- **Reviewer assessment:** ${
              missing ? 'missing (challenger emitted no assessment for this decision)' : i.assessment
            }`,
            `- **Builder response:** ${i.response}`,
            '',
            '**Recommendation (from the spec / build artifact):**',
            '',
            excerptOr(
              recommendations.get(normId(i.id)),
              'no matching `ID:` block found in the spec or build artifact'
            ),
            '',
            '**Reviewer challenge:**',
            '',
            excerptOr(
              challengeTexts.get(normId(i.id)),
              missing
                ? '⚠️ NOT ADDRESSED — the challenger emitted no `DECISION:` block for this surfaced decision. Treated as CONTESTED pending human review (a surfaced decision must never pass unexamined).'
                : i.assessment === 'agree'
                  ? 'agreed — no challenge raised'
                  : 'no parseable challenge text'
            ),
            '',
            '**Builder rebuttal:**',
            '',
            excerptOr(
              rebuttalTexts.get(normId(i.id)),
              i.response === 'none' ? 'not needed — reviewer agreed' : 'no parseable rebuttal text'
            ),
            '',
          ];
        });

  return [
    `# Ratification packet — ${args.sliceId}`,
    '',
    '**Maturity: PROTOTYPE** (DECISION-REVIEW-MODE-1)',
    `**Generated:** ${args.generatedAt}`,
    `**Challenger (supervisor):** ${args.challenger}  ·  **Rebutter (builder):** ${args.rebutter}`,
    `**Overall:** ${overall} (${converged.length} converged, ${contested.length} contested)`,
    '',
    'This packet is the HUMAN ratification gate. The relay has HALTED at',
    '`awaiting-ratification`; it will NOT auto-proceed to implementation. Spend',
    'judgment on the **contested** decisions (both arguments are below); the',
    '**converged** ones are de-risked (the two agents agree).',
    '',
    '## Decision outcomes',
    '',
    table,
    '',
    '## Per-decision detail (recommendation · challenge · rebuttal · status)',
    '',
    ...perDecision,
    '## Raw role outputs (audit trail)',
    '',
    '> Also written verbatim as `decision-challenge.md` and `decision-rebuttal.md`.',
    '',
    '### Reviewer challenge (raw)',
    '',
    args.challengeRaw.trim() || '_(empty)_',
    '',
    '### Builder rebuttal (raw)',
    '',
    args.rebuttalRaw.trim() || '_(empty)_',
    '',
  ].join('\n');
}

/** The decision-bearing artifacts injected into both decision-review postures. */
interface DecisionSources {
  /** Builder's approved run summary (`build-<n>.md`). */
  buildArtifact: string;
  /** Slice spec named by SLICE_DOC (the committed matrix), '' when absent. */
  specArtifact: string;
  /** SLICE_DOC path for labeling, or null. */
  sliceDoc: string | null;
}

/**
 * cwd header + selection packet + the decision-bearing artifact(s), shared by
 * both postures. The spec (SLICE_DOC) is injected when present — the matrix may
 * live there rather than in the build summary (review-0 fix), and the challenger
 * must see what it is challenging.
 */
function decisionReviewPreamble(
  targetDir: string,
  packetRaw: string,
  sources: DecisionSources
): string[] {
  const parts = [
    cwdHeader(targetDir),
    '',
    '# Slice selection packet (names the spec under review: SLICE_DOC, scope)',
    '',
    packetRaw,
  ];
  if (sources.specArtifact.trim()) {
    parts.push(
      '',
      `# Slice spec under review (${sources.sliceDoc ?? 'SLICE_DOC'}) — carries the DECISION_REQUIRED matrix`,
      '',
      sources.specArtifact
    );
  }
  parts.push(
    '',
    "# Builder's approved run summary (may restate the recommendations)",
    '',
    sources.buildArtifact
  );
  return parts;
}

function buildChallengerContext(
  targetDir: string,
  packetRaw: string,
  sources: DecisionSources
): string {
  return [
    ...decisionReviewPreamble(targetDir, packetRaw, sources),
    '',
    '# Your task',
    '',
    'The artifact(s) above surface operator-ratification-class decisions (a',
    'DECISION_REQUIRED matrix). Adversarially review the RECOMMENDATIONS — not the',
    "prose or formatting (review-impl already cleared the artifact). For EACH",
    'decision id, verify the recommended option against the ACTUAL source in this',
    'repository (read the cited files yourself; default to skepticism). Emit, per',
    'decision, the structured block from your role prompt:',
    '',
    '    DECISION: <id>',
    '    ASSESSMENT: agree|challenge',
    '',
    'followed by your reasoning with concrete cites.',
  ].join('\n');
}

function buildRebutterContext(
  targetDir: string,
  packetRaw: string,
  sources: DecisionSources,
  challengeRaw: string
): string {
  return [
    ...decisionReviewPreamble(targetDir, packetRaw, sources),
    '',
    "# The reviewer's challenge",
    '',
    challengeRaw,
    '',
    '# Your task',
    '',
    'Respond to EACH challenged decision honestly — convergence, not ego defense.',
    'For every decision id the reviewer assessed, emit the structured block from',
    'your role prompt:',
    '',
    '    DECISION: <id>',
    '    RESPONSE: concede|rebut',
    '',
    'CONCEDE (state the corrected cell) when the challenge is right; REBUT (cite',
    'source) when it is wrong.',
  ].join('\n');
}

/**
 * Run the additive decision-review phase: one challenge -> rebuttal round, then
 * emit the ratification packet and HALT at `awaiting-ratification`. A provider
 * run that does not COMPLETE (timeout/crash) blocks with a retryable reason,
 * mirroring runReview's infra-failure handling (never a false escalate).
 */
async function runDecisionReview(
  input: TargetRelayInput,
  deps: TargetRelayDeps,
  sliceDir: string,
  status: TargetRelayStatus,
  packetRaw: string,
  posture: WorkItemPosture
): Promise<TargetRelayStatus> {
  // The recommended cells live in the build summary and/or the SLICE_DOC spec
  // (review-0 fix: a SPEC slice's matrix is in SLICE_DOC). Read both; the
  // challenger/rebutter see both, and recommendations are mined from both.
  const { buildArtifact, specArtifact } = await readDecisionSources(
    sliceDir,
    status.iteration,
    input.targetDir,
    status.sliceDoc
  );
  const sources: DecisionSources = {
    buildArtifact,
    specArtifact,
    sliceDoc: status.sliceDoc,
  };
  // Spec first so its `ID:` blocks win over any restatement in the summary.
  // Mined independently (NOT concatenated) so the build summary cannot bleed
  // into the spec's last decision block.
  const recommendationSources = [specArtifact, buildArtifact].filter((s) => s.trim());
  const reviewedDecisionDelivery = async (
    promptPaths: readonly string[],
    directiveLabel: string,
    directive: string,
    capture: ReviewedInputCapture | undefined,
    extra: readonly RunTextInput[] = []
  ): Promise<RunRequest['delivery']> => {
    if (status.assurance?.contract !== 'requirements-assurance/v2-stage2') {
      const prompts = await loadPrompts(input.promptRoot, promptPaths, deps.computeDigest);
      return { kind: 'legacy-live-inputs', prompts, contextText: directive };
    }
    if (!capture) throw new Error('invalid-field: reviewed decision dispatch has no admitted input capture');
    const allocationPath = posture.kind === 'requirements-document' ? posture.admissionAllocation : status.sliceDoc ?? '';
    return {
      kind: 'reviewed-input-snapshots',
      contract: 'requirements-assurance/v2-input-delivery',
      common: await acceptedCommonInputs(input, deps, status.assurance, allocationPath, capture),
      roleSpecific: await roleSpecificInputs({ input, deps, sliceDir, packetRaw, promptPaths, directiveLabel, directive, extra, capture }),
    };
  };

  // --- 1) Supervisor challenges the recommendations (read-only). ---
  const challengeCapture = status.assurance ? captureReviewedInputs(input, deps) : undefined;
  const challengeAdmissionFailure = await assuredDispatchFailure(input, deps, status, posture, challengeCapture);
  if (challengeAdmissionFailure) {
    return blockSlice(sliceDir, status, deps.clock, 'human', `Baseline drift blocked decision-challenge dispatch:\n${challengeAdmissionFailure}`);
  }
  const challengeContext = buildChallengerContext(input.targetDir, packetRaw, sources);
  const challengeRequest: RunRequest = {
    runId: `decision-challenge-${status.sliceId}-${status.iteration}`,
    sliceId: status.sliceId,
    role: 'decision-challenger',
    mode: 'review',
    permission: 'read-only',
    workingDir: input.targetDir,
    model: input.supervisorModel,
    effort: input.supervisorEffort,
    delivery: await reviewedDecisionDelivery(input.challengerPromptPaths, 'decision-challenger-task', challengeContext, challengeCapture),
    inputArtifacts: [],
  };
  const challengeResult = await runWithRetry(
    deps.supervisor,
    challengeRequest,
    `decision-challenge ${status.sliceId}`
  );
  await writeRunRecord(
    sliceDir,
    'decision-challenge',
    makeRunRecord('decision-review', input.supervisorProvider, challengeRequest, challengeResult, input.targetDir, input.promptRoot, status.assurance?.manifest)
  );
  if (challengeResult.status !== RunStatus.COMPLETED) {
    return blockSlice(
      sliceDir,
      status,
      deps.clock,
      input.supervisorProvider,
      `Decision-review challenge did not complete (provider ${challengeResult.status}) after retries: ${challengeResult.error ?? 'unknown error'}. Transient/infra failure, not a decision — resume the slice (raise --timeout if it timed out).`
    );
  }
  const challengeRaw = String(challengeResult.outputArtifacts[0]?.content ?? '');
  await writeFile(join(sliceDir, 'decision-challenge.md'), challengeRaw, 'utf-8');

  // --- 2) Builder rebuts each challenge (read-only). ---
  const rebuttalCapture = status.assurance ? captureReviewedInputs(input, deps) : undefined;
  const rebuttalAdmissionFailure = await assuredDispatchFailure(input, deps, status, posture, rebuttalCapture);
  if (rebuttalAdmissionFailure) {
    return blockSlice(sliceDir, status, deps.clock, 'human', `Baseline drift blocked decision-rebuttal dispatch:\n${rebuttalAdmissionFailure}`);
  }
  const rebuttalContext = buildRebutterContext(input.targetDir, packetRaw, sources, challengeRaw);
  const rebutRequest: RunRequest = {
    runId: `decision-rebuttal-${status.sliceId}-${status.iteration}`,
    sliceId: status.sliceId,
    role: 'decision-rebutter',
    mode: 'review',
    permission: 'read-only',
    workingDir: input.targetDir,
    model: input.builderModel,
    effort: input.builderEffort,
    delivery: await reviewedDecisionDelivery(
      input.rebutterPromptPaths,
      'decision-rebutter-task',
      rebuttalContext,
      rebuttalCapture,
      [generatedRunInput('decision-challenge', 'prior-review', challengeRaw, deps.computeDigest)]
    ),
    inputArtifacts: [],
  };
  const rebutResult = await runWithRetry(
    deps.builder,
    rebutRequest,
    `decision-rebuttal ${status.sliceId}`
  );
  await writeRunRecord(
    sliceDir,
    'decision-rebuttal',
    makeRunRecord('decision-review', input.builderProvider, rebutRequest, rebutResult, input.targetDir, input.promptRoot, status.assurance?.manifest)
  );
  if (rebutResult.status !== RunStatus.COMPLETED) {
    return blockSlice(
      sliceDir,
      status,
      deps.clock,
      input.builderProvider,
      `Decision-review rebuttal did not complete (provider ${rebutResult.status}) after retries: ${rebutResult.error ?? 'unknown error'}. Transient/infra failure, not a decision — resume the slice (raise --timeout if it timed out).`
    );
  }
  const rebuttalRaw = String(rebutResult.outputArtifacts[0]?.content ?? '');
  await writeFile(join(sliceDir, 'decision-rebuttal.md'), rebuttalRaw, 'utf-8');

  // --- 3) Classify + emit the ratification packet (system of record). ---
  // The AUTHORITATIVE decision set is the source DECISION_REQUIRED matrix (spec
  // and/or build summary), NOT the challenger's output: every surfaced decision
  // must reach the human even if the challenger dropped one (review-2 fix).
  // classifyRatification unions these source ids with any extra ids the roles
  // raised and marks an unaddressed source decision contested ('missing').
  const sourceDecisionIds = recommendationSources.flatMap((s) => extractDecisionIds(s));
  const items = classifyRatification(
    sourceDecisionIds,
    parseChallengerAssessments(challengeRaw),
    parseRebutterResponses(rebuttalRaw)
  );
  const generatedAt = deps.clock.now();
  await writeFile(
    join(sliceDir, 'ratification-packet.md'),
    renderRatificationPacket({
      sliceId: status.sliceId,
      generatedAt,
      challenger: input.supervisorProvider,
      rebutter: input.builderProvider,
      items,
      recommendationSources,
      challengeRaw,
      rebuttalRaw,
    }),
    'utf-8'
  );

  // --- 4) HALT for the human (terminal-ish; NOT done, NOT auto-proceed). ---
  const halted: TargetRelayStatus = {
    ...status,
    phase: 'awaiting-ratification',
    updatedAt: generatedAt,
    lastActor: input.builderProvider,
  };
  await writeStatus(sliceDir, halted);
  return halted;
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

/**
 * Execute the target relay: resolve the active slice (resume or select), then
 * run build/review CYCLES until done, blocked, or the cycle cap is reached.
 */
export async function targetRelayLoop(
  input: TargetRelayInput,
  deps: TargetRelayDeps
): Promise<TargetRelayResult> {
  const maxIterations = input.maxIterations ?? 10;
  const amDir = join(input.targetDir, '.agent-manager');

  // An explicit baseline is checked before scaffold writes or provider calls.
  // Allocation is checked later, once the selected/resumed sliceDoc is known.
  let requestedAssurance: AnyPersistedAssurance | undefined;
  if (input.baselinePath !== undefined) {
    const initialAdmission = await admitBaseline(
      input.targetDir,
      input.baselinePath,
      deps.artifactStore
    );
    if (!initialAdmission.ok) {
      return {
        phase: 'blocked',
        stopped: true,
        reason: `Baseline admission failed before provider dispatch:\n${renderAdmissionFailure(initialAdmission)}`,
      };
    }
    if (initialAdmission.admission.enforcement === 'reviewed-inputs') {
      try {
        requestedAssurance = persistedAssuranceV2(initialAdmission.admission, await resolveInstructionSet(input, deps));
      } catch (cause) {
        return { phase: 'blocked', stopped: true, reason: `Reviewed-input instruction admission failed before provider dispatch: ${cause instanceof Error ? cause.message : String(cause)}` };
      }
    } else requestedAssurance = persistedAssurance(initialAdmission.admission);
  }

  await ensureScaffold(amDir);

  // --- Resolve the active slice: explicit --slice, resume, or fresh select ---
  let sliceId: string | undefined;
  let currentPointer: CurrentPointer | undefined;

  if (input.sliceId) {
    sliceId = sanitizeId(input.sliceId);
  } else if (!input.reselect) {
    const currentPath = join(amDir, 'current.json');
    const currentState = await readJsonState(currentPath);
    if (currentState.status === 'malformed') {
      return { phase: 'blocked', stopped: true, reason: `Malformed active current.json: ${currentState.detail}` };
    }
    if (currentState.status === 'ok') {
      const rawCurrent = currentState.value;
      if (!rawCurrent || typeof rawCurrent !== 'object' || Array.isArray(rawCurrent) || typeof (rawCurrent as Record<string, unknown>).sliceId !== 'string') {
        return { phase: 'blocked', stopped: true, reason: 'Malformed active current.json: sliceId is missing or invalid.' };
      }
      const currentMode = assuranceFromUnknown(rawCurrent, '.agent-manager/current.json');
      if (currentMode.present && !currentMode.valid) {
        return { phase: 'blocked', stopped: true, reason: `Malformed assured current.json:\n${currentMode.reason}` };
      }
      const raw = rawCurrent as Record<string, unknown>;
      currentPointer = {
        sliceId: String(raw.sliceId),
        sliceDoc: typeof raw.sliceDoc === 'string' ? raw.sliceDoc : null,
        updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : '',
        ...(currentMode.present && currentMode.valid ? { assurance: currentMode.value } : {}),
      };
      const candidate = sanitizeId(currentPointer.sliceId);
      const statusPath = join(amDir, 'slices', candidate, 'status.json');
      const statusState = await readJsonState(statusPath);
      if (statusState.status !== 'ok') {
        return {
          phase: 'blocked',
          sliceId: candidate,
          stopped: true,
          reason: `Active current.json points to a ${statusState.status} status.json for slice '${candidate}'${statusState.status === 'malformed' ? `: ${statusState.detail}` : '.'}`,
        };
      }
      if (!isTargetRelayStatusShape(statusState.value)) {
        return { phase: 'blocked', sliceId: candidate, stopped: true, reason: `Active current.json points to a malformed status.json for slice '${candidate}'.` };
      }
      const st = statusState.value;
      const statusMode = assuranceFromUnknown(statusState.value, `.agent-manager/slices/${candidate}/status.json`);
      if (statusMode.present && !statusMode.valid) {
        return { phase: 'blocked', sliceId: candidate, stopped: true, reason: `Malformed assured status.json:\n${statusMode.reason}` };
      }
      if (currentMode.present !== statusMode.present || (currentMode.present && currentMode.valid && statusMode.present && statusMode.valid && !sameAssurance(currentMode.value, statusMode.value))) {
        return { phase: 'blocked', sliceId: candidate, stopped: true, reason: 'Assurance state mismatch between current.json and status.json.' };
      }
      if (st && st.phase !== 'done' && st.phase !== 'blocked') {
        sliceId = candidate; // resume in-flight slice
      } else if (st && st.phase === 'blocked') {
        return {
          phase: 'blocked',
          sliceId: candidate,
          stopped: true,
          reason: `Active slice '${candidate}' is blocked (see slices/${candidate}/notes-for-human.md). Pass --slice ${candidate} to unblock and retry (raise --max-iter if it hit the cycle cap), or --reselect to choose a new slice.`,
        };
      }
      // A completed status permits the established fresh-selection behavior.
    }
  }

  // --- Fresh selection if no slice resolved ---
  if (!sliceId) {
    console.log(`  [select-slice] supervisor=${input.supervisorProvider} (read-only)`);
    let selection: Awaited<ReturnType<typeof runSelectSlice>>;
    try { selection = await runSelectSlice(input, deps, amDir, requestedAssurance); }
    catch (cause) { return { phase: 'blocked', stopped: true, reason: `Selection input preparation failed before provider dispatch: ${cause instanceof Error ? cause.message : String(cause)}` }; }
    await writeFile(join(amDir, 'pending-selection.md'), selection.raw, 'utf-8');

    if (selection.status === 'blocked') {
      await writeRunRecord(
        amDir,
        'pending-select',
        makeRunRecord(
          'select-slice',
          input.supervisorProvider,
          selection.request,
          selection.result,
          input.targetDir,
          input.promptRoot,
          requestedAssurance?.manifest
        )
      );
      await writeFile(
        join(amDir, 'notes-for-human.md'),
        `# Blocked at select-slice\n\n${selection.reason}\n\n## Supervisor output\n\n${selection.raw}\n`,
        'utf-8'
      );
      return {
        phase: 'blocked',
        stopped: true,
        reason: selection.reason ?? 'Blocked during select-slice.',
      };
    }

    if (requestedAssurance !== undefined) {
      let selectedPosture: WorkItemPosture;
      try { selectedPosture = parseWorkItemPosture(selection.raw, requestedAssurance); }
      catch (cause) { return { phase: 'blocked', stopped: true, reason: cause instanceof Error ? cause.message : String(cause) }; }
      const allocationAdmission = await admitBaseline(
        input.targetDir,
        requestedAssurance.manifest.path,
        deps.artifactStore,
        {
          expectedManifest: requestedAssurance.manifest,
          allocationPath: selectedPosture.kind === 'requirements-document' ? selectedPosture.admissionAllocation : selection.sliceDoc ?? '',
        }
      );
      if (!allocationAdmission.ok) {
        const reason = `Selected slice failed baseline allocation admission:\n${renderAdmissionFailure(allocationAdmission)}`;
        await writeFile(join(amDir, 'notes-for-human.md'), `# Blocked at baseline admission\n\n${reason}\n`, 'utf-8');
        return { phase: 'blocked', stopped: true, reason };
      }
      if (requestedAssurance.contract === 'requirements-assurance/v1-stage1') requestedAssurance = persistedAssurance(allocationAdmission.admission);
    }

    sliceId = sanitizeId(selection.sliceId as string);
    const sliceDir = join(amDir, 'slices', sliceId);
    await mkdir(join(sliceDir, 'runs'), { recursive: true });
    await writeFile(join(sliceDir, 'selection.md'), selection.raw, 'utf-8');
    await writeFile(
      join(sliceDir, 'selection.json'),
      JSON.stringify(
        {
          status: 'selected',
          sliceId,
          sliceDoc: selection.sliceDoc ?? null,
          selectedBy: input.supervisorProvider,
          raw: selection.raw,
        },
        null,
        2
      ),
      'utf-8'
    );
    await writeRunRecord(
      sliceDir,
      'select',
      makeRunRecord(
        'select-slice',
        input.supervisorProvider,
        selection.request,
        selection.result,
        input.targetDir,
        input.promptRoot,
        requestedAssurance?.manifest
      )
    );

    const initial: TargetRelayStatus = {
      phase: 'implement',
      sliceId,
      sliceDoc: selection.sliceDoc ?? null,
      iteration: 0,
      updatedAt: deps.clock.now(),
      lastActor: input.supervisorProvider,
      builderProvider: input.builderProvider,
      supervisorProvider: input.supervisorProvider,
      ...(requestedAssurance ? { assurance: requestedAssurance } : {}),
    };
    await writeStatus(sliceDir, initial);
    await writeCurrent(amDir, {
      sliceId,
      sliceDoc: selection.sliceDoc ?? null,
      updatedAt: deps.clock.now(),
      ...(requestedAssurance ? { assurance: requestedAssurance } : {}),
    });

    if (input.until === 'select-slice') {
      if (requestedAssurance) {
        console.log(`  [assurance] baseline-admission ${requestedAssurance.manifest.path} ${requestedAssurance.manifest.sha256}`);
      }
      return {
        phase: 'implement',
        sliceId,
        stopped: true,
        reason: 'Stopped after select-slice (--until). Re-run without --until to build/review this slice.',
      };
    }
  }

  // --- Load resolved slice state ---
  const sliceDir = join(amDir, 'slices', sliceId);
  const statusPath = join(sliceDir, 'status.json');
  const statusState = await readJsonState(statusPath);
  if (statusState.status !== 'ok') {
    return {
      phase: 'blocked',
      sliceId,
      stopped: true,
      reason: `${statusState.status === 'missing' ? 'No' : 'Malformed'} status.json for slice '${sliceId}' (cannot resume)${statusState.status === 'malformed' ? `: ${statusState.detail}` : '.'}`,
    };
  }
  if (!isTargetRelayStatusShape(statusState.value)) {
    return { phase: 'blocked', sliceId, stopped: true, reason: `Malformed status.json for slice '${sliceId}' (cannot resume): required relay fields are missing or invalid.` };
  }
  let status = statusState.value;
  if (status.sliceId !== sliceId) {
    return { phase: 'blocked', sliceId, stopped: true, reason: `Status subject mismatch: status.json names slice '${status.sliceId}', expected '${sliceId}'.` };
  }
  if (status.phase === 'select-slice') {
    return {
      phase: 'blocked',
      sliceId,
      stopped: true,
      reason: `Active status phase 'select-slice' is not resumable for slice '${sliceId}'; selection has not established a slice status.`,
    };
  }
  const loadedMode = assuranceFromUnknown(statusState.value, `.agent-manager/slices/${sliceId}/status.json`);
  if (loadedMode.present && !loadedMode.valid) {
    return { phase: 'blocked', sliceId, stopped: true, reason: `Malformed assured status.json:\n${loadedMode.reason}` };
  }

  const persistedMode = loadedMode.present && loadedMode.valid ? loadedMode.value : undefined;
  if (input.sliceId) {
    const explicitCurrentState = await readJsonState(join(amDir, 'current.json'));
    if (explicitCurrentState.status === 'malformed' && (persistedMode || requestedAssurance)) {
      return { phase: 'blocked', sliceId, stopped: true, reason: `Malformed active current.json for assured slice: ${explicitCurrentState.detail}` };
    }
    if (
      explicitCurrentState.status === 'ok' &&
      (persistedMode || requestedAssurance) &&
      (!explicitCurrentState.value ||
        typeof explicitCurrentState.value !== 'object' ||
        Array.isArray(explicitCurrentState.value) ||
        typeof (explicitCurrentState.value as Record<string, unknown>).sliceId !== 'string')
    ) {
      return { phase: 'blocked', sliceId, stopped: true, reason: 'Malformed active current.json for assured slice: sliceId is missing or invalid.' };
    }
    if (explicitCurrentState.status === 'ok' && explicitCurrentState.value && typeof explicitCurrentState.value === 'object' && !Array.isArray(explicitCurrentState.value)) {
      const explicitRecord = explicitCurrentState.value as Record<string, unknown>;
      if (explicitRecord.sliceId === sliceId) {
        const explicitCurrentMode = assuranceFromUnknown(explicitCurrentState.value, '.agent-manager/current.json');
        if (explicitCurrentMode.present && !explicitCurrentMode.valid) {
          return { phase: 'blocked', sliceId, stopped: true, reason: `Malformed assured current.json:\n${explicitCurrentMode.reason}` };
        }
        const currentModeValue = explicitCurrentMode.present && explicitCurrentMode.valid ? explicitCurrentMode.value : undefined;
        if ((currentModeValue === undefined) !== (persistedMode === undefined) || (currentModeValue && persistedMode && !sameAssurance(currentModeValue, persistedMode))) {
          // A first explicit --baseline invocation is allowed to promote two
          // matching legacy records together. Every already-assured mismatch blocks.
          if (!(requestedAssurance && currentModeValue === undefined && persistedMode === undefined)) {
            return { phase: 'blocked', sliceId, stopped: true, reason: 'Assurance state mismatch between current.json and status.json.' };
          }
        }
      }
    }
  }
  if (requestedAssurance && persistedMode && !sameAssurance(requestedAssurance, persistedMode)) {
    return { phase: 'blocked', sliceId, stopped: true, reason: `Baseline conflict: --baseline resolved to ${requestedAssurance.manifest.path} ${requestedAssurance.manifest.sha256}, but status.json persists ${persistedMode.manifest.path} ${persistedMode.manifest.sha256}.` };
  }
  const activeMode = persistedMode ?? requestedAssurance;
  let packetRaw: string;
  try { packetRaw = await readFile(join(sliceDir, 'selection.md'), 'utf-8'); }
  catch (cause) {
    if (activeMode) return { phase: 'blocked', sliceId, stopped: true, reason: `missing: active assured selection.md is required: ${cause instanceof Error ? cause.message : String(cause)}` };
    packetRaw = '';
  }
  let posture: WorkItemPosture;
  try { posture = parseWorkItemPosture(packetRaw, activeMode); }
  catch (cause) { return { phase: 'blocked', sliceId, stopped: true, reason: cause instanceof Error ? cause.message : String(cause) }; }
  let stage3: Stage3Context | undefined;
  if (activeMode) {
    const loadedAdmission = await loadBaselineClosure(
      input.targetDir,
      activeMode.manifest.path,
      deps.artifactStore,
      { expectedManifest: activeMode.manifest, allocationPath: posture.kind === 'requirements-document' ? posture.admissionAllocation : status.sliceDoc ?? '' }
    );
    const allocationAdmission = loadedAdmission.result;
    if (!allocationAdmission.ok) {
      return { phase: 'blocked', sliceId, stopped: true, reason: `Baseline admission failed for active slice:\n${renderAdmissionFailure(allocationAdmission)}` };
    }
    if (activeMode.contract === 'requirements-assurance/v2-stage2' && loadedAdmission.manifest?.formatVersion === 2 && posture.kind === 'implementation') {
      const allowed = new Set(loadedAdmission.manifest.reviewObligationIds);
      for (const id of posture.implementObligationIds ?? []) if (!allowed.has(id)) return { phase: 'blocked', sliceId, stopped: true, reason: `review-coverage-unknown: IMPLEMENT_OBLIGATION_IDS '${id}' was not in the reviewed manifest scope` };
      try {
        stage3 = await loadStage3Context({ workItemId: sliceId, sliceDoc: status.sliceDoc ?? '', assurance: activeMode, posture, manifest: loadedAdmission.manifest, admittedSnapshots: loadedAdmission.snapshots });
      } catch (cause) {
        return { phase: 'blocked', sliceId, stopped: true, reason: cause instanceof Error ? cause.message : String(cause) };
      }
    }
    if (status.candidateTracking && !stage3) {
      return { phase: 'blocked', sliceId, stopped: true, reason: 'Malformed active status.json: candidateTracking is valid only for an admitted stage-3 implementation allocation.' };
    }
    const mode = activeMode.contract === 'requirements-assurance/v2-stage2'
      ? persistedAssuranceV2(allocationAdmission.admission, activeMode.instructions)
      : persistedAssurance(allocationAdmission.admission);
    status = { ...status, assurance: mode };
    await writeStatus(sliceDir, status);
    await writeCurrent(amDir, {
      sliceId,
      sliceDoc: status.sliceDoc,
      updatedAt: deps.clock.now(),
      assurance: mode,
    });
    console.log(`  [assurance] ${mode.enforcement} ${mode.manifest.path} ${mode.manifest.sha256}`);
  } else {
    if (status.candidateTracking) {
      return { phase: 'blocked', sliceId, stopped: true, reason: 'Malformed active status.json: candidateTracking cannot be resumed without an admitted stage-3 baseline and allocation.' };
    }
    if (currentPointer?.assurance !== undefined) {
      return { phase: 'blocked', sliceId, stopped: true, reason: 'Assured current.json cannot resume a legacy status.json.' };
    }
    console.log('  [assurance] legacy (requirements assurance not enforced)');
  }

  // Explicit --slice on a terminal slice is an operator override.
  if (input.sliceId) {
    if (status.phase === 'done') {
      return {
        phase: 'done',
        sliceId,
        stopped: true,
        reason: 'Slice already done. Use --reselect to choose a new slice.',
      };
    }
    if (status.phase === 'blocked') {
      if (stage3) {
        const reviewPath = join(sliceDir, `review-${status.iteration}.json`);
        const retainedReview = await readJsonState(reviewPath);
        if (retainedReview.status === 'malformed') {
          return {
            phase: 'blocked',
            sliceId,
            stopped: true,
            reason: `Cannot safely resume: retained Stage-3 review is malformed or unreadable: ${retainedReview.detail}`,
          };
        }
        if (retainedReview.status === 'ok') {
          const envelope = retainedReview.value;
          if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
            return { phase: 'blocked', sliceId, stopped: true, reason: 'Cannot safely resume: retained Stage-3 review has an invalid envelope.' };
          }
          const fields = Object.keys(envelope).sort().join(',');
          const record = envelope as Record<string, unknown>;
          const parsed = record.parsed;
          if (fields !== 'iteration,parsed,raw' || record.iteration !== status.iteration || typeof record.raw !== 'string' || !parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return { phase: 'blocked', sliceId, stopped: true, reason: 'Cannot safely resume: retained Stage-3 review has an invalid envelope.' };
          }
          const parsedRecord = parsed as Record<string, unknown>;
          if (parsedRecord.result === 'decision-required') {
            const rawReview = parseAssuranceJson(record.raw, reviewPath);
            const rawRecord = rawReview.ok && rawReview.value && typeof rawReview.value === 'object' && !Array.isArray(rawReview.value)
              ? rawReview.value as Record<string, unknown>
              : undefined;
            const decisions = parsedRecord.decisions;
            const decisionShapeOk = Array.isArray(decisions) && decisions.length > 0 && decisions.every((decision) => {
              if (!decision || typeof decision !== 'object' || Array.isArray(decision)) return false;
              const item = decision as Record<string, unknown>;
              return typeof item.decisionId === 'string' && typeof item.question === 'string' &&
                typeof item.recommendation === 'string' && typeof item.blockingReason === 'string' &&
                Array.isArray(item.options) && item.options.length > 0 && item.options.every((option) =>
                  !!option && typeof option === 'object' && !Array.isArray(option) &&
                  typeof (option as Record<string, unknown>).option === 'string' &&
                  typeof (option as Record<string, unknown>).reward === 'string' &&
                  typeof (option as Record<string, unknown>).risk === 'string'
                );
            });
            if (!rawRecord || rawRecord.result !== 'decision-required' || JSON.stringify(rawRecord.decisions) !== JSON.stringify(decisions) || !decisionShapeOk) {
              return { phase: 'blocked', sliceId, stopped: true, reason: 'Cannot safely resume: retained Stage-3 decision evidence is inconsistent.' };
            }
            return {
              phase: 'blocked',
              sliceId,
              stopped: true,
              reason: `Stage-3 implementation review still requires an authorized decision:\n${renderDecisionMatrix(decisions as ImplementationReviewResult['decisions'])}`,
            };
          }
          const hasRecordedErrors = Array.isArray(parsedRecord.errors) && parsedRecord.errors.length > 0;
          if (!hasRecordedErrors && parsedRecord.result !== 'accepted' && parsedRecord.result !== 'refinement-required') {
            return { phase: 'blocked', sliceId, stopped: true, reason: 'Cannot safely resume: retained Stage-3 review has an unknown result.' };
          }
        }
      }
      // Retry index depends on whether the blocked iteration was actually built.
      // The run records (filesystem = system of record) are the signal:
      //  - build-<i>.json EXISTS  => mid-cycle block (builder failed / reviewer
      //    escalated). Advance to i+1 so existing records are preserved.
      //  - build-<i>.json ABSENT  => cap block: a prior `revise` already advanced
      //    the index to a never-built cycle. Retry THAT index; incrementing would
      //    skip it and leave a build-/review- hole.
      const builtThisIteration = await fileExists(
        join(sliceDir, 'runs', `build-${status.iteration}.json`)
      );
      const nextIteration = builtThisIteration
        ? status.iteration + 1
        : status.iteration;
      status = {
        ...status,
        phase: 'implement',
        iteration: nextIteration,
        updatedAt: deps.clock.now(),
        lastActor: 'human',
        ...(status.candidateTracking?.state === 'evidence-bound'
          ? { candidateTracking: { contract: 'requirements-assurance/v3-candidate-tracking' as const, state: 'building' as const, baseRevision: status.candidateTracking.baseRevision } }
          : {}),
      };
      await writeStatus(sliceDir, status);
      console.log(
        `  [resume] unblocked slice ${sliceId}; retrying at cycle ${nextIteration + 1}`
      );
    }
  }

  // --- Build/review CYCLES, then (ADDITIVELY) decision-review when earned. ---
  //
  // Additive-parity invariant: for a slice WITHOUT the DECISION_REQUIRED marker,
  // `status.phase` is only ever implement/review-impl/done/blocked, so every
  // `decision-review`/`awaiting-ratification` clause below is dead and the
  // condition collapses to the original
  //   phase !== done && phase !== blocked && iteration < maxIterations.
  // The review-impl guard is exact: runReview was previously the unconditional
  // tail of each iteration, and it is reached only with phase === 'review-impl'
  // (runImplement yields review-impl or breaks on blocked).
  while (
    status.phase !== 'done' &&
    status.phase !== 'blocked' &&
    status.phase !== 'awaiting-ratification' &&
    (status.iteration < maxIterations || status.phase === 'decision-review')
  ) {
    // Decision-review is NOT cycle-bounded: it runs once, post-approval, then
    // halts. (The `|| decision-review` above lets it run even if approval
    // landed on the final allowed cycle.)
    if (status.phase === 'decision-review') {
      console.log(
        `  [decision-review] adversarial challenge -> rebuttal (one round) for ${status.sliceId}`
      );
      try { status = await runDecisionReview(input, deps, sliceDir, status, packetRaw, posture); }
      catch (cause) { status = await blockSlice(sliceDir, status, deps.clock, 'human', cause instanceof Error ? cause.message : String(cause)); }
      continue;
    }

    // Run implement only if this cycle has not built yet (handles resume at
    // review-impl, where the builder already ran).
    if (status.phase === 'implement') {
      const dispatchCapture = status.assurance ? captureReviewedInputs(input, deps) : undefined;
      const admissionFailure = await assuredDispatchFailure(input, deps, status, posture, dispatchCapture);
      if (admissionFailure) {
        status = await blockSlice(
          sliceDir,
          status,
          deps.clock,
          'human',
          `Baseline drift blocked builder dispatch:\n${admissionFailure}`
        );
        break;
      }
      console.log(
        `  [cycle ${status.iteration + 1}/${maxIterations}] implement builder=${input.builderProvider}`
      );
      try { status = await runImplement(input, deps, sliceDir, status, packetRaw, posture, dispatchCapture, stage3); }
      catch (cause) {
        // runImplement may already have persisted the stage-3 base before a
        // later provider/report failure. Preserve that newer state so an
        // explicit resume can continue the partial candidate without treating
        // it as a new dirty first dispatch.
        const persistedAfterFailure = await readJsonState(join(sliceDir, 'status.json'));
        const blockingStatus = persistedAfterFailure.status === 'ok' && isTargetRelayStatusShape(persistedAfterFailure.value) && persistedAfterFailure.value.sliceId === status.sliceId
          ? persistedAfterFailure.value
          : status;
        status = await blockSlice(sliceDir, blockingStatus, deps.clock, 'human', cause instanceof Error ? cause.message : String(cause));
      }
      if (status.phase === 'blocked') break;
    }

    if (status.phase === 'review-impl') {
      // A new role gets a fresh snapshot attempt so drift after the builder is
      // detected, while the guard and DTO for this reviewer share exact bytes.
      const dispatchCapture = status.assurance ? captureReviewedInputs(input, deps) : undefined;
      const admissionFailure = await assuredDispatchFailure(input, deps, status, posture, dispatchCapture);
      if (admissionFailure) {
        status = await blockSlice(
          sliceDir,
          status,
          deps.clock,
          'human',
          `Baseline drift blocked reviewer dispatch:\n${admissionFailure}`
        );
        break;
      }
      console.log(
        `  [cycle ${status.iteration + 1}/${maxIterations}] review-impl supervisor=${input.supervisorProvider}`
      );
      try { status = await runReview(input, deps, sliceDir, status, packetRaw, posture, dispatchCapture, stage3); }
      catch (cause) { status = await blockSlice(sliceDir, status, deps.clock, 'human', cause instanceof Error ? cause.message : String(cause)); }
    }
  }

  if (
    status.phase !== 'done' &&
    status.phase !== 'blocked' &&
    status.phase !== 'awaiting-ratification'
  ) {
    status = await blockSlice(
      sliceDir,
      status,
      deps.clock,
      'human',
      `Max iterations (${maxIterations} cycles) reached without an approved verdict.`
    );
  }

  const result: TargetRelayResult = {
    phase: status.phase,
    sliceId,
    stopped: true,
  };
  if (status.phase === 'done') return posture.kind === 'requirements-document'
    ? { ...result, reason: 'reviewed baseline awaiting operator approval' }
    : stage3
      ? { ...result, reason: `implementation review: accepted\nverification: required checks passed for ${status.candidateTracking?.state === 'evidence-bound' ? status.candidateTracking.candidateSha256 : 'recorded candidate'}\noperator acceptance: not recorded; ASSURANCE-4 gate not delivered\nrelease/deployment: not performed` }
      : result;
  if (status.phase === 'awaiting-ratification') {
    return {
      ...result,
      reason: `Decision review complete; human ratification required. See ${join('.agent-manager', 'slices', sliceId, 'ratification-packet.md')}`,
    };
  }
  return {
    ...result,
    reason: `See ${join('.agent-manager', 'slices', sliceId, 'notes-for-human.md')}`,
  };
}
