# Conscious-recovery amendment — manager acceptance

Status: ACCEPTED, 2026-09-12. Authority: [human decision](../ASSURANCE-1/recovery-ratification.md).

[Review 0](review-0.json) approved the six-document delta. Manager review found an incidental change to the order of two local pre-dispatch guards; [review 1](review-1.json) approved its two-document correction, preserving existing explicit-baseline-first order. Both original reviewer reports are retained verbatim.

Manager SHA-256 checks verified 103 non-allocated starting paths unchanged, including all seven inherited implementation paths and all nine H files. The second correction changed exactly two paths; the other 107 pre-correction identities were unchanged. Manager inspected each final document delta and ran git diff --check. This accepts documents only: no new runtime behavior or software-test execution is claimed.

The human-approved outcome is refusal of unsafe implicit dispatch followed by active investigation and evidence-supported recovery under existing authority, not an automatic request for human permission. The builder continues preserved work. The only compatibility exception is corrupted active state; valid legacy routing remains unchanged. There is no new recovery service, command, module, dependency, or approval gate for routine retries. Naming instructions remain intact and SYSTEM remains project-independent.

## Reused evidence and exact inputs

The original 9 H / 56 L review remains relevant because their bytes are unchanged: [ASSURANCE-0 review](../ASSURANCE-0/review-3.json). The diagnostic boundary and prior unchanged design retain [diagnostic review](../ASSURANCE-1-DIAGNOSTICS/review-0.json). Recovery review 0 covers the six-document delta; review 1 covers its two-document ordering correction. None is represented as having reviewed the whole catalog again.

The manager assembles INPUT-3 after these reviews, using inspected final bytes plus the new human decision and both recovery reviews. The review record's actor identities/report identify the actual final delta invocation, not a claim that it read the not-yet-created manifest. Baseline publication is separately operator-authorized and manually checked. INPUT-1/INPUT-2 and historical acceptance remain unchanged; their accepted bytes are reconstructible from e2b3380 and 10b2181 respectively. They cannot admit changed current input bytes.

The amendment introduces no abstraction. Typed runtime recovery remains allocated to ASSURANCE-4; these instructions immediately govern the existing in-place manager. ASSURANCE-1 code still requires its source-diagnostic correction, newly specified recovery checks, independent implementation review, and manager gates.
