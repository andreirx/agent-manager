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

import type { ClockPort, ProviderRunnerPort } from '../ports/index.js';
import type { RunRequest, RunResult } from '../ports/provider-runner.js';
import type { PromptRef } from '../../core/run-record.js';
import { RunStatus } from '../../core/run-record.js';
import { parseVerdict } from './relay-shared.js';

/** Phase in the target-owned relay. */
export type TargetPhase =
  | 'select-slice'
  | 'implement'
  | 'review-impl'
  | 'blocked'
  | 'done';

/** Actor identity (provider playing a role, or a human). */
export type TargetActor = 'claude' | 'codex' | 'human';

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
}

/** Pointer to the active slice, so a later invocation resumes (not reselects). */
interface CurrentPointer {
  sliceId: string;
  sliceDoc: string | null;
  updatedAt: string;
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
  /** Resume this specific slice id (skip selection). */
  sliceId?: string;
  /** Force a fresh selection even if an active slice exists. */
  reselect?: boolean;
  /** Early stop after selection (no building). Only 'select-slice' supported. */
  until?: TargetPhase;
}

/** Dependencies for the target relay. */
export interface TargetRelayDeps {
  clock: ClockPort;
  builder: ProviderRunnerPort;
  supervisor: ProviderRunnerPort;
  computeDigest: (content: string) => string;
}

/** Result of a full target relay run. */
export interface TargetRelayResult {
  phase: TargetPhase;
  sliceId?: string;
  stopped: boolean;
  reason?: string;
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

function buildReviewerContext(targetDir: string, packetRaw: string): string {
  return [
    cwdHeader(targetDir),
    '',
    '# Slice selection packet (authoritative acceptance criteria)',
    '',
    packetRaw,
    '',
    '# Your task',
    '',
    "Review the builder's UNCOMMITTED changes in the target working tree. Inspect them yourself with `git diff` and `git status`.",
    'Judge strictly against DEFINITION_OF_DONE and the declared scope. Label every claim OBSERVED or INFERRED.',
    'Respond with the verdict line FIRST: `STATUS: approved|revise|escalate`, then the rationale.',
  ].join('\n');
}

/** Idempotently provision the .agent-manager scaffold in ANY target repo. */
async function ensureScaffold(amDir: string): Promise<void> {
  await mkdir(amDir, { recursive: true });
  await writeIfAbsent(
    join(amDir, '.gitignore'),
    [
      '# Agent Manager (target-owned relay) operational output.',
      '#',
      '# Raw provider execution traces are operational, not system-of-record.',
      '# Workflow artifacts (selection.json, status.json, build-*.md,',
      '# review-*.json, runs/*.json, notes-for-human.md, current.json) ARE',
      '# committed.',
      '',
      'logs/',
      'pending-selection.md',
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
      'directory only holds its artifacts for work performed here.',
      '',
      'This repository is the system of record. The builder edits files (left',
      'uncommitted); the reviewer inspects the resulting `git diff`.',
      '',
      'Phase graph: select-slice -> (implement -> review-impl)* -> done | blocked.',
      'Verdict contract: reviewer first line `STATUS: approved|revise|escalate`.',
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

async function readJson<T>(path: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(path, 'utf-8')) as T;
  } catch {
    return undefined;
  }
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
  const result = await deps.supervisor.run(request);

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
  const result = await deps.builder.run(request);

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
      `Builder failed at iteration ${status.iteration}: ${result.error ?? 'unknown error'}`
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
  const request: RunRequest = {
    runId: `review-${status.sliceId}-${status.iteration}`,
    sliceId: status.sliceId,
    role: 'reviewer',
    mode: 'review',
    permission: 'read-only',
    workingDir: input.targetDir,
    model: input.supervisorModel,
    effort: input.supervisorEffort,
    prompts,
    contextText: buildReviewerContext(input.targetDir, packetRaw),
    inputArtifacts: [],
  };
  const result = await deps.supervisor.run(request);

  await writeRunRecord(
    sliceDir,
    `review-${status.iteration}`,
    makeRunRecord('review-impl', input.supervisorProvider, request, result, input.targetDir)
  );

  const raw =
    result.status === RunStatus.COMPLETED
      ? String(result.outputArtifacts[0]?.content ?? '')
      : `Reviewer run failed: ${result.error ?? 'unknown error'}`;
  const verdict =
    result.status === RunStatus.COMPLETED ? parseVerdict(raw) : 'escalate';

  await writeFile(
    join(sliceDir, `review-${status.iteration}.json`),
    JSON.stringify({ iteration: status.iteration, verdict, raw }, null, 2),
    'utf-8'
  );

  if (verdict === 'approved') {
    const done: TargetRelayStatus = {
      ...status,
      phase: 'done',
      updatedAt: deps.clock.now(),
      lastActor: input.supervisorProvider,
    };
    await writeStatus(sliceDir, done);
    return done;
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
  await ensureScaffold(amDir);

  // --- Resolve the active slice: explicit --slice, resume, or fresh select ---
  let sliceId: string | undefined;

  if (input.sliceId) {
    sliceId = sanitizeId(input.sliceId);
  } else if (!input.reselect) {
    const current = await readJson<CurrentPointer>(join(amDir, 'current.json'));
    if (current) {
      const candidate = sanitizeId(current.sliceId);
      const st = await readJson<TargetRelayStatus>(
        join(amDir, 'slices', candidate, 'status.json')
      );
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
      // done (or missing status) => fall through to a fresh selection.
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
    };
    await writeStatus(sliceDir, initial);
    await writeCurrent(amDir, {
      sliceId,
      sliceDoc: selection.sliceDoc ?? null,
      updatedAt: deps.clock.now(),
    });

    if (input.until === 'select-slice') {
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
  let status = await readJson<TargetRelayStatus>(join(sliceDir, 'status.json'));
  if (!status) {
    return {
      phase: 'blocked',
      sliceId,
      stopped: true,
      reason: `No status.json for slice '${sliceId}' (cannot resume).`,
    };
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

  // --- Build/review CYCLES. maxIterations bounds the cycle index globally. ---
  while (
    status.phase !== 'done' &&
    status.phase !== 'blocked' &&
    status.iteration < maxIterations
  ) {
    // Run implement only if this cycle has not built yet (handles resume at
    // review-impl, where the builder already ran).
    if (status.phase === 'implement') {
      console.log(
        `  [cycle ${status.iteration + 1}/${maxIterations}] implement builder=${input.builderProvider}`
      );
      status = await runImplement(input, deps, sliceDir, status, packetRaw);
      if (status.phase === 'blocked') break;
    }

    console.log(
      `  [cycle ${status.iteration + 1}/${maxIterations}] review-impl supervisor=${input.supervisorProvider}`
    );
    status = await runReview(input, deps, sliceDir, status, packetRaw);
  }

  if (status.phase !== 'done' && status.phase !== 'blocked') {
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
  return {
    ...result,
    reason: `See ${join('.agent-manager', 'slices', sliceId, 'notes-for-human.md')}`,
  };
}
