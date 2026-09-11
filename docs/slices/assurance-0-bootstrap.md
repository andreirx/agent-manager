# ASSURANCE-0 — Reviewed record grammar and bootstrap baseline

Status: READY for document authoring and independent review. Maturity: PROTOTYPE.
Authority: [human authorization](../assurance/ASSURANCE-0/human-authorization.md).
Parent: [approved rollout](requirements-assurance-rollout.md#assurance-0--review-the-process-and-baseline-documents-only).

## Outcome and allocation

Refine the approved format into the smallest exact contract that ASSURANCE-1 can implement, and independently assess all 9 H / 56 L requirements before dependent code. This specifies all Hs; it does not implement them. Preserve every approved requirement statement, verification criterion, decision choice, legacy relay behavior and named architectural boundary.

## Deliverables

1. docs/contracts/requirements-assurance-v1.md: narrow versioned Markdown + JSON metadata grammar, root-relative path/digest rules, required/unknown/duplicate/unsupported handling, H/L identity and source/parent representation. JSON manifest and initial manual approval/review references must specify exact fields and content-binding without circular hashes. Name only stage-1-consumed fields and explicitly separate deferred later-stage record contracts; no unused schemas/framework. Include inline valid/invalid examples, not a new parser implementation.
2. Add minimal machine metadata to the nine H files consistent with the contract, WITHOUT changing approved behavioral prose or verification criteria. The metadata is the same file's identity/links, not a second copy of the requirement text. If evidence contradicts approved text, report a finding instead of silently revising it.
3. docs/slices/assurance-1-baseline-admission.md: bounded executable next packet, actual code-backed integration locations, exact stage1 allocations/output/preservation/checks from rollout. Specify persisted baseline selection, per-dispatch revalidation, invalid-input zero provider calls, absent-mode legacy parity, and new-target local scaffold. Describe concrete grammar/approval validation for MANUAL bootstrap vs future structured review coverage; never pretend stage2 gates exist in stage1.
4. Final build report: account for every H/L ID with source/criterion/ambiguity assessment, scope inventory, no code changes, and verification executed. Reviewer independently returns its own per-ID coverage/findings in its final artifact. The manager, not builder, records review provenance and exact accepted baseline after review.

## Verification

Count 9 unique H / 56 unique L; verify parents and sources; inspect examples for unknown fields/version, malformed JSON, duplicate IDs, missing read, traversal and symlink-escape behavior. Explain how tiny in-memory tests and separate filesystem/CLI tests will exercise the actual dispatcher. Check frozen input vs mutable output separation, and whether existing prompts conflict with tracked durable evidence. Independently check the contract is the smallest implementation satisfying stage1 and extensible only along named later stages. No code or fabricated software tests in this document slice.

## Stop conditions

New product decisions or changed approval/authority choices; contradiction with approved requirement semantics; need for new package/dependency/boundary beyond approved rollout. Record precise plain-text decision and stop dependent work. Do not reopen unchanged ratified D-* choices merely because their old matrices are retained. No build, provider launch, commit, deployment or sibling repo edits by the builder.
