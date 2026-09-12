# Agent Manager roadmap

Status: APPROVED requirements-assurance track; implementation pending. Date: 2026-09-11.
Maturity: PROTOTYPE planning artifact. This is not a historical completion ledger.

## Current priority

ASSURANCE-1 is [accepted](assurance/ASSURANCE-1/manager-acceptance.md): real baseline
admission, persisted-mode revalidation, and isolated CLI checks are implemented.
Nine implementation cycles retained their verdicts; final independent review plus
manager clean-copy and working-tree gates passed (82 tests each). The deliberate
legacy-corruption exception includes conscious manager recovery, not automatic repair.
ASSURANCE-2 design is [accepted](assurance/ASSURANCE-2-PREP/manager-acceptance.md)
after two Sol/Terra document cycles and manager baseline probes. Implementation
uses the new ASSURANCE-2-INPUT-1 baseline under the accepted stage-1 guard.
Structured per-ID review, identical-context, evidence-completion, and final-acceptance
gates remain unimplemented until their respective runtime increments are accepted.

## Proposed order

All detailed packets/checks/allocations are in the linked rollout sections. Before
execution, create the actual bounded slice document with its approved scope and
baseline; do not point every execution at an unreviewed umbrella plan.

| Work item | Deliverable and visible result | Prerequisite | State |
|---|---|---|---|
| [ASSURANCE-0](slices/requirements-assurance-rollout.md#assurance-0--review-the-process-and-baseline-documents-only) | Independent review, resolved format/authority decisions, accepted input baseline | Human authorization to run review; provider readiness | Accepted; four document cycles; [record](assurance/ASSURANCE-0/manager-acceptance.md) |
| [ASSURANCE-1](slices/requirements-assurance-rollout.md#assurance-1--baseline-admission-on-the-real-dispatch-path) | Real pre-dispatch refusal/allow result for a baseline | Accepted ASSURANCE-0 | Accepted; [operator record](assurance/ASSURANCE-1/manager-acceptance.md), INPUT-3, 82 tests in clean copy and working checkout |
| [ASSURANCE-2](slices/requirements-assurance-rollout.md#assurance-2--reviewed-inputs-and-identical-role-context) | Requirements review coverage and identical recorded role inputs | Accepted ASSURANCE-1 runner | Design accepted; implementation authorized under INPUT-1; runtime verification pending |
| [ASSURANCE-3](slices/requirements-assurance-rollout.md#assurance-3--evidence-linked-implementation-review) | Evidence/preservation gate rejects an unsupported green verdict | Accepted ASSURANCE-2 runner | Blocked on prerequisite |
| [ASSURANCE-4](slices/requirements-assurance-rollout.md#assurance-4--controlled-acceptance-and-recovery) | Durable operator acceptance and cause-aware resume | Accepted ASSURANCE-3 runner | Blocked on prerequisite |
| [ASSURANCE-5](slices/requirements-assurance-rollout.md#assurance-5--manager-led-trace-readiness-and-complete-dogfood) | Manager-led own-repo delivery, trace/readiness report, and independent usefulness gate | Accepted ASSURANCE-4 runner | Blocked on prerequisite |

## Trace and status rules

Requirement text lives only in its H file. Slice allocations live in the rollout
and later execution packets. Evidence/approval bind exact revisions, not this table.
A stage implements only its listed Ls; a parent H may remain partially delivered.
'Written', 'reviewed', 'implemented', 'verified', 'accepted', and 'released' are not
interchangeable states. None of these increments is declared implemented here.

The existing relay workflows remain available under their current contract.
This track does not order work in other target repositories or migrate them silently.
