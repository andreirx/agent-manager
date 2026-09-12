# Contract: Target-Owned Relay

**Maturity: PROTOTYPE** (contracts still being shaped; expect breaking changes)

## Purpose

Drive a select → build → review loop on an **external target repository**
(e.g. `../repo-graph`) instead of on agent-manager itself. Generalizes
self-hosting: the same role-driven loop, pointed at an arbitrary repo, with that
repo as the system of record.

This complements (does not replace) the self-host relay (`relay.ts` /
`npm run relay`), which remains for AM-* slices inside agent-manager.

## Optional stage-1 baseline admission (PROTOTYPE)

`relay-target -- <target> --baseline <target-relative-manifest-path>` opts one
target-owned run into the additive `requirements-assurance/v1-stage1` contract
defined in [Requirements Assurance v1](requirements-assurance-v1.md). This is
**baseline admission only**: it does not mean the requirements are semantically
validated by software, evidence-complete, accepted, verified, or released.

Before a provider dispatch, the relay reads the manifest and its exact
requirement/dependency/review/approval/authority closure through the contained
filesystem boundary, hashes the raw bytes, and applies the closed record grammar.
Expected failures name a stable error code, record path, and location. A bad
upstream closure causes zero provider calls. On fresh selection the selector is
the one permitted earlier call because `SLICE_DOC` is not known; the selected
`SLICE_DOC` must then equal a role-`allocation` dependency before the builder.
The closure is reread before builder, reviewer, and any decision-review role.

Successful allocation admission persists the same complete object in the
slice's `status.json` and active `current.json`:

```json
{
  "assurance": {
    "contract": "requirements-assurance/v1-stage1",
    "enforcement": "baseline-admission",
    "manifest": {
      "path": "docs/requirements/baselines/EXAMPLE.json",
      "sha256": "sha256:<64-lowercase-hex>"
    }
  }
}
```

Flag omission on resume does not downgrade that persisted mode. A conflicting
flag, malformed/partial mode, state-file mismatch, input byte drift, or allocation
mismatch blocks instead. Malformed active `current.json`, or an active pointer to
missing/malformed `status.json`, also blocks implicit dispatch before any provider
call, including in legacy mode; it never silently selects different work. This is
the narrow ratified compatibility exception. Otherwise, runs with neither a flag
nor persisted assurance keep legacy routing and print `legacy (requirements
assurance not enforced)`. Live execution prints that definitive legacy label only
after loading the selected slice status and resolving that no persisted assurance
mode applies; flag omission alone is not a legacy verdict.

This refusal is not itself a human-decision escalation or an automatic repair.
The manager first investigates the status/progress records, worktree, owned
processes, and approved inputs. When that evidence supports a non-destructive
repair within existing authority, the manager records/explains the repair,
restores only the supported operational pointer or status, and explicitly resumes
the same slice. The relay then revalidates any persisted baseline before dispatch
and leaves partial work intact. Ambiguous authority, changed approved inputs, or a
recovery that risks losing work still requires human direction. Typed runtime
recovery remains outside stage 1.

Assured dry-run is deliberately narrower: it requires both `--baseline` and an
explicit preprepared `--slice`. It reads that slice's existing status to obtain
`sliceDoc`, executes the same closure/allocation admission operation as live
dispatch, then prints `baseline-admission` and the exact manifest digest. It does
not write local state or invoke a provider. It prints no admission label when
only upstream closure validation or allocation validation fails.

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

Either role may be played by any provider:
`--builder claude|codex|copilot`, `--supervisor claude|codex|copilot`
(defaults `claude`/`codex`). `copilot` (GitHub Copilot CLI, batch mode) is
PROTOTYPE: its default model is empty (pin one with `--builder-model` /
`--supervisor-model`), `--effort` is dropped (no Copilot effort flag), and the
read-only reviewer posture is `--deny-tool write` only (weaker than Codex's
`--sandbox read-only`; shell stays open for `git diff`). The Copilot argv mapping
is doc-grounded, not yet probed against an installed CLI — see TECH-DEBT TD-016.

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
  approved -> done             (no decision surfaced by THIS slice — see trigger rule below)
  approved -> decision-review  (THIS slice surfaced a DECISION_REQUIRED — see trigger rule below)
  revise   -> implement (iteration + 1)
  escalate -> blocked
  unknown  -> blocked
decision-review (ADDITIVE, PROTOTYPE — one round)
  supervisor challenge -> builder rebuttal -> ratification-packet.md
  -> awaiting-ratification     (HALT for the human; never auto-proceeds)
```

`design` / `review-design` are intentionally absent: the target repo's own slice
docs carry the design.

### Decision review (additive — DECISION-REVIEW-MODE-1, PROTOTYPE)

When `review-impl` **approves** a slice that **surfaced** an operator-ratification
`DECISION_REQUIRED:` block — i.e. the marker is in the builder's approved summary
(`build-<n>.md`), OR in the `SLICE_DOC` **AND this slice's build created/modified that
SLICE_DOC** (a SPEC slice writing its matrix) — the relay runs one adversarial round on the
**decisions** (not the artifact) before the human sees them. An IMPL slice that merely
references a **pre-ratified** `SLICE_DOC` it did NOT modify does **not** trigger the phase
(corrected by DECISION-REVIEW-TRIGGER-FIX-1; the earlier "marker in build OR SLICE_DOC"
over-fired on every IMPL slice).

1. **decision-challenger** (supervisor, review/read-only) — sees the SLICE_DOC
   spec (when present) and the build summary; verifies each recommended cell
   against source; per decision emits `DECISION: <id>` + `ASSESSMENT:
   agree|challenge`.
2. **decision-rebutter** (builder, review/read-only) — responds per challenge:
   `DECISION: <id>` + `RESPONSE: concede|rebut`.
3. The relay classifies each decision (agree → converged; challenge+concede →
   converged; challenge+rebut or no reply → contested; **a surfaced decision the
   challenger never assessed → contested** [`missing`], never dropped), writes
   `ratification-packet.md`, and transitions to **`awaiting-ratification`** — a
   terminal-ish HALT distinct from `done`. The relay never auto-proceeds; the
   human ratifies.

The authoritative decision set is the **source `DECISION_REQUIRED` matrix**
(`extractDecisionIds` over the SLICE_DOC spec and/or the build summary), unioned
with any extra ids the roles raise — NOT the challenger's output. So a
load-bearing decision the challenger omits or misformats still reaches the human
(marked `missing`/contested) instead of silently disappearing — the safety
property the phase exists for.

The packet is **per-decision**: each decision is a section pairing its
recommendation excerpt (mined from the spec/build artifact), the reviewer
challenge, the builder rebuttal, and the converged|contested status — plus a
summary table and the raw role outputs as an audit appendix.

This is **purely additive**: a slice WITHOUT the marker takes the original
`approved -> done` transition unchanged (proven by `--dry-run` parity, which is
byte-for-byte identical since the standard planned invocations are untouched).
The new postures are PROMPTS (`prompts/roles/decision-challenger.md`,
`decision-rebutter.md`) reusing the existing adapters, run-record, and
prompt-loading machinery — no new adapter.

## Provider flag mapping (mechanism)

Common Claude: `--print --output-format stream-json --verbose --prompt-suggestions false [--system-prompt-file <shared>] --model <m> --effort <e>`, spawn `cwd = workingDir`, prompt via stdin `-p -`. (`stream-json --verbose` captures the transcript log — see Logging; `captureTranscript: false` reverts to `--output-format text`.)
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
`--system-prompt-file` (path), which **replaces** Claude's default system prompt
with this file (operator preference for coding tasks). Codex receives its
**content** as `developer_instructions` (JSON-encoded to be a valid TOML basic
string for `-c key=value`).

> Note: `--system-prompt-file` replaces Claude's default system prompt prose.
> Tools remain available, but Claude's default dynamic context (cwd/env/git) and
> target `CLAUDE.md` auto-load are NOT injected — the role prompts therefore
> instruct the agent to read target governance (`CLAUDE.md`/`AGENTS.md`)
> explicitly. `--append-system-prompt-file` (layer on top) is the alternative if
> auto-load/default harness is wanted instead.

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
  current.json                         active-slice pointer
  slices/<id>/selection.json|md        the operator's brief / builder packet
  slices/<id>/status.json              phase, iteration, providers
  slices/<id>/build-<n>.md             builder summary per cycle
  slices/<id>/review-<n>.json          verdict per cycle
  slices/<id>/runs/*.json              run records (-> log path)
  slices/<id>/decision-challenge.md    decision-review only, when it fires
  slices/<id>/decision-rebuttal.md     decision-review only, when it fires
  slices/<id>/ratification-packet.md   the human ratification gate
  slices/<id>/notes-for-human.md       only when blocked
  logs/<ts>__<role>__<provider>__slice-<id>.txt   provider transcripts
  pending-selection.md
```

**`.agent-manager/` is gitignored / local-only working state** (ratified 2026-06-28; it was
previously specified here as "committed (system of record)" — superseded, see TECH-DEBT
"artifact disposition"). It is the relay's **process trail**, not the system of record. The
DURABLE record of decisions lives in the **target's own committed artifacts** — the slice/spec
docs (e.g. `docs/slices/*.md` with their ratification sections) + the operator's commits of the
deliverable + the commit messages. Run records (`runs/*.json` → log path) restore per-call
traceability **locally** (`runId`, provider, model, effort, mode, permission, status, timestamps,
the target-relative `logPath`, pinned prompt digests).

The scaffold (`.gitignore`, `README.md`) is provisioned by the relay on first run for **whatever
target** is passed; no repository is pre-seeded or hardcoded. A newly generated scaffold ignores
the whole `.agent-manager/` directory and describes it as local-only. Existing scaffold files are
write-if-absent and are not migrated or rewritten.

The relay does **not** commit the target repo (neither code changes nor these artifacts); the
operator commits the **deliverable** after review approval. Committing/branching by the relay is
out of scope.

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
  [--builder claude|codex|copilot] [--supervisor claude|codex|copilot] \
  [--builder-model <id>] [--supervisor-model <id>] \
  [--shared-prompt <path>] [--max-iter <n>] \
  [--slice <id>] [--reselect] [--until select-slice] [--dry-run] \
  [--baseline <target-relative-manifest-path>]
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
- `--baseline` selects stage-1 baseline admission. Its path uses the contract's
  target-relative POSIX syntax; it never names an Agent Manager prompt-root path.
- `--dry-run --baseline` additionally requires `--slice`; see the no-write
  allocation check above.
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

A malformed active pointer, or one naming missing/malformed slice status, stops
at step 2 rather than falling through to step 3. Recovery follows the consciously
managed procedure in the stage-1 section above; this command does not infer or
repair lost run state.

So `relay-target -- <t> --until select-slice` then `relay-target -- <t>` builds
and reviews the slice just selected — it does not reselect a different one.
