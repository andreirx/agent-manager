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
import type { PromptRef } from '../../core/run-record.js';
import { RunStatus } from '../../core/run-record.js';
import {
  parseApprovalRecord,
  parseAssuranceJson,
  parseBaselineManifest,
  parsePersistedAssurance,
  persistedAssurance,
  renderAssuranceError,
  validateBaselineAdmission,
  type AssuranceFileSnapshot,
  type AssuranceSnapshot,
  type BaselineAdmissionResult,
  type PersistedAssurance,
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
  assurance?: PersistedAssurance;
}

/** Pointer to the active slice, so a later invocation resumes (not reselects). */
interface CurrentPointer {
  sliceId: string;
  sliceDoc: string | null;
  updatedAt: string;
  assurance?: PersistedAssurance;
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
  options: { expectedManifest?: PersistedAssurance['manifest']; allocationPath?: string } = {}
): Promise<BaselineAdmissionResult> {
  const manifestSegments = manifestPath.split('/');
  if (
    manifestPath.length === 0 ||
    manifestPath.startsWith('/') ||
    manifestPath.includes('\\') ||
    manifestSegments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')
  ) {
    const code = manifestPath.includes('\\') || manifestPath.length === 0 ? 'invalid-field' : 'path-escape';
    return {
      ok: false,
      errors: [{ code, recordPath: manifestPath, location: '/', detail: 'baseline path must be a target-relative POSIX file path' }],
    };
  }
  const snapshots = new Map<string, AssuranceSnapshot>();
  const readOnce = async (path: string): Promise<AssuranceSnapshot> => {
    const existing = snapshots.get(path);
    if (existing) return existing;
    const snapshot = await artifactStore.readContainedFile(targetDir, path);
    snapshots.set(path, snapshot);
    return snapshot;
  };

  const manifestSnapshot = await readOnce(manifestPath);
  if (manifestSnapshot.status === 'ok') {
    const manifest = parseBaselineManifest(manifestSnapshot as AssuranceFileSnapshot);
    if (manifest.ok) {
      for (const ref of [...manifest.value.requirements, ...manifest.value.dependencies]) {
        await readOnce(ref.path);
      }
      const reviewPath = `docs/assurance/${manifest.value.baselineId}/requirements-review.json`;
      const approvalPath = `docs/assurance/${manifest.value.baselineId}/baseline-approval.json`;
      await readOnce(reviewPath);
      const approvalSnapshot = await readOnce(approvalPath);
      if (approvalSnapshot.status === 'ok') {
        const approval = parseApprovalRecord(approvalSnapshot as AssuranceFileSnapshot);
        if (approval.ok) {
          await readOnce(approval.value.authorityBasis.path);
          for (const decision of approval.value.resolvedDecisions) {
            await readOnce(decision.record.path);
          }
        }
      }
    }
  }
  return validateBaselineAdmission({
    manifestPath,
    snapshots: [...snapshots.values()],
    ...(options.expectedManifest ? { expectedManifest: options.expectedManifest } : {}),
    ...(options.allocationPath !== undefined ? { allocationPath: options.allocationPath } : {}),
  });
}

function renderAdmissionFailure(result: Extract<BaselineAdmissionResult, { ok: false }>): string {
  return result.errors.map(renderAssuranceError).join('\n');
}

function assuranceFromUnknown(
  container: unknown,
  recordPath: string
): { present: false } | { present: true; valid: true; value: PersistedAssurance } | { present: true; valid: false; reason: string } {
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
  status: TargetRelayStatus
): Promise<string | undefined> {
  if (!status.assurance) return undefined;
  const result = await admitBaseline(
    input.targetDir,
    status.assurance.manifest.path,
    deps.artifactStore,
    {
      expectedManifest: status.assurance.manifest,
      allocationPath: status.sliceDoc ?? '',
    }
  );
  return result.ok ? undefined : renderAdmissionFailure(result);
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
  iteration: number
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
  return parts.join('\n');
}

function buildReviewerContext(
  targetDir: string,
  packetRaw: string,
  buildReport?: string
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
    'Respond with the verdict line FIRST: `STATUS: approved|revise|escalate`, then the rationale.'
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

function sameAssurance(a: PersistedAssurance, b: PersistedAssurance): boolean {
  return (
    a.contract === b.contract &&
    a.enforcement === b.enforcement &&
    a.manifest.path === b.manifest.path &&
    a.manifest.sha256 === b.manifest.sha256
  );
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
    Object.prototype.hasOwnProperty.call(TARGET_ACTOR_VALUES, record.supervisorProvider)
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

/** Build a run record from a request/result pair. */
function makeRunRecord(
  phase: TargetPhase,
  provider: TargetActor,
  request: RunRequest,
  result: RunResult,
  targetDir: string
): TargetRunRecord {
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
    prompts: request.prompts.map((p) => ({ path: p.path, digest: p.digest })),
    workingDir: targetDir,
  };
  return result.error !== undefined ? { ...base, error: result.error } : base;
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
  amDir: string
): Promise<{
  status: 'selected' | 'blocked';
  sliceId?: string;
  sliceDoc?: string;
  raw: string;
  reason?: string;
  result: RunResult;
  request: RunRequest;
}> {
  const prompts = await loadPrompts(
    input.promptRoot,
    input.selectPromptPaths,
    deps.computeDigest
  );

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
    prompts,
    contextText: cwdHeader(input.targetDir),
    inputArtifacts: [],
  };
  const result = await runWithRetry(deps.supervisor, request, 'select-slice');

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
  packetRaw: string
): Promise<TargetRelayStatus> {
  const prompts = await loadPrompts(
    input.promptRoot,
    input.builderPromptPaths,
    deps.computeDigest
  );
  const request: RunRequest = {
    runId: `build-${status.sliceId}-${status.iteration}`,
    sliceId: status.sliceId,
    role: 'builder',
    mode: 'edit',
    permission: 'write',
    workingDir: input.targetDir,
    model: input.builderModel,
    effort: input.builderEffort,
    prompts,
    contextText: buildBuilderContext(input.targetDir, packetRaw, status.iteration),
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
    makeRunRecord('implement', input.builderProvider, request, result, input.targetDir)
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
  packetRaw: string
): Promise<TargetRelayStatus> {
  const prompts = await loadPrompts(
    input.promptRoot,
    input.reviewerPromptPaths,
    deps.computeDigest
  );
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
  const request: RunRequest = {
    runId: `review-${status.sliceId}-${status.iteration}`,
    sliceId: status.sliceId,
    role: 'reviewer',
    mode: 'review',
    permission: input.reviewerPermission ?? 'read-only',
    workingDir: input.targetDir,
    model: input.supervisorModel,
    effort: input.supervisorEffort,
    prompts,
    contextText: buildReviewerContext(input.targetDir, packetRaw, buildReport),
    inputArtifacts: [],
  };
  const result = await runWithRetry(
    deps.supervisor,
    request,
    `review ${status.sliceId} iter ${status.iteration}`
  );

  await writeRunRecord(
    sliceDir,
    `review-${status.iteration}`,
    makeRunRecord('review-impl', input.supervisorProvider, request, result, input.targetDir)
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

  const raw = String(result.outputArtifacts[0]?.content ?? '');
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
  packetRaw: string
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

  // --- 1) Supervisor challenges the recommendations (read-only). ---
  const challengeAdmissionFailure = await assuredDispatchFailure(input, deps, status);
  if (challengeAdmissionFailure) {
    return blockSlice(sliceDir, status, deps.clock, 'human', `Baseline drift blocked decision-challenge dispatch:\n${challengeAdmissionFailure}`);
  }
  const challengerPrompts = await loadPrompts(
    input.promptRoot,
    input.challengerPromptPaths,
    deps.computeDigest
  );
  const challengeRequest: RunRequest = {
    runId: `decision-challenge-${status.sliceId}-${status.iteration}`,
    sliceId: status.sliceId,
    role: 'decision-challenger',
    mode: 'review',
    permission: 'read-only',
    workingDir: input.targetDir,
    model: input.supervisorModel,
    effort: input.supervisorEffort,
    prompts: challengerPrompts,
    contextText: buildChallengerContext(input.targetDir, packetRaw, sources),
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
    makeRunRecord('decision-review', input.supervisorProvider, challengeRequest, challengeResult, input.targetDir)
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
  const rebuttalAdmissionFailure = await assuredDispatchFailure(input, deps, status);
  if (rebuttalAdmissionFailure) {
    return blockSlice(sliceDir, status, deps.clock, 'human', `Baseline drift blocked decision-rebuttal dispatch:\n${rebuttalAdmissionFailure}`);
  }
  const rebutterPrompts = await loadPrompts(
    input.promptRoot,
    input.rebutterPromptPaths,
    deps.computeDigest
  );
  const rebutRequest: RunRequest = {
    runId: `decision-rebuttal-${status.sliceId}-${status.iteration}`,
    sliceId: status.sliceId,
    role: 'decision-rebutter',
    mode: 'review',
    permission: 'read-only',
    workingDir: input.targetDir,
    model: input.builderModel,
    effort: input.builderEffort,
    prompts: rebutterPrompts,
    contextText: buildRebutterContext(input.targetDir, packetRaw, sources, challengeRaw),
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
    makeRunRecord('decision-review', input.builderProvider, rebutRequest, rebutResult, input.targetDir)
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
  let requestedAssurance: PersistedAssurance | undefined;
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
    requestedAssurance = persistedAssurance(initialAdmission.admission);
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
    const selection = await runSelectSlice(input, deps, amDir);
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
          input.targetDir
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
      const allocationAdmission = await admitBaseline(
        input.targetDir,
        requestedAssurance.manifest.path,
        deps.artifactStore,
        {
          expectedManifest: requestedAssurance.manifest,
          allocationPath: selection.sliceDoc ?? '',
        }
      );
      if (!allocationAdmission.ok) {
        const reason = `Selected slice failed baseline allocation admission:\n${renderAdmissionFailure(allocationAdmission)}`;
        await writeFile(join(amDir, 'notes-for-human.md'), `# Blocked at baseline admission\n\n${reason}\n`, 'utf-8');
        return { phase: 'blocked', stopped: true, reason };
      }
      requestedAssurance = persistedAssurance(allocationAdmission.admission);
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
        input.targetDir
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
  if (activeMode) {
    const allocationAdmission = await admitBaseline(
      input.targetDir,
      activeMode.manifest.path,
      deps.artifactStore,
      { expectedManifest: activeMode.manifest, allocationPath: status.sliceDoc ?? '' }
    );
    if (!allocationAdmission.ok) {
      return { phase: 'blocked', sliceId, stopped: true, reason: `Baseline admission failed for active slice:\n${renderAdmissionFailure(allocationAdmission)}` };
    }
    const mode = persistedAssurance(allocationAdmission.admission);
    status = { ...status, assurance: mode };
    await writeStatus(sliceDir, status);
    await writeCurrent(amDir, {
      sliceId,
      sliceDoc: status.sliceDoc,
      updatedAt: deps.clock.now(),
      assurance: mode,
    });
    console.log(`  [assurance] baseline-admission ${mode.manifest.path} ${mode.manifest.sha256}`);
  } else {
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
      };
      await writeStatus(sliceDir, status);
      console.log(
        `  [resume] unblocked slice ${sliceId}; retrying at cycle ${nextIteration + 1}`
      );
    }
  }

  const packetRaw = await readFile(join(sliceDir, 'selection.md'), 'utf-8').catch(
    () => ''
  );

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
      status = await runDecisionReview(input, deps, sliceDir, status, packetRaw);
      continue;
    }

    // Run implement only if this cycle has not built yet (handles resume at
    // review-impl, where the builder already ran).
    if (status.phase === 'implement') {
      const admissionFailure = await assuredDispatchFailure(input, deps, status);
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
      status = await runImplement(input, deps, sliceDir, status, packetRaw);
      if (status.phase === 'blocked') break;
    }

    if (status.phase === 'review-impl') {
      const admissionFailure = await assuredDispatchFailure(input, deps, status);
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
      status = await runReview(input, deps, sliceDir, status, packetRaw);
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
  if (status.phase === 'done') return result;
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
