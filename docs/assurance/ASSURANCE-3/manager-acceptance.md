# ASSURANCE-3 — manager acceptance and handoff

Status: ACCEPTED bounded runtime increment, 2026-09-13. Maturity: PROTOTYPE.
Operator: in-place-manager. Authority: standing rollout approval plus the human's
explicit instruction to apply the four-reference correction, finish Stage 3,
commit and push. This is manual bootstrap acceptance under slice section 12,
not a runtime-produced Stage-4 acceptance, whole-overhaul completion, certification,
release or deployment.

## Accepted outcome

The [slice](../../slices/assurance-3-evidence-linked-review.md) contributes 13 Ls
and protects eight P obligations. It binds a reviewed allocation, mandatory check
plan, actual candidate, builder outcomes and separate reviewer assessments. An
unrelated green test, missing assessment, failed preservation check, changed
candidate or unjustified path cannot be replaced by positive verdict prose.
Parent H requirements are context, not automatically completed by this increment.

[Verification](verification.json) identifies the seven exact implementation files,
their Git diff digest, each file's purpose/allocated IDs and deterministic hunk
inventory. Core validation stays pure. Application orchestration uses existing
boundaries; the CLI supplies Git/index/working-tree facts and exclusive writes.
The reviewer sees staged and unstaged changes separately, plus in-scope untracked
bytes. The tool records check outcomes and agent judgments; it does not prove
that an agent's semantic judgment is correct.

This serves VISION's purpose: remove the human from transporting evidence, without
moving product or architecture authority into software.

## Reviews and executed verification

Sol built and Terra reviewed through separate Codex CLI invocations, both high
effort. This is same-provider independence, not cross-vendor independence.
[Review 4](review-4.json) approved the exact implementation. Earlier review outputs
0–3 remain beside it; [actual run provenance](run-provenance.json) preserves actor,
timing and delivered-input identities without copying source input bodies.
All five completed build/review pairs have identical recorded common inputs.

The manager independently executed every prescribed command filter on an exact
clean source copy, including all 168 Jest tests, a fresh build and built-CLI gate,
typecheck and primary diff check. Before closeout, the manager ran build,
typecheck and all 168 tests again in the primary checkout; all passed. Candidate
hashes remained identical. [Retained command-output excerpts](validation-output.txt)
and verification.json distinguish each execution and its original local log.
The manager also inspected the production diff, its existing dependency directions,
scope and test oracles (A3-C09), including the live CLI's staged/working/untracked
representation and the actual allocation rather than fixture names alone.

The [four-link input correction](input-correction.md) fixes an inconsistency the
earlier document review missed. The actual corrected allocation passes the unchanged
parser, retaining every required check and oracle. [Terra's separate delta review](correction-review.md)
approved that correction and historical-input handling; [run identity](correction-review-run.json)
records its explicit SYSTEM.txt and reviewer model. The old input baseline/review
is historical, not overwritten or reusable against the amended file. No new
runtime baseline admission or provider dispatch under stale inputs is claimed.

## Bootstrap and recovery provenance

This own-repo change ran under the accepted Stage-2 predecessor at
766d4767582394183387c7fb154fe15889edb847, plus a separately reviewed two-file CLI
correction. That correction moved commonPromptPaths from unused adapter config
to the actual relay input and tested live v2 persist/resume. Sol authored it,
[Terra approved it](predecessor-correction-review.json), and the manager passed
139 tests/build/typecheck on the isolated corrected runner before adoption.
Its exact source/runner identities are retained in run-provenance.json. The
correction is now integrated, not retrospectively attributed to Stage-2's original
acceptance. Operational recovery preserved prompt bytes, authority and partial work.

An earlier CLI-test attempt reached an installed provider through inherited host
environment. The manager stopped the identified run family and retained local
incident evidence; it did not discard the implementation. The accepted test helper
uses isolated provider homes, an owned PATH containing only the pre-resolved Git
executable and explicit fixture provider, bounded output/time and owned-process
cleanup. The final automated checks use fake providers, not live accounts.

The new Stage-3 gate itself was exercised at pure/public-use-case and freshly built
CLI boundaries with isolated positive/sabotage fixtures. Those records are not
copied here as if the predecessor generated Stage-3 evidence for its own source.
This manager verification is deliberately labelled manual bootstrap evidence.

## Earned structure and limitations

The [builder report](build-final.md#abstraction-accounting) accounts for allocation,
outcome sums, candidate/checkpoint tracking, publication seams and role-output
contracts: concrete consumers, required variation and rejected simpler alternatives.
Test process-isolation helper — users: existing Stage-2 and new Stage-3 built-CLI
tests; variation: installed host providers versus explicit fake providers; rejected
inherited PATH/HOME because it allowed a test to reach an operator-owned account.
No package, module, dependency, registry or architectural relocation was added.

Known limits are explicit: record integrity is not semantic proof; reviewer prompt
tests verify instructions, not model obedience; publication is two ordered exclusive
writes, not a transaction; full typed recovery/final acceptance are not delivered.
The extra lint command cannot run because ESLint is not installed; it was not a
mandatory slice gate, and no dependency was added. Legacy --supervisor still names
selection/review, not the persistent manager. Transitional done still means the
review activity ended, not operator acceptance. Both naming mismatches remain
visible rather than silently changing persisted/CLI contracts.

## Next manager session

Stages 0–3 are accepted; [ROADMAP](../../ROADMAP.md) is the current navigation.
CLAUDE.md and ROADMAP receive closeout status/navigation updates, not new runtime
rules. Original inputs remain recoverable at their recorded Git revision; H wording
is unchanged. These acceptance records supersede progress labels, not requirement semantics.
Future work needs its own current reviewed baseline. Do not resume ASSURANCE-3
against its historical INPUT-1 or treat local done as reusable final authority.

**Stage 4/5 remain on hold for the human's proportionality/context discussion.**
The proposed Stage 4 adds durable final acceptance and cause-aware recovery; Stage 5
adds eligibility/reverse trace and the complete manager-led dogfood/usefulness gate.
Neither is authorized to start automatically by this closeout.

Latest human direction: agents assess human decisions; software checks integrity.
Investigate and explain recoverable interruptions instead of ritual stopping.
Architecture preservation is a standing project-aware requirement and reviewer duty,
not a new architecture-policing subsystem. Retain outputs/decisions and references
to versioned inputs; do not gratuitously duplicate input documents. Context is a
limited working set: the current full-document delivery contract is not silently
trimmed here. Inspect its measured duplication before specifying further machinery.
