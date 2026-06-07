# Contract: Target-Owned Relay

**Maturity: PROTOTYPE** (contracts still being shaped; expect breaking changes)

## Purpose

Drive a select → build → review loop on an **external target repository**
(e.g. `../repo-graph`) instead of on agent-manager itself. Generalizes
self-hosting: the same role-driven loop, pointed at an arbitrary repo, with that
repo as the system of record.

This complements (does not replace) the self-host relay (`relay.ts` /
`npm run relay`), which remains for AM-* slices inside agent-manager.

## Two roots (the core distinction)

| Root | Value | Holds |
|------|-------|-------|
| `promptRoot` | agent-manager | Pinned role/system prompts (digest-verified) |
| `workingDir` | target repo | Provider process cwd; code edits; `.agent-manager/` artifacts + logs |

Previously a single `repoRoot` conflated both. The adapter config field was
renamed `repoRoot` → `promptRoot`; the provider working directory is the new
`RunRequest.workingDir`.

## Roles, providers, modes

Roles are stable; providers are volatile and chosen per session:

- **builder** — implements the slice (agentic file edits).
- **supervisor** — selects the slice (planner) and reviews the result (reviewer).

Either role may be played by either provider:
`--builder claude|codex`, `--supervisor claude|codex` (defaults `claude`/`codex`).

`RunRequest` carries provider-neutral policy fields; adapters map them to flags:

| Field | Values | Meaning |
|-------|--------|---------|
| `workingDir` | abs path | provider process cwd |
| `mode` | `plan` \| `edit` \| `review` | workflow intent |
| `permission` | `read-only` \| `write` | posture |
| `contextText` | string | dynamic per-run context (not a pinned asset) appended to stdin |

## Phase graph

```
select-slice (supervisor, plan/read-only)
  STATUS: selected -> implement
  STATUS: blocked  -> blocked
implement (builder, edit/write)            -> review-impl
review-impl (supervisor, review/read-only)
  approved -> done
  revise   -> implement (iteration + 1)
  escalate -> blocked
  unknown  -> blocked
```

`design` / `review-design` are intentionally absent: the target repo's own slice
docs carry the design.

## Provider flag mapping (mechanism)

Common Claude: `--print --output-format stream-json --verbose --prompt-suggestions false [--append-system-prompt-file <shared>] --model <m> --effort <e>`, spawn `cwd = workingDir`, prompt via stdin `-p -`. (`stream-json --verbose` captures the transcript log — see Logging; `captureTranscript: false` reverts to `--output-format text`.)
Common Codex: `exec --model <m> --config model_reasoning_effort="<e>" [--config developer_instructions=<json>] -C <workingDir>`, spawn `cwd = workingDir`, prompt via stdin `-`.

| Phase | mode | permission | Claude adds | Codex adds |
|-------|------|-----------|-------------|------------|
| select-slice | plan | read-only | `--permission-mode plan` | `--sandbox read-only` |
| implement | edit | write | `--dangerously-skip-permissions` | `--sandbox workspace-write` |
| review-impl | review | read-only | `--permission-mode plan` | `--sandbox read-only` |

**Selection is read-only.** The supervisor only *selects* an existing slice; it
must not modify code (its prompt says so). Agent Manager writes `selection.json`
from the supervisor's stdout. Only the builder gets write posture. Letting the
supervisor *author* new slice docs (the original D4 "authoring" case) would be a
separate, explicitly write-enabled phase — not yet built.

Shared system prompt (`CLAUDE-SYSTEM.txt`): Claude receives it via
`--append-system-prompt-file` (path; appends to the default agentic prompt, so
tool scaffolding + dynamic context + target `CLAUDE.md` auto-load survive). Codex
receives its **content** as `developer_instructions` (JSON-encoded to be a valid
TOML basic string for `-c key=value`).

> Note: `--system-prompt`/`--system-prompt-file` would REPLACE Claude's default
> prompt and strip the agentic harness; `--append-system-prompt-file` is the
> ratified choice.

## Logging (Claude transcript)

Claude runs capture a full `stream-json` event transcript — every tool call,
tool result, reasoning/assistant message, and the final `result` event — stored
verbatim in the run log (`<target>/.agent-manager/logs/…`, gitignored) for
**human** analysis. The adapter extracts the final assistant text (the `result`
event's `result` field; fallback: last `assistant` text blocks) into
`build-<n>.md` and the run's output artifact, so the reviewer and relay logic see
the same final text regardless of log format.

The transcript is operational log output ONLY; it is never fed to another agent.
The reviewer reads `build-<n>.md` + `git diff`, not the log. Default on for all
Claude runs (self-host included); set the adapter's `captureTranscript: false`
to revert to `--output-format text`. Codex runs remain text-only (see TECH-DEBT
TD-008).

## Storage (in the target repo)

```
<target>/.agent-manager/
  .gitignore                           created at runtime (any target)
  README.md                            created at runtime (any target)
  current.json                         active-slice pointer (committed)
  slices/<id>/selection.json|md        committed (system of record)
  slices/<id>/status.json              committed (phase, iteration, providers)
  slices/<id>/build-<n>.md             committed (builder summary per cycle)
  slices/<id>/review-<n>.json          committed (verdict per cycle)
  slices/<id>/runs/select.json         committed (run record -> log path)
  slices/<id>/runs/build-<n>.json      committed (run record -> log path)
  slices/<id>/runs/review-<n>.json     committed (run record -> log path)
  slices/<id>/notes-for-human.md       committed (only when blocked)
  logs/<ts>__<role>__<provider>__slice-<id>.txt   gitignored
  pending-selection.md                 gitignored
```

Run records restore the traceability model (run -> log path): each provider call
writes a `runs/*.json` capturing `runId`, provider, model, effort, mode,
permission, status, timestamps, the (target-relative) `logPath`, and the pinned
prompt digests.

The scaffold (`.gitignore`, `README.md`) is provisioned by the relay on first
run for **whatever target** is passed; no repository is pre-seeded or hardcoded.

The relay does **not** commit the target repo (neither code changes nor these
artifacts). Committing/branching is currently out of scope (see TECH-DEBT).

## Verdict contract

Reviewer output MUST begin with `STATUS: approved|revise|escalate`. Parsing is
shared with the self-host relay (`relay-shared.ts`), so reviewer prompts/providers
are swappable without changing parsing.

## Non-interactive contract

Provider runs are batch text-in/text-out executions. Agents must not present
interactive choices, menus, pickers, buttons, or prompts that wait for a user.

If a run cannot safely continue without a decision, the agent writes the decision
as a plain-text artifact instead of waiting:

```
DECISION_REQUIRED:
- ID: <stable short id>
  QUESTION: <decision needed>
  OPTIONS:
  - <option A and consequence>
  - <option B and consequence>
  RECOMMENDED: <option, if one is defensible>
  BLOCKING_REASON: <why work cannot safely continue without this decision>
```

Phase-specific handling:

- `select-slice`: return `STATUS: blocked` and include `DECISION_REQUIRED`.
- `implement`: stop work and include `DECISION_REQUIRED` in the builder output.
- `review-impl`: return `STATUS: escalate` and include `DECISION_REQUIRED`.

Claude is invoked with `--print`, stdin/stdout pipes, and
`--prompt-suggestions false`. The adapter does not open an interactive session.

## CLI

```
npm run relay-target -- <target-path> \
  [--builder claude|codex] [--supervisor claude|codex] \
  [--shared-prompt <path>] [--max-iter <n>] \
  [--slice <id>] [--reselect] [--until select-slice] [--dry-run]
```

- `<target-path>` is required and resolved against the invocation cwd. No
  repository is hardcoded; `../repo-graph` is only an example.
- `--max-iter <n>` bounds build/review **cycles** (each cycle = one implement +
  one review), not individual phase steps. The cap is on the persisted cycle
  index, so it holds across resumes.
- `--dry-run` prints the exact provider invocations (command, args, cwd),
  including Codex's `--config developer_instructions=…` (its long value is
  elided for readability, with the source path and length shown). No process is
  spawned.
- `--until select-slice` stops after the supervisor picks a slice, before any
  edit, so the selection can be inspected.

### Resume (so `--until select-slice` then a full run target the same slice)

`current.json` records the active slice. On start the relay:

1. uses `--slice <id>` if given (skip selection): resumes that slice; if it is
   `blocked`, unblocks and retries — advancing to a **new** cycle when the
   blocked cycle already has build/review records (builder-failed / escalated),
   or **retrying the same index** when the block was the cycle cap (a
   never-built cycle). The decision is made from the run records on disk, so no
   build-/review- holes are created. Raise `--max-iter` if the block was the
   cap. If `done`, reports done;
2. else, unless `--reselect`, resumes the in-flight slice named by
   `current.json` (phase not `done`/`blocked`); a `blocked` active slice stops
   with guidance to pass `--slice <id>` (unblock + retry) or `--reselect`;
3. else runs a fresh selection.

So `relay-target -- <t> --until select-slice` then `relay-target -- <t>` builds
and reviews the slice just selected — it does not reselect a different one.
