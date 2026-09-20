# Agent Manager - Project Instructions

## Requirements-assurance rollout authority (2026-09-11)

CLAUDE.md is the sole project-instruction entry point; AGENTS.md was removed at human direction. Read the approved [catalog](docs/requirements/README.md), [process](docs/PROCESS.md), [manager playbook](docs/MANAGER.md), [rollout](docs/slices/requirements-assurance-rollout.md), and [roadmap](docs/ROADMAP.md).

The human approved the drafts and authorized implementation: [authority and decisions](docs/assurance/ASSURANCE-0/human-authorization.md). Approval, independent review, implementation, and verification are distinct; only claim gates actually delivered. Execute the staged self-host sequence, beginning with ASSURANCE-0's record grammar and independent review.

**Current overhaul assignment supersedes historical model instructions below for this track:** builder = Codex CLI / gpt-5.6-sol; reviewer = Codex CLI / gpt-5.6-terra; existing high effort. Manager = the human-started coordinating session. Separate invocations, same provider, not cross-vendor independence. Use explicit --builder codex --builder-model gpt-5.6-sol --supervisor codex --supervisor-model gpt-5.6-terra --shared-prompt <absolute-agent-manager-root>/SYSTEM.txt. This prompt must be loaded before either role runs; do not fall back to ~/CLAUDE-SYSTEM.txt. CLI global defaults remain unchanged.

Use relay-target on agent-manager itself, at most three cycles before checkpoint. Verify the actual runner/prompt identities, preserve pre-existing work, and do not claim future gates enforce this bootstrap. Adopt each newly accepted runtime increment only in a fresh process after typecheck, tests, and legacy routing parity. The legacy --supervisor flag still binds selection and review, not the persistent manager; do not silently rename its contract.

**Current accepted position (2026-09-13):** ASSURANCE-0 through ASSURANCE-3 are
accepted; see [Stage-3 acceptance and handoff](docs/assurance/ASSURANCE-3/manager-acceptance.md)
and the [current roadmap](docs/ROADMAP.md). Stage 3 passed 168 tests and separate
Sol/Terra implementation review; manager acceptance remains a manual bootstrap,
not the future runtime acceptance gate. Stage 4/5 are held for the human's
proportionality/context discussion. Historical baseline/progress wording is not
current dispatch authority; do not reuse ASSURANCE-3-INPUT-1 after its approved
closeout amendment. A future work item needs its own current reviewed baseline.

## Read Order

1. `docs/VISION.md` — product purpose and boundaries
2. `docs/ARCHITECTURE.md` — architectural layers, domain model, storage model
3. `docs/contracts/` — machine contracts (once they exist)
4. This file — execution rules

## Hard Constraints

1. **Self-hosting governs scope.** A feature is not mature if it cannot be exercised by the product on itself in a controlled slice.

2. **Dependencies point inward.** Core never imports adapters. See `docs/ARCHITECTURE.md` section 3.

3. **Files are the system of record.** No database. No hidden state. If correctness requires something not reconstructible from tracked files, the design is wrong.

4. **Roles are stable. Providers are volatile.** Core workflow depends on role contracts. Provider-specific behavior stays in adapters.

5. **Silent drift is forbidden.** Once a design is frozen, any divergence must be explicit.

## Technology Stack

- TypeScript
- Node.js
- Text and JSON files on disk
- Git for version history

## Storage Rules

### Tracked (committed)

| Directory | Contains |
|-----------|----------|
| `slices/` | Authoritative workflow artifacts |
| `prompts/` | System prompts, role prompts |
| `schemas/` | JSON schemas for machine contracts |
| `templates/` | Artifact templates |

### Gitignored

| Directory | Contains |
|-----------|----------|
| `logs/` | Raw execution traces |

### Log naming pattern

```
YYYY-MM-DD_HH-MM-SSZ__<role>__<provider>__slice-<id>.<ext>
```

## Module Maturity Levels

All modules must declare maturity in their header comment or README.

| Level | Meaning |
|-------|---------|
| PROTOTYPE | Contracts still being shaped. Expect breaking changes. |
| MATURE | Stable contracts. Breaking changes require decision record. |
| PRODUCTION | Battle-tested. Breaking changes require migration path. |

## Technical Debt Recording

When creating technical debt, add an entry to `docs/TECH-DEBT.md` with:

- ID (TD-001, TD-002, etc.)
- Date
- What was done
- Why acceptable
- Proper solution
- When to address
- Status

## When Making Changes

1. **Read the architecture first.** `docs/ARCHITECTURE.md` defines layers, entities, and boundaries.

2. **Check module maturity.** PROTOTYPE can break freely. MATURE/PRODUCTION require care.

3. **Check contracts.** Once `docs/contracts/` exists, changes must respect frozen contracts or update them explicitly.

4. **Provider logic stays in adapters.** If you find yourself checking provider name in core, refactor.

5. **Ask before implementing open decisions.** See `docs/ARCHITECTURE.md` section 14 for unfrozen decisions.

## Commands and Workflows

| Command | Purpose |
|---------|---------|
| `npm run relay -- <slice-id>` | Self-host relay on an AM-* slice inside agent-manager |
| `npm run relay-target -- <target-path> [opts]` | Target-owned relay on an external repo (e.g. `../repo-graph`) |
| `npm run am-001` | One-shot builder run for AM-001 |
| `npm run human` | Record a human intervention |
| `npm run typecheck` | `tsc --noEmit` |

`relay-target` options: `--builder claude|codex|copilot`, `--supervisor claude|codex|copilot`
(copilot is PROTOTYPE — batch mode, empty default model so pass `--builder-model`; see TD-016),
`--shared-prompt <path>`, `--max-iter <n>`, `--until <phase>`, `--dry-run`.
See `docs/contracts/target-owned-relay.md`.

## Current Phase

Simplified relay system (READY).

Completed:
- Phase 0-4: Infrastructure validated
- Scope correction: Simplified from "workflow platform" to "relay automation"
- Codex adapter
- Relay loop use case
- Reviewer prompt with verdict format

To run relay: `npm run relay -- <slice-id>`

Minimal filesystem per slice:
```
slices/<id>/
  brief.md       # task description
  current.md     # latest artifact
  context.md     # generated context for actor
  status.json    # phase, updatedAt, lastActor
  notes-for-human.md  # only when blocked
```

Relay loop:
1. Read brief + current
2. Send to builder (claude) or reviewer (codex) based on phase
3. Parse verdict from reviewer (STATUS: approved|revise|escalate)
4. Update current.md and status.json
5. Stop on blocked or max iterations

Human only needed for:
- Deadlock breaking
- Ambiguous decisions
- Final acceptance

### Target-owned relay (PROTOTYPE)

Drives the loop on an external repo with that repo as the system of record.
Distinct from self-host relay: `promptRoot` (agent-manager prompts) and
`workingDir` (target repo) are separate; the builder edits the target's working
tree; the reviewer reads the resulting `git diff`; either role can be Claude or
Codex.

Phase graph: `select-slice` → (`implement` → `review-impl`)* →
[`decision-review` → `awaiting-ratification`] → `done` | `blocked`.
Selection is **read-only** (supervisor only picks a slice; AM writes
`selection.json`). `--max-iter` bounds build/review **cycles**. The active slice
is tracked in `current.json`, so `--until select-slice` then a plain run resume
the same slice (`--slice <id>` / `--reselect` to override). Each provider call
writes a `runs/*.json` run record referencing its log path.

**Bootstrap rule for SPEC slices:** `sliceDoc` in `selection.json`/`status.json` must point at the
spec document the slice CREATES (e.g. `docs/slices/<name>.md`), NOT at `docs/ROADMAP.md` — the
decision-review trigger reads the marker from `status.sliceDoc`; a wrong pointer silently skips the
adversarial decision pass (bitten 2026-07-27, GC-SPEC-ETAPE-1: 30+ decisions went straight to
`done`; caught by the operator, pass re-run manually).

Per-slice files (relay-target): `<target>/.agent-manager/slices/<ID>/` holds
`selection.md` (the operator's brief — the builder packet), `selection.json`,
`status.json`, `build-<n>.md`, `review-<n>.json`, `runs/`, and — when blocked —
`notes-for-human.md`. The operator **bootstraps a slice** by writing `selection.md`
+ `selection.json` + `status.json` (phase `implement`) then running `--slice <ID>`.

The target is **always** the `<target-path>` argument; no repo is hardcoded
(`../repo-graph` is only an example). The relay provisions
`<target>/.agent-manager/` on first run for any target. **The relay NEVER
self-commits** (verified: the builder context says "Do NOT commit"); the operator commits
the **deliverable** (the spec/code in the target's tracked tree) after review approval.

**`.agent-manager/` is gitignored / local-only working state** (ratified 2026-06-28) — the relay's
**process trail**, NOT the system of record. The DURABLE record of decisions is the **target's own
committed** slice/spec docs (e.g. `docs/slices/*.md` with their ratification sections) + the
operator's commits + commit messages. (The contract + README were superseded to match; the earlier
"artifacts committed" spec is retired. Scaffold follow-up: provision `.agent-manager/` gitignored for
NEW targets — see TECH-DEBT.)

Run: `npm run relay-target -- <target-path>` (add `--dry-run` first to inspect
the exact provider invocations). Full contract: `docs/contracts/target-owned-relay.md`.

### Decision-review (two-agent adversarial review before human ratification — PROTOTYPE)

The relay's `review-impl` reviews the **artifact** (well-formed? in-scope?); it does
NOT review the **decisions** a spec surfaces. The `decision-review` phase closes that:
after `review-impl` approves a slice **that surfaced new ratification-class decisions**,
the supervisor (Codex) adversarially **challenges** each recommendation against source,
the builder (Claude) **rebuts** (one round), and the relay emits a `ratification-packet.md`
(per decision: recommendation / challenge / rebuttal / converged|contested) then **halts
at `awaiting-ratification`** for the human — it never auto-proceeds. This is the encoded
form of the manual pass that caught real foundational errors before code (e.g. a cross-store
split-brain). **Trigger:** the decision marker appears in this slice's `build-<n>.md`, OR in
a `SLICE_DOC` **this slice's build created/modified** (a SPEC slice writing its spec) — NOT
when an IMPL slice merely references a pre-ratified spec. Spec + decisions:
`docs/slices/decision-review-mode-1.md`.

### agent-manager self-build

To build a capability INTO agent-manager, run **`relay-target` pointed at the agent-manager
repo itself** (the proven mechanism; the self-host `npm run relay` / `relay.ts` path is
UNPROVEN — AM-001 never completed). Changes to the running relay (`relay-target.ts`) must be
ADDITIVE and gated on `typecheck` + tests + a `relay-target --dry-run` parity check (the
existing flow unchanged) before the next run relies on them; the running process loaded its
code at start, so mid-run edits do not affect it.

### Operator practices (this way of working)

Curated 2026-09-20. Each rule is the rule plus its reason. The incident that taught it (dates, slice
ids, hashes, the full story) is kept verbatim in `docs/OPERATOR-LESSONS-ARCHIVE.md`, which is
append-only. A rule tagged `[retire: TD-0xx]` compensates for a runtime gap and is deleted when
that debt closes. Rules that a builder or reviewer must follow live in the role prompts or in the
target's own CLAUDE.md, not here.

#### Rule hygiene

- A lesson goes first to the place where it acts: the packet being written, a role prompt (between
  admissions), the target's CLAUDE.md, or `docs/TECH-DEBT.md` when the runtime should enforce it.
  Reason: a rule the manager must remember to repeat in every packet fires less reliably than one
  the recipient reads itself.
- A new standing rule in this section needs the human's sign-off; the manager proposes it in a
  closeout report with what it catches and what it costs. Reason: unreviewed accretion buried the
  infra-resume rule so deep it did not fire (2026-09-18).
- At each release cut, delete rules whose retire condition is met and rules that have not fired
  since the previous cut; move their text to the archive. Never edit the archive's existing entries.
- Findings are recorded against the artifact and the policy that let the defect through (packet,
  oracle, prompt, runtime), never against an agent or a person.

#### Standing assignments (the human's knobs — never changed by the operator)

- repo-graph slices: builder `--builder claude --builder-model claude-opus-4-8` (effort high),
  reviewer Codex `gpt-5.6-terra`. The operator MAY use `--supervisor-model gpt-5.6-sol` for one
  review when a review escalates on a design question the spec cannot settle, or after more than
  two substantive revise rounds; the review record names the model. Any other model, provider or
  effort change is the human's: surface strain and the option, do not switch.
- agent-manager self-build: see the overhaul assignment at the top of this file.
- A Codex builder cannot bind a Unix socket in its sandbox: route live proofs through stdio or mark
  them operator-run.
- repo-graph code slices launch with `--timeout 120`. Reason: the builder's corpus proofs and the
  reviewer at high effort both need more than the 20-minute default.
- After each slice closes out, wait one hour (a background `sleep 3600` whose completion resumes
  you), prepare the next packet's reads meanwhile, then launch the next slice without waiting for
  the human. Reason: the account's rolling allowance. The pause is a wait, never a stop.

#### Authority

- Provider quota, auth lapse, rate limit, transient failure or timeout: investigate, preserve the
  partial work, resume. It is not a question for the human.
- A real `escalate` or `DECISION_REQUIRED` on a product trade-off, boundary, or invariant: surface
  it. The full table is in `prompts/roles/manager.md`.
- Agent-to-agent results are not schema-policed (human ruling 2026-09-13). A shape deviation is
  never an agent's defect; apply the meaning through manager interpretation. Integrity rules stay
  on durable records and the input closure. `[retire: TD-020]`

#### Before a packet exists

- Root-cause before packeting. Every defect gets a code-level cause (render site, data path, the
  exact predicate, regression-or-never-worked, smallest fix, verification) before a packet or a
  queue is proposed; slices are cut along shared causes, not symptom labels.
- A mechanism claim is verified on the live system (the real database, the real output), never
  grepped from sources. Reason: a partial glob produced a false premise in a ratified spec.
- Rewards are product outcomes. "No reindex", "render-only", "small" are avoided costs; fix at the
  cause. An option whose only reward is being cheaper is not an option.
- The map is not the territory. A defect is a defect only if a user asking about a repo is misled
  or unhelped. An internal-method question is surfaced only with the user-visible output it changes.
- Deep vertical slices: whatever a slice delivers is wired through and visible on a named output
  surface in the same slice, and validation proves it renders there.
- Smaller slices converge. When a slice cannot converge or times out, split it using the build log.

#### Writing the packet and its oracles

- Evidence taxonomy up front: for every evidence field the slice introduces, list absent /
  present-valid / present-malformed and bind a test to each. Reason: reviewers otherwise find the
  defensive paths one cycle at a time.
- A measured target names its exact measure: which bytes or rows, measured how, excluding what.
- The round is ordered: the fix, then chunked per-crate gates, then proofs on the smallest corpus
  that demonstrates the contract, then cleanup, with `build-progress.md` written after each step.
  Reason: an unordered round ends every cycle "incomplete".
- "Nothing else" limits scope, not the smallest change a ratified behaviour needs end to end. Say
  "beyond the ratified definition of done".
- An oracle that selects a test the slice rewrites names the test's new identity; rename in the
  packet. A test named for a behaviour the slice reverses is a false name. `[see TD-022, TD-023]`
- When a slice reverses a served behaviour, grep the tests for that behaviour's name, including
  test files pulled in by `#[path]`, and put them in the allocation.
- When a slice changes a value one route or engine serves, bind the other route's parity tests
  and the whole unit suite of every touched crate inside the acceptance boundary.
- Before allocating, grep every literal construction of any struct the slice extends and list
  every hit in the candidate paths. Never let the packet make an out-of-allocation path "optional".
- A byte-identity oracle first enumerates the derived lines the change legitimately moves.
- A structured-output oracle asserts over the answer field, not the whole document (the focus is
  echoed elsewhere). A negated grep names one exact file and a literal terminator.
- When a decision record names the proof, the check performs exactly that proof, not a proxy.
- Check commands use quoted absolute paths, never `$PWD` after a `cd`.
- The hygiene oracle includes the target's formatter check, not only `git diff --check`.
- Verify every literal token in an oracle against real output before the document review. A grep
  that prints nothing is a failed verification.
- Packets and notes quote full digests, never suffixes, and never restate a per-cycle identity;
  point at the cycle's directive instead.
- Run `npx tsx scripts/validate-allocation.ts` over a stage-3 block before its document review.
  `[retire: TD-019]`

#### Baselines, manifests, admission

- After any requirement-file change, revise the bootstrap baseline in the same commit and
  regenerate every not-yet-approved slice manifest. Read a digest-mismatch's file list first.
- A slice manifest pins the closure of its parents' `sources`, generated from the requirement
  files, plus the decision record that authorizes any amendment.
- Bootstrapping a record: copy a valid current record and re-read the contract; never reuse an old
  shape. `[retire: TD-018]`
- Re-admitting a superseded item: copy the previous runtime-written `status.json`, replace only
  `assurance.manifest`, drop sessions/tracking/pending interpretation, reset phase. `[retire: TD-021]`
- Never edit a pinned input (role prompt, shared prompt, requirement, governance file) while an
  item is admitted or while an interpretation is pending. Queue the edit for the next admission.

#### Launch and checkpoint

- One launch per command, never chained or backgrounded behind another. `--dry-run` after any
  invocation change.
- Bound every relay at the current iteration plus three. At the checkpoint read the newest build
  and review, the progress file and the tree. Reviewers judge the contract; the operator judges
  product sense. When the only pending input is the operator's own ruling, close out instead of
  buying another round.
- Three cycles on one class of finding is strain: freeze the slice's scope with a taxonomy, move
  further instances to a follow-up, and bring the scope question to the human.

#### Interruption and recovery

- After any relay kill, session exit or provider timeout: `pgrep -fl "claude.*stream-json|codex exec"`
  and the build tool's children, kill survivors, confirm the tree is stable, check that no build
  lock is held, then relaunch.
- On a builder timeout read `build-progress.md` and the edit distribution before anything else. On
  a clean tree check `git stash list`. Keep the partial work, write a resume note, relaunch.
- When a timed-out builder left a complete fix with only gates pending, run the gates yourself,
  write the build report from the progress file, label it operator-executed, and go to review.

#### Manager interpretation `[retire: TD-020]`

- Content is only result / obligationAssessments / checkAssessments / changedPathAssessments /
  findings / decisions / report. Path assessments are exactly {path, result, findingIds, decisionIds}.
  `--shared-prompt` is required. Verify each finding on the code before applying.
- `execution-failed` and `unverified` are not assessment results: use refinement-required plus the
  finding. Builder-evidence reliance is `{kind, limitation}`; a reproduction is
  `{kind, outcome:{kind, actual, supportingEvidence}}`. An accepted assessment references no finding.

#### Closeout

- Follow the closeout checklist in `docs/MANAGER.md` §6; do not restate it in status messages.
- The gate script is tracked here (`scripts/repo-graph-gates.sh`). Run it to a log file; assert the
  green marker and the absence of failures in a separate command; only then commit. Never pipe a
  gate's exit status away and never chain a commit behind an unverified gate.
- The committed bytes equal the accepted candidate; if formatting had to run after acceptance,
  prove the difference is whitespace only.
- A reviewer finding about a duty the process assigns to the operator is resolved with the
  operator's evidence (the gate log on the unchanged candidate), never by fiat.

#### Editing records

- Durable records are append-only: a published review, evidence, decision or approval is never
  edited or deleted; a correction is a new dated entry that references what it corrects. Reason: one
  rewritten record makes every record unverifiable.
- A scripted record edit asserts its anchor, rewrites the whole sentence, prints the edited field
  for a read-back, and commits only inside the success path of the same script.

#### Reporting to the human

- A question is self-contained: the problem in plain language first (what is broken or at stake,
  how we got here), then each option as reward and risk. No labels carrying the meaning.
- Reports state what was wrong in which artifact and what changed. No attribution, no apology.
- Assessment deliverables use the grade-matrix format the human approved (2026-08-26).

#### repo-graph operations (operator side; builder and reviewer rules live in repo-graph's CLAUDE.md)

- Every checkpoint and closeout report carries code-under-analysis examples: real file:line and
  statement from the analyzed repositories, before and after. Counts alone are not an outcome.
- After each commit sweep that slice's roots from `/private/tmp`, check `rust/target` and
  `df -g /`. Retained roots live under `~/repo-graph-retained/`, never `/private/tmp`.
- After a release cut, warm the debug cache once (`cargo build --workspace --tests`) before a relay.
- Audit smoke runs use `SMOKE_SKIP=linux` until the per-repo index timeout override ships.
- A big smoke run gets the two-agent usefulness gate. A standalone reviewer pass needs a
  self-contained prompt: evidence inlined, no web search, read-only (`prompts/standalone-review.md`).
- After a Codex CLI upgrade, smoke the relay's exact flag shape with one real `codex exec`.
