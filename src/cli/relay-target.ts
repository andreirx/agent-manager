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
 *   --builder    claude|codex   provider that implements      (default: claude)
 *   --supervisor claude|codex   provider that selects+reviews (default: codex)
 *   --shared-prompt <path>      shared system-prompt file
 *                               (default: /Users/apple/CLAUDE-SYSTEM.txt)
 *   --max-iter <n>             max build/review CYCLES         (default: 10)
 *   --timeout <minutes>        per-provider-run timeout        (default: 20)
 *   --reviewer-write           elevate review phase to write (so rmap can run)
 *   --slice <id>               resume a specific slice (skip selection)
 *   --reselect                 force a fresh selection even if a slice is active
 *   --until select-slice       stop after selection (no building)
 *   --dry-run                  print exact provider invocations; do not spawn
 *
 * @module cli
 * @maturity PROTOTYPE
 */

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SystemClock } from '../adapters/clock/index.js';
import { FilesystemArtifactStore } from '../adapters/filesystem/index.js';
import { ClaudeAdapter } from '../adapters/providers/claude-code/index.js';
import { CodexAdapter } from '../adapters/providers/codex/index.js';
import {
  targetRelayLoop,
  type TargetActor,
  type TargetPhase,
  type TargetRelayInput,
} from '../application/use-cases/relay-target.js';
import type { RunRequest } from '../application/ports/provider-runner.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
/** agent-manager root: prompt-asset root (NOT the target working dir). */
const promptRoot = resolve(__dirname, '../..');

const DEFAULT_SHARED_PROMPT = '/Users/apple/CLAUDE-SYSTEM.txt';

/** Provider-appropriate model + effort defaults (provider is volatile). */
function providerDefaults(name: TargetActor): { model: string; effort: string } {
  return name === 'claude'
    ? { model: 'claude-opus-4-8', effort: 'max' }
    : { model: 'gpt-5.5', effort: 'high' };
}

function computeDigest(content: string): string {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

type RawAdapter = ClaudeAdapter | CodexAdapter;

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
  return name === 'claude'
    ? new ClaudeAdapter(config, store, clock)
    : new CodexAdapter(config, store, clock);
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
}

function parseProvider(value: string, flag: string): TargetActor {
  if (value !== 'claude' && value !== 'codex') {
    console.error(`Invalid ${flag}: '${value}'. Expected 'claude' or 'codex'.`);
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
        builder = parseProvider(value('--builder'), '--builder');
        break;
      case '--supervisor':
        supervisor = parseProvider(value('--supervisor'), '--supervisor');
        break;
      case '--shared-prompt':
        sharedPrompt = value('--shared-prompt');
        break;
      case '--max-iter':
        maxIter = Number.parseInt(value('--max-iter'), 10);
        break;
      case '--timeout': {
        const mins = Number.parseInt(value('--timeout'), 10);
        if (!Number.isFinite(mins) || mins < 1) {
          console.error('--timeout must be a positive integer (minutes).');
          process.exit(1);
        }
        timeoutMs = mins * 60_000;
        break;
      }
      case '--slice':
        slice = value('--slice');
        break;
      case '--reselect':
        reselect = true;
        break;
      case '--reviewer-write':
        reviewerWrite = true;
        break;
      case '--until': {
        const u = value('--until');
        if (u !== 'select-slice') {
          console.error(`--until currently supports only 'select-slice' (got '${u}').`);
          process.exit(1);
        }
        until = u;
        break;
      }
      case '--dry-run':
        dryRun = true;
        break;
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

  // exactOptionalPropertyTypes: include optionals only when present.
  const base: Args = { target, builder, supervisor, sharedPrompt, maxIter, timeoutMs, reviewerWrite, reselect, dryRun };
  const withSlice = slice !== undefined ? { ...base, slice } : base;
  return until !== undefined ? { ...withSlice, until } : withSlice;
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
  builderRaw: RawAdapter,
  supervisorRaw: RawAdapter
): Promise<void> {
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
    const def = providerDefaults(p.provider);
    const inv = p.adapter.buildInvocation({
      runId: 'dry-run',
      sliceId: '<slice-id>',
      role: p.role,
      mode: p.mode,
      permission: p.permission,
      workingDir: targetDir,
      model: def.model,
      effort: def.effort,
      prompts: [],
      inputArtifacts: [],
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

  // Shared system prompt is optional: warn and continue if absent.
  let sharedInstructionPath: string | undefined = resolve(
    process.cwd(),
    args.sharedPrompt
  );
  if (!existsSync(sharedInstructionPath)) {
    console.warn(
      `Shared prompt file not found: ${sharedInstructionPath} — proceeding without it.`
    );
    sharedInstructionPath = undefined;
  }

  console.log(`=== Target-owned relay ===`);
  console.log(`Target     : ${targetDir}`);
  console.log(`Prompt root: ${promptRoot}`);
  console.log(`Builder    : ${args.builder}`);
  console.log(`Supervisor : ${args.supervisor}`);
  console.log(`Shared     : ${sharedInstructionPath ?? '(none)'}`);
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

  if (args.dryRun) {
    await printDryRun(args, targetDir, sharedInstructionPath, builderRaw, supervisorRaw);
    return;
  }

  const builderDef = providerDefaults(args.builder);
  const supervisorDef = providerDefaults(args.supervisor);

  const base: TargetRelayInput = {
    targetDir,
    promptRoot,
    selectPromptPaths: ['prompts/system/base.md', 'prompts/roles/supervisor-select.md'],
    builderPromptPaths: ['prompts/system/base.md', 'prompts/roles/builder-target.md'],
    reviewerPromptPaths: ['prompts/system/base.md', 'prompts/roles/reviewer-target.md'],
    builderProvider: args.builder,
    supervisorProvider: args.supervisor,
    builderModel: builderDef.model,
    builderEffort: builderDef.effort,
    supervisorModel: supervisorDef.model,
    supervisorEffort: supervisorDef.effort,
    maxIterations: args.maxIter,
    reselect: args.reselect,
    reviewerPermission: args.reviewerWrite ? 'write' : 'read-only',
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
