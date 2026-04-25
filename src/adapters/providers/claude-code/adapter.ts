/**
 * Claude Code provider adapter.
 *
 * Implements ProviderRunnerPort for Claude Code CLI in headless mode.
 *
 * Boundary responsibilities:
 * - This adapter ONLY executes and captures
 * - It does NOT write authoritative artifacts (those go through ArtifactStorePort)
 * - Raw logs are adapter-owned operational output, written directly to filesystem
 *
 * @module adapters/providers/claude-code
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
 * Configuration for Claude adapter.
 */
export interface ClaudeAdapterConfig {
  /** Path to logs directory (absolute) */
  readonly logsDir: string;

  /** Path to repository root (for resolving prompt paths) */
  readonly repoRoot: string;

  /** Claude CLI command (default: 'claude') */
  readonly command?: string;

  /** Default timeout in ms (default: 300000 = 5 min) */
  readonly defaultTimeout?: number;

  /** Grace period before SIGKILL after SIGTERM (default: 5000 = 5 sec) */
  readonly killGracePeriod?: number;
}

/**
 * Composition error thrown during adapter setup or validation.
 *
 * Distinguished from runtime failures which are returned in RunResult.
 */
export class ClaudeAdapterCompositionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClaudeAdapterCompositionError';
  }
}

/**
 * Claude Code adapter implementing ProviderRunnerPort.
 *
 * Headless mode only. No interactive/resume support in this version.
 * Schema-constrained output is not supported in Phase 3.
 */
export class ClaudeAdapter implements ProviderRunnerPort {
  private readonly config: Required<ClaudeAdapterConfig>;
  private readonly store: ArtifactStorePort;
  private readonly clock: ClockPort;

  constructor(
    config: ClaudeAdapterConfig,
    store: ArtifactStorePort,
    clock: ClockPort
  ) {
    this.config = {
      command: 'claude',
      defaultTimeout: 300_000,
      killGracePeriod: 5_000,
      ...config,
    };
    this.store = store;
    this.clock = clock;
  }

  async run(request: RunRequest): Promise<RunResult> {
    // Composition-time validation: reject unsupported features
    if (request.outputSchema !== undefined) {
      throw new ClaudeAdapterCompositionError(
        'Schema-constrained output is not supported in Phase 3. ' +
        'Remove outputSchema from request or wait for schema support.'
      );
    }

    const startedAt = this.clock.now();

    // Validate and read all prompt contents
    const promptContents: string[] = [];
    for (const prompt of request.prompts) {
      // Validate repo-relative path
      if (isAbsolute(prompt.path)) {
        throw new ClaudeAdapterCompositionError(
          `Prompt path must be repo-relative, got absolute path: ${prompt.path}`
        );
      }

      const fullPath = join(this.config.repoRoot, prompt.path);
      const asset = await this.store.readPromptAsset(fullPath);

      // Verify digest matches
      if (asset.digest !== prompt.digest) {
        throw new ClaudeAdapterCompositionError(
          `Prompt digest mismatch for ${prompt.path}. ` +
          `Expected ${prompt.digest}, got ${asset.digest}. ` +
          `Prompt may have changed since run was prepared.`
        );
      }

      promptContents.push(asset.content);
    }

    // Combine prompts
    const fullPrompt = promptContents.join('\n\n---\n\n');

    // Build command arguments
    const args = this.buildArgs(request);

    // Determine log path
    const logPath = this.buildLogPath(request, startedAt);

    // Ensure logs directory exists
    await mkdir(dirname(logPath), { recursive: true });

    // Execute Claude
    const execResult = await this.execute(args, request.timeout, fullPrompt);

    const completedAt = this.clock.now();

    // Write log (adapter-owned operational output, not via artifact port)
    await this.writeLog(logPath, request, execResult, startedAt, completedAt);

    // Build result
    return this.buildResult(request, execResult, logPath, startedAt, completedAt);
  }

  private buildArgs(request: RunRequest): string[] {
    const args: string[] = ['--print'];

    // Output format: text for now (schema mode not supported in Phase 3)
    args.push('--output-format', 'text');

    // Model override
    if (request.model) {
      args.push('--model', request.model);
    }

    // Effort override
    if (request.effort) {
      args.push('--effort', request.effort);
    }

    // Prompt will be passed via stdin
    args.push('-p', '-');

    return args;
  }

  private buildLogPath(request: RunRequest, timestamp: string): string {
    // Format: YYYY-MM-DD_HH-MM-SSZ__<role>__<provider>__slice-<id>.<ext>
    // Convert ISO timestamp to filename-safe format
    const ts = timestamp
      .replace(/:/g, '-')
      .replace(/\.\d{3}Z$/, 'Z')
      .replace('T', '_');

    const filename = `${ts}__${request.role}__claude__slice-${request.sliceId}.txt`;
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
        // spawn itself threw (very rare, e.g., invalid options)
        // This is a composition error, not a runtime failure
        reject(
          new ClaudeAdapterCompositionError(
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

      // Timeout handling with SIGTERM -> SIGKILL escalation
      const termTimer = setTimeout(() => {
        timedOut = true;
        proc.kill('SIGTERM');

        // Escalate to SIGKILL after grace period
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

        // ENOENT means command not found - composition error
        // EACCES means permission denied - composition error
        // These indicate environment/installation problems, not runtime failures
        const errWithCode = err as NodeJS.ErrnoException;
        if (errWithCode.code === 'ENOENT') {
          reject(
            new ClaudeAdapterCompositionError(
              `Claude CLI not found: '${this.config.command}' is not installed or not in PATH`
            )
          );
          return;
        }
        if (errWithCode.code === 'EACCES') {
          reject(
            new ClaudeAdapterCompositionError(
              `Permission denied executing '${this.config.command}'`
            )
          );
          return;
        }

        // Other spawn errors after process started are runtime failures
        resolve({
          stdout,
          stderr,
          exitCode: 1,
          timedOut: false,
          error: err.message,
        });
      });

      // Handle stdin write safely
      if (proc.stdin) {
        proc.stdin.on('error', (err) => {
          // EPIPE or similar - process exited before reading all input
          // This is not fatal; the process result will tell us what happened
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
      `Provider: claude`,
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
    // Determine status
    let status: RunStatus;
    if (execResult.timedOut) {
      status = RunStatus.TIMEOUT;
    } else if (execResult.exitCode !== 0 || execResult.error) {
      status = RunStatus.FAILED;
    } else {
      status = RunStatus.COMPLETED;
    }

    // Output artifact handling:
    // Type 'provider-output' marks this as provisional raw output.
    // Phase 4 application logic maps it to an authoritative artifact path/type.
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

    // Add failure details if applicable
    if (status === RunStatus.FAILED || status === RunStatus.TIMEOUT) {
      (result as { exitCode: number }).exitCode = execResult.exitCode;
      (result as { error: string }).error =
        execResult.error ?? (execResult.stderr || 'Unknown error');
    }

    return result;
  }
}

/**
 * Result of executing Claude CLI.
 */
interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  error?: string;
}
