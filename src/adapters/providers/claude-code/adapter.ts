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

  /** Path to prompt-asset root (agent-manager; for resolving prompt paths) */
  readonly promptRoot: string;

  /**
   * Absolute path to the shared system-prompt file (e.g. CLAUDE-SYSTEM.txt).
   *
   * When set, passed to Claude via `--append-system-prompt-file` so the house
   * rules are layered ON TOP of Claude's default agentic system prompt (tool
   * scaffolding, dynamic cwd/env/git context, and target CLAUDE.md auto-load
   * all survive). Absent => no shared-prompt flag (self-host default).
   */
  readonly sharedInstructionPath?: string;

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
/**
 * Internal config with defaults resolved. `sharedInstructionPath` stays optional
 * (it has no default); only command/timeout/grace are guaranteed present.
 */
type ResolvedClaudeConfig = ClaudeAdapterConfig & {
  command: string;
  defaultTimeout: number;
  killGracePeriod: number;
};

export class ClaudeAdapter implements ProviderRunnerPort {
  private readonly config: ResolvedClaudeConfig;
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

  /**
   * Preload step for parity with adapters that read external files. Claude
   * receives the shared prompt via a path flag, so there is nothing to preload;
   * provided so callers (e.g. dry-run) can treat all adapters uniformly.
   */
  async prewarm(): Promise<void> {
    // intentionally empty
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

      const fullPath = join(this.config.promptRoot, prompt.path);
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

    // Combine file prompts, then append dynamic per-run context (not a pinned
    // asset, so it is delivered inline rather than resolved/digested).
    const parts = [...promptContents];
    if (request.contextText) {
      parts.push(request.contextText);
    }
    const fullPrompt = parts.join('\n\n---\n\n');

    // Build full invocation (command, args, cwd)
    const invocation = this.buildInvocation(request);

    // Determine log path
    const logPath = this.buildLogPath(request, startedAt);

    // Ensure logs directory exists
    await mkdir(dirname(logPath), { recursive: true });

    // Execute Claude
    const execResult = await this.execute(invocation, request.timeout, fullPrompt);

    const completedAt = this.clock.now();

    // Write log (adapter-owned operational output, not via artifact port)
    await this.writeLog(logPath, request, execResult, startedAt, completedAt);

    // Build result
    return this.buildResult(request, execResult, logPath, startedAt, completedAt);
  }

  /**
   * Build the full provider invocation: command, argv, and working directory.
   *
   * Claude has no working-directory flag; the spawned process cwd is the only
   * mechanism, and it also drives Claude's project-root CLAUDE.md auto-discovery
   * and git context. cwd defaults to the prompt root (self-host) and becomes the
   * target repo when `request.workingDir` is set.
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
    const args: string[] = ['--print'];

    // Output format: text for now (schema mode not supported in Phase 3)
    args.push('--output-format', 'text');

    // Shared house-rules layer, APPENDED to (not replacing) the default agentic
    // system prompt so tool scaffolding + dynamic context survive.
    if (this.config.sharedInstructionPath) {
      args.push('--append-system-prompt-file', this.config.sharedInstructionPath);
    }

    // Model override
    if (request.model) {
      args.push('--model', request.model);
    }

    // Effort override
    if (request.effort) {
      args.push('--effort', request.effort);
    }

    // Permission posture. Only emitted when explicitly requested; absent =>
    // self-host default (no flag).
    if (request.permission === 'write') {
      // Full autonomy: file edits + bash/validation without prompts.
      args.push('--dangerously-skip-permissions');
    } else if (request.permission === 'read-only') {
      // Plan mode: investigation (incl. `git diff`) allowed, edits blocked.
      args.push('--permission-mode', 'plan');
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
