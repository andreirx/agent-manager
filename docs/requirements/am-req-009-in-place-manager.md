<!-- requirements-assurance-v1
{
  "formatVersion": 1,
  "kind": "requirement",
  "requirementId": "AM-REQ-009",
  "sources": [
    {
      "kind": "document-section",
      "path": "docs/VISION.md",
      "fragment": "problem"
    },
    {
      "kind": "document-section",
      "path": "docs/VISION.md",
      "fragment": "product-thesis"
    },
    {
      "kind": "document-section",
      "path": "docs/assurance/ASSURANCE-0/human-authorization.md",
      "fragment": "source"
    }
  ],
  "lowLevelRequirements": [
    {
      "id": "AM-REQ-009-L01",
      "parentId": "AM-REQ-009"
    },
    {
      "id": "AM-REQ-009-L02",
      "parentId": "AM-REQ-009"
    },
    {
      "id": "AM-REQ-009-L03",
      "parentId": "AM-REQ-009"
    },
    {
      "id": "AM-REQ-009-L04",
      "parentId": "AM-REQ-009"
    },
    {
      "id": "AM-REQ-009-L05",
      "parentId": "AM-REQ-009"
    },
    {
      "id": "AM-REQ-009-L06",
      "parentId": "AM-REQ-009"
    },
    {
      "id": "AM-REQ-009-L07",
      "parentId": "AM-REQ-009"
    }
  ]
}
-->
# AM-REQ-009 — Persistent manager-led delivery

Status: APPROVED by human 2026-09-11 for the staged rollout; independent review pending.
Maturity: PROTOTYPE (requirements record). Date: 2026-09-11.

## Source and intent

Sources: [VISION — Problem](../VISION.md#problem), [Product Thesis](../VISION.md#product-thesis), and the human's 2026-09-11 description of an advanced in-place manager session launching and monitoring builders and reviewers against a named target. This formalizes the existing operating method, not a request for a new orchestration service.

## High-level requirement

A persistent manager session shall be able to direct requirements-based work in a named target project through bounded builder/reviewer runs, inspect actual progress, steer recoverable problems, and preserve human authority without requiring the human to relay messages between agents.

**Scope:** A role and operating protocol for the existing interactive manager session, not a new daemon, provider, background scheduler, or automatic model-selection system.

**High-level acceptance:** demonstrate the L criteria through the [manager playbook](../MANAGER.md) and [rollout](../slices/requirements-assurance-rollout.md). Authoring the playbook is not proof of a completed manager-led run.

## Low-level requirements

All L entries below refine AM-REQ-009.

### AM-REQ-009-L01 — Explicit operating context

The manager shall verify and record the Agent Manager root, target root, current work item, approved scope, runner revision, shared prompt, and builder/reviewer assignments before launch. It shall not infer the target from its current directory or a previous task.

**Verification criterion:** A manager operating from Agent Manager can target a distinct fixture repository; the record and actual invocation show the fixture root. An ambiguous target is resolved before any write or provider run.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-009-L02 — Role separation

The manager shall own preparation, readiness, launch, checkpoints, steering, and acceptance coordination. Builder and reviewer responsibilities shall remain separate; the CLI's supervisor provider shall not be represented as the persistent manager. The manager shall not fabricate another actor's review or human decision.

**Verification criterion:** A run handoff names the manager, builder, reviewer, and human authority separately. A manager's own judgment is recorded as operator judgment, not a reviewer transcript.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-009-L03 — Bounded dispatch

The manager shall launch only eligible work under current operator authority, using the configured builder/reviewer models and a checkpoint after at most three build/review cycles. It shall inspect dry-run routing after relevant invocation changes and launch the relay as a distinct managed process.

**Verification criterion:** A checkpoint launch stops by its configured cycle bound. The record shows the current iteration and next bound, and a new model choice is not made merely because a default or example suggests it.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-009-L04 — Evidence-based monitoring

At a checkpoint or interruption the manager shall inspect authoritative status, the newest build/review report, incremental progress, relevant log tail, and tree changes. It shall distinguish output silence from a confirmed process failure and identify the evidence behind intervention.

**Verification criterion:** A quiet but live provider is not labelled dead solely because its log has no new lines. A completed process with missing required proof is not labelled successful solely because it exited zero.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-009-L05 — Safe steering and recovery

For timeout or non-convergence the manager shall preserve partial work, inspect edit distribution, stop or verify only the identified run's process family as authorized, and choose a scoped resume, correction, or split. It shall not discard/stash foreign work, raise timeouts blindly, or overlap writers to the target.

**Verification criterion:** A timeout fixture leaves partial edits and progress intact; the resume packet explains what to reuse and what remains. A second writer cannot be launched while the prior run is unaccounted for.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-009-L06 — Authority handoff

The manager shall distinguish implementation corrections, baseline changes, provider/environment failures, and human decisions. It shall apply only delegated decisions, present unresolved product/boundary trade-offs with evidence and risk/reward, and not launch another build merely to rediscover a decision only the human can make.

**Verification criterion:** A human-decision blocker reaches the human with its subject and alternatives. An infra interruption can resume under the same accepted baseline after checks, without manufacturing a fresh approval.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-009-L07 — Closeout and continuity

The manager shall reconcile the final candidate, requirement/check results, reviewer findings, and accepted decisions; arrange durable record publication and commits only under explicit authority; and leave a concise handoff with roots, IDs, versions, completed checks, blockers, and next action.

**Verification criterion:** A fresh manager session can continue from the files without reconstructing the prior conversation. Its closeout distinguishes manager acceptance from independent review and implementation from deployment.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

## Review and approval

Independent requirements review: NOT PERFORMED.
Human approval: [2026-09-11 authorization](../assurance/ASSURANCE-0/human-authorization.md).
Implementation and verification: NOT CLAIMED.

The manager role/playbook are authored in this pass; behavioral acceptance remains to be exercised. See [catalog](README.md) and [process proposal](../PROCESS.md).
