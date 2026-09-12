# ASSURANCE-1 — manager checkpoint, 2026-09-12

Status: NOT ACCEPTED; dependent work paused for human decision. No provider process matched the checked relay/provider process list at this checkpoint. All implementation changes are preserved and uncommitted.

## Evidence and correction

Four Terra revise rounds are recorded locally. The last concerns independent diagnostic harvesting when unrelated duplicate JSON keys exist. Manager reproduced the mechanism in the freshly built pure parser: one unknown field plus duplicate requirement paths reports both errors; duplicate unrelated JSON fields plus duplicate paths reports only duplicate-field. Both parser outcomes are failures. [Exact probe](manager-diagnostic-probe.json). This is diagnostic completeness, not observed invalid-input admission.

The previous review's ordinary-unknown-field failure claim was incorrect: checkClosed returns false only for non-object values; unknown fields append errors and return true. The builder reported a pre-correction passing regression. The manager's previous update repeated the reviewer premise without this behavioral check; it is corrected here. The private helper's name obscures its actual contract and needs an honest local name under either decision.

## Decision: diagnostic scope

DECISION_REQUIRED:
- ID: D-A1-DIAGNOSTICS
  QUESTION: Retain full independently discoverable diagnostics after duplicate-key JSON, or explicitly bound diagnostic continuation at that ambiguity?
  OPTIONS:
  - Retain the approved all-independently-discoverable-errors contract: recover only unambiguous diagnostic identities while keeping semantic admission rejected. Reward: fuller per-pass repair guidance. Risk/cost: more diagnostic recovery logic and verification for ambiguous records; four rounds demonstrate coordination cost.
  - Refine the contract so malformed or duplicate-key JSON is rejected and stops deeper diagnostics for that record; retain aggregate diagnostics for unambiguously parsed records. Reward: a simpler rejection rule and smaller parser trust surface. Risk/cost: users may need another validation pass after repairing JSON, and the approved contract plus affected tests/baseline require explicit change and review.
  RECOMMENDED: Bound diagnostic continuation at malformed/duplicate-key JSON, while preserving fail-closed admission. This is a proposed requirements change, NOT an instruction to implement it.
  BLOCKING_REASON: The strict approved contract remains in force; only human authorization may change this observable guarantee. Repeated revision plus the incorrectly diagnosed prior case warrants a manager checkpoint rather than silent acceptance or automatic retry.

No model switch is authorized. Sol/terra assignments remain; model escalation is an available separate human decision if strict recovery is retained and continued strain warrants it. No new abstraction or runtime edit was introduced by this manager checkpoint.

## Resolution

The human approved the recommended narrower boundary on 2026-09-12. [Ratification](diagnostics-ratification.md) governs the next document/code increments; the options above are historical, not pending.

The ratified amendment is independently reviewed and [manager-accepted](../ASSURANCE-1-DIAGNOSTICS/manager-acceptance.md). INPUT-2 replaces INPUT-1 for subsequent implementation; code acceptance remains pending.
