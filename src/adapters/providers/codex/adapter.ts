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
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, isAbsolute } from 'node:path';

import type { ClockPort, ArtifactStorePort } from '../../../application/ports/index.js';
import type {
  ProviderRunnerPort,
  RunRequest,
  RunResult,
} from '../../../application/ports/provider-runner.js';
import { RunStatus } from '../../../core/run-record.js';

/**
 * Configuration for Codex adapter.
 */
export interface CodexAdapterConfig {
  /** Path to logs directory (absolute) */
  readonly logsDir: string;

  /** Path to repository root (for resolving prompt paths) */
  readonly repoRoot: string;

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
export class CodexAdapter implements ProviderRunnerPort {
  private readonly config: Required<CodexAdapterConfig>;
  private readonly store: ArtifactStorePort;
  private readonly clock: ClockPort;

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

  async run(request: RunRequest): Promise<RunResult> {
    const startedAt = this.clock.now();

    // Validate and read all prompt contents
    const promptContents: string[] = [];
    for (const prompt of request.prompts) {
      if (isAbsolute(prompt.path)) {
        throw new CodexAdapterCompositionError(
          `Prompt path must be repo-relative, got absolute path: ${prompt.path}`
        );
      }

      const fullPath = join(this.config.repoRoot, prompt.path);
      const asset = await this.store.readPromptAsset(fullPath);

      if (asset.digest !== prompt.digest) {
        throw new CodexAdapterCompositionError(
          `Prompt digest mismatch for ${prompt.path}. ` +
          `Expected ${prompt.digest}, got ${asset.digest}.`
        );
      }

      promptContents.push(asset.content);
    }

    const fullPrompt = promptContents.join('\n\n---\n\n');

    const args = this.buildArgs(request);
    const logPath = this.buildLogPath(request, startedAt);

    await mkdir(dirname(logPath), { recursive: true });

    const execResult = await this.execute(args, request.timeout, fullPrompt);

    const completedAt = this.clock.now();

    await this.writeLog(logPath, request, execResult, startedAt, completedAt);

    return this.buildResult(request, execResult, logPath, startedAt, completedAt);
  }

  private buildArgs(request: RunRequest): string[] {
    // Use exec mode for general artifact review
    // review mode is for code diff review, not artifact review
    const args: string[] = ['exec'];

    // Model override
    if (request.model) {
      args.push('--model', request.model);
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
    args: string[],
    timeout: number | undefined,
    stdinContent: string
  ): Promise<ExecResult> {
    const effectiveTimeout = timeout ?? this.config.defaultTimeout;

    return new Promise((resolve, reject) => {
      let proc: ChildProcess;

      try {
        proc = spawn(this.config.command, args, {
          stdio: ['pipe', 'pipe', 'pipe'],
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
      ...request.prompts.map((p) => `- ${p.path} (${p.digest})`),
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
    completedAt: string
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
    };

    if (status === RunStatus.FAILED || status === RunStatus.TIMEOUT) {
      (result as { exitCode: number }).exitCode = execResult.exitCode;
      (result as { error: string }).error =
        execResult.error ?? (execResult.stderr || 'Unknown error');
    }

    return result;
  }
}

interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  error?: string;
}
