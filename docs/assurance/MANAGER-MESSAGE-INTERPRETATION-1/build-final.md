## Outcome

Completed the bounded M-MMI-01 through M-MMI-03 corrective pass without adding modules, dependencies, services, schemas, or transaction machinery.

### Corrections

- **M-MMI-01**
  - Interpretation audits are now role-bound: `manager-interpretation-<role>-<iteration>.json`.
  - Clarification audit, request, and run-record identities include the pending role.
  - An exact retry reuses an immutable existing audit after a later consume failure.
  - A differing command, rationale, source, or route is rejected as an audit conflict; nothing is overwritten.
  - Public-use-case tests cover builder and reviewer interpretation and clarification in the same iteration.
- **M-MMI-02**
  - Attribution now states: “this interpretation is not independent execution evidence.”
  - Removed the unsupported assertion about whether the manager executed checks elsewhere.
- **M-MMI-03**
  - Fresh legacy reviewer clarification now receives the current builder report before the legacy delivery branch returns.
  - The test verifies the actual provider request, fresh-session behavior, preserved iteration, and persisted reviewer session ID.

This supports the VISION by keeping semantic interpretation an explicit manager responsibility while the runtime preserves immutable provider evidence, honest attribution, and deterministic resumability.

## Files changed in this corrective pass

- `src/application/use-cases/relay-target.ts` — role-bound identities, identity-safe audit retry, truthful attribution, legacy reviewer report delivery.
- `src/application/use-cases/relay-target.test.ts` — same-cycle composition, immutable retry recovery/conflict, attribution, and legacy fresh-session coverage.
- `docs/contracts/target-owned-relay.md` — corrected runtime record and retry contract.
- `docs/MANAGER.md` — corrected operator-facing behavior and evidence wording.

Earlier MMI implementation and accepted uncommitted SPS predecessor changes remain present. The accepted provider port and Codex/Claude adapter bytes were not altered.

**Local abstraction:** `ensureInterpretationAudit`; users: all four existing interpretation routes; variation: first audit creation versus exact-command retry after downstream failure; rejected unconditional create-only behavior because it wedges recovery, and rejected overwrite/attempt numbering because those weaken immutable operation identity.

## Validation

- **EXECUTED / PASS:** `npm run typecheck`
- **EXECUTED / PASS:** `npm test -- --runInBand`
  - 1 suite passed.
  - **209/209 tests passed**, 0 snapshots.
- **EXECUTED / PASS:** `npm run build`
- **EXECUTED / PASS:** `git diff --check`

The final four gates were run synchronously as:

```text
npm run typecheck && npm test -- --runInBand && npm run build && git diff --check
```

### TEST REPORT

- **Focused MMI suite:** `npm test -- --runInBand -t 'MANAGER-MESSAGE-INTERPRETATION-1'`
  - PASS: 26 focused tests.
- **Full automated suite:** `npm test -- --runInBand`
  - PASS: 209/209.
- **Built CLI apply proof**
  - PASS: isolated CLI reported `Final phase: done` and `without a provider call`.
- **Built CLI clarification proof**
  - PASS: isolated fake Codex executable was called exactly once; CLI remained at `awaiting-manager-interpretation`, iteration remained unchanged, and the native reviewer session was retained.
- **M-MMI-01 recovery proof**
  - PASS: forced post-audit `EISDIR`, preserved audit bytes, rejected a changed command, then recovered with the exact original operation after repairing the obstruction.
- **M-MMI-03 request proof**
  - PASS: actual fresh legacy reviewer request contained the current builder report, retained reviewer output, and manager question.

## Preservation evidence

- **OBSERVED / PASS:** `SYSTEM.txt`, `prompts/system/base.md`, and tracked role prompts have no diff.
- **OBSERVED / PASS:** accepted SPS hashes remain:
  - provider runner: `6331f35…`
  - Codex adapter: `07b9960…`
  - Claude adapter: `ae638ac…`
- **OBSERVED / PASS:** no owned `/private/tmp/MANAGER-MESSAGE-INTERPRETATION-1-*` roots remain.
- **NOT RUN:** installed/real providers; prohibited for this builder pass. The manager owns the final live retained-output smoke.
- **NOT RUN:** lint; explicitly excluded by the packet because ESLint is absent and not mandatory.

No stop condition was hit. No work remains in this bounded corrective pass.