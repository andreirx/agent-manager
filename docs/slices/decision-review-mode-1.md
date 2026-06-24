# DECISION-REVIEW-MODE-1 — two-agent adversarial decision review before human ratification

**Maturity: PROTOTYPE** (the mode is ratified; the phase contract will sharpen with use)
**Status: SPEC** (ratified by operator 2026-06-24; IMPL follows)
**Track: agent-manager self-hosting** — agent-manager builds a capability for its own relay.

## Why (the demonstrated need, not imagined)

The relay's `review-impl` phase reviews the **artifact** (is the doc/code well-formed, honest,
in-scope → approved/revise/escalate). It does **not** review the **decisions** a spec surfaces —
the load-bearing engineering bets in a `DECISION_REQUIRED` matrix. So a spec's *recommendations*
reach the human carrying only **one** model's opinion (the builder's), unchallenged.

**Demonstrated failure (2026-06-23, DAEMON-CONCURRENCY-1).** The relay `review-impl` **approved**
that spec — correctly, as a document. But its headline recommendation (D-W = "serve last-good
during refresh") had a real **cross-store split-brain** defect (SQLite snapshot + in-memory
LiveGraph swap independently, no per-request epoch). It was caught only by a **manually-run**
adversarial pass: the reviewer (Codex) challenged the recommendations against source → the builder
(Claude) rebutted/conceded → they converged on a corrected slate (W-B withdrawn). Without that
pass, the operator would have ratified a split-brain into the daemon's foundation. This is the
"merrily wrong together" failure mode: one model proposes, nobody contests, the human ratifies a
single opinion dressed as consensus.

Concrete current callers (≥2, the earned-abstraction bar): **every** spec slice that surfaces
operator-ratification-class `DECISION_REQUIRED` items — MODULE-MODEL-1 (D1–D6), DAEMON-CONCURRENCY-1
(D-C…D-E), and the queued ENRICH-LIFECYCLE-1 / STATS-HONESTY-1 / PROTOCOL-HELP-TRUTH-1. Ratified
near-term requirement: the operator ratified the mode 2026-06-24.

## What (the mode)

A new relay capability: when a SPEC slice surfaces operator-ratification-class decisions, BOTH
roles opine on the **decisions** (not the artifact) before the human sees them, as a **debate**:

1. **Builder recommends** — already happens (the spec's `DECISION_REQUIRED` matrices carry the
   builder's recommended cells).
2. **Reviewer challenges** — the reviewer (Codex) is run in an *adversarial decision-review*
   posture: default to skepticism, verify each recommendation against source, AGREE or CHALLENGE
   per decision with cites. (Distinct from `review-impl`, which checks the artifact.)
3. **Builder rebuts** — the builder responds to each challenge: CONCEDE (with the corrected
   recommendation) or REBUT (with source). Honest convergence, not ego defense.
4. **Manager packages for the human** — a ratification packet: each decision × {builder rec,
   reviewer challenge, builder rebuttal} sorted into **converged** (both agree → human ratifies
   trivially) and **contested** (they disagree → human adjudicates, both arguments present).

The human spends judgment only where the two agents genuinely diverge; the agreed cells are
de-risked, and the contested/withdrawn ones come with the reasoning.

## Design (smallest that satisfies the ratified behavior)

Reuse, do not reinvent: the builder/reviewer **provider adapters**, the **run-record** traceability,
the **prompt system**, and the existing phase machinery all already exist. The new surface is small.

- **New phase `decision-review`** in the target relay state machine, entered after `review-impl`
  *approves* a slice **iff** the artifact (the spec) carries operator-ratification-class
  `DECISION_REQUIRED` markers. (If none, skip it — most IMPL slices have no such decisions.)
- **Two new role-postures** (prompt templates, not new adapters): `reviewer` in adversarial-
  decision-challenge mode; `builder` in rebuttal mode. Both read the target repo (read-only is
  sufficient — they reason + cite, they do not edit).
- **One new artifact:** `ratification-packet.md` (per decision: rec / challenge / rebuttal /
  status=converged|contested) written to the slice dir, plus the two raw role outputs as run
  records (the audit trail; files are the system of record).
- **New terminal-ish phase `awaiting-ratification`** distinct from `done` — the relay halts here
  for the human; it does NOT auto-proceed to IMPL. (The human gate is the whole point.)

### Decisions to surface (DECISION_REQUIRED — operator ratifies the agent-manager design)
- ID: DR-TRIGGER — How is "operator-ratification-class DECISION_REQUIRED" detected? Options:
  (a) a marker convention the spec must emit (e.g. a `DECISION_REQUIRED:` block, as the briefs
  already use); (b) the supervisor flags it during `review-impl`; (c) always run on SPEC-type
  slices, never on IMPL. RECOMMENDED: (a) marker convention — explicit, greppable, already in use.
- ID: DR-PHASE-SHAPE — A distinct `decision-review` phase (RECOMMENDED) vs folding challenge+rebuttal
  into an extended `review-impl`. RECOMMENDED: distinct phase — keeps artifact-review and
  decision-review verdicts unconflated.
- ID: DR-ROUNDS — Fixed one round (challenge → rebut) (RECOMMENDED) vs iterate until convergence.
  RECOMMENDED: one round; if still contested, surface BOTH positions to the human (contested is a
  valid, useful output — the human decides). Avoids unbounded agent loops.
- ID: DR-SCOPE — Target-relay only (RECOMMENDED first) vs also the self-host relay. RECOMMENDED:
  target relay first (where the spec slices run); self-host later if earned.

## Smallest-design statement & abstraction ledger

- **New phase `decision-review` + `awaiting-ratification`.** Current users: every
  ratification-class SPEC slice (MODULE-MODEL-1, DAEMON-CONCURRENCY-1, the queued specs). Axis of
  variation: decisions needing two-agent adversarial vetting before human ratification. Rejected
  simpler: manager-improvised manual `codex exec`/`claude exec` (what produced DAEMON-CONCURRENCY-1's
  review) — works once, but is untracked, inconsistent, and drifts (no run records, easy to skip).
- **REJECTED: a general N-agent "panel" framework.** Imagined variation — we have exactly two roles
  and one use. Build the 2-role debate; do not build a pluggable panel until a third panelist or a
  second use is demonstrated.
- New role-postures are PROMPTS, not new adapters/crates — no new module boundary beyond the phase.

## Validation (self-hosting: support module + the feature using it)

- Unit: the trigger detector (marker present → enter decision-review; absent → skip).
- Integration: a SPEC slice with a `DECISION_REQUIRED` block runs challenge → rebuttal → emits a
  `ratification-packet.md` with converged/contested classification; halts at `awaiting-ratification`,
  does NOT auto-proceed.
- Dogfood: re-run the mode on a real queued spec (e.g. ENRICH-LIFECYCLE-1's decisions) and confirm
  the packet matches what the manual 2026-06-23 run produced by hand.

## Out of scope
- The self-host relay variant (target relay first).
- Auto-adjudication of contested decisions (the human decides — never the machine).
- More than two roles / a panel framework.
