# ASSURANCE-1-RECOVERY — conscious recovery, not ceremonial escalation

Status: READY for bounded document authoring and independent delta review.
Maturity: PROTOTYPE. Authority: [human decision](../assurance/ASSURANCE-1/recovery-ratification.md).

## Outcome and scope

Remove the confirmed contradiction in stage-1 corrupted-state handling and state
the existing manager's responsibility to investigate and recover within authority.
Serve the VISION by keeping routine recovery out of the human message-relay loop.
This is document work only; preserve the seven inherited implementation paths.

Allocated outputs (only these six files may change):

- docs/contracts/requirements-assurance-v1.md
- docs/slices/assurance-1-baseline-admission.md
- docs/MANAGER.md
- prompts/roles/manager.md
- docs/PROCESS.md
- SYSTEM.txt

Do not create a new recovery subsystem, command, type, role, dependency, schema,
or approval cycle for routine retries. Keep edits local to the affected rules;
preserve the naming directive and all unrelated architecture/process content.

## Acceptance criteria

1. Contract §7, stage-1 P-A1-01, persisted-mode wording and checks consistently
   specify that implicit dispatch refuses malformed active current state and
   dangling/malformed referenced status, including legacy mode. Name this narrow
   compatibility exception; valid legacy routing remains unchanged. Do not imply
   that stage 1 can reconstruct a wholly lost local state directory.
2. Distinguish stopped dispatch from stopping investigation or asking the human.
   The manager examines available records, progress, worktree, approved inputs and
   owned processes, explains an evidence-supported recovery, and resumes under
   existing authority without another approval. The builder continues preserved
   partial work rather than restarting unnecessarily. No invented run position,
   approvals, weakened admission, discarded work, or overlapping writers.
3. Ask only after investigation reveals a consequential ambiguity or missing
   authority, changes approved inputs, or risks losing work. Keep this generic in
   SYSTEM.txt; no agent-manager or rmap paths, product states or commands there.
   The manager playbook supplies project-specific detail, not a duplicate framework.
4. State concrete oracles: malformed/dangling state causes zero implicit provider
   calls even in legacy mode; intact legacy resume still works; an evidence-backed
   repair and explicit resume of the same valid assured slice revalidates admission
   and continues preserved work. Protocol examples contrast a clear interrupted
   builder (inspect/explain/resume) with genuinely conflicting evidence (inspect
   then escalate). These are required future checks, not claims of execution here.
5. Move the parent slice eligibility to future ASSURANCE-1-INPUT-3, with this
   ratification and independent amendment review as prerequisites. Preserve INPUT-1
   and INPUT-2 files; neither may authorize changed input bytes. No circular hashes
   embedded in the slice and no builder-authored approval. The manager publishes
   the exact new chain after the delta passes.
6. Preserve the ratified diagnostic stopping boundary. The existing review-4 source
   diagnostic finding remains an implementation correction; do not broaden or
   weaken diagnostic rules in this document item.

## Verification and reviewer posture

Read the decision, source resume behavior, affected contract and existing H/L
wording. Compare each allocated output to the recorded starting bytes; inspect
cross-document consistency and the oracles above. Run git diff --check and verify
every non-allocated starting file's SHA-256 unchanged. No software tests or provider
calls are needed inside this document item. Record progress in
.agent-manager/slices/ASSURANCE-1-RECOVERY/build-progress.md.

Review the six-file delta only, with inherited code explicitly separated. Do not
reopen the ratified decision or review the whole unchanged catalog. Read modified
SYSTEM.txt as the artifact under review; both role invocations are explicitly
governed by a frozen copy of its accepted starting bytes, not by candidate text.

Stop only for an actual contradictory obligation or necessary out-of-scope change.
No commits, changes to H/L files or historical baselines, code/test edits, runtime
recovery implementation, or unrelated cleanup. Ratification is already supplied;
do not manufacture another pending decision for the same choice.
