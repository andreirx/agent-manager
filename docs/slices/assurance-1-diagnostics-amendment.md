# ASSURANCE-1-DIAGNOSTICS — ratified diagnostic contract amendment

Status: READY for document-only authoring and independent review. Maturity: PROTOTYPE.
Authority: [D-A1-DIAGNOSTICS](../assurance/ASSURANCE-1/diagnostics-ratification.md).

## Scope and outcome

Amend only requirements-assurance-v1.md and assurance-1-baseline-admission.md to state the human-approved diagnostic boundary consistently. Preserve the 9 H / 56 L set, fail-closed admission, every other stage1 guarantee and all existing uncommitted code. This is a document work item, not permission to alter code or tests before review.

## Definition of done

- §2.5 and related diagnostic wording clearly stop deeper diagnostics for malformed/duplicate-key JSON records; unambiguously parsed records retain aggregate diagnostics. No last-member-wins semantic admission.
- A1-C01 names positive/negative expectations across requirement, manifest, review and approval records: ambiguous JSON is refused without harvesting deeper identities; unrelated errors in unambiguously parsed objects do not hide readable duplicates. Include an explicit naming check/test plan for the misleading private helper without doing the rename in this document slice.
- Update the ASSURANCE-1 eligibility paths to the future ASSURANCE-1-INPUT-2 manifest/review/approval, identify its prerequisite independent amendment review and manager publication, and link the ratified decision. Do not invent hashes or approve/publish that chain yourself. INPUT-1 remains untouched and historical.
- Do not require diagnostic recovery below the new stopping boundary or add later-stage mechanisms. Inspect source semantics, not merely names.
- Run git diff --check, verify only the two allocated documents changed against the starting identities, and verify requirement/INPUT-1 bytes unchanged. Report the exact amendment and checks; software tests are not applicable to this document-only item.

## Reviewer posture

Review the ratified delta, its consistency and implementability—not reopen the unchanged 65 obligations or already decided diagnostic choice. Explicitly distinguish inherited implementation from this document diff using starting-identities.json. Approve only if the next implementation has an unambiguous test oracle and cannot silently reuse stale INPUT-1 authority.

## Stop conditions

Any required change beyond the ratified diagnostic/naming scope, change to H/L semantics, new authority/dependency/boundary, or contradictory evidence. No provider launch, commit, code/test edit, baseline mutation, or unrelated documentation cleanup.
