# Diagnostic amendment — manager acceptance

Status: ACCEPTED, 2026-09-12. Authority: [human ratification](../ASSURANCE-1/diagnostics-ratification.md).

[Terra review](review-0.json) approved the two-document amendment in one cycle. The manager inspected the delta and verified 99 non-allocated starting files unchanged by SHA-256, including all existing source/test work and nine H records. Only the contract and ASSURANCE-1 packet changed. No code is approved by this document result.

The original 9 H / 56 L quality review remains applicable because those exact bytes are unchanged. Reuse [ASSURANCE-0 review](../ASSURANCE-0/review-3.json) for those obligations and the unchanged design; the new review covers the explicitly ratified diagnostic delta. No provider is claimed to have reviewed unrelated new material.

The manager assembles INPUT-2 after review from those unchanged inspected bytes, with the ratification and both review records available in the closure. INPUT-1 files remain untouched and are no longer eligible against the changed document paths; their accepted bytes remain reconstructible at e2b3380. This is manual baseline publication, not a claim that the not-yet-accepted stage1 runtime enforced the transition.

No new abstraction or runtime behavior was introduced by the amendment. The user exchanges exhaustive ambiguous-record recovery for bounded rejection diagnostics; valid input admission, raw-byte identity, and aggregate diagnostics on unambiguous records are preserved.
