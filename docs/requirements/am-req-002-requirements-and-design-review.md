<!-- requirements-assurance-v1
{
  "formatVersion": 1,
  "kind": "requirement",
  "requirementId": "AM-REQ-002",
  "sources": [
    {
      "kind": "document-section",
      "path": "docs/VISION.md",
      "fragment": "primary-use-case"
    },
    {
      "kind": "document-section",
      "path": "docs/VISION.md",
      "fragment": "architectural-principles"
    },
    {
      "kind": "document-section",
      "path": "docs/assurance/ASSURANCE-0/human-authorization.md",
      "fragment": "source"
    }
  ],
  "lowLevelRequirements": [
    {
      "id": "AM-REQ-002-L01",
      "parentId": "AM-REQ-002"
    },
    {
      "id": "AM-REQ-002-L02",
      "parentId": "AM-REQ-002"
    },
    {
      "id": "AM-REQ-002-L03",
      "parentId": "AM-REQ-002"
    },
    {
      "id": "AM-REQ-002-L04",
      "parentId": "AM-REQ-002"
    },
    {
      "id": "AM-REQ-002-L05",
      "parentId": "AM-REQ-002"
    },
    {
      "id": "AM-REQ-002-L06",
      "parentId": "AM-REQ-002"
    }
  ]
}
-->
# AM-REQ-002 — Requirements validation and proportionate design review

Status: APPROVED by human 2026-09-11 for the staged rollout; independent review pending.
Maturity: PROTOTYPE (requirements record).
Date: 2026-09-11.

## Source and intent

Sources: [VISION — Primary Use Case](../VISION.md#primary-use-case); [VISION — Architectural Principles](../VISION.md#architectural-principles); the human's 2026-09-11 request for requirements-linked, avionics-inspired delivery and project-specific architectural judgment. Vision section links describe origins, not proof that these refinements are already ratified.

## High-level requirement

Before implementation is authorized, Agent Manager shall route the applicable requirements and consequential design decisions through recorded independent review so an internally consistent but ineffective specification can be challenged.

**Scope:** Review obligations and authority. A different model is useful diversity, not a certification claim.

**High-level acceptance:** demonstrate the allocated low-level criteria below through the [rollout](../slices/requirements-assurance-rollout.md), including both acceptance and refusal where specified. Partial slice completion does not satisfy this whole H.

## Low-level requirements

All L entries below refine AM-REQ-002; their parent is this H. Their stable IDs are independent of filenames and section titles.

### AM-REQ-002-L01 — Separate deliverables

A work item shall identify whether its deliverable is a requirements/design document or implementation. Acceptance of a document shall not authorize code changes or assert implementation completion.

**Verification criterion:** A requirements-authoring run may produce only its permitted documents. A green document review cannot dispatch an implementation run without a separately eligible implementation item.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-002-L02 — Requirements judgment

The reviewer shall assess correctness against the originating need, completeness within named scope, consistency, feasibility, verifiability, and necessity; findings shall identify the obligation, evidence, consequence, and required refinement.

**Verification criterion:** A supplied example that meets its written acceptance test but fails its stated user outcome receives a requirement-defect finding; a valid bounded requirement can be accepted without extra scope.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-002-L03 — Review coverage

The review record shall account for every obligation submitted for review, including new derived proposals and blocking assumptions. Missing or unrecognized obligation IDs shall prevent review completion, not disappear from the result.

**Verification criterion:** Omit one L from a otherwise positive review: the relay reports missing coverage and cannot accept the reviewed baseline. Adding an unsolicited ID produces a finding rather than silently extending scope.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-002-L04 — Independent role and authority

Authorship and review shall be separate invocations whose identities, providers/models, inputs, and outcomes are recorded. Review shall not mutate its subject. Human decisions shall be recorded by the authorized operator, not inferred from an agent's assertion of human agreement.

**Verification criterion:** A builder's own summary or forged prose 'the human approved' does not satisfy a review/approval prerequisite. A separate same-provider review is labelled accurately, not presented as two-vendor review.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-002-L05 — Risk-scaled design

Every implementation item shall identify its risk/impact rationale and design basis. Local, settled changes may use a short approach in the slice; consequential changes shall include a reviewed note covering ownership, interfaces, failure behavior, preservation, and verification before dependent code work.

**Verification criterion:** A local formatting-free bug fix proceeds with its compact accepted basis; a changed persistence contract without reviewed recovery behavior is held for design review. Line count alone does not select the route.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-002-L06 — Ratification closure

New or amended authority-level decisions shall be resolved against the reviewed content before dependent implementation is eligible. An unresolved, omitted, or contested decision shall remain visible and blocking. Unchanged previously accepted decisions shall not be re-ratified solely because another slice references them.

**Verification criterion:** A contested requirement decision blocks its IMPL item; ratifying its exact revision permits reevaluation. A subsequent edit invalidates that ratification for the changed content; an unchanged reference does not reopen it.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

## Review and approval

Independent requirements review: NOT PERFORMED.
Human approval: [2026-09-11 authorization](../assurance/ASSURANCE-0/human-authorization.md).
Implementation and verification: NOT CLAIMED.

Common lifecycle and source/identity conventions: [catalog](README.md) and [process proposal](../PROCESS.md). Proposed formats and authority choices are in the [rollout decisions](../slices/requirements-assurance-rollout.md#7-decisions-required-before-code).
