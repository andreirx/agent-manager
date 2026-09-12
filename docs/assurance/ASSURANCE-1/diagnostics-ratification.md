# D-A1-DIAGNOSTICS — human ratification

Status: RATIFIED, 2026-09-12. Recorded by the in-place manager.
Source: the human answered “yes” to “Do you approve that narrower diagnostic contract?” after the manager presented both options.

## Approved change

Malformed JSON or duplicate-key JSON shall be rejected, and deeper diagnostics for that record shall stop. Records that parse unambiguously retain aggregate structural diagnostics. This does not relax rejection, containment, digest binding, approval authority, or legacy-preservation rules. It does not promise that a later validation pass discovers no further errors after the input is repaired.

## Trace and controlled adoption

Refines contract requirements-assurance-v1.md §2.5 and ASSURANCE-1 A1-C01 under AM-REQ-001-L06 (bounded loading and explicit failures); no H/L behavioral text is changed. This supersedes the earlier all-independently-discoverable-errors guarantee only at malformed/duplicate-key record boundaries. [Original options and evidence](manager-checkpoint.md) remain historical.

The contract/slice amendment receives independent Terra review before dependent code resumes. The manager then creates ASSURANCE-1-INPUT-2 with a new manifest/review/approval chain including this decision, preserving INPUT-1 and its history. INPUT-1 is not silently rehashed or used to admit changed input bytes. Until INPUT-2 exists, this is a manually supervised document amendment using the accepted predecessor, not an assured implementation run.

The misleading private checkClosed helper must also be corrected under the already approved naming directive: its return currently indicates object shape while errors are appended separately. Local rename/clarification is allowed; do not invent a new abstraction. No model change, new dependency, or wider code cleanup is authorized.
