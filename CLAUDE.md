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
- **Builder model default is `claude-opus-4-8`, effort `high`** (human directive 2026-07-31, back from the 2026-07-26 opus-5 period;
  baked into `relay-target.ts`; superseding the 2026-07-20 opus-4-8 default and the
  2026-07-16 judge-by-complexity policy). Model/effort changes remain the HUMAN's decision,
  not the operator's — per-run overrides via `--builder-model`; when strain appears, SURFACE
  it and the escalation option to the human instead of escalating. **Codex reviewer model
  default is `gpt-5.6-terra`** (human directive 2026-07-27, after the gpt-5.6-sol quota
  lockout; quota was reset same day).
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

- **Decision-surfacing format (human directive 2026-07-27):** when presenting the human a
  decision, FIRST explain the problem in detail (what is broken/at stake, how we got here),
  THEN present each option in explicit RISK vs REWARD terms. No option lists without the
  problem statement; no labels without consequences.

- **Kill the whole relay family, then verify (operator lesson 2026-08-16):** `pkill -f relay-target`
  kills the wrapper but can ORPHAN the spawned provider child (claude/codex), which keeps
  editing the target tree — a ghost builder wrote files DURING the next cycle's review and the
  reviewer correctly escalated on a moving diff. After any relay kill: `pgrep -f "claude.*stream-json|codex exec"`
  and kill survivors, then confirm tree stability (two `git status` hashes apart in time).
  Related: launches get their OWN command — never chained/backgrounded behind other commands
  (orphaned twice: GS-2 2026-08-12, TZ-4 2026-08-16).
- **Rust slices on opus-4-8/high need `--timeout 60` (operator lesson 2026-08-23):** the relay's 20-min
  per-provider default killed FORGET-REPO-1's builder mid-implementation (605 partial lines, no
  build report). Launch code slices on repo-graph with `--timeout 60`; on a timeout, keep the partial
  tree, add a RESUME NOTE to `selection.md` (build ON the diff, write build-N.md incrementally), and
  re-run `--slice <ID>` (the relay unblocks and retries at the next cycle).
- **Incremental build reports have ONE home (operator lesson 2026-09-04, three strays):** the relay
  stores only the builder's FINAL message as `build-<n>.md` (relay-target.ts `runBuild`), so a
  provider timeout erases all executed-gate evidence unless the builder wrote progress somewhere.
  Builders told "report incrementally" without a path chose `docs/slices/*-build-N.md` — a
  tracked, out-of-scope edit the reviewer must reject. The path is
  `<target>/.agent-manager/slices/<ID>/build-progress.md` (now in `builder-target.md` and every
  packet); on a timeout, READ it before writing the RESUME NOTE.
- **Codex CLI is the Homebrew cask, upgraded 0.144.1 → 0.153.2 (human directive 2026-09-04):** the
  recurring `models_cache.json` corruption ("missing field `base_instructions`", 4× — codex
  self-quarantines to `.corrupt-<date>`) was the OLD client failing to parse the newer models
  schema; gone on 0.153.2 (verified: relay flag shape `exec --model … -c model_reasoning_effort=…
  -c developer_instructions=… --sandbox read-only -C <dir> -` runs, zero ERROR lines). Upgrade path
  `brew upgrade --cask codex`; verify with the same minimal real `exec` smoke BEFORE a relay reaches
  its review phase. Reviewer MODEL stays `gpt-5.6-terra` (human's knob).
- **The codex reviewer at high effort needs ~2h on a 10-file Rust diff (measured 2026-09-04):**
  two HONESTY-GATE-1 review runs were killed at 60 and 90 min while AT THE VERDICT STEP — a
  linear 36-read review (no loop, no incident; distinguish by exec count + zero
  `Reconnecting` lines + last commands being `git diff --check`/build-report reads). Launch
  code slices with `--timeout 120`. When a kill lands at the verdict step on a diff an earlier
  review already judged code-sound and the only pending items are operator rulings, close out
  operator-side (write `review-<n>.json` naming who approved and why). Reviewer EFFORT is the
  human's knob (not the operator's) — surface it if the 2h pace becomes the bottleneck.
- **Sweep `/private/tmp` after every slice and watch `rust/target` (operator lesson 2026-09-05, disk
  at 37 GB free):** builders leave 2–5 GB isolated roots per slice (hg1/hg2/cppfid2/mi2… = 30 GB in a
  day) and `rust/target` regrew from 21 GB to 74 GB in eight slices (debug 51 GB). After each
  commit: `du -sh /private/tmp/* | sort -rh | head` and remove that slice's roots; keep only the
  retained audit root that packets reference. At the release cut, `clean-build.sh` runs — then warm
  the cache ONCE (gate script) before the next relay. Check `df -g /` in every status.
- **Warm the debug build cache after a release cut (operator lesson 2026-09-04, two hours lost):**
  `cut_release_minor.sh` cleans `rust/target/` ("next build will be slower"); the next relay
  builder's cold `cargo test --workspace` then eats the whole 60-min timeout — twice in a row
  on HONESTY-GATE-1, with the code fix already complete. After any release cut, run
  `cargo build --workspace --tests` (debug) in its own background call BEFORE launching a
  relay, or run the operator gate script once (it compiles the same targets). When a builder
  times out with a complete fix and only gates pending, run `/tmp/ch1-gates.sh` yourself,
  write `build-<n>.md` from its `build-progress.md` + the gate verdict, set phase
  `review-impl`, and relaunch — do not buy another cold hour.
- **A record script's git step must be CONDITIONAL on the script succeeding (operator lesson
  2026-09-05, third slip):** `python3 - <<EOF … EOF` followed by `git add … && git commit` on a
  NEW line commits whatever the script wrote before its first failed assert — half-applied
  records with a message claiming the whole. Put the commit inside the script, or chain the
  heredoc's exit into the git step with `&&` on the same logical line, and print an explicit
  "all edits applied" line the commit message can be trusted against.
- **Scripted record edits assert their anchor (operator lesson 2026-09-04, two silent no-ops):**
  a `str.replace(anchor, …)` with no `assert anchor in text` silently does nothing when the
  anchor drifted, and the commit message then claims a record that was never written (ROADMAP:
  HONESTY-GATE-1 shipped + JAVA-RESOLVER-IDENTITY-1 both missing until b5cacbb). Always
  `assert anchor in s` (or grep-verify after) before committing a record edit.
- **A retention pass that never finishes is a store that must be REBUILT, not waited on (production
  incident 2026-09-04):** repo-graph's store hit 4.8 GB / 29 snapshots because every daemon restart
  killed the multi-hour prune (15 FK child tables unindexed on `snapshot_uid`, 2 MB page cache) and it
  restarted from zero; after 5h it had committed NOTHING. Recovery (human-ratified): `launchctl
  bootout` → `bootstrap` → `rmap repo remove <path>` (retry every 3 s until the startup readers
  release the coordinator — it refuses with "being read right now") → `rmap index` (blocks; run it
  in a background call — macOS has no `timeout`). Watch `rmap doctor` before `repo remove`: if a
  detached index is already persisting into the old store, bootout again first. The fix is
  DAEMON-RESIDUALS-1 (a)+(b) + the prevention set (snapshot cap, prune-on-commit, time budget →
  rebuild, cache sizing, doctor visibility, benchmark gate).
- **A builder timeout with a CLEAN tree means "look in `git stash list`" (bitten 2026-09-05):**
  SEED-CHUNK-2's entire 15-file implementation was in `stash@{0}` (the builder stashed to build a
  before-baseline; the timeout hit first). Before writing a RESUME NOTE on a clean tree: `git
  stash list` → if a `<slice>-wip…` stash exists, `git stash pop` it on the same HEAD and verify the
  file count. The builder prompt now forbids stashing (baselines via `git worktree`).
- **Live proofs are scoped to the SMALLEST corpus that demonstrates the contract (operator lesson
  2026-09-05, two 120-min kills on SEED-CHUNK-2):** a before/after proof that rebuilds a large
  repo twice (two full indexes + embedding passes) eats the whole builder budget with the code
  already fixed and the gates unrecorded. Packets name the proof corpus (leveldb, a fixture, the
  retained seeded root served read-only) and order the round: gates recorded FIRST, then the
  small proof, then hand-off. A "before" binary comes from `git worktree` and is built once.
- **Gate exit codes are sacred (operator lesson 2026-07-31):** NEVER pipe a gate command's exit
  away (`gradlew test | tail` reports tail's exit, not the gate's) — run the gate bare, check
  `$?` explicitly, and never commit in the same chain as an unverified gate. Bitten: a red
  Gradle run (colima socket switch) was committed as green; code happened to be sound, process
  was not. Also: the Docker runtime is COLIMA — `~/.testcontainers.properties` pins
  `docker.host` to colima's socket; if Testcontainers fails with DockerClientProviderStrategy,
  check `docker context ls` before blaming code.
