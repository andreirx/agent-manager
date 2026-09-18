# Session support: manager-reviewed implementation baseline

Human authority: the 2026-09-17 request to implement separate builder/reviewer sessions during ONE slice until DONE, including interrupted slices without IDs and preserving their existing work.

Source HEAD: 6a1c8c9d6737406c838861304753086c01eaad7c. Scope: docs/slices/slice-provider-sessions-1.md (sha256:40d7ee78194cd775dd8f3f60197d0d4cc5f8d39373c6ba8974f8cf55980967e1). Shared instructions: SYSTEM.txt (sha256:fbb99b8cb7349562236bf289e33f9850a8412e1272746ba53d8dc7c9f6894f75).

Independent Terra requirements/design review approved after a resumed clarification. The initial CLI-help-only escalation was disproved by a live isolated native two-turn Codex probe: explicit parent sandbox/cwd flags, same ID and nonce recall, both native turn_context records read-only. Retry persistence finding is retained in SPS-L04. The human's interrupted-slice clarification is explicit in SPS-L05. Reports are retained beside this file.

Manager accepts this reviewed refinement under the human's explicit implementation request. Implementation uses the existing legacy target relay with Sol/Terra/high and explicit SYSTEM.txt, maximum two cycles before checkpoint. This record is a manual reviewed input baseline, NOT a v2/v3 runtime-admission claim. Existing historical assured records are untouched; message interpretation is separately authorized and not in this implementation scope.

## Candidate inspection pending implementation closeout

The manager's public-use-case fault probe at 2026-09-17T21:13:27Z found that the
reviewer's captured ID is overwritten by stale status if writing its returned
review fails. The raw observation and reproducible isolated script are retained
at `.agent-manager/slices/SLICE-PROVIDER-SESSIONS-1/manager-review-session-error-probe.{json,mjs}`;
`manager-candidate-findings.md` explains the existing SPS-L04 preservation duty.
This is an implementation finding, not a changed requirement or acceptance.

Manager clarification on 2026-09-17: SPS-L01 explicitly includes requirements/design work in the existing builder/reviewer roles. The original human scope did not restrict artifact kind; the candidate's posture guard was narrower than requested. The original approved wording/hash and review are retained above; the clarification is covered by the same-session corrective builder and final independent review, not retrospectively attributed to the first review.
