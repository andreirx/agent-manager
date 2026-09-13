# Contract: Target-Owned Relay

**Maturity: PROTOTYPE** (contracts still being shaped; expect breaking changes)

## Purpose

Drive a select → build → review loop on an **external target repository**
(e.g. `../repo-graph`) instead of on agent-manager itself. Generalizes
self-hosting: the same role-driven loop, pointed at an arbitrary repo, with that
repo as the system of record.

This complements (does not replace) the self-host relay (`relay.ts` /
`npm run relay`), which remains for AM-* slices inside agent-manager.

## Optional reviewed-baseline admission (PROTOTYPE)

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
explicit preprepared `--slice`. It reads that slice's existing status and packet,
then executes the same closure/posture/allocation operation as live dispatch:
ordinary work checks `SLICE_DOC`, while admitted document posture checks its
existing `ADMISSION_ALLOCATION`. It prints the accepted enforcement label and
exact manifest digest. Before the document author creates `SLICE_DOC` and
`REVIEW_BASELINE`, dry-run prints the actual available author delivery and marks
reviewer delivery pending on those authored outputs; it does not fabricate a
review subject. Once the candidate manifest exists, dry-run validates its full
candidate/allocation closure before printing the reviewer delivery. It does not
write local state or invoke a provider. It prints no admission label when
only upstream closure validation or allocation validation fails.

Version-2 manifests select `requirements-assurance/v2-stage2` and the
`reviewed-inputs` enforcement label defined in
[Requirements Assurance v2](requirements-assurance-v2.md). The relay persists
the accepted manifest plus rooted shared/common/role instruction identities in
both status objects. Every explicitly admitted v2 role request then carries
immutable bytes rather than live paths. Omission on resume preserves v2;
manifest or instruction drift blocks before the next provider call.

An explicit `ARTIFACT_KIND: REQUIREMENTS_DOCUMENT` uses separate author and
reviewer calls, including when its admitted input is the v1 predecessor. Its
`ADMISSION_ALLOCATION` is the existing input that authorizes those calls;
`SLICE_DOC` and `REVIEW_BASELINE` are authored outputs. The reviewer returns the
closed v2 result, with exactly one assessment per submitted
`REVIEW_OBLIGATION_IDS`. Refinement returns to the author, an authority decision
blocks with a visible matrix, and acceptance creates only
`docs/assurance/<baselineId>/requirements-review.json` before stopping with
`reviewed baseline awaiting operator approval`. It never creates approval.

## Evidence-linked implementation review (stage 3, PROTOTYPE)

A v2-admitted `ARTIFACT_KIND: IMPLEMENTATION` whose `SLICE_DOC` begins with the
closed `requirements-assurance-implementation-v1` metadata block takes the
stage-3 path. Other v2 implementation work and every v1/legacy item keep their
existing prose-verdict routing. The relay records that admitted choice in the
generated role directive's final `ROLE_OUTPUT_CONTRACT` field; both role prompts
explicitly treat allocation metadata alone as insufficient to select structured
stage-3 output. The allocation fixes the implements/preserves/
changes sets, preservation IDs, acceptance boundary, allowed candidate paths,
operational exclusions, exactly two post-review output paths, and mandatory
checks before the builder is invoked. Each check identifies its obligations,
owner, method, inputs/environment, expected oracle, and contains no optional
flag. Explicit preservation-only work may bind an empty checkpoint; path count
is never treated as semantic proof.

Before the first builder call, the relay observes the target's exact Git HEAD
and requires no non-excluded changes. It persists a closed `candidateTracking`
state with that base revision. After the builder returns, the CLI mechanism
captures porcelain-v1 status, stage-0 index blob bytes/mode through
`git ls-files --stage` and `git cat-file --batch`, and non-followed regular
working-tree bytes/mode. Pure policy rejects conflicts, unsupported nodes,
inconsistent present/absent states, escaping/duplicate paths, HEAD drift and
changes outside `candidatePaths`; it canonicalizes the remaining entries and
binds them with SHA-256. Index and working-tree identities remain separate, so
an index-only or executable-bit change cannot hide behind unchanged working
bytes or the same porcelain spelling. The reviewer representation is likewise
split: a labelled `HEAD`-to-index binary diff exposes staged content, a labelled
index-to-working-tree binary diff exposes unstaged content, and a third labelled
section carries each in-scope untracked file's raw bytes as base64. A combined
`git diff HEAD` is insufficient because staged content can be cancelled in the
working tree while remaining part of the checkpoint.

The builder result is one closed `implementation-evidence-result` JSON object.
Every planned check occurs exactly once with the exhaustive outcome `passed`,
`failed`, `not-run`, or `execution-failed`; every actual candidate path has one
authorized change justification. The relay copies that report into a runtime-
bound verification draft, labels its basis `provider-run-report`, and persists
`evidence-bound` with the candidate digest. It does not claim it observed the
provider's command execution independently.

The separate, read-only reviewer receives the accepted common inputs plus the
allocation, complete candidate checkpoint/diff, verification draft, build
report, and all prior structured reviews. Its one closed
`implementation-review-result` must assess every allocated H/L and P ID, every
planned check, and every actual changed path exactly once. Check verification is
either a reproduced four-way outcome or an explicit reliance on builder
evidence. Finding/decision references and aggregate precedence are structural;
positive prose cannot override them. A refinement returns to the builder with
the original allocation and all accumulated prior reviews. A decision blocks
for human authority.

Accepted structure is still not publication or operator acceptance. The relay
rechecks the candidate after review and immediately before publication, then
preflights both fixed output paths as definitely absent. It exclusively creates
`verification.json` first and `implementation-review.json` second. A collision
writes neither file; a write failure may leave a complete or incomplete subset,
which is reported as **unaccepted partial publication** and withholds review-
activity completion. No rollback or retry is inferred. Only both successful
writes produce these scoped terminal lines:

```text
implementation review: accepted
verification: required checks passed for <candidate sha256>
verification record: <target-relative path> <sha256 of exact published bytes>
implementation review record: <target-relative path> <sha256 of exact published bytes>
operator acceptance: not recorded; ASSURANCE-4 gate not delivered
release/deployment: not performed
```

The transitional `done` phase therefore means only that this implementation
review activity ended. It does not mean implementation acceptance, release or
deployment; ASSURANCE-4 owns that later authority and recovery policy.

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
| `delivery` | `legacy-live-inputs` \| `reviewed-input-snapshots` | mutually exclusive live prompt references or immutable reviewed bytes |

Legacy delivery retains its pinned prompt references and optional generated
context. Reviewed delivery separates an ordered common closure from intentional
role-specific inputs. Adapters validate every digest and UTF-8 payload, frame
exact byte lengths, and return the actual shared-instruction/stdin channel
identities. Run records retain those request projections and receipts as
`inputProvenance`; accepted requirements reviews require author/reviewer
baseline and ordered common identities to match.

## Phase graph

```
select-slice (supervisor, plan/read-only)
  STATUS: selected -> implement
  STATUS: blocked  -> blocked
implement (builder, edit/write)            -> review-impl
review-impl (supervisor, review/read-only)
  accepted stage-3 structure + stable candidate + both record writes -> done
                                (review activity only; operator acceptance not recorded)
  approved legacy/v1/v2 prose -> done
                                (no decision surfaced by THIS slice — see trigger rule below)
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

Implementation reviewer output MUST begin with `STATUS:
approved|revise|escalate`. Parsing is shared with the self-host relay
(`relay-shared.ts`). Requirements-document review instead requires the complete
closed JSON result from requirements-assurance v2; it never falls back to the
legacy prose parser.

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
- legacy/v1/v2-prose `implement`: stop work and include `DECISION_REQUIRED` in
  the builder output; stage 3 instead returns its closed evidence result with a
  non-pass check/limitation or a subsequent review decision.
- legacy/v1/v2-prose `review-impl`: return `STATUS: escalate` and include
  `DECISION_REQUIRED`; stage 3 returns `result: "decision-required"` with its
  closed risk/reward decision records.

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

Approval of an accepted v2 review is a mutually exclusive target-aware operation:

```text
npm run relay-target -- <target-path> \
  --record-reviewed-baseline-approval <manifest> \
  --approval-id <id> --project-id <id> \
  --approved-by-type human|operator --approved-by-id <id> \
  --recorded-by-type human|operator --recorded-by-id <id> \
  --authority-basis <target-relative-path> \
  [--decision-record <id>=<target-relative-path>]... \
  --rationale <text>
```

This operation revalidates the candidate, accepted review, target/project,
authority bytes, and exact required-decision set; writes only the fixed approval
path create-only; invokes no provider; and performs no commit.

- `<target-path>` is required and resolved against the invocation cwd. No
  repository is hardcoded; `../repo-graph` is only an example.
- `--max-iter <n>` bounds build/review **cycles** (each cycle = one implement +
  one review), not individual phase steps. The cap is on the persisted cycle
  index, so it holds across resumes.
- `--dry-run` prints the exact provider invocations (command, args, cwd),
  including Codex's `--config developer_instructions=…` (its long value is
  elided for readability, with the source path and length shown). No process is
  spawned.
- `--baseline` selects the manifest's versioned admission contract. Its path
  uses target-relative POSIX syntax; it never names a prompt-root path.
- `--dry-run --baseline` additionally requires `--slice`; see the no-write
  posture/allocation check above. V2 and the admitted v1 document bridge use the
  adapters' same no-spawn delivery preparation seam, print available input/channel
  identities (and any pending authored reviewer subject), and create no Claude
  snapshot file.
- `--until select-slice` stops after the supervisor picks a slice, before any
  edit, so the selection can be inspected.

### Resume (so `--until select-slice` then a full run target the same slice)

`current.json` records the active slice. On start the relay:

1. uses `--slice <id>` if given (skip selection): resumes that slice. A blocked
   stage-3 structured `decision-required` review is the narrow exception to
   retry: plain resume reads the retained structured result, preserves the block
   and matrix, and invokes no builder until a later authorized resolution
   mechanism exists. Malformed or unreadable retained stage-3 review state also
   refuses rather than guessing that the block is retryable. Other blocked
   states unblock and retry: they advance to a **new** cycle when the blocked
   cycle already has build/review records (builder-failed / invalid review), or
   **retry the same index** when the block was the cycle cap (a never-built
   cycle). The decision is made from the run records on disk, so no build-/review-
   holes are created. Raise `--max-iter` if the block was the cap. If `done`,
   reports done;
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
