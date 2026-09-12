/**
 * Codex provider adapter.
 *
 * Implements ProviderRunnerPort for Codex CLI in headless mode.
 * Uses `codex exec` for general tasks, `codex review` for code review.
 *
 * @module adapters/providers/codex
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
 * Configuration for Codex adapter.
 */
export interface CodexAdapterConfig {
  /** Path to logs directory (absolute) */
  readonly logsDir: string;

  /** Path to prompt-asset root (agent-manager; for resolving prompt paths) */
  readonly promptRoot: string;

  /**
   * Absolute path to the shared system-prompt file (e.g. CLAUDE-SYSTEM.txt).
   *
   * When set, the adapter READS the file and injects its content as Codex's
   * `developer_instructions` config (additive on top of Codex base
   * instructions), because `-c key=value` takes an inline value. Absent =>
   * no developer-instructions override (self-host default).
   */
  readonly sharedInstructionPath?: string;

  /** Codex CLI command (default: 'codex') */
  readonly command?: string;

  /** Default timeout in ms (default: 300000 = 5 min) */
  readonly defaultTimeout?: number;

  /** Grace period before SIGKILL after SIGTERM (default: 5000 = 5 sec) */
  readonly killGracePeriod?: number;
}

/**
 * Composition error thrown during adapter setup or validation.
 */
export class CodexAdapterCompositionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CodexAdapterCompositionError';
  }
}

/**
 * Codex adapter implementing ProviderRunnerPort.
 *
 * Headless mode only.
 */
/**
 * Internal config with defaults resolved. `sharedInstructionPath` stays optional
 * (it has no default); only command/timeout/grace are guaranteed present.
 */
type ResolvedCodexConfig = CodexAdapterConfig & {
  command: string;
  defaultTimeout: number;
  killGracePeriod: number;
};

export class CodexAdapter implements ProviderRunnerPort {
  private readonly config: ResolvedCodexConfig;
  private readonly store: ArtifactStorePort;
  private readonly clock: ClockPort;

  /** Lazily-read content of sharedInstructionPath, cached after first run. */
  private sharedInstruction: string | undefined;

  constructor(
    config: CodexAdapterConfig,
    store: ArtifactStorePort,
    clock: ClockPort
  ) {
    this.config = {
      command: 'codex',
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

  /**
   * Preload the shared instruction so a subsequent buildInvocation() reflects
   * the real argv (including --config developer_instructions). Used by dry-run.
   */
  async prewarm(): Promise<void> {
    await this.loadSharedInstruction();
  }

  async run(request: RunRequest): Promise<RunResult> {
    const startedAt = this.clock.now();
    const prepared = await this.prepareRunDelivery(request);
    const logPath = this.buildLogPath(request, startedAt);

    await mkdir(dirname(logPath), { recursive: true });

    const execResult = await this.execute(prepared.invocation, request.timeout, new TextDecoder().decode(prepared.stdinBytes));

    const completedAt = this.clock.now();

    await this.writeLog(logPath, request, execResult, startedAt, completedAt);

    return this.buildResult(request, execResult, logPath, startedAt, completedAt, prepared.receipt);
  }

  /** Compose and identify exactly what a live spawn will receive, without spawning. */
  async prepareRunDelivery(request: RunRequest): Promise<PreparedRunDelivery> {
    switch (request.delivery.kind) {
      case 'legacy-live-inputs': {
        await this.loadSharedInstruction();
        const promptContents: string[] = [];
        for (const prompt of request.delivery.prompts) {
          if (isAbsolute(prompt.path)) throw new CodexAdapterCompositionError(`Prompt path must be repo-relative, got absolute path: ${prompt.path}`);
          const asset = await this.store.readPromptAsset(join(this.config.promptRoot, prompt.path));
          if (asset.digest !== prompt.digest) throw new CodexAdapterCompositionError(`Prompt digest mismatch for ${prompt.path}. Expected ${prompt.digest}, got ${asset.digest}.`);
          promptContents.push(asset.content);
        }
        const parts = [...promptContents];
        if (request.delivery.contextText) parts.push(request.delivery.contextText);
        return { invocation: this.buildInvocation(request), stdinBytes: new TextEncoder().encode(parts.join('\n\n---\n\n')), receipt: { kind: 'legacy-live-inputs' } };
      }
      case 'reviewed-input-snapshots': {
        verifyReviewedInputs(request.delivery.common, request.delivery.roleSpecific);
        const shared = reviewedShared(request.delivery.common);
        const stdinBytes = frameReviewedInputs([...request.delivery.common.filter((item) => item !== shared), ...request.delivery.roleSpecific]);
        return {
          invocation: this.buildInvocation(request, new TextDecoder('utf-8', { fatal: true }).decode(shared.bytes)),
          stdinBytes,
          receipt: {
            kind: 'reviewed-input-snapshots', contract: request.delivery.contract,
            channels: [
              { channel: 'shared-instruction', mechanism: 'codex-developer-instructions', sha256: shared.sha256, byteLength: shared.bytes.byteLength },
              { channel: 'stdin', mechanism: 'stdin', sha256: digest(stdinBytes), byteLength: stdinBytes.byteLength },
            ],
          },
        };
      }
    }
  }

  /**
   * Build the full provider invocation: command, argv, and working directory.
   *
   * Codex accepts an explicit `-C <dir>` working root AND honors the spawned
   * process cwd; both are set to the target repo when `request.workingDir` is
   * provided so config/AGENTS.md resolution is unambiguous.
   */
  buildInvocation(request: RunRequest, sharedInstruction = this.sharedInstruction): {
    command: string;
    args: string[];
    cwd: string;
  } {
    return {
      command: this.config.command,
      args: this.buildArgs(request, sharedInstruction),
      cwd: request.workingDir ?? this.config.promptRoot,
    };
  }

  private buildArgs(request: RunRequest, sharedInstruction = this.sharedInstruction): string[] {
    // exec = non-interactive headless run.
    const args: string[] = ['exec'];

    // Model override
    if (request.model) {
      args.push('--model', request.model);
    }

    // Codex CLI exposes reasoning effort through config overrides, not a
    // dedicated `codex exec` flag.
    if (request.effort) {
      args.push('--config', `model_reasoning_effort="${request.effort}"`);
    }

    // Shared house-rules layer delivered as developer-instructions (additive on
    // top of Codex base instructions). JSON-encoded so it is a valid TOML basic
    // string for `-c key=value` parsing (newlines/quotes safely escaped).
    if (sharedInstruction !== undefined) {
      args.push(
        '--config',
        `developer_instructions=${JSON.stringify(sharedInstruction)}`
      );
    }

    // Permission posture via sandbox policy. Only emitted when explicitly
    // requested; absent => self-host default (no flag).
    if (request.permission === 'write') {
      args.push('--sandbox', 'workspace-write');
    } else if (request.permission === 'read-only') {
      args.push('--sandbox', 'read-only');
    }

    // Working root for the agent (target repo in target-owned relay).
    if (request.workingDir) {
      args.push('-C', request.workingDir);
    }

    // Prompt via stdin (positional argument)
    args.push('-');

    return args;
  }

  private buildLogPath(request: RunRequest, timestamp: string): string {
    const ts = timestamp
      .replace(/:/g, '-')
      .replace(/\.\d{3}Z$/, 'Z')
      .replace('T', '_');

    const filename = `${ts}__${request.role}__codex__slice-${request.sliceId}.txt`;
    return join(this.config.logsDir, filename);
  }

  private async execute(
    invocation: { command: string; args: string[]; cwd: string },
    timeout: number | undefined,
    stdinContent: string
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
          new CodexAdapterCompositionError(
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
            new CodexAdapterCompositionError(
              `Codex CLI not found: '${this.config.command}' is not installed or not in PATH`
            )
          );
          return;
        }
        if (errWithCode.code === 'EACCES') {
          reject(
            new CodexAdapterCompositionError(
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

        proc.stdin.write(stdinContent, (err) => {
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
    startedAt: string,
    completedAt: string
  ): Promise<void> {
    const lines: string[] = [
      `# Run Log`,
      ``,
      `Run ID: ${request.runId}`,
      `Slice ID: ${request.sliceId}`,
      `Role: ${request.role}`,
      `Provider: codex`,
      `Started: ${startedAt}`,
      `Completed: ${completedAt}`,
      `Exit Code: ${result.exitCode}`,
    ];

    if (result.timedOut) {
      lines.push(`Timed Out: yes`);
    }
    if (result.error) {
      lines.push(`Error: ${result.error}`);
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
    logPath: string,
    startedAt: string,
    completedAt: string,
    deliveryReceipt: RunResult['deliveryReceipt']
  ): RunResult {
    let status: RunStatus;
    if (execResult.timedOut) {
      status = RunStatus.TIMEOUT;
    } else if (execResult.exitCode !== 0 || execResult.error) {
      status = RunStatus.FAILED;
    } else {
      status = RunStatus.COMPLETED;
    }

    const outputArtifacts =
      status === RunStatus.COMPLETED && execResult.stdout.trim()
        ? [
            {
              suggestedPath: `${request.role}-output.md`,
              type: 'provider-output',
              content: execResult.stdout,
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
    };

    if (status === RunStatus.FAILED || status === RunStatus.TIMEOUT) {
      (result as { exitCode: number }).exitCode = execResult.exitCode;
      (result as { error: string }).error =
        execResult.error ?? (execResult.stderr || 'Unknown error');
    }

    return result;
  }
}

function digest(bytes: Uint8Array): string {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function verifyReviewedInputs(common: readonly RunTextInput[], roleSpecific: readonly RunTextInput[]): void {
  if (common.length === 0 || roleSpecific.length === 0) throw new CodexAdapterCompositionError('Reviewed input arrays must be non-empty.');
  for (const input of [...common, ...roleSpecific]) {
    if (digest(input.bytes) !== input.sha256) throw new CodexAdapterCompositionError(`Reviewed input digest mismatch for ${input.origin === 'file' ? input.path : input.label}.`);
    try { new TextDecoder('utf-8', { fatal: true }).decode(input.bytes); }
    catch { throw new CodexAdapterCompositionError(`Reviewed input is not UTF-8 for ${input.origin === 'file' ? input.path : input.label}.`); }
  }
}

function reviewedShared(common: readonly RunTextInput[]): RunTextInput {
  const matches = common.filter((input) => input.purpose === 'shared-instruction');
  if (matches.length !== 1 || !matches[0]) throw new CodexAdapterCompositionError('Reviewed delivery requires exactly one shared-instruction common input.');
  return matches[0];
}

interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  error?: string;
}
