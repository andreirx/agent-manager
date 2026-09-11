<!-- requirements-assurance-v1
{
  "formatVersion": 1,
  "kind": "requirement",
  "requirementId": "AM-REQ-004",
  "sources": [
    {
      "kind": "document-section",
      "path": "docs/VISION.md",
      "fragment": "2-files-before-hidden-state"
    },
    {
      "kind": "document-section",
      "path": "docs/VISION.md",
      "fragment": "3-structured-contracts-before-prose"
    },
    {
      "kind": "document-section",
      "path": "docs/VISION.md",
      "fragment": "traceability-model"
    },
    {
      "kind": "document-section",
      "path": "docs/assurance/ASSURANCE-0/human-authorization.md",
      "fragment": "source"
    }
  ],
  "lowLevelRequirements": [
    {
      "id": "AM-REQ-004-L01",
      "parentId": "AM-REQ-004"
    },
    {
      "id": "AM-REQ-004-L02",
      "parentId": "AM-REQ-004"
    },
    {
      "id": "AM-REQ-004-L03",
      "parentId": "AM-REQ-004"
    },
    {
      "id": "AM-REQ-004-L04",
      "parentId": "AM-REQ-004"
    },
    {
      "id": "AM-REQ-004-L05",
      "parentId": "AM-REQ-004"
    },
    {
      "id": "AM-REQ-004-L06",
      "parentId": "AM-REQ-004"
    }
  ]
}
-->
# AM-REQ-004 — Baseline-bound implementation and review

Status: APPROVED by human 2026-09-11 for the staged rollout; independent review pending.
Maturity: PROTOTYPE (requirements record).
Date: 2026-09-11.

## Source and intent

Sources: [VISION — Files before hidden state](../VISION.md#2-files-before-hidden-state); [VISION — Structured contracts before prose](../VISION.md#3-structured-contracts-before-prose); [VISION — Traceability Model](../VISION.md#traceability-model); the human's 2026-09-11 request for requirements-linked, avionics-inspired delivery and project-specific architectural judgment. Vision section links describe origins, not proof that these refinements are already ratified.

## High-level requirement

For an assured run, the builder, reviewer, and acceptance check shall operate against the same explicitly accepted requirements/design baseline, and detect drift before further authorized progress.

**Scope:** Invocation admission and content identity. Does not claim that a prompt or local repository protects against a malicious administrator.

**High-level acceptance:** demonstrate the allocated low-level criteria below through the [rollout](../slices/requirements-assurance-rollout.md), including both acceptance and refusal where specified. Partial slice completion does not satisfy this whole H.

## Low-level requirements

All L entries below refine AM-REQ-004; their parent is this H. Their stable IDs are independent of filenames and section titles.

### AM-REQ-004-L01 — Baseline identity

An accepted baseline shall identify the exact bytes of requirement files and their approved parent/design dependencies through an immutable manifest and approval references. Its identity shall not depend only on filenames, timestamps, or an editable status word.

**Verification criterion:** Change one byte of a referenced requirement: the previous manifest no longer admits that content. A path rename without an approved updated manifest also requires reevaluation.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-004-L02 — Admission gate

Before each implementation invocation, the relay shall verify the applicable baseline, required reviews/decisions, and slice allocations. Missing, stale, invalid, or unverifiable prerequisites shall produce a specific blocked result and zero builder invocations.

**Verification criterion:** Stub-runner call counts remain zero for missing approval, digest mismatch, omitted decision, and unreadable baseline; a valid baseline reaches the builder exactly once.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-004-L03 — Equivalent role context

The builder and reviewer shall receive the same authoritative requirements/design content and allocation, plus role-specific evidence. Run records shall identify the shared instructions, role prompts, governance inputs, and composed context used.

**Verification criterion:** Capture both normalized requests with stubs: baseline content/identity and allocations match, role material differs intentionally, and the actual delivered shared-prompt bytes have a recorded digest.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-004-L04 — Resume and mutation

On resume and before acceptance, the relay shall revalidate baseline and candidate identity. Worktree changes by another actor or changes to the reviewed subject shall invalidate affected evidence; a missing state file shall not silently create a fresh approved run.

**Verification criterion:** Mutate a requirement or candidate between build and review, or while paused: the next dependent action blocks with the changed input rather than reusing the old green verdict.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-004-L05 — Bounded snapshot claim

The relay shall identify the snapshot/checkpoint represented by a record, serialize its own writers, and not claim continuous tree immutability it cannot enforce. Acceptance shall recheck the candidate after review; volatile outputs shall be excluded only by an explicit scope rule.

**Verification criterion:** A test alters an in-scope untracked file after review: acceptance rejects the changed candidate. An out-of-scope log append does not invalidate code evidence if the exclusion is declared.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-004-L06 — Safe adoption

Assured versus legacy operation shall be explicit in invocation output and stored run state. An assured run shall not resume as legacy when metadata is absent, malformed, or a flag is omitted. Legacy runs shall not claim requirements assurance.

**Verification criterion:** Start an assured run, omit its invocation flag on resume, and retain assurance; corrupt its metadata and receive a blocking error. An explicit legacy run clearly reports its limited guarantees.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

## Review and approval

Independent requirements review: NOT PERFORMED.
Human approval: [2026-09-11 authorization](../assurance/ASSURANCE-0/human-authorization.md).
Implementation and verification: NOT CLAIMED.

Common lifecycle and source/identity conventions: [catalog](README.md) and [process proposal](../PROCESS.md). Proposed formats and authority choices are in the [rollout decisions](../slices/requirements-assurance-rollout.md#7-decisions-required-before-code).
