/**
 * Antigravity CLI (`agy`) provider adapter.
 *
 * Implements ProviderRunnerPort for Google's Antigravity CLI in headless
 * stream-json mode. Probed live against agy 1.4.0 on 2026-10-18 (see
 * docs/TECH-DEBT.md TD-035 for the one posture claim the probe could not
 * settle).
 *
 * Protocol facts the adapter relies on (all live-verified unless marked):
 *  - `--input-format stream-json --output-format stream-json` reads one NDJSON
 *    line per turn from stdin (`{"event":"user","message":{"content":…}}`),
 *    runs the turn, and exits when stdin closes. A 600 KB turn round-trips;
 *    argv delivery (`--print=…`) is capped by ARG_MAX (1 MiB here) and is not
 *    used.
 *  - stdout is NDJSON: an `init` event (`conversation_id`, model, cwd, tools)
 *    then `step_update` events then one `result` event (`conversation_id`,
 *    `status`, `response`, optional `error`, optional `denied_actions`).
 *  - `--conversation <id>` resumes a conversation; an UNKNOWN id only warns on
 *    stderr and starts a NEW conversation with exit 0, so a resumed run must
 *    prove the returned id equals the requested one.
 *  - Headless mode cannot prompt: a tool that needs a permission is auto-denied,
 *    the turn ends with an EMPTY response, `status: "SUCCESS"`, exit 0 and a
 *    `denied_actions` list. The adapter reports that as a failed run.
 *  - `--model <base> --effort <level>` resolves to the tiered catalog id
 *    (`gemini-3.8-flash` + `high` → `gemini-3.8-flash-high`, CLI log verified).
 *  - A model/agent API failure exits 3 with an `AGY_ERROR: {…}` line on stderr.
 *  - There is no system-prompt flag. The shared instruction travels as the
 *    first stdin frame (human ruling 2026-10-18, option A), the Copilot
 *    precedent; receipt mechanism `antigravity-stdin-frame`.
 *
 * @module adapters/providers/antigravity
 * @maturity PROTOTYPE
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, isAbsolute } from 'node:path';

import type { ClockPort, ArtifactStorePort } from '../../../application/ports/index.js';
import type {
  ProviderRunnerPort,
  RunRequest,
  RunResult,
  PreparedRunDelivery,
  RunTextInput,
} from '../../../application/ports/provider-runner.js';
import { frameReviewedInputs } from '../../../application/ports/provider-runner.js';
import { RunStatus } from '../../../core/run-record.js';

/**
 * Configuration for the Antigravity adapter.
 */
export interface AntigravityAdapterConfig {
  /** Path to logs directory (absolute) */
  readonly logsDir: string;

  /** Path to prompt-asset root (agent-manager; for resolving prompt paths) */
  readonly promptRoot: string;

  /**
   * Absolute path to the shared system-prompt file (e.g. SYSTEM.txt).
   *
   * `agy` has no system-prompt flag. When set, the adapter READS the file and
   * delivers its content as the FIRST part of the user turn (ahead of the role
   * prompts / reviewed frames). Absent => no shared layer (self-host default).
   */
  readonly sharedInstructionPath?: string;

  /** Antigravity CLI command (default: 'agy') */
  readonly command?: string;

  /** Default timeout in ms (default: 300000 = 5 min) */
  readonly defaultTimeout?: number;

  /** Grace period before SIGKILL after SIGTERM (default: 5000 = 5 sec) */
  readonly killGracePeriod?: number;
}

/**
 * Composition error thrown during adapter setup or validation.
 */
export class AntigravityAdapterCompositionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AntigravityAdapterCompositionError';
  }
}

type ResolvedAntigravityConfig = AntigravityAdapterConfig & {
  command: string;
  defaultTimeout: number;
  killGracePeriod: number;
};

/**
 * Antigravity adapter implementing ProviderRunnerPort.
 *
 * Headless stream-json mode only. One process per run; one user turn per
 * process; native conversations continue through `--conversation <id>`.
 */
export class AntigravityAdapter implements ProviderRunnerPort {
  readonly sessionSupport = 'explicit-id' as const;

  private readonly config: ResolvedAntigravityConfig;
  private readonly store: ArtifactStorePort;
  private readonly clock: ClockPort;

  /** Lazily-read content of sharedInstructionPath, cached after first run. */
  private sharedInstruction: string | undefined;

  constructor(
    config: AntigravityAdapterConfig,
    store: ArtifactStorePort,
    clock: ClockPort
  ) {
    this.config = {
      command: 'agy',
      defaultTimeout: 300_000,
      killGracePeriod: 5_000,
      ...config,
    };
    this.store = store;
    this.clock = clock;
  }

  /** Read the shared instruction file once (if configured) and cache it. */
  private async loadSharedInstruction(): Promise<void> {
    if (
      this.config.sharedInstructionPath &&
      this.sharedInstruction === undefined
    ) {
      this.sharedInstruction = await readFile(
        this.config.sharedInstructionPath,
        'utf-8'
      );
    }
  }

  /** Preload the shared instruction (dry-run parity with the sibling adapters). */
  async prewarm(): Promise<void> {
    await this.loadSharedInstruction();
  }

  async run(request: RunRequest): Promise<RunResult> {
    if (request.outputSchema) {
      throw new AntigravityAdapterCompositionError(
        'Schema-constrained output is not supported by the Antigravity adapter. Remove outputSchema from the request.'
      );
    }
    const startedAt = this.clock.now();
    const prepared = await this.prepareRunDelivery(request);
    const logPath = this.buildLogPath(request, startedAt);
    await mkdir(dirname(logPath), { recursive: true });

    const execResult = await this.execute(prepared.invocation, request.timeout, prepared.stdinBytes);
    const response = extractAntigravityResponse(execResult.stdout, request.providerSession?.kind === 'resume' ? request.providerSession.sessionId : undefined);

    const completedAt = this.clock.now();
    await this.writeLog(logPath, request, execResult, response, startedAt, completedAt);

    return this.buildResult(request, execResult, response, logPath, startedAt, completedAt, prepared.receipt);
  }

  /** Compose and identify exactly what a live spawn will receive, without spawning. */
  async prepareRunDelivery(request: RunRequest): Promise<PreparedRunDelivery> {
    switch (request.delivery.kind) {
      case 'legacy-live-inputs': {
        await this.loadSharedInstruction();
        const parts: string[] = [];
        if (this.sharedInstruction !== undefined) parts.push(this.sharedInstruction);
        for (const prompt of request.delivery.prompts) {
          if (isAbsolute(prompt.path)) throw new AntigravityAdapterCompositionError(`Prompt path must be repo-relative, got absolute path: ${prompt.path}`);
          const asset = await this.store.readPromptAsset(join(this.config.promptRoot, prompt.path));
          if (asset.digest !== prompt.digest) throw new AntigravityAdapterCompositionError(`Prompt digest mismatch for ${prompt.path}. Expected ${prompt.digest}, got ${asset.digest}.`);
          parts.push(asset.content);
        }
        if (request.delivery.contextText) parts.push(request.delivery.contextText);
        return { invocation: this.buildInvocation(request), stdinBytes: encodeUserTurn(parts.join('\n\n---\n\n')), receipt: { kind: 'legacy-live-inputs' } };
      }
      case 'reviewed-input-snapshots': {
        verifyReviewedInputs(request.delivery.common, request.delivery.roleSpecific);
        const shared = reviewedShared(request.delivery.common);
        // The shared instruction is the first frame of the turn (option A).
        const framed = frameReviewedInputs([shared, ...request.delivery.common.filter((item) => item !== shared), ...request.delivery.roleSpecific]);
        const stdinBytes = encodeUserTurn(new TextDecoder('utf-8', { fatal: true }).decode(framed));
        return {
          invocation: this.buildInvocation(request), stdinBytes,
          receipt: {
            kind: 'reviewed-input-snapshots', contract: request.delivery.contract,
            channels: [
              { channel: 'shared-instruction', mechanism: 'antigravity-stdin-frame', sha256: shared.sha256, byteLength: shared.bytes.byteLength },
              { channel: 'stdin', mechanism: 'stdin-stream-json', sha256: digest(stdinBytes), byteLength: stdinBytes.byteLength },
            ],
          },
        };
      }
    }
  }

  /**
   * Build the full provider invocation: command, argv, and working directory.
   *
   * `agy` has no working-root flag; the spawned process cwd is the workspace
   * (the target repo when `request.workingDir` is set), where it auto-loads
   * `GEMINI.md` / `AGENTS.md` rules by walking up to the repository root.
   */
  buildInvocation(request: RunRequest): {
    command: string;
    args: string[];
    cwd: string;
  } {
    return {
      command: this.config.command,
      args: this.buildArgs(request),
      cwd: request.workingDir ?? this.config.promptRoot,
    };
  }

  private buildArgs(request: RunRequest): string[] {
    // Headless NDJSON protocol on both pipes; the prompt is the stdin turn.
    const args: string[] = ['--input-format', 'stream-json', '--output-format', 'stream-json'];

    // Base model + effort; agy resolves the pair to its tiered catalog id.
    if (request.model) {
      args.push('--model', request.model);
    }
    if (request.effort) {
      args.push('--effort', request.effort);
    }

    // Permission posture. Headless agy auto-denies every tool that would
    // prompt (shell commands by default), and a denial ends the turn with an
    // empty response, so both postures approve tools up front.
    // write     => full autonomy (same flag the Claude adapter uses).
    // read-only => plan mode plus the same approval so the reviewer can run
    //   `git diff` and the checks. Whether plan mode still blocks file edits
    //   under that approval is UNVERIFIED (TD-035); the relay's candidate
    //   checkpoint re-check is the backstop.
    if (request.permission === 'write') {
      args.push('--dangerously-skip-permissions');
    } else if (request.permission === 'read-only') {
      args.push('--mode', 'plan', '--dangerously-skip-permissions');
    }

    if (request.providerSession?.kind === 'resume') {
      args.push('--conversation', request.providerSession.sessionId);
    }

    return args;
  }

  private buildLogPath(request: RunRequest, timestamp: string): string {
    const ts = timestamp
      .replace(/:/g, '-')
      .replace(/\.\d{3}Z$/, 'Z')
      .replace('T', '_');
    const filename = `${ts}__${request.role}__antigravity__slice-${request.sliceId}.txt`;
    return join(this.config.logsDir, filename);
  }

  private async execute(
    invocation: { command: string; args: string[]; cwd: string },
    timeout: number | undefined,
    stdinBytes: Uint8Array
  ): Promise<ExecResult> {
    const effectiveTimeout = timeout ?? this.config.defaultTimeout;

    return new Promise((resolve, reject) => {
      let proc: ChildProcess;
      try {
        proc = spawn(invocation.command, invocation.args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: invocation.cwd,
        });
      } catch (err) {
        reject(
          new AntigravityAdapterCompositionError(
            `Failed to spawn process: ${err instanceof Error ? err.message : String(err)}`
          )
        );
        return;
      }

      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let processExited = false;
      let killTimer: ReturnType<typeof setTimeout> | undefined;

      const termTimer = setTimeout(() => {
        timedOut = true;
        proc.kill('SIGTERM');
        killTimer = setTimeout(() => {
          if (!processExited) {
            proc.kill('SIGKILL');
          }
        }, this.config.killGracePeriod);
      }, effectiveTimeout);

      const cleanup = () => {
        processExited = true;
        clearTimeout(termTimer);
        if (killTimer !== undefined) {
          clearTimeout(killTimer);
        }
      };

      proc.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        cleanup();
        resolve({
          stdout,
          stderr,
          exitCode: code ?? 1,
          timedOut,
        });
      });

      proc.on('error', (err) => {
        cleanup();
        const errWithCode = err as NodeJS.ErrnoException;
        if (errWithCode.code === 'ENOENT') {
          reject(
            new AntigravityAdapterCompositionError(
              `Antigravity CLI not found: '${this.config.command}' is not installed or not in PATH`
            )
          );
          return;
        }
        if (errWithCode.code === 'EACCES') {
          reject(
            new AntigravityAdapterCompositionError(
              `Permission denied executing '${this.config.command}'`
            )
          );
          return;
        }
        resolve({
          stdout,
          stderr,
          exitCode: 1,
          timedOut: false,
          error: err.message,
        });
      });

      if (proc.stdin) {
        proc.stdin.on('error', (err) => {
          stderr += `\n[stdin write error: ${err.message}]`;
        });
        // The turn is one NDJSON line; closing stdin tells agy to exit after it.
        proc.stdin.write(stdinBytes, (err) => {
          if (err) {
            stderr += `\n[stdin write callback error: ${err.message}]`;
          }
          proc.stdin?.end();
        });
      }
    });
  }

  private async writeLog(
    logPath: string,
    request: RunRequest,
    result: ExecResult,
    response: AntigravityResponse,
    startedAt: string,
    completedAt: string
  ): Promise<void> {
    const lines: string[] = [
      `# Run Log`,
      ``,
      `Run ID: ${request.runId}`,
      `Slice ID: ${request.sliceId}`,
      `Role: ${request.role}`,
      `Provider: antigravity`,
      `Started: ${startedAt}`,
      `Completed: ${completedAt}`,
      `Exit Code: ${result.exitCode}`,
    ];
    if (response.sessionId !== undefined) {
      lines.push(`Conversation: ${response.sessionId}`);
      lines.push(`Native transcript: ~/.gemini/antigravity-cli/brain/${response.sessionId}/.system_generated/logs/transcript.jsonl`);
    }
    if (result.timedOut) {
      lines.push(`Timed Out: yes`);
    }
    if (result.error) {
      lines.push(`Error: ${result.error}`);
    }
    if (response.protocolError) {
      lines.push(`Protocol Error: ${response.protocolError}`);
    }
    if (response.deniedActions.length > 0) {
      lines.push(`Denied Actions: ${response.deniedActions.join(', ')}`);
    }
    lines.push(
      ``,
      `## Prompts`,
      ``,
      ...(request.delivery.kind === 'legacy-live-inputs'
        ? request.delivery.prompts.map((p) => `- ${p.path} (${p.digest})`)
        : [...request.delivery.common, ...request.delivery.roleSpecific].map((p) => `- ${p.origin === 'file' ? p.path : p.label} (${p.sha256})`)),
      ``,
      `## STDOUT`,
      ``,
      '```',
      result.stdout,
      '```',
      ``,
      `## STDERR`,
      ``,
      '```',
      result.stderr,
      '```'
    );
    await writeFile(logPath, lines.join('\n'), 'utf-8');
  }

  private buildResult(
    request: RunRequest,
    execResult: ExecResult,
    response: AntigravityResponse,
    logPath: string,
    startedAt: string,
    completedAt: string,
    deliveryReceipt: RunResult['deliveryReceipt']
  ): RunResult {
    let status: RunStatus;
    let failure: string | undefined;
    if (execResult.timedOut) {
      status = RunStatus.TIMEOUT;
    } else if (execResult.exitCode !== 0 || execResult.error) {
      status = RunStatus.FAILED;
      failure = execResult.error ?? agyErrorLine(execResult.stderr) ?? (execResult.stderr || 'Unknown error');
    } else if (response.protocolError) {
      status = RunStatus.FAILED;
      failure = response.protocolError;
    } else if (response.resultStatus !== 'SUCCESS') {
      status = RunStatus.FAILED;
      failure = response.resultError ?? `Antigravity reported result status '${response.resultStatus}'.`;
    } else if (response.deniedActions.length > 0 && !response.finalText.trim()) {
      status = RunStatus.FAILED;
      failure = `Antigravity headless mode auto-denied a tool permission (${response.deniedActions.join(', ')}) and the turn ended without a response.`;
    } else {
      status = RunStatus.COMPLETED;
    }

    const outputArtifacts =
      status === RunStatus.COMPLETED && response.finalText.trim()
        ? [
            {
              suggestedPath: `${request.role}-output.md`,
              type: 'provider-output',
              content: response.finalText,
            },
          ]
        : [];

    const result: RunResult = {
      runId: request.runId,
      status,
      outputArtifacts,
      logPath,
      startedAt,
      completedAt,
      deliveryReceipt,
      ...(response.sessionId !== undefined ? { providerSessionId: response.sessionId } : {}),
    };

    if (status === RunStatus.FAILED || status === RunStatus.TIMEOUT) {
      (result as { exitCode: number }).exitCode = execResult.exitCode;
      (result as { error: string }).error = failure ?? (execResult.stderr || 'Unknown error');
    }

    return result;
  }
}

function digest(bytes: Uint8Array): string {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

/** One stream-json user turn: `{"event":"user","message":{"content":…}}` + newline. */
function encodeUserTurn(content: string): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify({ event: 'user', message: { content } })}\n`);
}

function verifyReviewedInputs(common: readonly RunTextInput[], roleSpecific: readonly RunTextInput[]): void {
  if (common.length === 0 || roleSpecific.length === 0) throw new AntigravityAdapterCompositionError('Reviewed input arrays must be non-empty.');
  for (const input of [...common, ...roleSpecific]) {
    if (digest(input.bytes) !== input.sha256) throw new AntigravityAdapterCompositionError(`Reviewed input digest mismatch for ${input.origin === 'file' ? input.path : input.label}.`);
    try { new TextDecoder('utf-8', { fatal: true }).decode(input.bytes); }
    catch { throw new AntigravityAdapterCompositionError(`Reviewed input is not UTF-8 for ${input.origin === 'file' ? input.path : input.label}.`); }
  }
}

function reviewedShared(common: readonly RunTextInput[]): RunTextInput {
  const matches = common.filter((input) => input.purpose === 'shared-instruction');
  if (matches.length !== 1 || !matches[0]) throw new AntigravityAdapterCompositionError('Reviewed delivery requires exactly one shared-instruction common input.');
  return matches[0];
}

/** The structured `AGY_ERROR: {...}` line agy prints on stderr for exit 3, if any. */
function agyErrorLine(stderr: string): string | undefined {
  const line = stderr.split('\n').find((item) => item.startsWith('AGY_ERROR:'));
  return line?.trim();
}

interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  error?: string;
}

interface AntigravityResponse {
  finalText: string;
  sessionId?: string;
  resultStatus?: string;
  resultError?: string;
  deniedActions: string[];
  protocolError?: string;
}

/**
 * Extract the role-facing text, the native conversation id and the turn
 * outcome from agy's stream-json stdout.
 *
 * `expectedSessionId` is the id a resumed run asked for; agy starts a NEW
 * conversation (with only a stderr warning) when the id is unknown, so a
 * different returned id is a protocol error, never a silent rebinding.
 */
export function extractAntigravityResponse(stdout: string, expectedSessionId?: string): AntigravityResponse {
  let sessionId: string | undefined;
  let finalText = '';
  let resultStatus: string | undefined;
  let resultError: string | undefined;
  const deniedActions: string[] = [];
  let sawResult = false;

  const noteSession = (id: unknown): string | undefined => {
    if (typeof id !== 'string' || id.length === 0) return undefined;
    if (sessionId !== undefined && sessionId !== id) return `Antigravity output changed conversation id from '${sessionId}' to '${id}'.`;
    sessionId = id;
    return undefined;
  };

  for (const line of stdout.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let value: unknown;
    try {
      value = JSON.parse(trimmed);
    } catch {
      return { finalText, deniedActions, ...(sessionId ? { sessionId } : {}), protocolError: 'Antigravity stream output contained a non-JSON line.' };
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const event = value as Record<string, unknown>;
    if (event.event === 'init') {
      const problem = noteSession(event.conversation_id);
      if (problem) return { finalText, deniedActions, ...(sessionId ? { sessionId } : {}), protocolError: problem };
    } else if (event.event === 'result' && event.result && typeof event.result === 'object' && !Array.isArray(event.result)) {
      const result = event.result as Record<string, unknown>;
      const problem = noteSession(result.conversation_id);
      if (problem) return { finalText, deniedActions, ...(sessionId ? { sessionId } : {}), protocolError: problem };
      sawResult = true;
      if (typeof result.response === 'string') finalText = result.response;
      if (typeof result.status === 'string') resultStatus = result.status;
      if (typeof result.error === 'string' && result.error) resultError = result.error;
      if (Array.isArray(result.denied_actions)) {
        for (const item of result.denied_actions) {
          if (item && typeof item === 'object') {
            const denied = item as Record<string, unknown>;
            deniedActions.push(typeof denied.display_name === 'string' ? denied.display_name : typeof denied.action === 'string' ? denied.action : 'unknown');
          }
        }
      }
    }
  }

  const base = { finalText, deniedActions, ...(sessionId ? { sessionId } : {}), ...(resultStatus ? { resultStatus } : {}), ...(resultError ? { resultError } : {}) };
  if (sessionId === undefined) {
    return { ...base, protocolError: 'Antigravity stream output did not identify a conversation.' };
  }
  if (!sawResult) {
    return { ...base, protocolError: 'Antigravity stream output ended without a result event.' };
  }
  if (expectedSessionId !== undefined && sessionId !== expectedSessionId) {
    return { ...base, protocolError: `Antigravity did not resume conversation '${expectedSessionId}' (it answered in '${sessionId}'; the id is unknown to the CLI).` };
  }
  return base;
}
