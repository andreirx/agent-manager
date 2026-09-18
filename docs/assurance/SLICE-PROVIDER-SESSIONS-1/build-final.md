## Outcome

Corrected the same session-support candidate without changing architecture.

### Under the hood

`runReview()` captured and persisted the reviewer’s native ID, but a later exception escaped to the relay loop. That outer catch still held the pre-dispatch `status` value and passed it to `blockSlice()`, overwriting the newer persisted session binding.

The reviewer catch now mirrors the established builder behavior: it rereads and validates the same-slice persisted status before blocking. Thus post-provider parsing, publication, or output-write failures preserve the latest captured reviewer ID.

Requirements-document author/reviewer calls now participate in the same builder/reviewer conversations. Only selection and decision challenge/rebuttal omit Agent Manager reuse requests.

## Requirement results

- **SPS-L01 — PASS:** Independent builder/reviewer conversations now include requirements-document roles and survive relay restart.
- **SPS-L02 — PASS:** Slice/role/provider lifecycle remains enforced; auxiliary selection/decision calls remain outside managed conversations.
- **SPS-L03 — PASS:** Hermetic adapter tests pass. Manager-produced live evidence shows Claude and corrected-fixture Codex continuation passing.
- **SPS-L04 — PASS:** Public-use-case regression proves a captured reviewer ID survives subsequent review-output processing failure.
- **SPS-L05 — PASS:** Pre-upgrade requirements-document state without IDs starts fresh conversations, retains findings, and resumes both roles after restart.
- **SPS-P01 — PASS:** Full admission, delivery, evidence, review, and publication suite passes.
- **SPS-P02 — PASS:** Builder tests used isolated fake providers; no provider or user HOME was accessed.

## Corrective changes

- `src/application/use-cases/relay-target.ts`
  - Preserves newer reviewer state on processing exceptions.
  - Removes the artifact-kind session exclusion.
- `src/application/ports/provider-runner.ts`
  - Corrects absence semantics to “no Agent Manager reuse request,” not “stateless.”
- `src/cli/relay-target.ts`
  - Dry-run now reports requirements-document role sessions consistently with dispatch.
- `src/application/use-cases/relay-target.test.ts`
  - Adds reviewer post-provider failure regression.
  - Adds requirements-document fresh/refinement/restart/resume regression.
  - Aligns requirements-document dry-run assertions.
- `docs/contracts/target-owned-relay.md`, `docs/MANAGER.md`
  - Document clarified role scope and recovery behavior.

No new production abstraction, module, service, or dependency was introduced. The narrow correction directly mirrors the existing builder recovery path.

## Validation

- **EXECUTED — PASS:** `npm run typecheck`
- **EXECUTED — PASS:** `npm test -- --runInBand -t 'SLICE-PROVIDER-SESSIONS-1|built document preflight'` — 13 passed
- **EXECUTED — PASS:** `npm test -- --runInBand -t 'document-role sessions'` — 1 passed
- **EXECUTED — PASS:** `npm test -- --runInBand` — **183/183 passed**
- **EXECUTED — PASS:** `npm run build`
- **EXECUTED — PASS:** `git diff --check`
- **OBSERVED:** Manager live evidence records successful Claude continuation and successful Codex continuation after correcting only the isolated fixture’s missing Git initialization.
- **NOT RUN:** Real providers by this builder, as required.

Manager-owned ROADMAP, second-slice documents, and input records were left untouched. No temporary slice roots remain. Changes are uncommitted; manager acceptance is not claimed.