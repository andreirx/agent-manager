# Agent Manager roadmap

Status: APPROVED requirements-assurance track; implementation pending. Date: 2026-09-11.
Maturity: PROTOTYPE planning artifact. This is not a historical completion ledger.

## Current priority

Review the [requirements catalog](requirements/README.md), [process](PROCESS.md),
[manager playbook](MANAGER.md), and [rollout design](slices/requirements-assurance-rollout.md).
The human approved the drafts and recommended decisions and authorized implementation:
[authorization](assurance/ASSURANCE-0/human-authorization.md). ASSURANCE-0 is READY for
document refinement and independent review. Dependent code remains gated on its result;
no runtime assurance gate is claimed implemented.

## Proposed order

All detailed packets/checks/allocations are in the linked rollout sections. Before
execution, create the actual bounded slice document with its approved scope and
baseline; do not point every execution at an unreviewed umbrella plan.

| Work item | Deliverable and visible result | Prerequisite | State |
|---|---|---|---|
| [ASSURANCE-0](slices/requirements-assurance-rollout.md#assurance-0--review-the-process-and-baseline-documents-only) | Independent review, resolved format/authority decisions, accepted input baseline | Human authorization to run review; provider readiness | Accepted; four document cycles; [record](assurance/ASSURANCE-0/manager-acceptance.md) |
| [ASSURANCE-1](slices/requirements-assurance-rollout.md#assurance-1--baseline-admission-on-the-real-dispatch-path) | Real pre-dispatch refusal/allow result for a baseline | Accepted ASSURANCE-0 | Ready for bounded self-build |
| [ASSURANCE-2](slices/requirements-assurance-rollout.md#assurance-2--reviewed-inputs-and-identical-role-context) | Requirements review coverage and identical recorded role inputs | Accepted ASSURANCE-1 runner | Blocked on prerequisite |
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
