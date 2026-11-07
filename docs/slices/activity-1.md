# ACTIVITY-1 — what the agent read, edited, ran; and what it never opened

Status: built 2026-11-07 under the human's standing direction (additive / orthogonal); live-proven with a real Claude run through the adapter.
Maturity: PROTOTYPE.

## Problem served (from `docs/slices/lexmap-1.md` §Source)

1 — it is too hard to see what agents are doing in the larger context. Git shows writes; the agent's *reads* and *commands* are the part that was invisible, and "did it look at the files it should have" was unanswerable.

## What it is

**One event shape** (`src/core/activity.ts`, pure): `{ at, runId, sliceId, role, provider, kind: run-start | run-end | read | edit | exec | search | note, path?, command?, pattern?, tool?, detail? }`, paths made target-relative. Three pure parsers turn one native line into events: Claude `stream-json` (`tool_use` blocks: Read/Edit/Write/MultiEdit → read/edit with the path; Bash → exec with the command; Grep/Glob → search), Codex `--json` (`command_execution` completed → exec with exit code; `file_change` → edits by path), Antigravity `step_update` tool steps → notes. Copilot's batch output has no structure: start and end only.

**Capture** (`src/adapters/activity/capture.ts` + `ndjson-log.ts`): every provider adapter opens `<workingDir>/.agent-manager/activity/<runId>.ndjson`, writes `run-start`, feeds its stdout chunks line by line through its parser and appends events as they arrive, writes `run-end` with the run's status. Best-effort by construction: a parse error drops that line's events; a write error is kept and reported by `close()`, never thrown; a working directory without `.agent-manager/` gets nothing (adapters do not provision relay state). The relay use case is untouched; the four adapters gained one call before `execute` and one after `buildResult`, plus an `onStdout` hook on the two `execute`s that had none.

**The viewer** (`/api/activity[?run=]`, left column "Agent activity"): the newest run (or a chosen one), its events newest first, counts by kind, and for a builder run the **uninspected neighbors** — the candidate's code neighbors (`hunkNeighbors`, code partition) minus the files the run read or edited. Polled every 5 s while the run has no `run-end`. When the provider does not expose reads (Codex reads through `cat` inside shell commands; Copilot shows nothing) the panel says so and the whole code-neighbor list is shown as unconfirmed rather than pretending subtraction happened.

## Observable per provider (recorded, not hidden)

| provider | reads | edits | commands | searches |
|---|---|---|---|---|
| Claude | yes (path) | yes (path) | yes (command) | yes (pattern, path) |
| Codex | no (inside shell) | `file_change` items, shape from the published protocol, unverified live (TD-038) | yes (command, exit code) | no |
| Antigravity | tool-step notes only; step fields unverified (TD-038) | same | same | same |
| Copilot | no | no | no | no |

## Live proof (2026-11-07 17:00Z)

A real `claude-sonnet-5-5` run through `ClaudeAdapter` in a scratch target with `.agent-manager/`, asked to read `package.json`, run `ls src` and grep for `settle_marker`: the activity log holds `run-start` → `read package.json` → `exec ls src` → `search settle_marker in src` → `exec grep -rn settle_marker src` → `run-end completed`, 9 s end to end, paths relative. The viewer on that target then reported the run, its counts and touched paths, and the uninspected list against a candidate diff.

## Tests

`core/activity.test.ts` (parsers on the real captured line shapes, splitter, helpers), `adapters/activity/ndjson-log.test.ts` (append, no-`.agent-manager` no-op, write failure reported not thrown), `antigravity/adapter.test.ts` (end-to-end through the fake CLI: run-start/run-end written; bare directory untouched), `view/server.test.ts` (`/api/activity`: newest run, live flag, counts, touched paths, uninspected rows, run-end status).

## Limits recorded

- Claude's `onChunk` carries stderr too; a stderr fragment landing between two halves of one stdout JSON line costs that line's events. Rare, bounded, recorded.
- Codex reads are not facts; the command text is the honest substitute. Antigravity step shapes and Codex `file_change` shapes are unverified live (TD-038): the parsers keep whatever names exist and never throw.
- Runs started before this commit have no activity log (the adapters loaded at their start did not capture).
