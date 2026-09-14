# Human authorization — requirements-assurance overhaul

Date: 2026-09-11. Recorded by: the in-place manager. Mode: MANUAL BOOTSTRAP.

## Source

The human instructed: “drafts approved - update their status then start working on the actual implementation of this overhaul” and assigned GPT-5.6-sol as builder, GPT-5.6-terra as reviewer through the installed Codex CLI, with this session supervising as manager. The human also requested adopting the new SYSTEM.txt before provider calls and bootstrap updates to CLAUDE.md and role prompts.

## Approved scope and decisions

The nine H files / 56 L entries, process, manager operating method, and ordered ASSURANCE-0–5 rollout are authorized. The manager records approval of the rollout's recommended choices:

- D-FORMAT: Markdown requirements with narrow JSON metadata; JSON manifests/reviews/evidence. Exact grammar is refined and independently reviewed in ASSURANCE-0 before implementation.
- D-AUTH: explicit human/operator-recorded baseline and final approval initially; no reviewer-created human authority.
- D-ADOPTION: explicit persisted opt-in, full assurance label only after its gates exist; legacy preserved.
- D-DISPATCH: document and implementation work items through existing roles, real prerequisite/acceptance gates rather than a new workflow engine.
- D-EVIDENCE: durable minimal evidence/decisions/content identities; raw operational logs local.

[Original draft identities](approved-draft-identities.json) distinguish the user-approved drafts from subsequent bootstrap metadata/prompt edits and builder refinements. Requirement wording is not changed by the manager's status update.

## Ratifications 2026-09-14

- ef3e1c9 (provider-result framing: the first balanced JSON object of a builder/reviewer final message is extracted before the unchanged strict parse) — made by the manager outside the assured self-build path after the human's 2026-09-13 ruling; RATIFIED AS MADE by the human (option A of the manager's question).
- Assurance corrections: the human chose a recorded, operator-approved, closeout-reviewed "oracle correction" for text-only changes to a check or its prose (no re-baseline, no re-admission), with every correction logged. Procedure recorded in docs/MANAGER.md; the runtime part is taken by the human in a separate session (no work item).

## Execution and limits

Target and prompt root: agent-manager. The new prompt is agent-manager/SYSTEM.txt; filesystem inspection found no ../repo-graph/SYSTEM.txt. Use the existing explicit --shared-prompt override, not a global default change or a new copy in repo-graph. Both role invocations use Codex, different models, high effort (existing setting), separate sessions. Same-provider review is disclosed. Existing --supervisor flag still selects AND reviews; no persisted/CLI rename is authorized by this bootstrap.

Manager may prepare packets, run bounded relays and validation, record separate operator checks, and advance accepted increments under the standing self-build practice. No deployment, publication, global provider/model default change, or adjacent target migration. Preserve pre-existing documentation edits and authorized AGENTS.md removal.

User approval is not independent review or implementation verification. Those remain pending and must be recorded from actual runs. ASSURANCE-0 is document work; new runtime gates are unavailable. New contradictions or materially changed decisions stop dependent implementation.
