/**
 * CLI for the target-owned relay.
 *
 * Drives a select -> build -> review loop on an EXTERNAL target repository.
 * The target repo is the system of record; agent-manager only supplies the
 * pinned role prompts and the orchestration. The target is ALWAYS supplied as
 * an argument — no repository is hardcoded.
 *
 * Usage:
 *   npm run relay-target -- <target-path> [options]
 *
 * Options:
 *   --builder    claude|codex|copilot  provider that implements (default: claude)
 *   --builder-model <id>       override builder model         (default: per provider;
 *                              operator picks by slice complexity, e.g. claude-fable-5;
 *                              REQUIRED for copilot to pin a model — its default is empty)
 *   --supervisor-model <id>    override supervisor model
 *   --supervisor claude|codex|copilot  provider that selects+reviews (default: codex)
 *   --shared-prompt <path>      shared system-prompt file
 *                               (default: /Users/apple/CLAUDE-SYSTEM.txt)
 *   --max-iter <n>             max build/review CYCLES         (default: 10)
 *   --timeout <minutes>        per-provider-run timeout        (default: 20)
 *   --reviewer-write           elevate review phase to write (so rmap can run)
 *   --slice <id>               resume a specific slice (skip selection)
 *   --reselect                 force a fresh selection even if a slice is active
 *   --until select-slice       stop after selection (no building)
 *   --dry-run                  print exact provider invocations; do not spawn
 *   --baseline <path>          target-relative stage-1 baseline manifest
 *
 * @module cli
 * @maturity PROTOTYPE
 */

import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, realpathSync } from 'node:fs';
import { lstat, readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, relative, sep, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { SystemClock } from '../adapters/clock/index.js';
import { FilesystemArtifactStore } from '../adapters/filesystem/index.js';
import { ClaudeAdapter } from '../adapters/providers/claude-code/index.js';
import { CodexAdapter } from '../adapters/providers/codex/index.js';
import { CopilotAdapter } from '../adapters/providers/copilot/index.js';
import {
  targetRelayLoop,
  admitBaseline,
  isTargetRelayStatusShape,
  prepareReviewedTargetDryRunDeliveries,
  recordReviewedBaselineApproval,
  type TargetActor,
  type TargetPhase,
  type TargetRelayInput,
  type TargetRelayStatus,
} from '../application/use-cases/relay-target.js';
import type { ProviderSessionRequest, RunRequest } from '../application/ports/provider-runner.js';
import { parseAssuranceJson, parsePersistedAssurance, renderAssuranceError } from '../core/assurance.js';
import type { CandidateCheckpoint, CandidateTreeObservation, CandidateIndexState, CandidateFileState } from '../core/assurance.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
/** agent-manager root: prompt-asset root (NOT the target working dir). */
const promptRoot = resolve(__dirname, '../..');

const DEFAULT_SHARED_PROMPT = '/Users/apple/CLAUDE-SYSTEM.txt';

/** Provider-appropriate model + effort defaults (provider is volatile). */
function providerDefaults(name: TargetActor): { model: string; effort: string } {
  switch (name) {
    case 'claude':
      return { model: 'claude-opus-4-8', effort: 'high' }; // model per human directive 2026-07-31 (back from opus-5); effort high per 2026-07-26
    case 'copilot':
      // Empty model => the adapter emits NO --model flag, so Copilot uses its
      // OWN default model. We do not hardcode a Copilot model id (the exact
      // `--model` spelling is unverified against the installed CLI); the
      // operator selects one per run via --builder-model / --supervisor-model.
      // Effort is ignored by the Copilot adapter (no effort flag exists).
      return { model: '', effort: 'high' };
    case 'codex':
    case 'human':
    default:
      return { model: 'gpt-5.6-terra', effort: 'high' }; // reviewer model per human directive 2026-07-27 (was gpt-5.6-sol)
  }
}

/** Defaults with the operator's per-run model overrides applied (one seam for
 * BOTH the dry-run printer and the live loop — they cannot diverge). */
function resolvedDefaults(
  name: TargetActor,
  role: 'builder' | 'supervisor',
  args: Pick<Args, 'builderModel' | 'supervisorModel'>
): { model: string; effort: string } {
  const def = providerDefaults(name);
  const override = role === 'builder' ? args.builderModel : args.supervisorModel;
  return override !== undefined ? { ...def, model: override } : def;
}

function computeDigest(content: string): string {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

const execFileAsync = promisify(execFile);

/**
 * Concrete `TargetRelayDeps.changedPaths`: the target tree's UNCOMMITTED
 * changed-file set (target-relative, forward-slash paths) via
 * `git status --porcelain`. Feeds the decision-review trigger — a SLICE_DOC this
 * build created or modified appears here because the builder leaves changes
 * uncommitted. `--no-renames` keeps each line `XY <path>`, so the path is always
 * the substring after the 2 status columns + 1 space (slice(3)); a created
 * (untracked `??`) and a modified (` M`) SLICE_DOC both surface.
 *
 * Best-effort by design: a non-repo target or any git failure yields [], so the
 * trigger simply never treats the spec as build-authored (no false
 * decision-review — fail toward the original select/implement/review flow).
 *
 * PROTOTYPE assumption: targetDir is the git repo root (the relay already
 * provisions `.agent-manager/` and runs every provider there), so porcelain
 * paths and SLICE_DOC are both repo-root-relative and compare directly.
 */
async function gitChangedPaths(targetDir: string): Promise<readonly string[]> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['-C', targetDir, 'status', '--porcelain', '--no-renames'],
      { maxBuffer: 16 * 1024 * 1024 }
    );
    return stdout
      .split('\n')
      .map((line) => line.slice(3).trim())
      .filter((p) => p.length > 0);
  } catch {
    return [];
  }
}

function execFileBuffer(file: string, args: readonly string[], options: { cwd?: string; maxBuffer?: number } = {}): Promise<Buffer> {
  return new Promise((accept, reject) => {
    execFile(file, [...args], { ...options, encoding: 'buffer' }, (cause, stdout) => {
      if (cause) reject(cause);
      else accept(stdout as Buffer);
    });
  });
}

function sha256Bytes(bytes: Uint8Array): string {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

async function readGitBlobThroughBatch(targetDir: string, objectId: string): Promise<Buffer> {
  return new Promise((accept, reject) => {
    const child = spawn('git', ['-C', targetDir, 'cat-file', '--batch'], { stdio: ['pipe', 'pipe', 'pipe'] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`git cat-file --batch exited ${String(code)}: ${Buffer.concat(stderr).toString('utf8')}`));
        return;
      }
      const output = Buffer.concat(stdout);
      const newline = output.indexOf(0x0a);
      if (newline < 0) { reject(new Error(`git cat-file --batch returned no header for '${objectId}'`)); return; }
      const header = output.subarray(0, newline).toString('ascii').match(/^([0-9a-f]{40,64}) blob ([0-9]+)$/);
      if (!header || header[1] !== objectId) { reject(new Error(`git cat-file --batch returned an unexpected header for '${objectId}'`)); return; }
      const size = Number(header[2]);
      const body = output.subarray(newline + 1, newline + 1 + size);
      if (!Number.isSafeInteger(size) || body.byteLength !== size || output[newline + 1 + size] !== 0x0a) { reject(new Error(`git cat-file --batch returned malformed blob bytes for '${objectId}'`)); return; }
      accept(body);
    });
    child.stdin.end(`${objectId}\n`);
  });
}

/**
 * Observe the Git-visible candidate without collapsing index and working bytes.
 * Policy remains in core; this mechanism only reports raw, deterministic facts.
 */
async function observeCandidateTree(targetDir: string): Promise<CandidateTreeObservation> {
  const head = (await execFileBuffer('git', ['-C', targetDir, 'rev-parse', 'HEAD'])).toString('utf8').trim();
  const statusBytes = await execFileBuffer('git', ['-C', targetDir, 'status', '--porcelain=v1', '-z', '--untracked-files=all', '--no-renames']);
  const records = new TextDecoder('utf-8', { fatal: true }).decode(statusBytes).split('\0').filter((value) => value.length > 0);
  const entries: CandidateTreeObservation['entries'] = [];
  for (const record of records) {
    if (record.length < 4 || record[2] !== ' ') throw new Error(`Unsupported porcelain record: ${JSON.stringify(record)}`);
    const porcelainStatus = record.slice(0, 2);
    const path = record.slice(3);
    const indexRaw = new TextDecoder('utf-8', { fatal: true }).decode(await execFileBuffer('git', ['-C', targetDir, 'ls-files', '--stage', '-z', '--', path]));
    const indexRecords = indexRaw.split('\0').filter(Boolean);
    let index: CandidateIndexState = { kind: 'absent' };
    if (indexRecords.length > 0) {
      if (indexRecords.length !== 1) throw new Error(`Unsupported multiple index stages for '${path}'`);
      const match = indexRecords[0]?.match(/^(\d{6}) ([0-9a-f]{40,64}) (\d)\t/);
      if (!match) throw new Error(`Malformed index entry for '${path}'`);
      const gitMode = match[1];
      const stage = Number(match[3]);
      if ((gitMode !== '100644' && gitMode !== '100755') || stage !== 0) throw new Error(`Unsupported index node for '${path}' (mode=${gitMode}, stage=${stage})`);
      const blob = await readGitBlobThroughBatch(targetDir, match[2] as string);
      index = { kind: 'present', gitMode, stage: 0, sha256: sha256Bytes(blob), byteLength: blob.byteLength };
    }
    let workingTree: CandidateFileState;
    const absolute = join(targetDir, path);
    try {
      const stat = await lstat(absolute);
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Unsupported working-tree node for '${path}'`);
      const bytes = await readFile(absolute);
      workingTree = { kind: 'present', gitMode: (stat.mode & 0o111) === 0 ? '100644' : '100755', sha256: sha256Bytes(bytes), byteLength: bytes.byteLength };
    } catch (cause) {
      if (typeof cause === 'object' && cause !== null && 'code' in cause && ((cause as { code: unknown }).code === 'ENOENT' || (cause as { code: unknown }).code === 'ENOTDIR')) workingTree = { kind: 'absent' };
      else throw cause;
    }
    entries.push({ path, porcelainStatus, index, workingTree });
  }
  return { baseRevision: head, entries };
}

async function candidateDiff(targetDir: string, checkpoint: CandidateCheckpoint): Promise<string> {
  const headToIndex = (await execFileBuffer('git', ['-C', targetDir, 'diff', '--cached', '--binary', 'HEAD', '--'])).toString('utf8');
  const indexToWorkingTree = (await execFileBuffer('git', ['-C', targetDir, 'diff', '--binary', '--'])).toString('utf8');
  const untracked: string[] = [];
  for (const entry of checkpoint.entries) {
    if (entry.porcelainStatus === '??' && entry.workingTree.kind === 'present') {
      const bytes = await readFile(join(targetDir, entry.path));
      untracked.push(`\n--- /dev/null\n+++ b/${entry.path}\n# untracked raw bytes (base64)\n${bytes.toString('base64')}\n`);
    }
  }
  return [
    '=== HEAD-to-index diff (staged candidate state) ===',
    headToIndex,
    '=== Index-to-working-tree diff (unstaged candidate state) ===',
    indexToWorkingTree,
    '=== Untracked working-tree files (raw bytes as base64) ===',
    untracked.join(''),
  ].join('\n');
}

async function createTrackedFileExclusively(targetDir: string, path: string, bytes: Uint8Array): Promise<void> {
  const absolute = join(targetDir, path);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, bytes, { flag: 'wx' });
}

type RawAdapter = ClaudeAdapter | CodexAdapter | CopilotAdapter;

function makeAdapter(
  name: TargetActor,
  config: {
    logsDir: string;
    promptRoot: string;
    sharedInstructionPath?: string;
    defaultTimeout?: number;
  },
  store: FilesystemArtifactStore,
  clock: SystemClock
): RawAdapter {
  switch (name) {
    case 'claude':
      return new ClaudeAdapter(config, store, clock);
    case 'copilot':
      return new CopilotAdapter(config, store, clock);
    default:
      // 'codex' (and 'human', which is never selected as builder/supervisor).
      return new CodexAdapter(config, store, clock);
  }
}

interface Args {
  target: string;
  builder: TargetActor;
  supervisor: TargetActor;
  sharedPrompt: string;
  maxIter: number;
  /** Per-provider-run timeout in ms (opus --effort max routinely exceeds 5 min). */
  timeoutMs: number;
  /** Elevate the REVIEW phase to write posture (so tools like rmap can run). */
  reviewerWrite: boolean;
  slice?: string;
  reselect: boolean;
  until?: TargetPhase;
  dryRun: boolean;
  /** Optional per-run model overrides (operator picks by slice complexity —
   * e.g. claude-fable-5 for complex/long-converging slices, opus-4-8 default). */
  builderModel?: string;
  supervisorModel?: string;
  baseline?: string;
  managerOperation?:
    | { kind: 'apply-interpretation'; commandPath: string }
    | { kind: 'clarify-pending'; questionPath: string; managerId: string };
  approval?: {
    manifest: string;
    approvalId: string;
    projectId: string;
    approvedByType: 'human' | 'operator';
    approvedById: string;
    recordedByType: 'human' | 'operator';
    recordedById: string;
    authorityBasis: string;
    decisionRecords: { id: string; path: string }[];
    rationale: string;
  };
}

function parseProvider(value: string, flag: string): TargetActor {
  if (value !== 'claude' && value !== 'codex' && value !== 'copilot') {
    console.error(`Invalid ${flag}: '${value}'. Expected 'claude', 'codex', or 'copilot'.`);
    process.exit(1);
  }
  return value;
}

function parseArgs(argv: string[]): Args {
  let target: string | undefined;
  let builder: TargetActor = 'claude';
  let supervisor: TargetActor = 'codex';
  let sharedPrompt = DEFAULT_SHARED_PROMPT;
  let maxIter = 10;
  let timeoutMs = 20 * 60_000; // 20 min default; opus --effort max exceeds 5 min
  let reviewerWrite = false;
  let slice: string | undefined;
  let reselect = false;
  let until: TargetPhase | undefined;
  let dryRun = false;
  let builderModel: string | undefined;
  let supervisorModel: string | undefined;
  let baseline: string | undefined;
  let interpretationPath: string | undefined;
  let clarificationPath: string | undefined;
  let managerId: string | undefined;
  const approvalValues: Record<string, string> = {};
  const decisionRecords: { id: string; path: string }[] = [];
  let runtimeFlagExplicit = false;
  const approvalValue = (name: string, flag: string, read: () => string): void => {
    if (Object.prototype.hasOwnProperty.call(approvalValues, name)) {
      console.error(`${flag} must occur exactly once.`);
      process.exit(1);
    }
    approvalValues[name] = read();
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === undefined) continue;

    // Read the value for a flag, advancing the loop index. process.exit is
    // `never`, so the result narrows to string.
    const value = (flag: string): string => {
      const v = argv[i + 1];
      if (v === undefined) {
        console.error(`${flag} requires a value.`);
        process.exit(1);
      }
      i += 1;
      return v;
    };

    switch (a) {
      case '--builder':
        runtimeFlagExplicit = true;
        builder = parseProvider(value('--builder'), '--builder');
        break;
      case '--supervisor':
        runtimeFlagExplicit = true;
        supervisor = parseProvider(value('--supervisor'), '--supervisor');
        break;
      case '--builder-model':
        runtimeFlagExplicit = true;
        builderModel = value('--builder-model');
        break;
      case '--supervisor-model':
        runtimeFlagExplicit = true;
        supervisorModel = value('--supervisor-model');
        break;
      case '--shared-prompt':
        runtimeFlagExplicit = true;
        sharedPrompt = value('--shared-prompt');
        break;
      case '--baseline':
        runtimeFlagExplicit = true;
        baseline = value('--baseline');
        break;
      case '--apply-manager-interpretation':
        runtimeFlagExplicit = true;
        interpretationPath = value('--apply-manager-interpretation');
        break;
      case '--clarify-pending':
        runtimeFlagExplicit = true;
        clarificationPath = value('--clarify-pending');
        break;
      case '--manager-id':
        runtimeFlagExplicit = true;
        managerId = value('--manager-id');
        break;
      case '--max-iter':
        runtimeFlagExplicit = true;
        maxIter = Number.parseInt(value('--max-iter'), 10);
        break;
      case '--timeout': {
        runtimeFlagExplicit = true;
        const mins = Number.parseInt(value('--timeout'), 10);
        if (!Number.isFinite(mins) || mins < 1) {
          console.error('--timeout must be a positive integer (minutes).');
          process.exit(1);
        }
        timeoutMs = mins * 60_000;
        break;
      }
      case '--slice':
        runtimeFlagExplicit = true;
        slice = value('--slice');
        break;
      case '--reselect':
        runtimeFlagExplicit = true;
        reselect = true;
        break;
      case '--reviewer-write':
        runtimeFlagExplicit = true;
        reviewerWrite = true;
        break;
      case '--until': {
        runtimeFlagExplicit = true;
        const u = value('--until');
        if (u !== 'select-slice') {
          console.error(`--until currently supports only 'select-slice' (got '${u}').`);
          process.exit(1);
        }
        until = u;
        break;
      }
      case '--dry-run':
        runtimeFlagExplicit = true;
        dryRun = true;
        break;
      case '--record-reviewed-baseline-approval': approvalValue('manifest', a, () => value(a)); break;
      case '--approval-id': approvalValue('approvalId', a, () => value(a)); break;
      case '--project-id': approvalValue('projectId', a, () => value(a)); break;
      case '--approved-by-type': approvalValue('approvedByType', a, () => value(a)); break;
      case '--approved-by-id': approvalValue('approvedById', a, () => value(a)); break;
      case '--recorded-by-type': approvalValue('recordedByType', a, () => value(a)); break;
      case '--recorded-by-id': approvalValue('recordedById', a, () => value(a)); break;
      case '--authority-basis': approvalValue('authorityBasis', a, () => value(a)); break;
      case '--rationale': approvalValue('rationale', a, () => value(a)); break;
      case '--decision-record': {
        const raw = value(a);
        const split = raw.indexOf('=');
        if (split <= 0 || split === raw.length - 1) { console.error('--decision-record requires <decision-id>=<target-relative-path>.'); process.exit(1); }
        decisionRecords.push({ id: raw.slice(0, split), path: raw.slice(split + 1) });
        break;
      }
      default:
        if (a.startsWith('--')) {
          console.error(`Unknown option: ${a}`);
          process.exit(1);
        }
        if (target === undefined) target = a;
        break;
    }
  }

  if (!target) {
    console.error('Usage: npm run relay-target -- <target-path> [options]');
    process.exit(1);
  }
  if (!Number.isFinite(maxIter) || maxIter < 1) {
    console.error('--max-iter must be a positive integer.');
    process.exit(1);
  }
  if (slice !== undefined && reselect) {
    console.error('--slice and --reselect are mutually exclusive.');
    process.exit(1);
  }
  if (interpretationPath !== undefined && clarificationPath !== undefined) {
    console.error('--apply-manager-interpretation and --clarify-pending are mutually exclusive.');
    process.exit(1);
  }
  if ((interpretationPath !== undefined || clarificationPath !== undefined) && slice === undefined) {
    console.error('Manager interpretation operations require --slice <id>.');
    process.exit(1);
  }
  if (clarificationPath !== undefined && (!managerId || managerId.trim().length === 0)) {
    console.error('--clarify-pending requires --manager-id <id>.');
    process.exit(1);
  }
  if (managerId !== undefined && clarificationPath === undefined) {
    console.error('--manager-id is valid only with --clarify-pending.');
    process.exit(1);
  }
  if ((interpretationPath !== undefined || clarificationPath !== undefined) && (reselect || until !== undefined || dryRun)) {
    console.error('Manager interpretation operations cannot be combined with --reselect, --until, or --dry-run.');
    process.exit(1);
  }

  // exactOptionalPropertyTypes: include optionals only when present.
  const base: Args = { target, builder, supervisor, sharedPrompt, maxIter, timeoutMs, reviewerWrite, reselect, dryRun };
  const withSlice = slice !== undefined ? { ...base, slice } : base;
  const withUntil = until !== undefined ? { ...withSlice, until } : withSlice;
  const withBM = builderModel !== undefined ? { ...withUntil, builderModel } : withUntil;
  const withSM = supervisorModel !== undefined ? { ...withBM, supervisorModel } : withBM;
  const withBaseline = baseline !== undefined ? { ...withSM, baseline } : withSM;
  const ordinary: Args = interpretationPath !== undefined
    ? { ...withBaseline, managerOperation: { kind: 'apply-interpretation', commandPath: resolve(process.cwd(), interpretationPath) } }
    : clarificationPath !== undefined
      ? { ...withBaseline, managerOperation: { kind: 'clarify-pending', questionPath: resolve(process.cwd(), clarificationPath), managerId: managerId as string } }
      : withBaseline;
  const approvalRequested = Object.keys(approvalValues).length > 0 || decisionRecords.length > 0;
  if (!approvalRequested) return ordinary;
  if (runtimeFlagExplicit) { console.error('--record-reviewed-baseline-approval is mutually exclusive with dispatch/dry-run/provider/model/permission/cycle flags.'); process.exit(1); }
  const required = ['manifest', 'approvalId', 'projectId', 'approvedByType', 'approvedById', 'recordedByType', 'recordedById', 'authorityBasis', 'rationale'] as const;
  for (const name of required) if (!approvalValues[name]) { console.error(`Approval operation missing required ${name}.`); process.exit(1); }
  const actorType = (name: 'approvedByType' | 'recordedByType') => {
    const raw = approvalValues[name];
    if (raw !== 'human' && raw !== 'operator') { console.error(`${name} must be human or operator.`); process.exit(1); }
    return raw;
  };
  return { ...ordinary, approval: { manifest: approvalValues['manifest'] as string, approvalId: approvalValues['approvalId'] as string, projectId: approvalValues['projectId'] as string, approvedByType: actorType('approvedByType'), approvedById: approvalValues['approvedById'] as string, recordedByType: actorType('recordedByType'), recordedById: approvalValues['recordedById'] as string, authorityBasis: approvalValues['authorityBasis'] as string, decisionRecords, rationale: approvalValues['rationale'] as string } };
}

/** Elide the long developer_instructions value so dry-run stays readable. */
function formatArg(a: string): string {
  const key = 'developer_instructions=';
  if (a.startsWith(key)) {
    const val = a.slice(key.length);
    const head = val.slice(0, 48).replace(/\n/g, '\\n');
    return `${key}${head}...(${val.length} chars, TOML-escaped)`;
  }
  return a;
}

async function printDryRun(
  args: Args,
  targetDir: string,
  sharedInstructionPath: string | undefined,
  sharedInstruction: TargetRelayInput['sharedInstruction'],
  builderRaw: RawAdapter,
  supervisorRaw: RawAdapter,
  store: FilesystemArtifactStore
): Promise<void> {
  let activeStatus: TargetRelayStatus | undefined;
  if (args.slice !== undefined) {
    const statusPath = `.agent-manager/slices/${args.slice}/status.json`;
    const snapshot = await store.readContainedFile(targetDir, statusPath);
    if (snapshot.status === 'ok') {
      const parsed = parseAssuranceJson(new TextDecoder('utf-8', { fatal: true }).decode(snapshot.bytes), statusPath);
      if (!parsed.ok) throw new Error(parsed.errors.map(renderAssuranceError).join('\n'));
      if (!isTargetRelayStatusShape(parsed.value)) throw new Error(`invalid-field: ${statusPath} /: malformed target relay status`);
      activeStatus = parsed.value;
    }
  }
  const plannedSession = (role: 'builder' | 'reviewer', provider: TargetActor, adapter: RawAdapter): ProviderSessionRequest | undefined => {
    if (!('sessionSupport' in adapter) || adapter.sessionSupport !== 'explicit-id') return undefined;
    const binding = activeStatus?.providerSessions?.[role];
    if (binding?.provider === provider) return { kind: 'resume', sessionId: binding.sessionId };
    return { kind: 'fresh' };
  };

  if (args.baseline !== undefined) {
    if (args.slice === undefined) {
      throw new Error('assured dry-run requires an explicit --slice <id> so its SLICE_DOC allocation can be checked');
    }
    const statusPath = `.agent-manager/slices/${args.slice}/status.json`;
    const statusSnapshot = await store.readContainedFile(targetDir, statusPath);
    if (statusSnapshot.status === 'error') {
      throw new Error(`${statusSnapshot.code}: ${statusPath}: ${statusSnapshot.detail}`);
    }
    const parsedStatus = parseAssuranceJson(
      new TextDecoder('utf-8', { fatal: true }).decode(statusSnapshot.bytes),
      statusPath
    );
    if (!parsedStatus.ok) {
      throw new Error(parsedStatus.errors.map(renderAssuranceError).join('\n'));
    }
    const status = parsedStatus.value;
    const sliceDoc =
      status && typeof status === 'object' && !Array.isArray(status)
        ? (status as Record<string, unknown>).sliceDoc
        : undefined;
    const statusRecord = status && typeof status === 'object' && !Array.isArray(status)
      ? status as Record<string, unknown>
      : undefined;
    if (statusRecord?.sliceId !== args.slice) {
      throw new Error(`subject-mismatch: ${statusPath} /sliceId: status sliceId does not equal --slice '${args.slice}'`);
    }
    if (typeof sliceDoc !== 'string' || sliceDoc.length === 0) {
      throw new Error(`invalid-field: ${statusPath} /sliceDoc: assured dry-run requires a non-empty SLICE_DOC`);
    }
    // First validate only the accepted input closure. The active packet decides
    // whether allocation means the existing SLICE_DOC (ordinary v1/v2 work) or
    // ADMISSION_ALLOCATION (the admitted document-authoring bridge).
    const admission = await admitBaseline(targetDir, args.baseline, store);
    if (!admission.ok) {
      throw new Error(admission.errors.map((e) => `${e.code}: ${e.recordPath} ${e.location}: ${e.detail}`).join('\n'));
    }
    if (Object.prototype.hasOwnProperty.call(statusRecord, 'assurance')) {
      const persisted = parsePersistedAssurance(statusRecord.assurance, statusPath);
      if (!persisted.ok) {
        throw new Error(persisted.errors.map(renderAssuranceError).join('\n'));
      }
      if (
        persisted.value.manifest.path !== admission.admission.manifest.path ||
        persisted.value.manifest.sha256 !== admission.admission.manifest.sha256
      ) {
        throw new Error(`subject-mismatch: ${statusPath} /assurance/manifest: persisted assurance conflicts with --baseline`);
      }
    }
    const selectionPath = `.agent-manager/slices/${args.slice}/selection.md`;
    const selectionSnapshot = await store.readContainedFile(targetDir, selectionPath);
    if (selectionSnapshot.status === 'error' && admission.admission.enforcement === 'reviewed-inputs') {
      throw new Error(`${selectionSnapshot.code}: ${selectionPath}: ${selectionSnapshot.detail}`);
    }
    const packetRaw = selectionSnapshot.status === 'ok'
      ? new TextDecoder('utf-8', { fatal: true }).decode(selectionSnapshot.bytes)
      : undefined;
    let planned: Awaited<ReturnType<typeof prepareReviewedTargetDryRunDeliveries>>;
    if (packetRaw !== undefined) {
      const builderDef = resolvedDefaults(args.builder, 'builder', args);
      const supervisorDef = resolvedDefaults(args.supervisor, 'supervisor', args);
      const relayInput: TargetRelayInput = {
        targetDir,
        promptRoot,
        selectPromptPaths: ['prompts/system/base.md', 'prompts/roles/supervisor-select.md'],
        builderPromptPaths: ['prompts/system/base.md', 'prompts/roles/builder-target.md'],
        reviewerPromptPaths: ['prompts/system/base.md', 'prompts/roles/reviewer-target.md'],
        challengerPromptPaths: ['prompts/system/base.md', 'prompts/roles/decision-challenger.md'],
        rebutterPromptPaths: ['prompts/system/base.md', 'prompts/roles/decision-rebutter.md'],
        builderProvider: args.builder,
        supervisorProvider: args.supervisor,
        builderModel: builderDef.model,
        builderEffort: builderDef.effort,
        supervisorModel: supervisorDef.model,
        supervisorEffort: supervisorDef.effort,
        commonPromptPaths: ['prompts/system/base.md'],
        ...(sharedInstruction ? { sharedInstruction } : {}),
      };
      planned = await prepareReviewedTargetDryRunDeliveries({
        input: relayInput,
        deps: { artifactStore: store, computeDigest },
        baselinePath: args.baseline,
        sliceId: args.slice,
        sliceDoc,
        packetRaw,
        documentCandidateAvailability:
          statusRecord.phase === 'implement' && statusRecord.iteration === 0
            ? 'not-yet-authored'
            : 'expected',
      });
    }
    if (planned) {
      const builderDef = resolvedDefaults(args.builder, 'builder', args);
      const supervisorDef = resolvedDefaults(args.supervisor, 'supervisor', args);
      console.log(`Enforcement: ${admission.admission.enforcement}`);
      console.log(`Manifest   : ${planned.manifest.path} ${planned.manifest.sha256}`);
      console.log(`Target root: ${targetDir}`);
      console.log(`Prompt root: ${promptRoot}`);
      console.log(`Roles      : builder=${args.builder}/${builderDef.model}/${builderDef.effort}; reviewer=${args.supervisor}/${supervisorDef.model}/${supervisorDef.effort}`);
      console.log(`Independence: ${args.builder === args.supervisor ? 'same-provider' : 'different-provider'}\n`);
      const reviewedPhases = [
        { label: 'implement' as const, adapter: builderRaw, provider: args.builder, role: 'builder', mode: 'edit' as const, permission: 'write' as const, model: builderDef.model, effort: builderDef.effort, delivery: planned.builder },
        ...(planned.reviewer.kind === 'available' ? [{ label: 'review-impl' as const, adapter: supervisorRaw, provider: args.supervisor, role: 'reviewer', mode: 'review' as const, permission: args.reviewerWrite ? 'write' as const : 'read-only' as const, model: supervisorDef.model, effort: supervisorDef.effort, delivery: planned.reviewer.delivery }] : []),
      ];
      console.log('=== DRY RUN: planned reviewed-input provider deliveries (no processes spawned, no snapshot files written) ===\n');
      for (const phase of reviewedPhases) {
        const providerSession = plannedSession(phase.role === 'builder' ? 'builder' : 'reviewer', phase.provider, phase.adapter);
        const request: RunRequest = { runId: `dry-run-${phase.label}`, sliceId: args.slice, role: phase.role, mode: phase.mode, permission: phase.permission, workingDir: targetDir, model: phase.model, effort: phase.effort, delivery: phase.delivery, inputArtifacts: [], ...(providerSession ? { providerSession } : {}) };
        const prepared = await phase.adapter.prepareRunDelivery(request);
        console.log(`# ${phase.label}  (${phase.provider}, mode=${phase.mode}, permission=${phase.permission})`);
        console.log(`  cwd : ${prepared.invocation.cwd}`);
        console.log(`  cmd : ${prepared.invocation.command} ${prepared.invocation.args.map(formatArg).join(' ')}`);
        if (prepared.sharedSnapshot) console.log(`  eventual-shared-snapshot: ${prepared.sharedSnapshot.path}`);
        for (const input of [...phase.delivery.common, ...phase.delivery.roleSpecific]) {
          const identity = input.origin === 'file' ? `${input.root}:${input.path}` : `generated:${input.label}`;
          console.log(`  input: ${input.purpose} ${identity} ${input.sha256} bytes=${input.bytes.byteLength}`);
        }
        if (prepared.receipt.kind !== 'reviewed-input-snapshots') throw new Error('role-context-mismatch: reviewed dry-run produced a legacy receipt');
        for (const channel of prepared.receipt.channels) console.log(`  channel: ${channel.channel} mechanism=${channel.mechanism} ${channel.sha256} bytes=${channel.byteLength}`);
        console.log('');
      }
      if (planned.reviewer.kind === 'pending-authored-review-subject') {
        console.log('# review-impl  (pending authored review subject; no provider delivery available)');
        console.log(`  missing REVIEW_BASELINE          : ${planned.reviewer.reviewBaseline}`);
        console.log(`  declared SLICE_DOC (not validated): ${planned.reviewer.sliceDoc}`);
        console.log('  next step: author must produce the candidate closure; relay will then validate its SLICE_DOC allocation before reviewer dispatch\n');
      }
      return;
    }
    const allocationAdmission = await admitBaseline(targetDir, args.baseline, store, {
      expectedManifest: admission.admission.manifest,
      allocationPath: sliceDoc,
    });
    if (!allocationAdmission.ok) {
      throw new Error(allocationAdmission.errors.map((e) => `${e.code}: ${e.recordPath} ${e.location}: ${e.detail}`).join('\n'));
    }
    console.log(`Enforcement: baseline-admission`);
    console.log(`Manifest   : ${admission.admission.manifest.path} ${admission.admission.manifest.sha256}\n`);
  } else {
    console.log('Enforcement: legacy (requirements assurance not enforced)\n');
  }

  // Preload external files so the printed argv is exact (Codex developer_instructions).
  await builderRaw.prewarm();
  await supervisorRaw.prewarm();

  const phases: {
    label: TargetPhase;
    adapter: RawAdapter;
    provider: TargetActor;
    mode: NonNullable<RunRequest['mode']>;
    permission: NonNullable<RunRequest['permission']>;
    role: string;
  }[] = [
    {
      label: 'select-slice',
      adapter: supervisorRaw,
      provider: args.supervisor,
      mode: 'plan',
      permission: 'read-only',
      role: 'supervisor',
    },
    {
      label: 'implement',
      adapter: builderRaw,
      provider: args.builder,
      mode: 'edit',
      permission: 'write',
      role: 'builder',
    },
    {
      label: 'review-impl',
      adapter: supervisorRaw,
      provider: args.supervisor,
      mode: 'review',
      permission: args.reviewerWrite ? 'write' : 'read-only',
      role: 'reviewer',
    },
  ];

  console.log('=== DRY RUN: planned provider invocations (no processes spawned) ===\n');
  for (const p of phases) {
    const def = resolvedDefaults(p.provider, p.role === 'implement' || p.role === 'builder' ? 'builder' : 'supervisor', args);
    const providerSession = p.role === 'builder'
      ? plannedSession('builder', p.provider, p.adapter)
      : p.role === 'reviewer'
        ? plannedSession('reviewer', p.provider, p.adapter)
        : undefined;
    const inv = p.adapter.buildInvocation({
      runId: 'dry-run',
      sliceId: '<slice-id>',
      role: p.role,
      mode: p.mode,
      permission: p.permission,
      workingDir: targetDir,
      model: def.model,
      effort: def.effort,
      delivery: { kind: 'legacy-live-inputs', prompts: [] },
      inputArtifacts: [],
      ...(providerSession ? { providerSession } : {}),
    });
    console.log(`# ${p.label}  (${p.provider}, mode=${p.mode}, permission=${p.permission})`);
    console.log(`  cwd : ${inv.cwd}`);
    console.log(`  cmd : ${inv.command} ${inv.args.map(formatArg).join(' ')}`);
    if (sharedInstructionPath && p.provider === 'claude') {
      console.log(`  shared-prompt: ${sharedInstructionPath} (via --system-prompt-file above)`);
    }
    console.log(`  stdin: <pinned role prompts> + <generated ${p.label} context>\n`);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const targetDir = resolve(process.cwd(), args.target);

  if (!existsSync(targetDir)) {
    console.error(`Target repository not found: ${targetDir}`);
    process.exit(1);
  }

  if (args.approval) {
    const clock = new SystemClock();
    const store = new FilesystemArtifactStore();
    try {
      const recorded = await recordReviewedBaselineApproval({ targetDir, manifestPath: args.approval.manifest, approvalId: args.approval.approvalId, projectId: args.approval.projectId, approvedBy: { actorType: args.approval.approvedByType, actorId: args.approval.approvedById }, recordedBy: { actorType: args.approval.recordedByType, actorId: args.approval.recordedById }, authorityBasisPath: args.approval.authorityBasis, decisionRecords: args.approval.decisionRecords, rationale: args.approval.rationale }, { clock, artifactStore: store, computeDigest });
      console.log('recorded reviewed-baseline approval');
      console.log(`Target     : ${targetDir}`);
      console.log(`Project    : ${recorded.approval.target.projectId}`);
      console.log(`Manifest   : ${recorded.approval.subject.path} ${recorded.approval.subject.sha256}`);
      console.log(`Review     : ${recorded.approval.review.path} ${recorded.approval.review.sha256}`);
      console.log(`Output     : ${recorded.outputPath}`);
      console.log('commit: not performed');
    } catch (cause) {
      console.error(`Approval recording failed: ${cause instanceof Error ? cause.message : String(cause)}`);
      process.exit(1);
    }
    return;
  }

  // Shared system prompt is optional: warn and continue if absent.
  let sharedInstructionPath: string | undefined = resolve(
    process.cwd(),
    args.sharedPrompt
  );
  if (!existsSync(sharedInstructionPath)) {
    if (args.baseline === undefined) {
      console.warn(`Shared prompt file not found: ${sharedInstructionPath} — proceeding without it.`);
    }
    sharedInstructionPath = undefined;
  }

  let sharedInstruction: TargetRelayInput['sharedInstruction'];
  if (sharedInstructionPath) {
    const targetReal = realpathSync(targetDir);
    const promptReal = realpathSync(promptRoot);
    const sharedReal = realpathSync(sharedInstructionPath);
    const within = (root: string) => sharedReal === root || sharedReal.startsWith(root.endsWith(sep) ? root : `${root}${sep}`);
    const inTarget = within(targetReal);
    const inPrompt = within(promptReal);
    if (inTarget && inPrompt && targetReal !== promptReal) {
      console.error('Shared prompt is ambiguously contained by distinct target and prompt roots.');
      process.exit(1);
    }
    if (inPrompt || (inTarget && targetReal === promptReal)) sharedInstruction = { root: 'prompt', path: relative(promptReal, sharedReal).split(sep).join('/') };
    else if (inTarget) sharedInstruction = { root: 'target', path: relative(targetReal, sharedReal).split(sep).join('/') };
  }

  console.log(`=== Target-owned relay ===`);
  console.log(`Target     : ${targetDir}`);
  console.log(`Prompt root: ${promptRoot}`);
  console.log(`Builder    : ${args.builder}`);
  console.log(`Supervisor : ${args.supervisor}`);
  console.log(`Shared     : ${sharedInstructionPath ?? '(none)'}`);
  if (!args.dryRun && args.baseline !== undefined) {
    console.log(
      `Enforcement: baseline requested (${args.baseline}; allocation not yet evaluated)`
    );
  }
  console.log('');

  const clock = new SystemClock();
  const store = new FilesystemArtifactStore();
  const adapterConfig = {
    logsDir: resolve(targetDir, '.agent-manager', 'logs'),
    promptRoot,
    defaultTimeout: args.timeoutMs,
    ...(sharedInstructionPath ? { sharedInstructionPath } : {}),
  };

  const builderRaw = makeAdapter(args.builder, adapterConfig, store, clock);
  const supervisorRaw = makeAdapter(args.supervisor, adapterConfig, store, clock);
  const clarificationRunners = new Map<Exclude<TargetActor, 'human'>, RawAdapter>();
  clarificationRunners.set(args.builder as Exclude<TargetActor, 'human'>, builderRaw);
  clarificationRunners.set(args.supervisor as Exclude<TargetActor, 'human'>, supervisorRaw);
  const clarificationRunner = (provider: Exclude<TargetActor, 'human'>): RawAdapter => {
    const existing = clarificationRunners.get(provider);
    if (existing) return existing;
    const created = makeAdapter(provider, adapterConfig, store, clock);
    clarificationRunners.set(provider, created);
    return created;
  };

  if (args.dryRun) {
    try {
      await printDryRun(args, targetDir, sharedInstructionPath, sharedInstruction, builderRaw, supervisorRaw, store);
    } catch (cause) {
      console.error(`Baseline admission failed: ${cause instanceof Error ? cause.message : String(cause)}`);
      process.exit(1);
    }
    return;
  }

  const builderDef = resolvedDefaults(args.builder, 'builder', args);
  const supervisorDef = resolvedDefaults(args.supervisor, 'supervisor', args);

  const base: TargetRelayInput = {
    targetDir,
    promptRoot,
    selectPromptPaths: ['prompts/system/base.md', 'prompts/roles/supervisor-select.md'],
    builderPromptPaths: ['prompts/system/base.md', 'prompts/roles/builder-target.md'],
    reviewerPromptPaths: ['prompts/system/base.md', 'prompts/roles/reviewer-target.md'],
    // Additive decision-review postures (DECISION-REVIEW-MODE-1). Loaded only
    // when the phase fires; never read for non-DECISION_REQUIRED slices.
    challengerPromptPaths: ['prompts/system/base.md', 'prompts/roles/decision-challenger.md'],
    rebutterPromptPaths: ['prompts/system/base.md', 'prompts/roles/decision-rebutter.md'],
    commonPromptPaths: ['prompts/system/base.md'],
    builderProvider: args.builder,
    supervisorProvider: args.supervisor,
    builderModel: builderDef.model,
    builderEffort: builderDef.effort,
    supervisorModel: supervisorDef.model,
    supervisorEffort: supervisorDef.effort,
    maxIterations: args.maxIter,
    reselect: args.reselect,
    reviewerPermission: args.reviewerWrite ? 'write' : 'read-only',
    ...(sharedInstruction ? { sharedInstruction } : {}),
    ...(args.baseline !== undefined ? { baselinePath: args.baseline } : {}),
    ...(args.managerOperation !== undefined ? { managerOperation: args.managerOperation } : {}),
  };
  const withSlice = args.slice !== undefined ? { ...base, sliceId: args.slice } : base;
  const input: TargetRelayInput =
    args.until !== undefined ? { ...withSlice, until: args.until } : withSlice;

  try {
    const result = await targetRelayLoop(input, {
      clock,
      builder: builderRaw,
      supervisor: supervisorRaw,
      computeDigest,
      changedPaths: gitChangedPaths,
      artifactStore: store,
      observeCandidateTree,
      candidateDiff,
      createTrackedFileExclusively,
      clarificationRunner,
    });

    console.log(`\nRelay completed.`);
    console.log(`Final phase: ${result.phase}`);
    if (result.sliceId) console.log(`Slice: ${result.sliceId}`);
    if (result.reason) console.log(`Reason: ${result.reason}`);

    if (result.phase === 'blocked') process.exit(1);
  } catch (err) {
    console.error('Error:', err);
    process.exit(2);
  }
}

main();
