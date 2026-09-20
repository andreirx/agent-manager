# Technical Debt Registry

Status: active

This document tracks technical debt, assumptions, and known divergences from the intended architecture.

## Format

Each entry should include:
- **ID**: Sequential identifier (TD-001, TD-002, etc.)
- **Date**: When the debt was incurred
- **What**: What was done
- **Why acceptable**: Why this was acceptable at the time
- **Proper solution**: What the proper implementation would be
- **When to address**: Trigger condition or timeline for resolution
- **Status**: OPEN | RESOLVED | ACCEPTED

---

## Current Entries

### TD-001

- **ID**: TD-001
- **Date**: 2026-06-06
- **What**: Relay composition now pins provider defaults to `claude-opus-4-8` for the builder and `gpt-5.5` with high reasoning effort for the reviewer, but the system does not preflight whether the installed provider CLIs currently expose those exact model selections.
- **Why acceptable**: Provider model selection is already a volatile adapter concern and the current request was a narrow setup update. The model strings are passed through existing provider selection mechanisms without changing core workflow policy.
- **Proper solution**: Add provider capability/model preflight at composition or adapter startup, surface unsupported model/effort combinations as composition errors, and document CLI/provider upgrade requirements.
- **When to address**: Before promoting provider adapters or the relay module beyond PROTOTYPE, or before relying on the relay loop for unattended production work.
- **Status**: OPEN

---

### TD-002

- **ID**: TD-002
- **Date**: 2026-06-07
- **What**: Two parallel relay use cases exist — `relay.ts` (self-host: design/review-design/implement/review-impl over `current.md` documents) and `relay-target.ts` (target-owned: select-slice/implement/review-impl over a git working tree). They share only `relay-shared.ts` (verdict parsing); the phase-stepping, status I/O, and blocked-transition logic are duplicated with different status shapes.
- **Why acceptable**: Both are PROTOTYPE. Unifying prematurely would couple two flows whose phase graphs and state shapes are still moving. Adding `relay-target.ts` as a separate module avoided regressing the working AM-001 self-host path ("do not remove functionality").
- **Proper solution**: Extract a phase-graph strategy abstraction (states, transitions, per-phase actor/mode/permission, status persistence) and express both relays as configurations of it.
- **When to address**: When either relay is promoted to MATURE, or when a third workflow shape appears.
- **Status**: OPEN

---

### TD-003

- **ID**: TD-003
- **Date**: 2026-06-07
- **What**: The supervisor slice-selection packet is parsed from a text `KEY: value` contract (regex for `STATUS`, `SLICE_ID`, `SLICE_DOC`; raw packet passed downstream verbatim). No schema enforcement.
- **Why acceptable**: The prompt mandates the exact structure; only `STATUS` and `SLICE_ID` are needed for control flow, and the raw packet is committed as the system of record. Text parsing keeps both providers uniform.
- **Proper solution**: Use `codex exec --output-schema <file>` (and a Claude equivalent when available) with a committed `schemas/slice-selection.schema.json`, validating the packet at the boundary.
- **When to address**: Before unattended production runs, or first time a malformed packet causes a misselection.
- **Status**: OPEN

---

### TD-004

- **ID**: TD-004
- **Date**: 2026-06-07
- **What**: The target-owned relay writes workflow artifacts and leaves code changes uncommitted in the target working tree, but never commits or branches the target repo. Successive iterations accumulate in one working tree.
- **Why acceptable**: Keeps the human in control of target git history during PROTOTYPE; the reviewer reads uncommitted diffs by design. Committing is a separable concern.
- **Proper solution**: Branch-per-slice, commit-on-approval (and optionally commit `.agent-manager/` metadata) via a VCS port, with clean-tree preconditions and rollback on block.
- **When to address**: Before unattended multi-slice runs or any run where losing/clobbering working-tree state is unacceptable.
- **Status**: OPEN

---

### TD-005

- **ID**: TD-005
- **Date**: 2026-06-07
- **What**: The shared system prompt (`CLAUDE-SYSTEM.txt`) is delivered as a system-prompt layer (Claude `--system-prompt-file` path, which replaces the default prompt; Codex `developer_instructions` content) but is NOT digest-pinned like the role/system prompt assets resolved under `promptRoot`.
- **Why acceptable**: It is an environment-level house-rules layer chosen at the composition root, not a per-slice reproducible asset; pinning it now adds ceremony without a consumer.
- **Proper solution**: Capture the shared prompt's digest in run records / status for reproducibility, and fail loudly if it changes mid-run.
- **When to address**: When reproducibility of past runs becomes a requirement, or before PRODUCTION.
- **Status**: OPEN

---

### TD-006

- **ID**: TD-006
- **Date**: 2026-06-07
- **What**: The read-only reviewer posture for Claude relies on `--permission-mode plan` permitting `git diff` / `git status`. This was confirmed as a valid mode but not yet verified to permit those specific read commands in a live run.
- **Why acceptable**: `plan` mode is designed for investigation without edits; the risk is a stalled review, not a destructive action. The `--dry-run` and `--until select-slice` affordances let the operator catch it before committing to a full loop.
- **Proper solution**: Verify on first live review; if `git` reads are blocked, fall back to an explicit allowlist (`--allowedTools "Bash(git diff:*)" "Bash(git status:*)" "Bash(git log:*)"`) while keeping edits blocked.
- **When to address**: On the first live `review-impl` run against a target.
- **Status**: OPEN

---

### TD-007

- **ID**: TD-007
- **Date**: 2026-06-07
- **What**: The target-owned relay tracks a single active slice via
  `<target>/.agent-manager/current.json`. Resume logic only resumes that one
  pointer. If a fresh selection occurs while an earlier slice is still in-flight
  (e.g. forced via `--reselect`), the earlier slice's `status.json` is left
  mid-phase and is not auto-resumed.
- **Why acceptable**: The intended workflow is one slice at a time; `--slice
  <id>` can resume any specific slice explicitly, so no state is lost, only
  not auto-discovered.
- **Proper solution**: A slice queue/index (or scan of `slices/*/status.json`)
  surfacing all in-flight slices, with explicit selection among them.
- **When to address**: When concurrent/queued slices become a requirement.
- **Status**: OPEN

---

### TD-008

- **ID**: TD-008
- **Date**: 2026-06-07
- **What**: Full event-stream transcript logging is implemented for the Claude
  adapter (`--output-format stream-json --verbose`, raw events stored in the run
  log for human analysis, final text extracted for the artifact). The Codex
  adapter still logs plain text (`codex exec` stdout/stderr), so runs executed
  by the Codex provider have no equivalent structured tool-call transcript.
- **Why acceptable**: Provider roles are swappable, but the current default
  target-owned binding uses Claude as builder and Codex as supervisor/reviewer.
  Claude also exposes a verified `stream-json --verbose` event stream in the
  installed CLI, making it the first tractable transcript implementation. Codex
  runs still produce captured stdout/stderr and authoritative artifacts; they
  only lack a structured tool-call transcript.
- **Proper solution**: Add a Codex experimental JSON event output (or parse
  `codex exec --json`/equivalent) and store it as the log, extracting the final
  message for the artifact — mirroring the Claude adapter.
- **When to address**: When Codex-provider runs need audit-grade tool-call
  transcripts, especially if Codex is bound to the builder role for a target
  workflow.
- **Status**: OPEN

---

### TD-009

- **ID**: TD-009
- **Date**: 2026-06-07
- **What**: Claude transcript capture is **default-on for every Claude run**,
  including the self-host relay and `am-001`. Their logs grew from plain text to
  full stream-json transcripts. Logs are gitignored, but transcript logs are
  larger and accumulate.
- **Why acceptable**: Logs are operational, gitignored, and the richer record is
  generally desirable. The adapter exposes `captureTranscript: false` to revert
  any composition root to text logs.
- **Proper solution**: If self-host log size matters, set `captureTranscript:
  false` in the self-host CLIs, and/or add log rotation/retention.
- **When to address**: If/when self-host log volume becomes a problem.
- **Status**: OPEN

---

### TD-010

- **ID**: TD-010
- **Date**: 2026-06-14
- **What**: The target's end-of-slice procedure (Test -> Install/deploy ->
  Cleanup) is SPECIFIED in the target-role prompts (`builder-target.md`,
  `reviewer-target.md`) and the README, and the Test phase is enforced (the
  builder runs it; the reviewer verifies the report). But the relay LOOP does
  not yet AUTOMATE the post-approval phases: install/deploy on an `approved`
  verdict and the cleanup phase are currently run by the OPERATOR, not the loop.
- **Why acceptable**: The procedure is documented and its highest-value phase
  (test + reviewer verification of runtime behavior) is in the loop.
  Install/deploy and cleanup are deterministic operator steps; automating them is
  additive and blocks nothing in the meantime.
- **Proper solution**: A per-target promote/cleanup command (a `.agent-manager`
  config field or `--promote-cmd`/`--cleanup-cmd` flags) that the relay loop runs
  on `approved` (promote) and at slice end (cleanup), each writing a run record,
  mirroring the existing run-record pattern. The promote command MUST carry a
  blast-radius class: SAFE/reversible (local install, staging, pre-release) may be
  auto-run on approval; PRODUCTION/irreversible (live deploy, release publish,
  prod data migration) is operator-gated and MUST NOT be auto-run — see the README
  "Deploy safety" note. Defaulting an unclassified deploy to operator-gated is the
  safe default.
- **When to address**: Next time the relay drives a code-slice-heavy target;
  until then the operator runs install/deploy + cleanup per the target's defined
  procedure.
- **Status**: OPEN

---

### TD-011

- **ID**: TD-011
- **Date**: 2026-06-26 (trigger-source item resolved iteration 2; decision-set
  source resolved iteration 3)
- **What**: The additive `decision-review` phase (DECISION-REVIEW-MODE-1) computes
  convergence by regex-parsing the challenger's `DECISION:/ASSESSMENT:` and the
  rebutter's `DECISION:/RESPONSE:` blocks
  (`parseChallengerAssessments`/`parseRebutterResponses`/`classifyRatification`),
  and mines the packet's per-decision recommendation/challenge/rebuttal text by
  regex (`extractRecommendations`/`extractDecisionTexts`/`extractDecisionIds`).
  This is text-convention-bound, not schema-enforced. Malformed, absent, or
  omitted blocks degrade to `contested` (a conservative gate, but it can
  over-report contested), and an unparseable recommendation renders a placeholder
  excerpt.
  - **RESOLVED (iteration 2):** the *trigger source* assumption — originally
    `hasRatificationDecisions` scanned only `build-<iteration>.md` — is fixed. The
    detector now scans `build-<iteration>.md` **and** the `SLICE_DOC` spec in the
    target tree (`readDecisionSources`), so a SPEC slice whose matrix lives only
    in the committed spec still triggers the phase. The decision-review context
    and recommendation mining read both sources too.
  - **RESOLVED (iteration 3):** the *decision-set source* assumption — originally
    the packet's decision set WAS the challenger's parsed assessments, so a
    decision the challenger omitted or misformatted silently vanished from the
    human packet. Fixed: the authoritative set is now the source `DECISION_REQUIRED`
    matrix (`extractDecisionIds` over spec + build), unioned with any extra ids the
    roles raised. A surfaced decision with no challenger assessment is reported
    `missing -> contested` (fail-loud), never dropped.
- **Why acceptable**: `contested` is the safe default: it routes an ambiguous case
  to the human, never auto-converges; a missing recommendation excerpt is a
  cosmetic gap (the raw role outputs are also in the packet). Same
  parsing-vs-schema class as TD-003.
- **Proper solution**: Promote the per-decision contract to a committed
  `schemas/ratification.schema.json` validated at the boundary (paired with
  TD-003's schema work), so a malformed debate is a composition error rather than
  a silent `contested`.
- **When to address**: Alongside TD-003, before unattended production runs.
- **Status**: OPEN (parse-vs-schema; trigger-source + decision-set items RESOLVED)

---

### TD-012

- **ID**: TD-012
- **Date**: 2026-06-26
- **What**: First test harness added for the repo: `jest.config.mjs` (ts-jest ESM
  preset) plus `src/application/use-cases/relay-target.test.ts`. The config sets
  `isolatedModules: true` on the ts-jest transform (per-file transpile, no
  in-jest typecheck) to silence the NodeNext "hybrid module kind" warning;
  type-checking is delegated to the separate `npm run typecheck` (tsc --noEmit),
  which covers `src/**/*` including tests. Coverage is currently the
  decision-review surface only; the rest of `relay-target.ts` / `relay.ts` /
  adapters remain untested by automation.
- **Why acceptable**: The slice required tests for the new trigger detector and
  the converged/contested classifier; standing up jest was the minimal support
  module to make `npm test` green (it exited 1 with "No tests found" at baseline).
  Splitting typecheck (whole tree) from jest transpile (changed files) keeps test
  runs fast without losing type safety.
- **Proper solution**: Backfill tests for the existing relay phases
  (select/implement/review-impl, resume/cap logic) and the adapters' arg-mapping;
  consider a single `isolatedModules` policy if the build ever needs it.
- **When to address**: When `relay-target.ts` or the adapters are promoted toward
  MATURE, or when a regression escapes the untested surface.
- **Status**: OPEN

---

## TD: DECISION-REVIEW-MODE-1 trigger over-fires on IMPL slices

**Found:** 2026-06-27 (DECISION-REVIEW-MODE-1's 2nd live run, on W-B-EPOCH-IMPL-1).
**Severity:** P2 — non-harmful but wastes a supervisor (codex) challenge+rebuttal and halts
every IMPL slice spuriously.

**Bug:** the `decision-review` trigger fires when `DECISION_REQUIRED:` appears in `build-<n>.md`
OR the `SLICE_DOC`. For an IMPL slice the `SLICE_DOC` is the **already-ratified spec** (which
legitimately contains the §8 `DECISION_REQUIRED` matrices), so decision-review fires on an
implementation that surfaces NO new decisions — producing a vacuous packet + an
`awaiting-ratification` halt the operator must bypass. Observed on W-B-EPOCH-IMPL-1: the IMPL
passed `review-impl` (approved), then decision-review false-triggered (its SLICE_DOC is the
ratified `daemon-w-b-epoch-1.md`).

**Root cause:** "DECISION_REQUIRED present in SLICE_DOC" is the wrong signal. Decision-review
should fire when **THIS slice surfaces NEW, unratified decisions** — not when it references a
pre-ratified spec.

**Fix options (pick at the refinement slice):**
- (a) Fire on SLICE_DOC only if THIS slice's build CREATED/MODIFIED it (the spec is the slice's
  deliverable) — auto-distinguishes SPEC from IMPL via the build diff. RECOMMENDED (no new flag).
- (b) Explicit opt-in: `selection.json` `surfacesDecisions: true` for SPEC slices; absent for IMPL.
- (c) Skip if the SLICE_DOC has a recorded ratification section (fuzzy; rejected).

**Interim handling:** for IMPL slices that false-trigger, the operator bypasses the vacuous
packet and commits the `review-impl`-approved IMPL (the decisions are already ratified).
**Status:** OPEN

---

## TD: relay discards partial work on builder timeout (no checkpoint / no steering)

**Found:** 2026-06-27 (W-B-EPOCH-IMPL-2 builder timed out at 75min with ~75min of real edits
in the working tree; the operator blind-discarded them via `git checkout` without inspecting).
**Severity:** P2 — loses work + steering signal on every timeout.

**Problem:** when a builder run times out, the relay leaves the partial edits in the target
working tree and blocks, but (a) gives no signal to inspect them before discarding, and (b)
does not preserve them — a `git checkout`/clean wipes them irrecoverably. The partial work is
valuable TWICE: as **steering** (which files/handlers got done → how to split a too-big slice)
and potentially as a **resume base** (continue rather than redo). On W-B-EPOCH-IMPL-2 the edits
were lost, but the builder LOG (`logPath` in the run record) still showed the edit distribution
(56 edits in `livegraph_feed.rs` → the build-then-peek cluster was the bottleneck → informed the
2A/2B split). The log saved the steering; the code was lost.

**Fix options (refinement slice):**
- (a) On timeout, the relay **commits the partial as a WIP checkpoint** (e.g. `wip(slice): build
  timeout iter N`) on a slice branch / with a clear marker — inspectable + resumable, never
  blind-wiped. RECOMMENDED.
- (b) At minimum, the `notes-for-human.md` on timeout says "partial work is in the working tree —
  INSPECT (and the build log) before discarding; consider splitting based on edit distribution."
- (c) Surface the build log's edit-distribution summary in the block notes (the steering, ready-made).

**Operator practice until fixed:** on a timeout, READ the build log's edit distribution (and the
tree) to steer the split BEFORE discarding — do not blind `git checkout`.
**Status:** OPEN

---

## TD: `.agent-manager/` artifact disposition — contract says committed, operator convention gitignored

**Found:** 2026-06-28 (Codex review of the way-of-working doc update, commit `b72d020`).
**Severity:** P2 — a ratified-contract divergence; affects whether the relay audit trail (decision
artifacts, ratification packets, run records, review verdicts) is traceable in git.

**Conflict:** The contract (`docs/contracts/target-owned-relay.md`), the README, and the relay's
**scaffolded** `<target>/.agent-manager/.gitignore` say the workflow **artifacts ARE committed**
(only `logs/` + `pending-selection.md` ignored) — the audit-trail-in-git intent. But this session's
**operator convention gitignored `.agent-manager/` entirely** in both repo-graph and agent-manager
(rationale: keep the builder/reviewer review diff clean; keep relay process bookkeeping out of the
target repo's product history). CLAUDE.md/AGENTS.md briefly asserted the local-only convention as
rule — now softened to flag this as OPEN. The relay never self-commits either way (verified).

**Decision needed (operator):**
- (A) **Align convention to contract** — un-gitignore `.agent-manager/` (keep only `logs/` +
  `pending-selection.md` ignored) in both repos; the operator commits the audit trail. Pro: the
  decision-review packets + review verdicts are traceable in git ("files are the system of record").
  Con: relay bookkeeping enters the target's history.
- (B) **Amend contract to local-only** — update the contract + README + scaffold to gitignore
  `.agent-manager/`. Pro: clean target history + review diffs; the DURABLE decisions already live in
  committed `docs/slices/*.md` (with §-ratifications). Con: the run-level audit trail is not in git.
- (C) **Split** — commit the decision artifacts (ratification packets, key reviews) to the target's
  tracked docs; keep noisy run-records local. More nuance; more machinery.

**DECIDED 2026-06-28 — option (B), local-only.** Operator ratified: `.agent-manager/` is gitignored /
local-only working state; the durable decision record is the target's committed `docs/slices/*.md`
(with ratification sections) + the operator's commits. The contract (`target-owned-relay.md`), README,
and CLAUDE.md/AGENTS.md were updated to match (the earlier "artifacts committed" spec retired).
**Status:** RESOLVED (disposition) — but see the follow-up below.

## TD: relay scaffold must gitignore `.agent-manager/` for NEW targets

**Found:** 2026-06-28 (follow-up of the disposition decision above).
**Severity:** P3 — code; existing targets are covered by a manual root `.gitignore` entry.

Given the ratified local-only convention, the relay's scaffold (`relay-target.ts`, the
`.agent-manager/.gitignore` + provisioning) should make `.agent-manager/` gitignored by default for a
**new** target — either add `.agent-manager/` to the target's root `.gitignore` on first provision, or
scaffold the inner `.agent-manager/.gitignore` to ignore everything (not just `logs/` +
`pending-selection.md`). Today a new target would TRACK the artifacts until the operator adds the root
entry manually (as was done for repo-graph + agent-manager this session). Small code slice.
**Status:** OPEN

---

## TD: standalone Codex review (usefulness gate) loops on web search without a self-contained prompt

**Found:** 2026-06-29 (the two-agent E2E usefulness gate's first STANDALONE Codex run — outside the
relay's diff-review flow — during the v0.3.1 checkpoint on repo-graph).
**Severity:** P2 — wastes the reviewer pass (one run burned ~3h in a reconnect/web-search loop and
produced nothing) and blocks the gate's second-agent verdict until re-run with a fixed prompt.

**Problem:** the relay's in-loop codex reviews are reliable because they judge a self-contained
`git diff` — they never need external facts. But a STANDALONE usefulness-gate review (e.g. "assess this
smoke output vs the VISION") pointed codex at a repo to evaluate; codex tried to fetch external
ground-truth (`web search:` + `node_repl/js_add_node_module_dir` MCP calls), failed, and looped on
`ERROR: Reconnecting... 1/5..5/5` indefinitely. The prompt INVITED external verification (it asked codex
to assess nginx) without forbidding tools or inlining the evidence.

**Fix (applied this session):** a reusable self-contained review template, `prompts/standalone-review.md`:
(1) run read-only — `codex exec --sandbox read-only -C <dir> - < prompt`; (2) INLINE the evidence in the
prompt; (3) explicitly forbid web search / node_repl / any tool, and state "judge OUTPUT quality, you do
NOT need external ground-truth." With that, the same review completed cleanly (gpt-5.5, high effort).

**Proper solution (future hardening):**
- (a) a thin `codex-review` helper (use-case/CLI) wrapping the read-only invocation + injecting the
  no-web-search developer-instruction, so the discipline is enforced not remembered. RECOMMENDED.
- (b) confirm + set a codex `--config` web-search-disable for review invocations (belt-and-suspenders).
**When to address:** when the standalone gate review is run often enough to deserve a command (today it
is operator-driven via the template), or when promoting the E2E gate beyond PROTOTYPE.
**Status:** OPEN (mitigated by `prompts/standalone-review.md`)

---

## TD: Reviewer-sandbox evidence deadlock — validation the reviewer can neither run nor see

**Date:** 2026-07-03

**What happened:** METRIC-LANG-COVERAGE-1 (repo-graph) converged on CODE by iteration ~6 but ran to
the 12-iteration cap without approval. The reviewer's read-only sandbox cannot execute the heavy
end-of-slice gates (`cargo build`/`clippy` fail on `target/.cargo-lock`; dogfood cannot create
`/private/tmp` dirs), and it correctly refuses to approve on claims. The builder's evidence kept
missing the reviewer: pointed at `/private/tmp` artifact paths the reviewer cannot read, or was cut
off by per-run timeouts / provider rate limits before the full inlined TEST REPORT landed. Cost:
~6 wasted cycles re-confirming already-converged code.

**Resolution used (operator close-out):** the operator executed the gates locally (fmt/build/
clippy/full test + dogfood-isolated — all green), did the structure review, committed with the
evidence chain in the message, and marked the slice done. Legitimate, but manual.

**Also learned:** (a) `--max-iter` is a TOTAL-iteration bound, not "N more" — resuming a slice at
iteration 7 with `--max-iter 6` blocks instantly with a misleading "max iterations reached";
(b) heavy-validation slices need the builder instructed to INLINE transcripts in `build-<n>.md`
(now standard selection.md language); (c) per-run timeout must fit validation, not just editing
(20m default vs ~60-90m real for a cargo-workspace gate sweep on this machine).

**Proper solution:**
- (a) relay-run validation: an explicit relay step (or builder sub-phase) that runs the named gate
  commands OUTSIDE the reviewer sandbox and attaches the transcript to the packet the reviewer
  judges — evidence transport by construction, not by prompt discipline. RECOMMENDED.
- (b) `--max-iter` semantics: interpret as additional cycles on resume (or warn when
  iteration >= max-iter at start).
- (c) reviewer prompt: state which gates are environment-blocked for the reviewer and that the
  attached transcript is the authoritative evidence for them.
**When to address:** before the next heavy-validation slice batch (DAEMON-VISIBILITY-1 qualifies).
**Status:** MITIGATED (2026-07-03) — (a) shipped in reduced form: `buildReviewerContext` now inlines
the current iteration's `build-<n>.md` into the reviewer context with weighing guidance
(BUILDER-EXECUTED labeling). Root cause was sharper than first recorded: `.agent-manager/` is
gitignored in targets, so the builder's report was INVISIBLE to the reviewer's git-based inspection
by construction (the INSTALL-ROBUSTNESS-2 builder proved it via `git check-ignore`). Gated: typecheck
+ 26 tests + `--dry-run` parity. Remaining open: (b) --max-iter resume semantics; (c) a true
relay-run validation step.

---

## Resolved Entries

(none yet)

## TD — Builder runs are not checkpointable; the fuse kills finished work at the report stage (2026-07-14)

**What happened:** across RELIABILITY-REFRAME-1's 8 iterations, THREE builder runs were
killed (rate limit or 90-min fuse) while AWAITING the workspace test suite or assembling
the final report — with the code complete and green. Each kill cost a full re-iteration
whose only real work was re-running gates + re-writing the report; review rounds then
bounced on "report missing" rather than substance. The same happened on MODULE-MODEL-2
(fuse at the finish line) and CARGO-WORKSPACE-INHERITANCE-1.

**Why acceptable:** the operator close-out pattern (run gates + assemble evidence from the
recorded live logs + ratified acceptance) recovers each case; deliveries stayed sound.

**Proper solution:** checkpointable builder runs — the builder writes its report
INCREMENTALLY (gates section as each gate lands, transcripts as captured) so a kill leaves
a resumable artifact, and/or the relay detects "code-complete, gates pending" and resumes
into a gates-only continuation instead of a fresh iteration.

**When to address:** before the next multi-hour slice family (post current queue).
**Status:** OPEN.

## TD — No per-slice relay lock: concurrent relay runs can race one slice (2026-07-16)

**What happened:** the operator relaunched TS-PROTOTYPE-RETIREMENT-1 (verdict run) while
the prior relay task was still alive mid-builder; both processes read/wrote the same
status.json. The old run's fuse handler clobbered the new run's phase flip; a parallel
builder iteration ran unsupervised; the working tree became the union of two work streams.

**Why acceptable:** operator discipline (verify the prior task exited before relaunch —
TaskList/ps) prevents it; the union tree was reconciled by operator gates.

**Proper solution:** relay-target takes an exclusive per-slice lockfile
(.agent-manager/slices/<ID>/.lock with PID; stale-lock detection) and refuses to start
while another live run holds it.

**When to address:** with the checkpointable-builder work (same relay-robustness batch).
**Status:** OPEN.

## TD-012: Builder background-waiter pause ends the provider turn — build report truncated

- **Date:** 2026-07-19
- **What was done:** Nothing yet (recorded from the field). Twice observed (EC-M3A round 1,
  RECON-M-R3A round 3): the builder arms background waiters for long gate runs and pauses;
  the claude CLI treats the pause as final output, so the relay captures a one-line "waiters
  armed" note as build-N.md and advances to review-impl. The reviewer then must revise for
  missing evidence — one full cycle burned each time.
- **Why acceptable:** The loop self-heals (reviewer catches it; next round re-runs gates), and
  packets now mandate SYNCHRONOUS validation + incremental reports, which mitigates when
  builders comply.
- **Proper solution:** relay-target detects a trivially short build report (< N bytes) while
  builder-side background tasks are pending, and either re-prompts the builder to wait
  synchronously or polls until the report is substantive before flipping to review-impl.
- **When to address:** Next relay-infrastructure slice.
- **Status:** OPEN

## TD-013 — Retry classifier treats permanent provider 400s as transient

- **Date:** 2026-07-26
- **What was done:** During the amodx CACHE-1 run, the reviewer invocation failed with
  HTTP 400 `invalid_request_error` ("The 'gpt-5-6-sol' model is not supported when using
  Codex with a ChatGPT account"). The relay classified it as "transient provider failure"
  and retried 3 times with 30/90/180s backoff before blocking — ~5 wasted minutes and a
  misleading "transient/infra failure, resume the slice" hint in the final output.
- **Why acceptable:** The run still terminated in `blocked` with the real error preserved
  in `runs/review-0.json`; no artifact corruption.
- **Proper solution:** Classify provider errors before retrying: HTTP 400/401/403
  `invalid_request_error` / auth errors are permanent — fail fast with the provider
  message surfaced in notes-for-human.md; retry only timeouts/5xx/rate-limits.
- **When to address:** Before the next multi-slice unattended run (wasted retries
  compound per cycle).
- **Status:** OPEN

## TD-013 — decision-review trigger blind to unregistered build-created slice docs

- **Date:** 2026-07-27
- **What was done:** Nothing in code; operator practice added to CLAUDE.md (SPEC-slice bootstraps
  must set `sliceDoc` to the doc the slice creates) and sibling bootstraps repaired.
- **Why acceptable:** The practice rule closes the hole procedurally; relay changes must be
  additive + gated, and the current need is met.
- **Defect:** `relay-target.ts` trigger comment claims it fires on "a SLICE_DOC this build
  created/modified", but `readDecisionSources` only reads `status.sliceDoc` — a build-created
  `docs/slices/*.md` not registered there is never scanned for `DECISION_REQUIRED:`.
  GC-SPEC-ETAPE-1 (30+ decisions) went straight to `done`.
- **Proper solution:** scan `changedPaths` for created/modified `docs/slices/*.md` and read those
  as decision sources too (matching the comment), or fix the comment to state the real contract.
- **When to address:** next relay-target hardening slice.
- **Status:** OPEN

## TD-014 — Resume at iteration ceiling runs zero cycles, reports "max iterations reached"

- **Date:** 2026-07-30
- **What was done:** EMAIL-1 blocked at max-iter 3 (iteration=2 in status.json). Operator
  reset phase to implement and relaunched with the same --max-iter 3; the relay exited
  immediately with "Max iterations (3 cycles) reached" without running a single cycle —
  stale review artifacts on disk made it look like the reviewer had re-rejected fixes
  it never saw. Workaround: relaunch with a higher --max-iter.
- **Why acceptable:** no artifact corruption; correct behavior once max-iter raised.
- **Proper solution:** on launch, if status.iteration already >= max-iter, either
  (a) error out with an explicit "raise --max-iter or reset iteration" message, or
  (b) treat --max-iter as ADDITIONAL cycles for a resumed slice. Never print the
  ambiguous max-reached message for a zero-cycle run.
- **When to address:** with TD-013 (both are resume-path ergonomics).
- **Status:** OPEN

## TD-015 — Decision-review re-fires on already-ratified decisions

- **Date:** 2026-08-01
- **What:** EMAIL-HOTFIX-1 modified the ratified plan doc (its sliceDoc), so the
  decision-review trigger re-ran the full adversarial pass over all six ALREADY
  HUMAN-RATIFIED D-EMAIL decisions and halted at awaiting-ratification again. Cost:
  one redundant challenge/rebuttal round + an operator close-out; benefit this time:
  it caught a factual count error (6 send sites, not 5) — so the pass is not pure waste.
- **Proper solution:** the trigger should detect a RATIFIED marker per decision ID and
  challenge only NEW or AMENDED decision blocks, not re-litigate ratified cells.
- **Status:** OPEN

## TD-016 — Copilot adapter argv is grounded in docs, not probed against the installed CLI

- **Date:** 2026-08-01
- **What:** Added `src/adapters/providers/copilot/adapter.ts` (GitHub Copilot CLI,
  batch mode) selectable as builder or supervisor via `--builder copilot` /
  `--supervisor copilot`. The `copilot` binary was NOT installed on the authoring
  machine, so the RunRequest→argv mapping is grounded in GitHub's published CLI
  docs, not an empirical probe. Unverified assumptions, each isolated in
  `buildArgs`/`buildInvocation` and marked `ASSUMPTION:`:
  (1) `copilot -p -` reads a single non-interactive prompt from stdin;
  (2) `--model <id>` selects the model;
  (3) `--allow-all-tools` grants write autonomy;
  (4) read-only is approximated by `--deny-tool write` only (shell left open so the
      reviewer can run `git diff`) — a WEAKER guarantee than Codex's `--sandbox
      read-only`; shell mutation (`rm`, `>`) is not blocked;
  (5) Copilot honors the spawned process cwd for repo context (no `-C`/`--add-dir`);
  (6) `-p` prints the final assistant text to stdout for capture.
  Also: `effort` is intentionally dropped (Copilot has no effort flag), and the
  shared house-rules prompt is PREPENDED to stdin (no `--system-prompt-file`).
- **Why acceptable:** Purely additive — Claude/Codex invocations are byte-identical
  post-change (verified by `relay-target --dry-run` parity) and no core/use-case
  logic branches on provider name. typecheck green. The adapter is PROTOTYPE and is
  not yet trusted in an unattended loop.
- **Proper solution:** Install `copilot`, run a single live smoke test as builder
  AND as reviewer against a throwaway slice, and correct each `ASSUMPTION:` line
  (prompt delivery, deny/allow tool grammar for a functional read-only reviewer,
  model-id spelling, cwd handling). Then set a Copilot default model id in
  `providerDefaults` (currently empty => operator must pass `--builder-model`).
  Consider consolidating the duplicated Codex/Copilot `execute()` once a third
  process-runner exists (deferred to avoid editing the in-use Codex adapter).
- **When to address:** Before the first real relay run that uses Copilot in either
  role; certainly before promoting the Copilot adapter beyond PROTOTYPE.
- **Status:** OPEN

## TD-016 — Builders may stash foreign artifacts and never restore them

- **Date:** 2026-08-07
- **What:** The CACHE-7 builder ran `git stash -u` to route the (untracked) REV-1 plan
  doc out of its review diff. The stash was never popped; the human-ratified plan
  existed only in a stash for 6 days and my `git add -A` commits could not see it.
  Recovered via the stash message's own instruction.
- **Proper solution:** builder prompts: FORBID `git stash` in the target repo (foreign
  working-tree state belongs to the operator); relay post-run check: warn if
  `git stash list` is non-empty.
- **Status:** OPEN

## TD-017 — relay verdict parser requires STATUS on the first line

- Date: 2026-09-07
- What was done: a Claude reviewer (interim, claude-opus-4-6) emitted a stray plan-mode/skill preamble before its
  `STATUS: approved` line; `relay-target` parsed the verdict as `unknown` and blocked a fully-approved slice
  (SYMBOL-IDENTITY-1). The operator corrected `review-1.json` by hand.
- Why acceptable: one occurrence; the review content was intact; the operator checkpoint caught it.
- Proper solution: parse `^STATUS: (approved|revise|escalate)` anywhere in the reviewer output (first match),
  and strip a leading non-review preamble; add a unit test with the captured preamble.
- When to address: before the next reviewer-provider switch, or if it recurs once more.
- Status: OPEN

## TD-018 — bootstrapped status.json: actor enum has no operator value and the malformed-status refusal names no field

- Date: 2026-09-13
- What was done: the first assured run on repo-graph (TRUST-MODULE-EDGES-1-PREP) was refused twice before any
  provider call with `Malformed status.json … required relay fields are missing or invalid`. Cause: the operator
  bootstrapped `lastActor: "in-place-manager"`, then `"operator"` (the value an earlier hand-closed slice,
  EXIT-CODES-1, carries) — `TARGET_ACTOR_VALUES` admits only `claude|codex|copilot|human`. The operator set
  `lastActor: "claude"` (the manager session's provider) to proceed. The refusal message did not name the failing
  field, so each attempt cost a launch.
- Root cause (corrected 2026-09-13 after the human's remark): the manager did NOT follow MANAGER.md §2 — "read the current
  contract and a valid record before constructing one; do not guess fields". Every valid record in the accepted self-build
  (ASSURANCE-2-PREP, ASSURANCE-3) carries a provider value in `lastActor`; the manager copied an old hand-closed repo-graph
  record instead. The items below are secondary diagnostic gaps, not the cause.
- Why acceptable: the refusal is fail-closed (correct); the fix is local to the packet; no provider ran.
- Proper solution: (a) the refusal names the offending field and value; (b) decide whether an `operator`/`manager`
  actor value is a legitimate `lastActor` for operator-bootstrapped packets (the manager playbook says the operator
  bootstraps slices) or whether bootstrap packets must spell a provider — document it in the relay contract and the
  playbook either way; (c) the `--dry-run` path should run the same status validation so a malformed bootstrap fails
  at dry-run, not at launch (it admitted the malformed packet).
- When to address: before the next operator-bootstrapped assured item.
- Status: OPEN

## TD-019 — the structured requirements review accepts an implementation allocation the stage-3 admission then refuses; IMPLEMENT_OBLIGATION_IDS means the whole allocation

- Date: 2026-09-13 (first assured run on repo-graph, TRUST-MODULE-EDGES-1)
- What was done: the REQUIREMENTS_DOCUMENT item authored a stage-3 allocation block; the structured reviewer (Terra)
  accepted the candidate 26/26 at cycle 5; the operator approved; the implementation dry-run under that baseline then
  refused with `heading-mismatch: preservation obligation 'P-TME-0N' has no prose declaration` ×3 and 15×
  `subject-mismatch: allocated obligation … is absent from IMPLEMENT_OBLIGATION_IDS`. Neither check runs during the
  document review: the allocation parser (`assurance.ts` prose-declaration regex; allocation⊆packet rule) is only
  invoked at implementation admission. The P-ID prose rule is documented only by example (the accepted ASSURANCE-3
  slice's table), not in a contract. Cost: one extra document item (INPUT-2) with a fresh review + approval.
- Also: `IMPLEMENT_OBLIGATION_IDS` must equal implements ∪ preserves ∪ changes (assurance.ts:1770-1776), so a packet
  that lists only the Ls the builder implements is refused; the name says "implement", the contract means "allocate".
- Why acceptable: fail-closed at admission is correct; no provider ran against the bad allocation.
- Proper solution: (a) run the allocation parser's packet-independent checks (prose declarations, check coverage,
  disjointness, preserve-oracle wording) inside the REQUIREMENTS_DOCUMENT review path when the SLICE_DOC carries the
  stage-3 block, so a document item cannot be accepted with an inadmissible allocation; (b) document the P-ID prose
  rule in the contract; (c) rename the packet line (`ALLOCATED_OBLIGATION_IDS`) or document that it names the whole
  allocation — a name that does not match its contract misleads the manager exactly as it did here.
- When to address: before the next stage-3 item on any target.
- Status: OPEN

## TD-020 — the structured requirements reviewer drifts from the §5 provider-result shape on a non-agent-manager target

- Date: 2026-09-13 (repo-graph TRUST-MODULE-EDGES-1 document items)
- What was done: across three document items (PREP, PREP-2, PREP-3), Codex gpt-5.6-terra returned an off-schema
  result twice: once the §6 DURABLE record shape (`kind: requirements-review` with reviewId/author/reviewer/
  independence/completedAt), once a free-form object (`subject: {sliceId, artifactKind, paths}`, `result: "REFINE"`,
  `report` as an object, unterminated JSON). The relay rejected both fail-closed (`unsupported-kind`/`unknown-field`;
  `malformed-json`) and blocked — correct — but each slip cost a full author+reviewer cycle (~15 min) and manager
  steering. The reviewer role prompt points at the contract section; the generated task directive does not carry the
  skeleton; the manager had to quote the full shape in the packet before the reviewer complied.
- HUMAN RULING (2026-09-13): "we're not going to be sticklers for schema adherence for something passed between two
  agents — they will understand what's in there, this is not an error." The agents' output is NOT the defect; the
  runtime's fail-closed rejection of an off-shape PROVIDER RESULT is. Structural integrity checks belong to the DURABLE
  records the runtime constructs (review/approval/verification/implementation-review JSON) and to the input closure —
  not to the message one agent hands the next. Reframes the proper solution below: the runtime should read a
  provider result leniently (extract the verdict, per-ID results, findings and decisions from what is there; ask the
  same agent for a clarification only when the content is genuinely ambiguous) and construct the well-formed durable
  record itself; a shape deviation never blocks a work item or costs a cycle.
- Why acceptable (before the ruling): no invalid output was ever consumed as a verdict; the durable records stayed clean.
- MITIGATED (2026-09-13, operator change under the ruling): `extractProviderResultJson` (core/assurance.ts) takes the
  first balanced top-level JSON object from a provider's final message before the UNCHANGED strict parse at the three
  provider-result sites (implementation evidence, implementation review, requirements review). A leading sentence, a
  Markdown fence or a trailing remark no longer blocks a cycle; when no balanced object exists the original text is
  parsed and the original error surfaces. The original message stays in the trail (`build-N.md`, `review-N.json.raw`).
  Additive; 5 unit tests; 173/173; dry-run parity. Made by hand OUTSIDE the assured self-build path because three
  implementation cycles (~1 h) were lost to the wrapper alone with correct evidence inside each — recorded here so the
  bypass is visible. Still open: the broader lenient reading (tolerating field-shape drift such as a non-ContentRef
  `subject`) and in-run clarification — those are Stage-4 discussion items, not patched.
  RATIFIED AS MADE by the human 2026-09-14 — the framing part of this item is RESOLVED; the field-shape leniency part stays OPEN.
  FIELD-SHAPE CASE (2026-09-14, CALL-BINDING-RECEIVER-1-PREP-2 cycle 1): the reviewer ACCEPTED (digests MATCH, markers and
  P-obligations verified, findings []) in an object with formatVersion 1 / verdict / digestCheck / grammarCheck / reviewId /
  allocation / reviewer; the runtime published only unknown-field/missing-field errors and blocked the cycle. The content was
  complete and unambiguous — a lenient reader mapping verdict→result and synthesizing per-obligation assessments from an
  ACCEPT with no findings would have published it. Cost: one document cycle (~10 min).
  EXTRACTOR FIX (2026-09-14, b234835): the first balanced brace group in a builder's prose was a Rust set literal
  (`{Receiverless, ExplicitThis, Indirect, Unreadable}`); the extractor now tries each `{` in turn until one parses as JSON.
  EVIDENCE FIELD-NAME CASE (2026-09-14, CALL-BINDING-RECEIVER-1 fourth admission cycle 1): a complete 19/19 evidence object
  was rejected because every changeJustifications entry said `note` instead of `summary`. Same content, one key name;
  one builder cycle (~15 min) to re-emit.
  DURABLE-SHAPE REVIEW CASE (2026-09-14, CALL-BINDING-RECEIVER-1 fourth admission cycle 2): the reviewer returned a full
  accept (22/22 obligations, 19/19 checks, 4/4 paths, no findings) in the §6 durable-record shape (reviewId, workItemId,
  baseline, allocation, reviewer, independence, completedAt, acceptanceStatus) — the shape the RUNTIME writes — instead of
  the provider-result shape. Dropped; the resume re-runs the builder too, so ~20 min per repeat. Tally for this slice:
  four correct provider results dropped for shape (one refine with two real findings, one accept, one evidence, one accept).
  EMPTY-ARRAY CASE (2026-09-14, fifth admission cycle 1): 19/19 evidence carrying the F-CBR-005 fix rejected because every
  `supportingEvidence` was `[]` — the content (actuals, the seven named tests, 0 self-loops / 9413 conserved) was all there.
  Running tally on this slice: SIX correct provider results dropped for shape (fifth admission cycle 3: a refinement-required
  review with two real findings used `id`/`severity`/`location` on findings and skipped one check assessment); ~15–20 min each.
  SEVENTH (fifth admission cycle 4): a full accept in the CORRECT shape rejected on `subject.verificationSha256` — the
  reviewer retyped the 64-hex digest and got one nibble run wrong (candidate digest exact). Strictness is right to refuse a
  wrong identity; the cost is that the accept, whose content was unambiguous, must be re-emitted by re-running the builder too.
  EIGHTH (fifth admission cycle 5): the same accept again, this time with the PREVIOUS cycle's verification digest copied
  from a manager note. A lenient reader would recognise the candidate digest (exact) and the runtime's own current
  verification identity and publish; the strict one re-runs builder + reviewer (~20 min) a third time for one field.
  IMPLEMENTATION-REVIEW CASE (2026-09-14, CALL-BINDING-RECEIVER-1 third admission cycle 1): the reviewer returned
  refinement-required with two REAL code findings (a mocked test where an indexed fixture was required; a malformed-metadata
  path re-enabling the forbidden self-binding). The object had `subject` as a sha pair that did not match, assessed parent
  H ids, and findings without obligationIds[]/locations[]; the runtime published only errors and the builder would never
  have seen the findings. The manager copied them verbatim into the packet. A lenient reader that ignores unknown
  assessments and maps single obligationId→obligationIds would have published a review whose substance was entirely right.
  NINTH (fifth admission cycle 10, 2026-09-17): a refinement-required review with ONE real finding (F-CBR-013: the
  fallback-forbidden scan stops at `lambda_expression` while its own comment and the packet rule say lambda captures count)
  emitted a top-level `verdict` instead of `result` and omitted the `decisionIds` array on all 26 obligation assessments.
  Content correct and actionable; dropped; the finding was carried into the next cycle by a manager note quoting the reviewer
  log, and the resume re-ran the builder (~27 min) as well as the review. Nine correct provider results dropped on one slice.
- Proper solution: (a) inline the §5 skeleton (field names, enum values, "subject = REVIEW_BASELINE path + sha256")
  in the generated requirements-reviewer task directive; (b) on a shape-invalid provider result, return the exact
  structural errors to the SAME reviewer for one bounded in-run correction before blocking the item (the author's
  deliverables are unchanged, so re-running the author is waste); (c) on the builder side the same for the
  `implementation-evidence-result` (the first stage-3 builder wrapped valid JSON in prose + a fence).
- When to address: before the next assured item on any target.
- Status: OPEN

## TD-021 — A superseded approved baseline strands its in-flight work item (2026-09-13)

- What was done: TRUST-MODULE-EDGES-1's implementation item was admitted under INPUT-2; cycle 0 STOPPED correctly
  on a wrong predicted movement; the human ruled (D-TME-MOVEMENT-1) and the allocation was corrected, reviewed and
  approved as INPUT-3. Resuming the item was then refused three ways, all by design: the persisted assurance object
  binds the item to INPUT-2 (`subject-mismatch … persisted assurance conflicts with --baseline`); candidate tracking
  pins `baseRevision` 61fa68c and refuses a later HEAD; and a fresh item under a new ID is refused because
  `workItemId` sits inside the bound allocation block (`allocation names 'TRUST-MODULE-EDGES-1'`), so renaming would
  force an identity-only re-review (INPUT-4). The manager retired the first admission's LOCAL process-trail record
  (`.agent-manager/slices/TRUST-MODULE-EDGES-1.superseded-INPUT-2/`, with a `superseded.md`) and admitted the same
  work item fresh under INPUT-3, carrying the cycle-0 candidate. No durable record was edited; no status line was
  changed to manufacture admission.
- Why acceptable: `.agent-manager/` is gitignored process trail (ratified 2026-06-28), not the system of record; the
  durable chain (INPUT-3 review + approval, repo-graph 7a2b2f2) is real and independently reviewed; the retired record
  is preserved and names its successor. The alternative — INPUT-4 for a name change — buys no information.
- Proper solution: an explicit, recorded supersession: `--supersede-baseline <old> --baseline <new>` on an admitted
  item requires the new manifest to be reviewed+approved AND to name the same `workItemId`, writes
  `assurance.superseded[]` (old manifest ref, new manifest ref, reason, approval ref) into the item's status, and
  returns candidate tracking to `building` at the current HEAD. Fail closed on anything else. This keeps the
  "one manifest per item" invariant auditable instead of forcing the manager around it.
- When to address: with the Stage-4 proportionality discussion — this is the second case (with TD-020) where the
  runtime's rigidity on a correct correction cost manager time without adding assurance.
- Status: OPEN, NARROWED 2026-09-14 — with the ratified oracle-correction path (TD-022) text-only corrections no longer
  need supersession; a supersession verb remains the proper solution for non-text baseline changes.

## TD-022 — A stale oracle token costs a full re-baseline because document review cannot execute (2026-09-13)

- What was done: TRUST-MODULE-EDGES-1's TME-C08B (`grep -i 'calls resolved'`) and TME-C14B (`"total_files"`) never
  matched the product's real output ("your code's calls N% resolved (…)"; `indexed_file_count`). Three document
  reviews accepted them — correctly under their contract, which forbids executing commands — and the defect surfaced
  only when the stage-3 builder ran them. The builder substituted stronger byte-identity evidence and reported
  `passed`; the implementation reviewer refused to close a mandatory check on substituted evidence and raised
  D-TME-VALIDATION-STALE-1 (A: amend + re-approve; B: bend product output to stale greps — forbidden; C: refuse the
  proven fix). The manager took A: INPUT-4 for a token correction, then re-admission (TD-021 again).
- Why acceptable: the fail-closed behaviour is correct — a mandatory check that cannot pass as written must not be
  counted passed; the builder's substitution, however honest, was a redefinition. The cost is ceremony, not risk.
- Proper solution (two parts): (1) stage-3 builders report a check whose command cannot execute as written as
  `execution-failed` with the stronger evidence attached — never `passed` (prompt rule; `builder-target.md`); (2) an
  operator-recorded **oracle correction** for a check whose command text is demonstrably stale (token absent from the
  current output, intent unchanged) that the implementation reviewer may accept without a new baseline — the record
  names the check, the old/new token, the evidence, and the approver, and is itself reviewed at closeout. Without (2),
  every literal in a check command is a latent re-baseline.
- When to address: Stage-4 proportionality discussion, with TD-020/TD-021 — three cases in one slice where the
  runtime's rigidity on a correct correction cost manager time without adding assurance.
- DIRECTION RATIFIED 2026-09-14 (human, option B): a recorded, operator-approved, closeout-reviewed oracle correction for
  text-only changes to a check or its prose — no re-baseline, no re-admission — with every correction logged. "Text-only"
  must be defined hard before implementation: changes no allocation set (implements/preserves/changes), no check-ID set, no
  requirement text, no candidate paths; only a check's command literal/expected/prose or the slice's explanatory prose.
  Procedure written into docs/MANAGER.md (§ Oracle corrections). The RUNTIME part (admit a corrected allocation digest chained
  through the record) is taken by the human in a separate session — no agent-manager work item (human 2026-09-14).
- Status: OPEN — procedure in place; runtime support pending (human).

## TD-023 — A bound oracle can lock a false name into the candidate (2026-09-13)

- What was done: TRUST-MODULE-EDGES-1's TME-C03 selected a render test by exact name while the slice inverted that
  test's assertions. The stage-3 builder kept the contradictory name to satisfy the check (its comment said so) and
  reported the check passed; the implementation reviewer raised D-TME-TEST-NAME-1. Manager took A: rename + INPUT-5.
- Why acceptable: the reviewer caught it; the fix is a rename plus a text-only oracle amendment.
- Proper solution: (1) `builder-target.md` rule — a builder never introduces or retains an identifier whose name
  contradicts its behaviour to satisfy a check; it reports the check `execution-failed` with the naming conflict named
  and STOPs, so the manager fixes the oracle (same family as TD-022's rule); (2) the manager's packet-authoring
  checklist: every test/function identity in a check command is re-read against the slice's own planned rewrites.
- When to address: with TD-020–022 in the Stage-4 discussion; the prompt rule is a one-line additive change to a
  tracked prompt and should go through the overhaul track's own path, not be patched mid-slice.
- Status: OPEN.


## TD-024 — reviewer input grows without bound with the slice's review history and hit the provider's input cap

- Date: 2026-09-18
- What was done: nothing in the runtime; the manager trimmed the live selection packet (superseded per-cycle notes moved to a
  non-input history file) to get the reviewer delivery under Codex's 1,048,576-character `turn/start` limit.
- What happened: CALL-BINDING-RECEIVER-1 cycle 14 (the first Codex reviewer RESUME after the session-id increment) failed
  four times with `input_too_large` (actual 1,048,951 chars). The reviewer delivery includes every prior review of the slice
  as `prior-review` inputs (review-1…12 ≈ 250 KB) plus the packet, the 126 KB candidate diff, the verification draft,
  the allocation and the task directive. The relay classified it as a transient provider failure and retried with backoff;
  the failure is deterministic.
- Why acceptable: rare — needs a long-running slice; the manager can shrink the packet; the durable record is unaffected.
- Proper solution: (1) classify `input_too_large` (and any provider "request too large" code) as a non-retryable delivery
  failure that blocks immediately with the byte breakdown per input; (2) bound the prior-review inputs (e.g. the last N
  reviews plus any review still referenced by an open finding, or the published findings ledger instead of whole records);
  (3) with a resumed native session, the prior context is already in the conversation — the delivery need not repeat it.
- When to address: with the session-id increment's follow-up; before another slice exceeds ~10 review cycles.
- Status: OPEN (manager workaround applied on CALL-BINDING-RECEIVER-1).

**Update 2026-09-20 (reference delivery, human decision "A and B"):** on a resumed native session, every input the conversation already received as content is now delivered as an identity-only reference frame, and `source` dependencies are references from the first turn (contract v2 section 8.4, "Reference frames"). Prior reviews already in the conversation are therefore no longer re-sent, which removes the growth this entry describes for resumed sessions. Still open: a FRESH reviewer session on a long slice still receives every prior review as content; the provider's input cap is still retried as transient.

## TD-025 — the requirements-document AUTHOR task directive names the reviewer's output contract

- Date: 2026-09-18
- What was done: nothing in the runtime; recorded from the author's own report (EXPLAIN-CYCLES-HONEST-1-PREP build-1.md).
- What happened: for an `ARTIFACT_KIND: REQUIREMENTS_DOCUMENT` item the generated author directive carries
  `ROLE_OUTPUT_CONTRACT: requirements-assurance/v2-requirements-review` — the REVIEWER's contract — while the builder-target
  duty for that kind is "verify/correct/re-emit the two deliverables, never write a review or approval". The claude author
  noticed the contradiction, did the document duty, and flagged it as unresolved rather than emitting a review object. Every
  PREP item since TRUST-MODULE-EDGES-1-PREP has run this way (authors report; reviewers review), so the process outcome is
  right; the directive text is wrong and costs the author a reasoning detour each cycle.
- Why acceptable: no wrong record has been produced; the role prompt's duty text wins in practice.
- Proper solution: the author directive for a REQUIREMENTS_DOCUMENT item names an author output contract (the two
  deliverables + a report), or omits `ROLE_OUTPUT_CONTRACT`; the reviewer directive keeps `v2-requirements-review`.
- When to address: with TD-020/024 in the human's runtime session.
- Status: OPEN.
