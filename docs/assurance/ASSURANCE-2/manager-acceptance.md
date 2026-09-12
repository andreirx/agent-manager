# ASSURANCE-2 — manager acceptance

Status: ACCEPTED runtime increment and required system demonstration, 2026-09-12.
Maturity: PROTOTYPE. Operator: in-place-manager under the
[human rollout authority](../ASSURANCE-0/human-authorization.md).
This is not final acceptance of the whole overhaul, certification, or release.

## Accepted scope and evidence

The [approved packet](../../slices/assurance-2-reviewed-inputs.md) allocates 16
stage-2 L contributions and 12 preservation obligations. Its versioned input is
ASSURANCE-2-INPUT-1. The exact 14-file runtime candidate, per-file obligation/purpose
mapping, all 133 starting tracked identities, verification outcomes, and returned
four-file successor chain are in [verification](verification.json).

[Terra implementation review 3](review-3.json) approved the code for the required
isolated demonstration. The reviewer explicitly relied on builder test reports;
the manager separately ran typecheck, all 138 Jest tests, and build in BOTH a clean
source copy (no local operational state) and the primary checkout. All passed.
Subsequent hash comparisons establish that those tested runtime bytes did not
change during document authoring or return. Final diff whitespace inspection
passed. Tests exercise A2-C01–C08 and legacy/stage-1 preservation; A2-C09 is the
real system demonstration below. The current test inventory is deterministically
enumerated by Jest, not inferred from semantic search.

The implementation was built through the accepted 47e647c runner, not its mutable
output. Four implementation review cycles retained their own outcomes. Corrections
closed legacy packet opt-in leakage, duplicate live reads between validation and
request capture, and document preflight incorrectly requiring an output before
its author could create it. [Run provenance](run-provenance.json) preserves actual
actors, prompts and completed invocations. Predecessor v1 logs are not retroactively
claimed to contain v2 delivery receipts.

## A2-C09 — delivered capability used on real successor work

A fresh build of the exact reviewed candidate in the isolated copy authored and
reviewed the real ASSURANCE-3 design and v2 manifest. Five Sol/Terra document cycles
resolved candidate-base separation, staged-versus-working identities, two-file
publication limits, and empty-candidate/preservation semantics. Manager intervention
challenged the proposed minimum-diff rule: changing a file is neither necessary nor
sufficient evidence of useful behavior. The accepted design instead admits explicit
preservation work and requires substantive obligation/check review.

The runtime-published [requirements review](../ASSURANCE-3-INPUT-1/requirements-review.json)
accepts exactly all 17 submitted IDs with no findings/decisions, binds the actual
separate Sol/Terra invocations, and records equal common delivered inputs and
intentional role-specific differences. Both use Codex/high; this is same-provider,
not cross-vendor independence. Adapter receipt identities describe bytes supplied,
not proof that a model obeyed them. Claude/Copilot were exercised at their actual
composition seams in parameterized tests, not live provider sessions.

The manager separately invoked the new target-aware approval-only CLI and produced
[baseline approval](../ASSURANCE-3-INPUT-1/baseline-approval.json), with the existing
seven decision references and explicit operator identity. That operation dispatched
no agent and performed no commit. The four outputs were copied byte-identically
back to this target. Actual built `admitBaseline` then accepted the returned chain
as `reviewed-inputs`. Raw local run history was retained separately; the tracked
review/approval chain does not depend on local logs to reconstruct its claim.

## Architecture, naming, and bounded limitations

Core policy remains pure; application coordinates admission and role capture;
three adapters deliver raw bytes through their existing mechanisms; CLI composes
concrete dependencies. No package, module, dependency, registry, provider or phase
was added. The packet lists the earned structures and rejected simpler alternatives.
Additional shared byte framing: `frameReviewedInputs`; current users: Claude,
Codex and Copilot delivery; variation: provider channels sharing one frame grammar;
rejected three copies of nontrivial length/UTF-8 framing logic.
Per-role rooted capture cache: admission, DTO preparation and dry-run; boundary:
one observed byte set per role attempt versus refreshed inputs at the next role;
rejected separate reads because validation could certify bytes other than delivery.
Pending reviewer-delivery sum: document preflight and CLI output; variation:
absent authored subject versus validated existing subject; rejected fabricated
future request bytes and nullable state combinations.

Existing naming/documentation debt is surfaced, not silently renamed:
`--supervisor` selects/reviews and is not the persistent manager; `TargetRunRecord`
is local operational provenance, not durable authority. The core assurance module's
old stage-1-only header now understates its v1/v2 policy; correcting that description
is deferred to the next authorized edit rather than changing the reviewed bytes.

The accepted successor baseline hashes ROADMAP/CLAUDE and other context. Their
pre-acceptance status wording remains a historical input snapshot; this exact-revision
acceptance and the successor approval establish current status. Do not silently
update a frozen progress document and invalidate the new baseline.

## Next increment

ASSURANCE-3 design/baseline are approved, not implemented. Start its implementation
only after this predecessor and evidence are operator-committed, using a fresh
accepted stage-2 runner and a clean target at that revision. It delivers allocation,
candidate/evidence binding and substantive implementation review. Final acceptance/
recovery and full trace/readiness remain ASSURANCE-4/5. No installation, deployment,
global defaults, adjacent project migration, or automatic commit was performed.
