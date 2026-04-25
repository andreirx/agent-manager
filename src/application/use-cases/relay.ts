/**
 * Relay use case.
 *
 * Orchestrates the builder/reviewer loop:
 * 1. Read brief + current artifact
 * 2. Send to appropriate actor (claude or codex)
 * 3. Store result in current.md
 * 4. Parse verdict and update status
 * 5. Detect stop conditions
 *
 * Note: This use case directly uses filesystem APIs for simplicity,
 * bypassing ArtifactStorePort. This is an intentional simplification.
 *
 * @module application/use-cases
 * @maturity PROTOTYPE
 */

import { join } from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

import type { ClockPort, ProviderRunnerPort } from '../ports/index.js';
import type { PromptRef } from '../../core/run-record.js';
import { RunStatus } from '../../core/run-record.js';

/**
 * Phase in the relay loop.
 */
export type RelayPhase = 'design' | 'review-design' | 'implement' | 'review-impl' | 'blocked' | 'done';

/**
 * Verdict parsed from reviewer output.
 */
export type Verdict = 'approved' | 'revise' | 'escalate' | 'unknown';

/**
 * Actor type.
 */
export type Actor = 'claude' | 'codex' | 'human';

/**
 * Status stored in status.json.
 */
export interface RelayStatus {
  phase: RelayPhase;
  updatedAt: string;
  lastActor: Actor;
}

/**
 * Metadata for current.md stored in current.meta.json.
 * Provides traceability for the current artifact.
 */
export interface CurrentMeta {
  phase: RelayPhase;
  actor: Actor;
  runId: string;
  updatedAt: string;
  logPath: string;
}

/**
 * Input for relay step.
 */
export interface RelayInput {
  sliceId: string;
  sliceDir: string;  // repo-relative
  repoRoot: string;  // absolute
  builderPromptPaths: readonly string[];
  reviewerPromptPaths: readonly string[];
}

/**
 * Result of relay step.
 */
export interface RelayResult {
  phase: RelayPhase;
  verdict?: Verdict;
  stopped: boolean;
  reason?: string;
}

/**
 * Dependencies for relay.
 */
export interface RelayDeps {
  clock: ClockPort;
  builder: ProviderRunnerPort;
  reviewer: ProviderRunnerPort;
  computeDigest: (content: string) => string;
}

/**
 * Execute one relay step.
 *
 * Reads current state, sends to appropriate actor, updates state.
 */
export async function relayStep(
  input: RelayInput,
  deps: RelayDeps
): Promise<RelayResult> {
  const { clock, builder, reviewer, computeDigest } = deps;
  const absSliceDir = join(input.repoRoot, input.sliceDir);

  // Read current status
  const statusPath = join(absSliceDir, 'status.json');
  let status: RelayStatus;
  try {
    const raw = await readFile(statusPath, 'utf-8');
    status = JSON.parse(raw) as RelayStatus;
  } catch {
    // Initialize if not exists
    status = {
      phase: 'design',
      updatedAt: clock.now(),
      lastActor: 'human',
    };
  }

  // Check if already stopped
  if (status.phase === 'done' || status.phase === 'blocked') {
    return { phase: status.phase, stopped: true, reason: `Already ${status.phase}` };
  }

  // Read brief
  const briefPath = join(absSliceDir, 'brief.md');
  const brief = await readFile(briefPath, 'utf-8');

  // Read current artifact (may not exist yet)
  const currentPath = join(absSliceDir, 'current.md');
  let current = '';
  try {
    current = await readFile(currentPath, 'utf-8');
  } catch {
    // No current artifact yet
  }

  // Determine actor and prompts based on phase
  const isReviewPhase = status.phase === 'review-design' || status.phase === 'review-impl';
  const actor = isReviewPhase ? reviewer : builder;
  const promptPaths = isReviewPhase ? input.reviewerPromptPaths : input.builderPromptPaths;
  const role = isReviewPhase ? 'reviewer' : 'builder';

  // Build context with phase-specific instructions
  const contextPrompt = buildContextPrompt(brief, current, status.phase);
  const contextPath = join(absSliceDir, 'context.md');
  await mkdir(absSliceDir, { recursive: true });
  await writeFile(contextPath, contextPrompt, 'utf-8');

  // Prepare prompts with digests
  const prompts: PromptRef[] = [];
  for (const path of promptPaths) {
    const fullPath = join(input.repoRoot, path);
    const content = await readFile(fullPath, 'utf-8');
    prompts.push({ path, digest: computeDigest(content) });
  }

  // Add context as a prompt
  const contextRelPath = join(input.sliceDir, 'context.md');
  prompts.push({ path: contextRelPath, digest: computeDigest(contextPrompt) });

  // Run the actor
  const runId = `relay-${Date.now()}`;
  const result = await actor.run({
    runId,
    sliceId: input.sliceId,
    role,
    prompts,
    inputArtifacts: [
      { path: join(input.sliceDir, 'brief.md'), type: 'brief' },
      ...(current ? [{ path: join(input.sliceDir, 'current.md'), type: 'artifact' }] : []),
    ],
  });

  if (result.status !== RunStatus.COMPLETED) {
    // Actor failed - escalate
    return await transitionToBlocked(
      absSliceDir,
      statusPath,
      clock,
      isReviewPhase ? 'codex' : 'claude',
      `Actor failed: ${result.error ?? 'Unknown error'}`
    );
  }

  // Get output
  const output = result.outputArtifacts[0]?.content ?? '';
  const outputText = typeof output === 'string' ? output : JSON.stringify(output, null, 2);

  // Write to current.md
  await writeFile(currentPath, outputText, 'utf-8');

  // Write current.meta.json for traceability
  // Convert absolute logPath to repo-relative for portability
  const repoRelativeLogPath = result.logPath.startsWith(input.repoRoot)
    ? result.logPath.slice(input.repoRoot.length + 1)  // +1 for trailing slash
    : result.logPath;

  const currentMetaPath = join(absSliceDir, 'current.meta.json');
  const currentMeta: CurrentMeta = {
    phase: status.phase,
    actor: isReviewPhase ? 'codex' : 'claude',
    runId,
    updatedAt: clock.now(),
    logPath: repoRelativeLogPath,
  };
  await writeFile(currentMetaPath, JSON.stringify(currentMeta, null, 2), 'utf-8');

  // Determine next phase
  let verdict: Verdict | undefined;
  let newPhase: RelayPhase;

  if (isReviewPhase) {
    verdict = parseVerdict(outputText);

    switch (verdict) {
      case 'approved':
        if (status.phase === 'review-design') {
          newPhase = 'implement';
        } else {
          // review-impl approved = done
          newPhase = 'done';
        }
        break;
      case 'revise':
        if (status.phase === 'review-design') {
          newPhase = 'design';
        } else {
          newPhase = 'implement';
        }
        break;
      case 'escalate':
        return await transitionToBlocked(
          absSliceDir,
          statusPath,
          clock,
          'codex',
          `Escalated by reviewer:\n\n${outputText}`
        );
      case 'unknown':
        // Unknown verdict is a blocker - do not self-review
        return await transitionToBlocked(
          absSliceDir,
          statusPath,
          clock,
          'codex',
          `Could not parse reviewer verdict. Expected STATUS: approved|revise|escalate\n\nReviewer output:\n${outputText.slice(0, 500)}`
        );
    }
  } else {
    // Builder finished, move to review
    if (status.phase === 'design') {
      newPhase = 'review-design';
    } else {
      newPhase = 'review-impl';
    }
  }

  // Update status
  const newStatus: RelayStatus = {
    phase: newPhase,
    updatedAt: clock.now(),
    lastActor: isReviewPhase ? 'codex' : 'claude',
  };
  await writeFile(statusPath, JSON.stringify(newStatus, null, 2), 'utf-8');

  const stopped = newPhase === 'done';

  const relayResult: RelayResult = { phase: newPhase, stopped };
  if (verdict !== undefined) {
    return { ...relayResult, verdict };
  }
  return relayResult;
}

/**
 * Transition to blocked state and persist.
 */
async function transitionToBlocked(
  absSliceDir: string,
  statusPath: string,
  clock: ClockPort,
  lastActor: Actor,
  reason: string
): Promise<RelayResult> {
  const newStatus: RelayStatus = {
    phase: 'blocked',
    updatedAt: clock.now(),
    lastActor,
  };
  await writeFile(statusPath, JSON.stringify(newStatus, null, 2), 'utf-8');

  const notesPath = join(absSliceDir, 'notes-for-human.md');
  await writeFile(notesPath, `# Blocked\n\n${reason}\n`, 'utf-8');

  return { phase: 'blocked', stopped: true, reason };
}

/**
 * Build context prompt from brief and current state.
 * Includes phase-specific instructions.
 */
function buildContextPrompt(brief: string, current: string, phase: RelayPhase): string {
  const parts = [`# Slice Brief\n\n${brief}`];

  if (current) {
    // Tell the actor what kind of artifact this is
    let artifactType: string;
    switch (phase) {
      case 'review-design':
        artifactType = 'DESIGN document produced by builder';
        break;
      case 'review-impl':
        artifactType = 'IMPLEMENTATION output produced by builder';
        break;
      case 'design':
        artifactType = 'Previous feedback or design iteration';
        break;
      case 'implement':
        artifactType = 'Approved design or previous implementation feedback';
        break;
      default:
        artifactType = 'Artifact';
    }

    parts.push(`\n\n# Current Artifact (${artifactType})\n\n${current}`);
  }

  // Phase-specific instructions
  let instruction: string;
  switch (phase) {
    case 'design':
      instruction = 'Produce or revise the DESIGN based on the brief and any feedback.';
      break;
    case 'review-design':
      instruction = 'Review the DESIGN artifact. You must start your response with STATUS: approved|revise|escalate';
      break;
    case 'implement':
      instruction = 'Produce or revise the IMPLEMENTATION based on the approved design.';
      break;
    case 'review-impl':
      instruction = 'Review the IMPLEMENTATION artifact. You must start your response with STATUS: approved|revise|escalate';
      break;
    default:
      instruction = '';
  }

  if (instruction) {
    parts.push(`\n\n# Your Task\n\n${instruction}`);
  }

  return parts.join('');
}

/**
 * Parse verdict from reviewer output.
 *
 * Looks for STATUS: line at top of output.
 */
function parseVerdict(output: string): Verdict {
  const lines = output.split('\n');

  for (const line of lines.slice(0, 10)) {
    const trimmed = line.trim().toUpperCase();

    if (trimmed.startsWith('STATUS:')) {
      const status = trimmed.replace('STATUS:', '').trim().toLowerCase();
      if (status === 'approved' || status === 'approve') return 'approved';
      if (status === 'revise' || status === 'revision' || status === 'changes' || status === 'revisions') return 'revise';
      if (status === 'escalate' || status === 'escalation' || status === 'block') return 'escalate';
    }
  }

  return 'unknown';
}

/**
 * Input for recording human intervention.
 */
export interface HumanInputParams {
  sliceId: string;
  sliceDir: string;  // repo-relative
  repoRoot: string;  // absolute
  text: string;
  phase: RelayPhase;
  reason?: string;
}

/**
 * Record human input as a first-class actor event.
 *
 * This allows human interventions to be logged and traced
 * just like Claude or Codex outputs.
 */
export async function recordHumanInput(
  params: HumanInputParams,
  clock: ClockPort
): Promise<void> {
  const { sliceId, sliceDir, repoRoot, text, phase, reason } = params;
  const absSliceDir = join(repoRoot, sliceDir);
  const timestamp = clock.now();

  // Build log filename: YYYY-MM-DD_HH-MM-SSZ__human__human__slice-<id>.txt
  const ts = timestamp
    .replace(/:/g, '-')
    .replace(/\.\d{3}Z$/, 'Z')
    .replace('T', '_');
  const logFilename = `${ts}__human__human__slice-${sliceId}.txt`;
  const logPath = join(repoRoot, 'logs', logFilename);
  const repoRelativeLogPath = join('logs', logFilename);

  // Ensure logs directory exists
  await mkdir(join(repoRoot, 'logs'), { recursive: true });

  // Write log entry
  const logContent = [
    `# Human Input Log`,
    ``,
    `Slice ID: ${sliceId}`,
    `Phase: ${phase}`,
    `Timestamp: ${timestamp}`,
    reason ? `Reason: ${reason}` : '',
    ``,
    `## Content`,
    ``,
    text,
  ].filter(line => line !== undefined).join('\n');

  await writeFile(logPath, logContent, 'utf-8');

  // Update current.md with human input
  const currentPath = join(absSliceDir, 'current.md');
  await writeFile(currentPath, text, 'utf-8');

  // Update current.meta.json
  const currentMetaPath = join(absSliceDir, 'current.meta.json');
  const currentMeta: CurrentMeta = {
    phase,
    actor: 'human',
    runId: `human-${Date.now()}`,
    updatedAt: timestamp,
    logPath: repoRelativeLogPath,
  };
  await writeFile(currentMetaPath, JSON.stringify(currentMeta, null, 2), 'utf-8');

  // Update status.json
  const statusPath = join(absSliceDir, 'status.json');
  const newStatus: RelayStatus = {
    phase,
    updatedAt: timestamp,
    lastActor: 'human',
  };
  await writeFile(statusPath, JSON.stringify(newStatus, null, 2), 'utf-8');
}

/**
 * Run the full relay loop until stopped.
 */
export async function relayLoop(
  input: RelayInput,
  deps: RelayDeps,
  maxIterations: number = 10
): Promise<RelayResult> {
  let lastResult: RelayResult = { phase: 'design', stopped: false };

  for (let i = 0; i < maxIterations; i++) {
    console.log(`  [${i + 1}/${maxIterations}] Phase: ${lastResult.phase}`);
    lastResult = await relayStep(input, deps);

    if (lastResult.stopped) {
      break;
    }
  }

  if (!lastResult.stopped) {
    // Max iterations reached - persist blocked state
    const absSliceDir = join(input.repoRoot, input.sliceDir);
    const statusPath = join(absSliceDir, 'status.json');
    const reason = `Max iterations (${maxIterations}) reached without resolution`;

    lastResult = await transitionToBlocked(
      absSliceDir,
      statusPath,
      deps.clock,
      'human',
      reason
    );
  }

  return lastResult;
}
