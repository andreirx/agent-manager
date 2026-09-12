# A1-LEGACY-POINTER-BEHAVIOR — conscious recovery

Status: RATIFIED, 2026-09-12. Recorded by the in-place manager.

## Source and problem

The human accepted stopping on broken active state with this qualification:
“we do recovery ‘manually’ or should I say consciously and with explaining to the user”;
the agent should investigate whether recovery is straightforward rather than stop
ceremonially, and the builder can normally continue its preserved work.

Terra's ASSURANCE-1 review-4 found a contradiction between P-A1-01's unchanged
legacy routing and contract §7 / slice §3's unconditional refusal of a dangling
active pointer. Manager source comparison confirmed that the predecessor fell
through to fresh selection when the referenced status was missing. This decision
resolves that contradiction; it is not an approval of the implementation.

## Decision and limits

1. Implicit dispatch shall stop on malformed active current state, or a current
   pointer to missing/malformed slice status, including legacy mode. It must not
   silently select different work or infer that lost assurance state means legacy.
   This is the explicit, narrow exception to P-A1-01. Valid legacy routing remains
   unchanged. Loss of both local records remains outside stage-1 runtime recovery.
2. A dispatch stop is not an automatic human-decision blocker. The manager shall
   first inspect available status, progress, logs, actual worktree, owned processes,
   and approved inputs. If these establish a safe continuation within existing
   authority, explain the cause and recovery action briefly, record the evidence
   in the existing handoff, and resume without requesting another approval.
3. Preserve partial work; let the builder inspect and continue the existing diff.
   Restore only operational state supported by evidence. Do not infer acceptance
   from partial code or green tests, manufacture review/approval, alter approved
   inputs, discard work, erase assurance, or overlap writers. Revalidate the
   selected baseline before dispatch. A retry is not a new requirements cycle.
4. Ask the human only when investigation leaves a consequential ambiguity, missing
   authority, an input/requirement change, or a recovery action risking loss of work.
   Explain what was inspected and why existing authority cannot settle the choice.
   A stopped process or corrupt pointer alone is not such a decision.
5. This is existing manager/builder operating practice made explicit. Stage 1 gains
   no automatic repair engine, phase taxonomy, journal, recovery command, or new
   module. Typed runtime recovery remains in its later allocated slice.

The reward is continuing useful work without making the human relay routine
recovery instructions. The accepted risk is a deliberate change to legacy
corruption handling; investigation replaces silent fresh selection. Recovery
remains bounded by the evidence and authority, not by optimism about agent ability.

## Trace and adoption

Clarifies AM-REQ-009-L04/L05/L06 and AM-REQ-006-L06; amends stage-1 P-A1-01 and its
affected resume checks. Existing H/L text already requires evidence-based safe
steering and explicit recovery, so no H/L record is changed. The manager playbook,
role prompt, process, and generic SYSTEM instruction shall agree on this boundary.

Sol authors the bounded document delta; Terra reviews that delta, not the entire
unchanged requirements catalog. The manager publishes a new ASSURANCE-1-INPUT-3
chain after review, preserving INPUT-1 and INPUT-2 and their historical evidence.
Dependent code resumes only against that new chain. This is manual bootstrap,
not a claim that a future gate already enforces the process.
