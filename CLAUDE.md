# Agent Manager - Project Instructions

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

`relay-target` options: `--builder claude|codex`, `--supervisor claude|codex`,
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

- **Drive the queue; the relays do the work.** The operator bootstraps slices, watches the
  gate, does an operator review (earned-abstraction / scope / honesty), commits on approval,
  advances. Surface only genuine blast-radius decisions to the human.
- **Checkpoint every 2-3 cycles — never let a loop run long unattended** (ratified
  2026-07-04). Launch relays with `--max-iter <current_iteration + 3>` so the relay STOPS at
  the checkpoint by design; the operator reads the newest review/build report + tree shape,
  then continues (on track) or steers via OPERATOR_NOTE (in the weeds). Reviewers judge the
  CONTRACT; only the operator/human judge PRODUCT SENSE — the field bugs (client timeout
  aborting live indexes; success-only registry persistence) all passed green review cycles.
  Corollary: when a review round's only pending input is the operator's own ratification,
  close out HERE (operator review + commit) instead of buying another round.
- **On a builder timeout, READ the build log's edit distribution (and the partial tree) to
  STEER before discarding** — do not blind `git checkout`. The partial work is steering (where
  a too-big slice should split) and a potential resume base. (Relay improvement pending — see
  `docs/TECH-DEBT.md`.)
- **Smaller slices converge; mega-slices block.** When a slice can't converge or times out,
  SPLIT it (informed by the build log) rather than retry/raise-timeout.
- **Builder model is `claude-opus-4-8` — always — unless the human explicitly instructs
  otherwise** (operator directive 2026-07-20, superseding the 2026-07-16
  judge-by-complexity policy: the escalation decision is the HUMAN's, not the operator's).
  Standing human overrides: glamCRM builders run `claude-opus-5` (2026-07-25). **Builder
  effort is `high`, not `max`** (human directive 2026-07-26; default changed in
  `relay-target.ts`).
  When strain appears (>2 substantive revise rounds, repeated fuse kills), SURFACE the
  strain and the escalation option to the human instead of escalating. Codex reviewer
  model stays per its own default.
- **Deep vertical slices — no dormant capability** (operator directive 2026-07-11). Whatever
  support a slice delivers must be WIRED through and REFLECTED IN THE OUTPUT somewhere, in the
  same slice. A capability that exists but never runs or never renders is the field-bug factory
  (retention shipped-but-never-ran; enrichment opt-in-never-invocable; resolutions computed but
  promoted=0). Slice packets must name the output surface where the delivered support becomes
  visible, and validation must prove it renders there.
- **Infra blocks (provider auth/quota lapse, transient timeout) → resume**; real `escalate` →
  surface the DECISION_REQUIRED to the human.
- **A big smoke run gets a usefulness GATE: an agent analyzing the outputs against the VISION, the
  current architecture, and the net tech-debt balance — plus the reviewer model's take** (the two-agent
  gate; `repo-graph/docs/testing/end-to-end-usefulness-protocol.md`). The reviewer pass runs the model
  STANDALONE (outside the relay), so use a **self-contained prompt**: inline the evidence, forbid web
  search / tools, read-only sandbox (`prompts/standalone-review.md`). A standalone review that asks the
  model to *assess a subject* without inlined evidence loops on web search (a 3h dead loop, 2026-06-29);
  the relay's in-loop reviews are safe because they judge a self-contained `git diff`.
