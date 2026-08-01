/**
 * GitHub Copilot CLI provider adapter (batch / programmatic mode).
 *
 * Implements ProviderRunnerPort for the `copilot` CLI run non-interactively
 * (`copilot -p ...`). Shaped after the Codex adapter (plain stdout capture, no
 * stream-json transcript), NOT the Claude adapter.
 *
 * WHY this exists / WHAT it maps: the relay's provider-neutral RunRequest
 * (mode, permission, model, effort, workingDir, stdin prompt) is translated to
 * Copilot's CLI surface here and ONLY here. Adding this file does not open the
 * Claude or Codex code paths; the composition root gains a third factory arm.
 *
 * ── UNVERIFIED-AGAINST-INSTALLED-CLI ASSUMPTIONS (see TECH-DEBT TD-016) ──
 * The `copilot` binary was NOT installed on the authoring machine, so the
 * argv mapping below is grounded in GitHub's published CLI docs, not an
 * empirical probe. Every such assumption is isolated in `buildArgs` /
 * `buildInvocation` and marked `ASSUMPTION:` so a single live smoke test can
 * confirm or correct each one with a one-line change. Until that probe passes,
 * this adapter is PROTOTYPE and must not be trusted in an unattended loop.
 *
 * @module adapters/providers/copilot
 * @maturity PROTOTYPE
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, isAbsolute } from 'node:path';

import type { ClockPort, ArtifactStorePort } from '../../../application/ports/index.js';
import type {
  ProviderRunnerPort,
  RunRequest,
  RunResult,
} from '../../../application/ports/provider-runner.js';
import { RunStatus } from '../../../core/run-record.js';

/**
 * Configuration for the Copilot adapter.
 *
 * Field-for-field identical to CodexAdapterConfig by intent: the composition
 * root builds ONE adapterConfig object and hands it to whichever provider was
 * selected, so a divergent shape here would force a branch in the wiring.
 */
export interface CopilotAdapterConfig {
  /** Path to logs directory (absolute) */
  readonly logsDir: string;

  /** Path to prompt-asset root (agent-manager; for resolving prompt paths) */
  readonly promptRoot: string;

  /**
   * Absolute path to the shared system-prompt file (e.g. CLAUDE-SYSTEM.txt).
   *
   * Copilot has NO `--system-prompt-file` equivalent, so when set the adapter
   * READS the file and PREPENDS its content to the stdin prompt (ahead of the
   * pinned role prompts). Absent => no shared layer (self-host default).
   */
  readonly sharedInstructionPath?: string;

  /** Copilot CLI command (default: 'copilot') */
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
export class CopilotAdapterCompositionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CopilotAdapterCompositionError';
  }
}

/**
 * Internal config with defaults resolved. `sharedInstructionPath` stays optional
 * (it has no default); only command/timeout/grace are guaranteed present.
 */
type ResolvedCopilotConfig = CopilotAdapterConfig & {
  command: string;
  defaultTimeout: number;
  killGracePeriod: number;
};

/**
 * Copilot CLI adapter implementing ProviderRunnerPort.
 *
 * Headless / batch mode only. No interactive/resume support.
 */
export class CopilotAdapter implements ProviderRunnerPort {
  private readonly config: ResolvedCopilotConfig;
  private readonly store: ArtifactStorePort;
  private readonly clock: ClockPort;

  /** Lazily-read content of sharedInstructionPath, cached after first run. */
  private sharedInstruction: string | undefined;

  constructor(
    config: CopilotAdapterConfig,
    store: ArtifactStorePort,
    clock: ClockPort
  ) {
    this.config = {
      command: 'copilot',
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
   * the real argv. Parity hook with the other adapters; used by dry-run.
   */
  async prewarm(): Promise<void> {
    await this.loadSharedInstruction();
  }

  async run(request: RunRequest): Promise<RunResult> {
    // Copilot has no structured-output mode wired here; reject early rather than
    // silently drop the schema (parity with the Claude adapter's stance).
    if (request.outputSchema !== undefined) {
      throw new CopilotAdapterCompositionError(
        'Schema-constrained output is not supported by the Copilot adapter. ' +
        'Remove outputSchema from the request.'
      );
    }

    const startedAt = this.clock.now();

    await this.loadSharedInstruction();

    // Validate and read all pinned prompt contents (digest-verified).
    const promptContents: string[] = [];
    for (const prompt of request.prompts) {
      if (isAbsolute(prompt.path)) {
        throw new CopilotAdapterCompositionError(
          `Prompt path must be repo-relative, got absolute path: ${prompt.path}`
        );
      }

      const fullPath = join(this.config.promptRoot, prompt.path);
      const asset = await this.store.readPromptAsset(fullPath);

      if (asset.digest !== prompt.digest) {
        throw new CopilotAdapterCompositionError(
          `Prompt digest mismatch for ${prompt.path}. ` +
          `Expected ${prompt.digest}, got ${asset.digest}.`
        );
      }

      promptContents.push(asset.content);
    }

    // Shared house-rules layer is PREPENDED (Copilot has no system-prompt flag),
    // then the pinned role prompts, then the dynamic per-run context.
    const parts: string[] = [];
    if (this.sharedInstruction !== undefined) {
      parts.push(this.sharedInstruction);
    }
    parts.push(...promptContents);
    if (request.contextText) {
      parts.push(request.contextText);
    }
    const fullPrompt = parts.join('\n\n---\n\n');

    const invocation = this.buildInvocation(request);
    const logPath = this.buildLogPath(request, startedAt);

    await mkdir(dirname(logPath), { recursive: true });

    const execResult = await this.execute(invocation, request.timeout, fullPrompt);

    const completedAt = this.clock.now();

    await this.writeLog(logPath, request, execResult, startedAt, completedAt);

    return this.buildResult(request, execResult, logPath, startedAt, completedAt);
  }

  /**
   * Build the full provider invocation: command, argv, and working directory.
   *
   * ASSUMPTION: Copilot honors the spawned process cwd for repo context (no
   * documented `-C` / `--add-dir` working-root flag, unlike Codex). cwd falls
   * back to the prompt root (self-host) and becomes the target repo when
   * `request.workingDir` is set.
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
    const args: string[] = [];

    // ── Prompt delivery ──────────────────────────────────────────────
    // ASSUMPTION: `copilot -p -` runs a single non-interactive prompt read
    // from stdin. Delivering via stdin (not an inline `-p "<text>"` value)
    // matches the Claude/Codex adapters and avoids ARG_MAX limits on the large
    // combined prompt (shared layer + role prompts + context). If the installed
    // CLI instead requires an inline value, change ONLY this pair of pushes.
    args.push('-p', '-');

    // ── Model selection (the operator's `--builder-model` / `--supervisor-model`
    // flow into request.model). ASSUMPTION: `--model <id>` selects the model. ──
    if (request.model) {
      args.push('--model', request.model);
    }

    // ── Reasoning effort ─────────────────────────────────────────────
    // Copilot exposes NO reasoning-effort flag. request.effort is intentionally
    // dropped here (a provider-capability difference that belongs in the
    // adapter, per the provider-neutrality rule) rather than mis-mapped.

    // ── Permission posture ───────────────────────────────────────────
    // write    => full tool autonomy.
    // read-only => Copilot has NO native read-only sandbox (unlike Codex's
    //   `--sandbox read-only`). We approximate it by DENYING the file-write tool
    //   (deny takes precedence over any allow) while LEAVING shell available, so
    //   the reviewer can still run `git diff` and other read commands — the whole
    //   point of the review phase. This is a WEAKER guarantee than Codex's
    //   sandbox: a misbehaving agent could still mutate the tree via shell
    //   (e.g. `rm`, `>`). Tightening to a granular allow-list (e.g.
    //   `--allow-tool 'shell(git)'` with everything else denied) requires the
    //   installed CLI's exact tool-spec grammar — deferred to the live probe
    //   (TECH-DEBT TD-016). ASSUMPTION: 'write' is the correct deny spec.
    // absent   => no flag (self-host default), matching the sibling adapters.
    if (request.permission === 'write') {
      args.push('--allow-all-tools');
    } else if (request.permission === 'read-only') {
      args.push('--deny-tool', 'write');
    }

    return args;
  }

  private buildLogPath(request: RunRequest, timestamp: string): string {
    // Format: YYYY-MM-DD_HH-MM-SSZ__<role>__<provider>__slice-<id>.<ext>
    const ts = timestamp
      .replace(/:/g, '-')
      .replace(/\.\d{3}Z$/, 'Z')
      .replace('T', '_');

    const filename = `${ts}__${request.role}__copilot__slice-${request.sliceId}.txt`;
    return join(this.config.logsDir, filename);
  }

  /**
   * Spawn the CLI and capture stdout/stderr.
   *
   * NOTE: this is a deliberate near-duplicate of the Codex adapter's execute().
   * Consolidating the three process-runners (Claude adds a stall watchdog +
   * process-group kill) into one helper would require editing the IN-USE Claude
   * and Codex adapters, which the current task explicitly forbids. The
   * duplication is the smaller cost; consolidation is deferred (TECH-DEBT).
   */
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
          new CopilotAdapterCompositionError(
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
            new CopilotAdapterCompositionError(
              `Copilot CLI not found: '${this.config.command}' is not installed or not in PATH`
            )
          );
          return;
        }
        if (errWithCode.code === 'EACCES') {
          reject(
            new CopilotAdapterCompositionError(
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
      `Provider: copilot`,
      `Model: ${request.model ?? '(provider default)'}`,
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
