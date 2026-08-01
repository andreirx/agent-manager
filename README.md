# agent-manager

Agent Manager is a role-driven supervisor for software-development workflows executed by coding agents.

It coordinates stable roles such as **builder** and **supervisor/reviewer** while keeping provider tools such as Claude Code and Codex as replaceable mechanisms. Workflow state is written to files on disk. Raw provider logs are gitignored. No database is used.

## Current workflow surfaces

| Workflow | Command | Purpose |
|----------|---------|---------|
| Self-host relay | `npm run relay -- <slice-id>` | Run Agent Manager against slices inside this repository. |
| Target-owned relay | `npm run relay-target -- <target-path>` | Run Agent Manager against another repository, with that target repository owning the workflow artifacts. |

The target-owned relay is the workflow for having a builder provider work in a target folder while a supervisor provider selects slices, reviews implementation, and decides whether the work is done, needs revision, or is blocked. The default binding is Claude as builder and Codex as supervisor/reviewer, but either role can be played by either provider.

## Prerequisites

### Local runtime

- Node.js `>=20`
- npm dependencies installed in this repository:

```bash
npm install
```

### Provider CLIs

Install and authenticate the provider CLIs you intend to use:

- `claude` for Claude Code
- `codex` for Codex CLI

The default target-owned binding is:

| Role | Provider | Model | Effort |
|------|----------|-------|--------|
| Builder | Claude | `claude-opus-4-8` | `max` |
| Supervisor/reviewer | Codex | `gpt-5.5` | `high` |

Both roles can be rebound to `claude`, `codex`, or `copilot`:

```bash
npm run relay-target -- <target-path> --builder claude --supervisor codex
npm run relay-target -- <target-path> --builder claude --supervisor claude
npm run relay-target -- <target-path> --builder codex --supervisor codex
npm run relay-target -- <target-path> --builder codex --supervisor claude
# GitHub Copilot CLI (batch mode) as either role — PROTOTYPE, see note below:
npm run relay-target -- <target-path> --builder copilot --builder-model <id>
npm run relay-target -- <target-path> --supervisor copilot
```

> **Copilot (PROTOTYPE).** The Copilot adapter runs the `copilot` CLI in batch
> mode (`copilot -p -`). Its default model is **empty**, so pin one explicitly
> with `--builder-model <id>` / `--supervisor-model <id>`. `--effort` is ignored
> (Copilot has no effort flag), and the read-only reviewer posture is a weaker
> approximation than Codex's sandbox (`--deny-tool write`; shell stays open for
> `git diff`). The argv mapping is grounded in GitHub's docs, not yet probed
> against an installed binary — run one live smoke test per role before trusting
> it in a loop. See `docs/TECH-DEBT.md` **TD-016**.

### Shared system prompt

By default, target-owned relay looks for:

```text
/Users/apple/CLAUDE-SYSTEM.txt
```

Override it with:

```bash
npm run relay-target -- <target-path> --shared-prompt /absolute/path/to/system-prompt.txt
```

Delivery mechanism:

- Claude receives the file path through `--system-prompt-file`.
- Codex receives the file content through `--config developer_instructions=<json-escaped-content>`.

`--system-prompt-file` replaces Claude's default system prompt with `CLAUDE-SYSTEM.txt` (operator preference for coding tasks). Tools remain available; Claude's default dynamic context (cwd/env/git) and target `CLAUDE.md` auto-load are not injected, so the role prompts instruct the agent to read target governance (`CLAUDE.md`/`AGENTS.md`) explicitly. Switch the adapter to `--append-system-prompt-file` if you want the house rules layered on top of Claude's default harness instead.

### Target repository requirements

The target folder must be an existing repository or working tree that the agents can inspect and edit.

Expected target documentation:

- `CLAUDE.md`
- `AGENTS.md`
- `docs/VISION.md`
- `docs/ROADMAP.md`
- slice documents, usually under `docs/slices/`
- validation commands documented in the selected slice or target repository docs

The target repository should define enough governance for the supervisor to select a slice without inventing work.

Recommended before a live run:

```bash
cd <target-path>
git status --short
```

Start from a clean or intentionally understood working tree. The reviewer judges the builder's uncommitted changes through `git status` and `git diff`; unrelated local changes make review ambiguous.

### The target's end-of-slice procedure

The relay does not hardcode how a target is tested, shipped, or cleaned up — **the target defines its own end-of-slice procedure**, and the relay requires and runs it. agent-manager owns the *workflow* (build → test → review → promote → clean); the *commands* are the target's, discoverable from its own materials (scripts, a Makefile/justfile/task runner, a test-protocol doc, CI config) or named in the slice packet. The procedure has three phases:

| Phase | What it is | When the relay runs it | If the target has not defined it |
|-------|------------|------------------------|----------------------------------|
| **Test** | The target's runnable suite — unit, integration, and **end-to-end / smoke** tests driving the built artifact against real inputs — with an isolated convention (temp dirs, a test-only data root) so runs never touch the operator's real state. | The builder runs it after implementing; the reviewer reads the report and re-runs key end-to-end commands. | Building the test harness is one of the first slices on the target. |
| **Install / deploy** | The target-specific "ship" step — dev-install a CLI, restart a daemon, deploy a service, publish a library. | **Only after the reviewer approves**, to promote reviewed code. | Writing the install/deploy script is one of the first slices on the target. |
| **Cleanup** | Reclaiming the slice's transient cost — debug/build artifacts, caches, temp data, stray daemons/processes. | After the slice completes. | Writing the cleanup script is one of the first slices on the target. |

**Per implementation slice** (a green build is not "done"):

1. The builder implements the slice.
2. The builder runs the **Test** phase against the fresh build, **in isolation**, and writes a test report — the exact commands, pass/fail, key end-to-end output, and any gaps.
3. The reviewer judges the diff **and** the report, re-running the key end-to-end commands itself. A green diff with no credible end-to-end evidence is not approved.
4. On approval, the reviewed build is **installed / deployed** — never before, and never with unreviewed code.
5. The **Cleanup** phase runs, so build artifacts and temp state do not accumulate across slices.

**Deploy safety (blast radius).** The install/deploy phase is gated by blast radius. A **safe, reversible** promotion — a local dev-install, a staging deploy, a pre-release — may be auto-run on approval. A **production or otherwise irreversible / high-blast-radius** one — deploying to live sites, publishing a release, migrating production data — is **NEVER auto-run by the relay**: it is operator-gated (an explicit human action), even for an approved slice. The target declares which class its deploy command is; the relay must never push unattended to production. A target with live deployments is driven with this guard from its first slice — "tread carefully" is the default, not the exception.

**Bootstrapping rule.** The relay should never drive a target it cannot test, ship, and clean up. If a target has not defined any phase of its end-of-slice procedure, defining it is among the **first slices** of work on that target, ahead of feature work — so it is an explicit, tracked slice, not a silent gap discovered later (a stopped daemon, an unexercised CLI, or 70+ GB of stale debug builds are all the same failure: an operational step nobody ran).

## Installing a shell command

The current project is a source checkout, not a packaged global CLI. The safest install is a small wrapper script in a directory already on your shell `PATH`.

### 1. Create a local bin directory

```bash
mkdir -p "$HOME/bin"
```

### 2. Add `~/bin` to bash or zsh

For zsh:

```bash
echo 'export PATH="$HOME/bin:$PATH"' >> "$HOME/.zshrc"
```

For bash:

```bash
echo 'export PATH="$HOME/bin:$PATH"' >> "$HOME/.bashrc"
```

Reload the shell:

```bash
exec "$SHELL" -l
```

### 3. Install `am-target`

```bash
cat > "$HOME/bin/am-target" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

AGENT_MANAGER_HOME="/Users/apple/Documents/APLICATII BIJUTERIE/agent-manager"

if [ "$#" -lt 1 ]; then
  echo "usage: am-target <target-path> [relay-target options]" >&2
  echo "example: am-target ../repo-graph --dry-run" >&2
  exit 2
fi

target="$1"
shift

target_abs="$(cd "$target" 2>/dev/null && pwd -P)" || {
  echo "target not found: $target" >&2
  exit 2
}

exec npm --prefix "$AGENT_MANAGER_HOME" run relay-target -- "$target_abs" "$@"
EOF

chmod +x "$HOME/bin/am-target"
```

This wrapper resolves the target path from your current shell directory before invoking Agent Manager. That means all of these work:

```bash
am-target . --dry-run
am-target ../repo-graph --until select-slice
am-target /absolute/path/to/repo --max-iter 3
```

Under the hood, the wrapper runs:

```bash
npm --prefix "$AGENT_MANAGER_HOME" run relay-target -- "$target_abs" "$@"
```

`npm --prefix` makes npm use the Agent Manager checkout even when your shell is currently inside the target repository. The wrapper converts the target path to an absolute path first so target resolution does not depend on npm's working directory behavior.

### 4. Optional self-host wrapper

For Agent Manager's self-host relay:

```bash
cat > "$HOME/bin/am-self" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

AGENT_MANAGER_HOME="/Users/apple/Documents/APLICATII BIJUTERIE/agent-manager"

exec npm --prefix "$AGENT_MANAGER_HOME" run relay -- "$@"
EOF

chmod +x "$HOME/bin/am-self"
```

Usage:

```bash
am-self <slice-id>
```

## Launching target-owned relay

Run commands from the Agent Manager repository root, or use the `am-target` wrapper from any directory.

### 1. Inspect provider wiring without spawning agents

```bash
npm run relay-target -- ../repo-graph --dry-run
```

Dry-run prints the provider command lines, working directories, model choices, effort settings, sandbox/permission posture, and shared prompt injection. It does not create `.agent-manager/` in the target and does not spawn providers.

### 2. Let the supervisor select the next slice, then stop

```bash
npm run relay-target -- ../repo-graph --until select-slice
```

This runs only the selection phase. The supervisor reads the target roadmap and slice docs, then emits a machine-parseable selection packet.

Agent Manager writes the selection under:

```text
<target>/.agent-manager/slices/<slice-id>/selection.md
<target>/.agent-manager/slices/<slice-id>/selection.json
<target>/.agent-manager/slices/<slice-id>/status.json
<target>/.agent-manager/current.json
```

### 3. Run the selected slice

```bash
npm run relay-target -- ../repo-graph --max-iter 3
```

If `current.json` points to an active slice, this resumes that slice instead of selecting another one.

The loop is:

```text
select-slice -> implement -> review-impl -> done | revise | blocked
```

- `approved` from reviewer -> `done`
- `revise` from reviewer -> another build/review cycle
- `escalate`, unknown verdict, provider failure, or cycle cap -> `blocked`

### 4. Retry a blocked slice explicitly

```bash
npm run relay-target -- ../repo-graph --slice <slice-id> --max-iter 5
```

`--slice` is an operator override. If the slice is blocked, Agent Manager unblocks it and retries without overwriting existing run records.

Retry index is derived from files on disk:

- if `runs/build-<n>.json` exists, the blocked cycle already has builder evidence, so retry advances to `n + 1`
- if `runs/build-<n>.json` does not exist, the block came from the cycle cap after a revise advanced to an unbuilt cycle, so retry uses the same `n`

### 5. Force a fresh selection

```bash
npm run relay-target -- ../repo-graph --reselect
```

Use this when the current active slice is wrong, done, blocked beyond retry, or no longer the desired work.

## Target-owned artifact layout

Agent Manager provisions this directory in the target repository at runtime:

```text
<target>/.agent-manager/
  .gitignore
  README.md
  current.json
  pending-selection.md                 # gitignored
  logs/                                # gitignored provider logs (Claude: full stream-json transcript)
  slices/<id>/selection.md
  slices/<id>/selection.json
  slices/<id>/status.json
  slices/<id>/build-<n>.md
  slices/<id>/review-<n>.json
  slices/<id>/runs/select.json
  slices/<id>/runs/build-<n>.json
  slices/<id>/runs/review-<n>.json
  slices/<id>/notes-for-human.md       # only when blocked
```

`.agent-manager/` is **gitignored / local-only** working state (ratified 2026-06-28) — the relay's
process trail, NOT the system of record. The durable record of decisions is the **target's own
committed** slice/spec docs (e.g. `docs/slices/*.md` with their ratification sections) + the
operator's commits + commit messages. See `docs/contracts/target-owned-relay.md`.

Agent Manager never commits the target repository. The operator commits the **deliverable** (code /
spec edits) after review approval; the `.agent-manager/` process artifacts stay local (gitignored).

## Provider permission posture

| Phase | Role | Mode | Permission | Claude mapping | Codex mapping |
|-------|------|------|------------|----------------|---------------|
| `select-slice` | supervisor | `plan` | `read-only` | `--permission-mode plan` | `--sandbox read-only` |
| `implement` | builder | `edit` | `write` | `--dangerously-skip-permissions` | `--sandbox workspace-write` |
| `review-impl` | supervisor | `review` | `read-only` | `--permission-mode plan` | `--sandbox read-only` |

Selection and review are read-only. Only implementation receives write posture.

## Non-interactive operation

Agent Manager provider runs are text-in/text-out batch executions. Agents must
not present interactive menus, pickers, buttons, or live questions that wait for
a user.

If a builder, supervisor, or reviewer needs a decision, it must write the
decision into its normal text output:

```text
DECISION_REQUIRED:
- ID: <stable short id>
  QUESTION: <decision needed>
  OPTIONS:
  - <option A and consequence>
  - <option B and consequence>
  RECOMMENDED: <option, if one is defensible>
  BLOCKING_REASON: <why work cannot safely continue without this decision>
```

The next supervising run reads that block as an artifact and responds in text.
Nothing in the relay waits for a live prompt response.

Claude is launched with `--print` and `--prompt-suggestions false`; Agent
Manager communicates with it through stdin/stdout pipes.

Claude runs additionally use `--output-format stream-json --verbose`, so the run
log captures the full event transcript (tool calls, results, final result) for
later **human** analysis. The final assistant text is extracted into
`build-<n>.md`; the transcript log is never fed to another agent. Revert with the
adapter's `captureTranscript: false`.

## How it works under the hood

Agent Manager separates two roots:

| Root | Meaning |
|------|---------|
| `promptRoot` | This Agent Manager repository. Role prompts are loaded here and digest-pinned. |
| `workingDir` | The target repository. Provider processes are spawned here and read the target's `CLAUDE.md`, `AGENTS.md`, git state, and files. |

The application use case owns the workflow state machine. Provider adapters only translate normalized `RunRequest` fields into CLI flags.

Provider-neutral request fields include:

- `workingDir`
- `mode`
- `permission`
- `contextText`
- `model`
- `effort`

This keeps provider-specific behavior in adapters and keeps role workflow logic independent of Claude or Codex command-line details.

## Validation commands

Run TypeScript validation from the Agent Manager root:

```bash
npm run typecheck
```

Dry-run target relay wiring:

```bash
npm run relay-target -- <target-path> --dry-run
```

## References

- `docs/VISION.md` — product purpose and boundaries
- `docs/ARCHITECTURE.md` — Clean Architecture boundaries
- `docs/contracts/target-owned-relay.md` — target-owned relay contract
- `docs/TECH-DEBT.md` — known technical debt
