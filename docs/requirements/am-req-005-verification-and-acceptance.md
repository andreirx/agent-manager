<!-- requirements-assurance-v1
{
  "formatVersion": 1,
  "kind": "requirement",
  "requirementId": "AM-REQ-005",
  "sources": [
    {
      "kind": "document-section",
      "path": "docs/VISION.md",
      "fragment": "traceability-model"
    },
    {
      "kind": "document-section",
      "path": "docs/VISION.md",
      "fragment": "5-critic-independence"
    },
    {
      "kind": "document-section",
      "path": "docs/VISION.md",
      "fragment": "near-term-vision"
    },
    {
      "kind": "document-section",
      "path": "docs/assurance/ASSURANCE-0/human-authorization.md",
      "fragment": "source"
    }
  ],
  "lowLevelRequirements": [
    {
      "id": "AM-REQ-005-L01",
      "parentId": "AM-REQ-005"
    },
    {
      "id": "AM-REQ-005-L02",
      "parentId": "AM-REQ-005"
    },
    {
      "id": "AM-REQ-005-L03",
      "parentId": "AM-REQ-005"
    },
    {
      "id": "AM-REQ-005-L04",
      "parentId": "AM-REQ-005"
    },
    {
      "id": "AM-REQ-005-L05",
      "parentId": "AM-REQ-005"
    },
    {
      "id": "AM-REQ-005-L06",
      "parentId": "AM-REQ-005"
    },
    {
      "id": "AM-REQ-005-L07",
      "parentId": "AM-REQ-005"
    }
  ]
}
-->
# AM-REQ-005 — Evidence-based verification and acceptance

Status: APPROVED by human 2026-09-11 for the staged rollout; independent review pending.
Maturity: PROTOTYPE (requirements record).
Date: 2026-09-11.

## Source and intent

Sources: [VISION — Traceability Model](../VISION.md#traceability-model); [VISION — Critic independence](../VISION.md#5-critic-independence); [VISION — Near-Term Vision](../VISION.md#near-term-vision); the human's 2026-09-11 request for requirements-linked, avionics-inspired delivery and project-specific architectural judgment. Vision section links describe origins, not proof that these refinements are already ratified.

## High-level requirement

Agent Manager shall withhold assured implementation completion until the required checks and independent review support the exact candidate under its accepted obligations, while reporting the limits of that evidence.

**Scope:** Required evidence and acceptance decisions, not automatic proof of software correctness.

**High-level acceptance:** demonstrate the allocated low-level criteria below through the [rollout](../slices/requirements-assurance-rollout.md), including both acceptance and refusal where specified. Partial slice completion does not satisfy this whole H.

## Low-level requirements

All L entries below refine AM-REQ-005; their parent is this H. Their stable IDs are independent of filenames and section titles.

### AM-REQ-005-L01 — Verification plan

Each assured implementation slice shall define checks for its allocated and preserved obligations, their expected results, method, required environment/input, and execution owner before implementation is admitted.

**Verification criterion:** A planned inspection has a falsifiable review criterion; a planned test has an expected assertion. A bare command or an unassigned required hardware proof is reported incomplete.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-005-L02 — Evidence distinctions

Each check record shall distinguish pass, fail, not run, and execution failure, with performer, method/command, expected/actual result, candidate identity, inputs, and supporting evidence location. Inference shall not be labelled execution.

**Verification criterion:** An exit-filter success after a failing command, an unavailable environment, and a skipped test cannot become a passing requirement result.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-005-L03 — Integration relevance

Evidence shall include the delivered behavior at its specified acceptance boundary and the relevant component interactions. Pure-policy tests shall be possible without GUI, database, or hardware; adapter/system checks shall separately exercise the mechanisms where required.

**Verification criterion:** A helper passing unit tests but never called by the public use case fails acceptance. A domain-rule unit test executes against raw inputs without external infrastructure.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-005-L04 — Independent evidence review

The reviewer shall inspect assertions and evidence, challenge ungrounded fixtures and naming/contract mismatches, and reproduce risk-relevant checks where permitted. It shall identify any reliance on builder-produced evidence or unexecuted checks.

**Verification criterion:** A fixture asserting an invented behavior is challenged against the source requirement. A sandbox-restricted reviewer records reliance rather than pretending to rerun a test or bypassing permissions.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-005-L05 — Completion predicate

A bare positive verdict shall not complete an assured implementation slice. Completion shall require a valid baseline, unchanged reviewed candidate, all mandatory checks satisfied, no blocking findings/decisions, and the required acceptance authority.

**Verification criterion:** Each missing predicate independently blocks an otherwise positive verdict. A fully evidenced candidate completes; one failed preservation test prevents it.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-005-L06 — Durable acceptance

The operator shall be able to publish a durable acceptance record binding the baseline, reviewed candidate, evidence, and approvals. Publishing shall not commit automatically. Missing publication or a failed write shall not be reported as durable acceptance.

**Verification criterion:** Interrupt publication and retry: no partial record is accepted and unrelated work is preserved. A clean checkout of operator-committed records can reconstruct the acceptance claim without local logs.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-005-L07 — Scoped conclusions

Completion output shall separate artifact completion, software verification, human acceptance, and release/deployment. It shall name unverified scope and shall not claim certification, total correctness, or automatic qualification from a green review.

**Verification criterion:** A document-only acceptance says document accepted, not software verified; a completed implementation with no deployment action does not report deployed.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

## Review and approval

Independent requirements review: NOT PERFORMED.
Human approval: [2026-09-11 authorization](../assurance/ASSURANCE-0/human-authorization.md).
Implementation and verification: NOT CLAIMED.

Common lifecycle and source/identity conventions: [catalog](README.md) and [process proposal](../PROCESS.md). Proposed formats and authority choices are in the [rollout decisions](../slices/requirements-assurance-rollout.md#7-decisions-required-before-code).
