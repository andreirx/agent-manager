/**
 * RunRecord captures the execution of a provider run.
 *
 * Run records are authoritative artifacts stored in the slice's runs/ directory.
 * They provide traceability from workflow state back to execution evidence.
 *
 * @module core
 * @maturity PROTOTYPE
 */

import type { RoleId } from './role.js';
import type { ArtifactRef } from './artifact-ref.js';

/**
 * Run execution status.
 */
export const RunStatus = {
  COMPLETED: 'completed',
  FAILED: 'failed',
  TIMEOUT: 'timeout',
  CANCELLED: 'cancelled',
} as const;

export type RunStatus = (typeof RunStatus)[keyof typeof RunStatus];

/**
 * Provider identifier.
 *
 * This is the adapter/provider name (e.g., "claude", "codex"),
 * not the model name.
 */
export type ProviderId = string;

/**
 * Prompt reference as stored in run records.
 *
 * Includes digest for reproducibility per prompt-assets.md contract.
 */
export interface PromptRef {
  /** Path to prompt file relative to repository root */
  readonly path: string;

  /** Content digest in format "sha256:<hex>" */
  readonly digest: string;
}

/**
 * Output artifact from a run.
 *
 * Includes the suggested path where the artifact should be written.
 * The supervisor decides final placement.
 */
export interface RunOutputArtifact {
  /** Suggested path for the artifact */
  readonly suggestedPath: string;

  /** Artifact type */
  readonly type: string;

  /** Content (string or structured object) */
  readonly content: string | Record<string, unknown>;
}

/**
 * Run record stored in runs/ directory.
 *
 * This is the authoritative record of a provider execution.
 * All timestamps must be provided by caller (from clock port).
 */
export interface RunRecord {
  /** Unique identifier for this run */
  readonly runId: string;

  /** Slice this run belongs to */
  readonly sliceId: string;

  /** Role that initiated this run */
  readonly role: RoleId;

  /** Provider that executed this run */
  readonly provider: ProviderId;

  /** Prompts used for this run (with digests) */
  readonly prompts: readonly PromptRef[];

  /** Input artifacts provided to the run */
  readonly inputArtifacts: readonly ArtifactRef[];

  /** Output artifacts produced by the run */
  readonly outputArtifacts: readonly RunOutputArtifact[];

  /** Path to raw log file */
  readonly logPath: string;

  /** Run start time (ISO-8601) */
  readonly startedAt: string;

  /** Run completion time (ISO-8601) */
  readonly completedAt: string;

  /** Execution status */
  readonly status: RunStatus;

  /** Model used (optional, for traceability) */
  readonly model?: string;

  /** Reasoning effort level (optional) */
  readonly effort?: string;

  /** Provider exit code (on failure) */
  readonly exitCode?: number;

  /** Error description (on failure) */
  readonly error?: string;
}
