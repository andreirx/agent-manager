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

export type RunInputPurpose =
  | 'shared-instruction'
  | 'common-role-instruction'
  | 'baseline-manifest'
  | 'requirement'
  | 'source'
  | 'governance'
  | 'design'
  | 'allocation'
  | 'review'
  | 'approval'
  | 'authority'
  | 'decision'
  | 'role-instruction'
  | 'selection-packet'
  | 'review-subject'
  | 'build-report'
  | 'prior-review'
  | 'task-directive';

export type RunTextInput =
  | {
      readonly origin: 'file';
      readonly root: 'target' | 'prompt';
      readonly purpose: RunInputPurpose;
      readonly path: string;
      readonly bytes: Uint8Array;
      readonly sha256: string;
    }
  | {
      readonly origin: 'generated';
      readonly purpose: RunInputPurpose;
      readonly label: string;
      readonly bytes: Uint8Array;
      readonly sha256: string;
    };

/** Closed input-delivery mode: legacy live files or immutable reviewed bytes. */
export type RunInputDelivery =
  | {
      readonly kind: 'legacy-live-inputs';
      readonly prompts: readonly PromptRef[];
      readonly contextText?: string;
    }
  | {
      readonly kind: 'reviewed-input-snapshots';
      readonly contract: 'requirements-assurance/v2-input-delivery';
      readonly common: readonly RunTextInput[];
      readonly roleSpecific: readonly RunTextInput[];
    };

export interface RunChannelIdentity {
  readonly channel: 'shared-instruction' | 'stdin';
  readonly mechanism: string;
  readonly sha256: string;
  readonly byteLength: number;
}

export type RunDeliveryReceipt =
  | { readonly kind: 'legacy-live-inputs' }
  | {
      readonly kind: 'reviewed-input-snapshots';
      readonly contract: 'requirements-assurance/v2-input-delivery';
      readonly channels: readonly RunChannelIdentity[];
    };

export interface PreparedRunDelivery {
  readonly invocation: { readonly command: string; readonly args: string[]; readonly cwd: string };
  readonly stdinBytes: Uint8Array;
  readonly sharedSnapshot?: { readonly path: string; readonly bytes: Uint8Array };
  readonly receipt: RunDeliveryReceipt;
}

/**
 * Native provider-conversation request.
 *
 * Absence means Agent Manager makes no conversation-reuse request for this
 * one-shot call; the native provider may still retain its own conversation.
 * `fresh` asks the adapter to start a conversation and return its native id;
 * `resume` names the only conversation the adapter may continue.
 */
export type ProviderSessionRequest =
  | { readonly kind: 'fresh' }
  | { readonly kind: 'resume'; readonly sessionId: string };

/** Render the contract's length-delimited frames without normalizing source bytes. */
export function frameReviewedInputs(inputs: readonly RunTextInput[]): Uint8Array {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (const input of inputs) {
    // Fatal decoding is an explicit pre-spawn validation even though framing
    // copies the original bytes rather than the decoded string.
    decoder.decode(input.bytes);
    const header = input.origin === 'file'
      ? { origin: input.origin, root: input.root, purpose: input.purpose, path: input.path, sha256: input.sha256, byteLength: input.bytes.byteLength }
      : { origin: input.origin, purpose: input.purpose, label: input.label, sha256: input.sha256, byteLength: input.bytes.byteLength };
    const opening = encoder.encode(`AGENT_MANAGER_INPUT_V2 ${JSON.stringify(header)}\n`);
    const closing = encoder.encode('\nAGENT_MANAGER_INPUT_END_V2\n');
    chunks.push(opening, input.bytes, closing);
    total += opening.byteLength + input.bytes.byteLength + closing.byteLength;
  }
  const framed = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    framed.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return framed;
}

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

  /** Exact input-delivery mode selected by the application. */
  readonly delivery: RunInputDelivery;

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

  /**
   * Absolute path used as the provider process working directory.
   *
   * Self-host runs omit this (cwd falls back to the prompt root). Target-owned
   * relay sets it to the target repository so the agent reads/edits that tree
   * and its CLAUDE.md / git context resolve there.
   */
  readonly workingDir?: string;

  /**
   * Workflow intent for this run. Provider-neutral; the use case decides it from
   * the phase, the adapter maps it (with `permission`) to CLI flags.
   * - 'plan'   : select/author a slice
   * - 'edit'   : implement (agentic file edits)
   * - 'review' : inspect changes and emit a verdict
   */
  readonly mode?: 'plan' | 'edit' | 'review';

  /**
   * Permission posture. Provider-neutral; mapped to provider flags by adapters.
   * Absent => no permission flag is emitted (self-host default behavior).
   */
  readonly permission?: 'read-only' | 'write';

  /** Explicit native conversation lifecycle for session-capable providers. */
  readonly providerSession?: ProviderSessionRequest;

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

  /** Identity of the actual provider delivery channels used for this request. */
  readonly deliveryReceipt: RunDeliveryReceipt;

  /** Provider exit code (on failure) */
  readonly exitCode?: number;

  /** Error description (on failure) */
  readonly error?: string;

  /** Native conversation id observed in the provider protocol, when available. */
  readonly providerSessionId?: string;
}

/**
 * Port for executing provider runs.
 *
 * Adapters implement this to translate between normalized requests
 * and provider-specific CLI invocations.
 */
export interface ProviderRunnerPort {
  /** The adapter can start and explicitly resume a native conversation by id. */
  readonly sessionSupport?: 'explicit-id';

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
