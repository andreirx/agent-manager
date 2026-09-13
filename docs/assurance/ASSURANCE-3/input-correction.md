# ASSURANCE-3 — authorized closeout input correction

The human explicitly authorized the recommended correction on 2026-09-13:
“you apply the document correction, finish stage 3 closeout, commit, push”.
The in-place manager records that authority; software does not interpret or
authenticate the human decision.

## Correction and impact

The approved slice's check grammar permits allocated implementation/preservation
obligations only. Its metadata nevertheless included four contextual parent Hs:
A3-C02 → AM-REQ-004, A3-C03 → AM-REQ-005, A3-C04 → AM-REQ-003, and A3-C09 →
AM-REQ-007. The manager's actual-input probe exposed this inconsistency after
Terra approved the implementation. Earlier requirements review missed it.

Remove those four check links, and nothing else in the slice. Retain all four
parentRequirementIds as context, 13 allocated Ls, eight P obligations, ten checks,
their commands/oracles, candidate scope and architecture. The parser remains
unchanged. This neither weakens verification nor grants whole-H completion credit.
[Exact before/after identities and actual parser result](allocation-correction-check.json)
record the delta. Independent review is retained in correction-review.md.

## Historical input versus current closeout authority

The original slice is recoverable at Git revision
766d4767582394183387c7fb154fe15889edb847. ASSURANCE-3-INPUT-1 and its requirements
review/approval remain byte-identical historical records of what the actual
builder/reviewer runs received. They are not rewritten to claim those invocations
saw the corrected bytes. Their allocation digest intentionally does not match the
corrected current file; do not reuse that baseline for a new dispatch.

Current manager closeout is against that original reviewed design plus this
explicit human-authorized, separately reviewed four-link amendment. This is the
manual bootstrap acceptance allowed by slice section 12, not a newly admitted
runtime baseline or an automated Stage-4 acceptance record. No dependent builder
is dispatched under the amended input. Any future work needs its own reviewed
current-input baseline; historical records remain historical.

The amendment introduces no new runtime record type, approval engine, requirement,
abstraction or dependency. All seven implementation files retain their reviewed
and independently tested identities.
