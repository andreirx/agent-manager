/**
 * ProviderRunnerPort executes provider runs.
 *
 * This port accepts normalized run requests and returns normalized results.
 * Provider-specific details (CLI commands, output parsing) are adapter concerns.
 *
 * @module application/ports
 * @maturity PROTOTYPE
 */

import type { RoleId } from '../../core/role.js';
import type { ArtifactRef } from '../../core/artifact-ref.js';
import type { PromptRef, RunOutputArtifact, RunStatus } from '../../core/run-record.js';

/**
 * Request to execute a provider run.
 *
 * All fields needed by the adapter to invoke the provider.
 */
export interface RunRequest {
  /** Unique identifier for this run */
  readonly runId: string;

  /** Slice this run belongs to */
  readonly sliceId: string;

  /** Role being executed */
  readonly role: RoleId;

  /** Prompts to inject (with digests already computed) */
  readonly prompts: readonly PromptRef[];

  /** Input artifacts to provide */
  readonly inputArtifacts: readonly ArtifactRef[];

  /** JSON schema for structured output (optional) */
  readonly outputSchema?: Record<string, unknown>;

  /** Model override (optional) */
  readonly model?: string;

  /** Reasoning effort level (optional) */
  readonly effort?: string;

  /** Timeout in milliseconds (optional) */
  readonly timeout?: number;
}

/**
 * Result of a provider run.
 *
 * Returned by adapter after provider execution completes.
 */
export interface RunResult {
  /** Matches request runId */
  readonly runId: string;

  /** Execution status */
  readonly status: RunStatus;

  /** Output artifacts produced (on success) */
  readonly outputArtifacts: readonly RunOutputArtifact[];

  /** Path to raw log file */
  readonly logPath: string;

  /** Run start time (ISO-8601) */
  readonly startedAt: string;

  /** Run completion time (ISO-8601) */
  readonly completedAt: string;

  /** Provider exit code (on failure) */
  readonly exitCode?: number;

  /** Error description (on failure) */
  readonly error?: string;
}

/**
 * Port for executing provider runs.
 *
 * Adapters implement this to translate between normalized requests
 * and provider-specific CLI invocations.
 */
export interface ProviderRunnerPort {
  /**
   * Execute a provider run.
   *
   * @param request - Normalized run request
   * @returns Run result after provider completes
   *
   * Runtime failures (timeout, crash, parse error) are returned in the result
   * with status 'failed', 'timeout', or 'cancelled'.
   *
   * Composition errors (provider not installed, invalid config) may throw
   * before execution begins.
   */
  run(request: RunRequest): Promise<RunResult>;
}
