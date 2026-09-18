# Agent Manager roadmap

Status: ASSURANCE-0–3 ACCEPTED; ASSURANCE-4/5 HELD. Updated: 2026-09-18.
Maturity: PROTOTYPE planning artifact. This is not a historical completion ledger.

## Current priority

### Human-authorized corrective increments (2026-09-17)

These precede, and do not reopen, the held ASSURANCE-4/5 rollout. Both bounded
requirements/designs have independent Terra review under the current human request;
implementation acceptance is recorded separately, not implied by this table.

| Work item | Outcome | Current position |
|---|---|---|
| [SLICE-PROVIDER-SESSIONS-1](slices/slice-provider-sessions-1.md) | Separate builder/reviewer native conversations within one slice; unfinished older slices keep their work when IDs are absent | Accepted; 183 tests and actual Codex/Claude continuation; [manager acceptance](assurance/SLICE-PROVIDER-SESSIONS-1/manager-acceptance.md) |
| [MANAGER-MESSAGE-INTERPRETATION-1](slices/manager-message-interpretation-1.md) | Manager interprets retained output; runtime constructs records and resumes the exact pending step | Accepted; 209 tests, same-session corrective review, and real retained-prose application; [manager acceptance](assurance/MANAGER-MESSAGE-INTERPRETATION-1/manager-acceptance.md) |

No cache measurement infrastructure or interpreter service is part of either item.

### Accepted overhaul position

ASSURANCE-1 [baseline admission](assurance/ASSURANCE-1/manager-acceptance.md),
ASSURANCE-2 [reviewed input delivery](assurance/ASSURANCE-2/manager-acceptance.md),
and ASSURANCE-3 [evidence-linked implementation review](assurance/ASSURANCE-3/manager-acceptance.md)
are accepted bounded runtime increments. Stage 3 has separate Sol/Terra review
and 168 passing tests in both a clean source copy and the primary checkout.
Final acceptance remains manager-recorded bootstrap authority, not a delivered
Stage-4 runtime gate. Historical inputs remain identifiable and are not silently
updated to cover new bytes.

Before Stage 4, discuss proportionality and context pressure with the human.
Human ruling 2026-09-13 (from the first assured run on repo-graph, TD-020): agent-to-agent
messages are not schema-policed — an off-shape provider result is not an error; the runtime
reads it leniently and builds the well-formed durable record itself; integrity checks apply
to durable records and the input closure, not to the hand-off between two agents. This is
input to the Stage-4 proportionality discussion and a change to the stage-2/3 result
handling; the bounded manager-interpretation path is now implemented by MANAGER-MESSAGE-INTERPRETATION-1 above. It is not an automatic semantic interpreter or the held Stage-4 acceptance system.
Human decisions 2026-09-14 after the first assured repo-graph slice (TRUST-MODULE-EDGES-1, 4 admissions / 5 baselines /
14 document cycles / 7 implementation cycles for a fix that never failed a check): (1) ef3e1c9 provider-result framing
RATIFIED as made. (2) Corrections: option B — recorded oracle correction, text-only, operator-approved, closeout-reviewed,
logged, no re-baseline/re-admission; procedure in docs/MANAGER.md; the runtime part is the human's, in a separate session (TD-022). (3) Questions to the human
are self-contained (manager instruction updated). These are the Stage-4 proportionality inputs; Stage 4/5 remain held
until the human opens that discussion.
Agents assess human decisions; software checks record integrity. Architecture
preservation is a project requirement/reviewer duty, not a new policing subsystem.
Do not automatically advance the remaining original scope.

## Proposed order

All detailed packets/checks/allocations are in the linked rollout sections. Before
execution, create the actual bounded slice document with its approved scope and
baseline; do not point every execution at an unreviewed umbrella plan.

| Work item | Deliverable and visible result | Prerequisite | State |
|---|---|---|---|
| [ASSURANCE-0](slices/requirements-assurance-rollout.md#assurance-0--review-the-process-and-baseline-documents-only) | Independent review, resolved format/authority decisions, accepted input baseline | Human authorization to run review; provider readiness | Accepted; four document cycles; [record](assurance/ASSURANCE-0/manager-acceptance.md) |
| [ASSURANCE-1](slices/requirements-assurance-rollout.md#assurance-1--baseline-admission-on-the-real-dispatch-path) | Real pre-dispatch refusal/allow result for a baseline | Accepted ASSURANCE-0 | Accepted; [operator record](assurance/ASSURANCE-1/manager-acceptance.md), INPUT-3, 82 tests in clean copy and working checkout |
| [ASSURANCE-2](slices/requirements-assurance-rollout.md#assurance-2--reviewed-inputs-and-identical-role-context) | Requirements review coverage and identical recorded role inputs | Accepted ASSURANCE-1 runner | Accepted; [record](assurance/ASSURANCE-2/manager-acceptance.md), 138 tests and real successor-document review; later CLI correction recorded in Stage 3 |
| [ASSURANCE-3](slices/requirements-assurance-rollout.md#assurance-3--evidence-linked-implementation-review) | Evidence/preservation gate rejects an unsupported green verdict | Accepted ASSURANCE-2 runner | Accepted; [record](assurance/ASSURANCE-3/manager-acceptance.md), 168 tests, approved four-link input amendment and separate bootstrap acceptance |
| [ASSURANCE-4](slices/requirements-assurance-rollout.md#assurance-4--controlled-acceptance-and-recovery) | Durable operator acceptance and cause-aware resume | Accepted ASSURANCE-3 runner | Held for human proportionality/context checkpoint; no implementation dispatched |
| [ASSURANCE-5](slices/requirements-assurance-rollout.md#assurance-5--manager-led-trace-readiness-and-complete-dogfood) | Manager-led own-repo delivery, trace/readiness report, and independent usefulness gate | Accepted ASSURANCE-4 runner | Blocked on prerequisite |

## Trace and status rules

Requirement text lives only in its H file. Slice allocations live in the rollout
and later execution packets. Evidence/approval bind exact revisions, not this table.
A stage implements only its listed Ls; a parent H may remain partially delivered.
'Written', 'reviewed', 'implemented', 'verified', 'accepted', and 'released' are not
interchangeable states. Only accepted bounded increments above are implemented;
no whole-H completion, maturity promotion or full assured-run contract is claimed.

The existing relay workflows remain available under their current contract.
This track does not order work in other target repositories or migrate them silently.
