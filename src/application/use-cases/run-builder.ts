/**
 * Run Builder use case.
 *
 * Executes a builder role against a slice and records the result.
 *
 * @module application/use-cases
 * @maturity PROTOTYPE
 */

import { join } from 'node:path';

import type { ClockPort, ArtifactStorePort, ProviderRunnerPort } from '../ports/index.js';
import type { RunRequest } from '../ports/provider-runner.js';
import type { PromptRef, RunRecord } from '../../core/run-record.js';
import { RunStatus } from '../../core/run-record.js';
import type { SliceStatus } from '../../core/slice.js';
import { WorkflowPhase } from '../../core/workflow-phase.js';

/**
 * Input for running a builder.
 */
export interface RunBuilderInput {
  /** Slice ID */
  readonly sliceId: string;

  /** Path to slice directory relative to repo root */
  readonly sliceDir: string;

  /** Prompt paths relative to repo root */
  readonly promptPaths: readonly string[];

  /** Repository root (absolute, for filesystem resolution only) */
  readonly repoRoot: string;

  /** Run ID for this execution */
  readonly runId: string;

  /** Provider ID (e.g., 'claude', 'codex') */
  readonly providerId: string;

  /** Model override (optional) */
  readonly model?: string;

  /** Effort override (optional) */
  readonly effort?: string;
}

/**
 * Result of running a builder.
 */
export interface RunBuilderResult {
  /** Whether the run completed successfully */
  readonly success: boolean;

  /** Path to output artifact (if success) */
  readonly outputArtifactPath?: string;

  /** Path to run record */
  readonly runRecordPath: string;

  /** Error message (if failed) */
  readonly error?: string;
}

/**
 * Dependencies for the use case.
 */
export interface RunBuilderDeps {
  readonly clock: ClockPort;
  readonly store: ArtifactStorePort;
  readonly provider: ProviderRunnerPort;
}

/**
 * Execute a builder run against a slice.
 *
 * This use case:
 * 1. Resolves prompt assets and computes digests
 * 2. Builds RunRequest
 * 3. Invokes provider
 * 4. Writes output artifact to slice
 * 5. Writes run record
 * 6. Updates slice status
 */
export async function runBuilder(
  input: RunBuilderInput,
  deps: RunBuilderDeps
): Promise<RunBuilderResult> {
  const { clock, store, provider } = deps;

  // 1. Resolve prompt assets and compute digests
  const prompts: PromptRef[] = [];
  for (const promptPath of input.promptPaths) {
    const fullPath = join(input.repoRoot, promptPath);
    const asset = await store.readPromptAsset(fullPath);
    prompts.push({
      path: promptPath,
      digest: asset.digest,
    });
  }

  // 2. Build RunRequest (using repo-relative paths for artifact references)
  const briefPath = join(input.sliceDir, 'brief.md');
  const request: RunRequest = {
    runId: input.runId,
    sliceId: input.sliceId,
    role: 'builder',
    prompts,
    inputArtifacts: [
      {
        path: briefPath,
        type: 'brief',
      },
    ],
    ...(input.model !== undefined && { model: input.model }),
    ...(input.effort !== undefined && { effort: input.effort }),
  };

  // 3. Invoke provider
  const result = await provider.run(request);

  // 4. Write output artifact (if success and has output)
  // Paths are repo-relative for traceability; filesystem adapter resolves to absolute
  let outputArtifactPath: string | undefined;
  if (result.status === RunStatus.COMPLETED && result.outputArtifacts.length > 0) {
    const output = result.outputArtifacts[0];
    if (output) {
      // Map provider-output to design artifact (repo-relative path)
      outputArtifactPath = join(input.sliceDir, 'design', 'design.md');
      const content =
        typeof output.content === 'string'
          ? output.content
          : JSON.stringify(output.content, null, 2);
      // Filesystem write uses absolute path
      await store.writeArtifact(join(input.repoRoot, outputArtifactPath), content);
    }
  }

  // 5. Write run record (repo-relative path)
  const runRecordPath = join(input.sliceDir, 'runs', `${input.runId}.json`);
  const runRecord: RunRecord = {
    runId: result.runId,
    sliceId: input.sliceId,
    role: 'builder',
    provider: input.providerId,
    prompts,
    inputArtifacts: request.inputArtifacts,
    outputArtifacts: result.outputArtifacts,
    logPath: result.logPath,
    startedAt: result.startedAt,
    completedAt: result.completedAt,
    status: result.status,
    ...(input.model !== undefined && { model: input.model }),
    ...(input.effort !== undefined && { effort: input.effort }),
    ...(result.exitCode !== undefined && { exitCode: result.exitCode }),
    ...(result.error !== undefined && { error: result.error }),
  };
  // Filesystem write uses absolute path
  await store.writeRunRecord(join(input.repoRoot, runRecordPath), runRecord);

  // 6. Update slice status
  const newPhase =
    result.status === RunStatus.COMPLETED
      ? WorkflowPhase.DESIGN_DRAFT
      : WorkflowPhase.BACKLOG;
  const statusPath = join(input.sliceDir, 'status.json');
  const newStatus: SliceStatus = {
    sliceId: input.sliceId,
    phase: newPhase,
    updatedAt: clock.now(),
  };
  // Filesystem write uses absolute path
  await store.updateStatus(join(input.repoRoot, statusPath), newStatus);

  // Return result
  if (result.status === RunStatus.COMPLETED) {
    const successResult: RunBuilderResult = {
      success: true,
      runRecordPath,
    };
    if (outputArtifactPath !== undefined) {
      return { ...successResult, outputArtifactPath };
    }
    return successResult;
  } else {
    return {
      success: false,
      runRecordPath,
      error: result.error ?? `Run failed with status: ${result.status}`,
    };
  }
}
