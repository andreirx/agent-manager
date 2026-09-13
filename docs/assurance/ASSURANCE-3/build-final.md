## Outcome

Implemented revision iteration 4 and preserved all prior ASSURANCE-3 corrections.

The reviewer now receives three distinct candidate representations:

1. `HEAD` → index: staged changes.
2. Index → working tree: unstaged changes.
3. In-scope untracked files: raw bytes encoded as base64.

This prevents staged content from disappearing when working-tree bytes happen to match `HEAD`. Git’s binary diff form preserves binary data, modes, and deletions. This supports VISION’s traceable critic-independence goal: the reviewer can inspect the actual states bound by the candidate checkpoint, rather than hashes alone.

## Files changed

The complete candidate remains restricted to the seven authorized paths:

- `src/core/assurance.ts` — pure allocation, evidence, checkpoint, and review policy.
- `src/application/use-cases/relay-target.ts` — Stage-3 orchestration, continuity, review, and publication gates.
- `src/cli/relay-target.ts` — Git/filesystem observation and corrected staged/working reviewer representation.
- `src/application/use-cases/relay-target.test.ts` — policy, relay, mutation, publication, and hermetic built-CLI tests.
- `prompts/roles/builder-target.md` — structured evidence duty.
- `prompts/roles/reviewer-target.md` — read-only structured review duty.
- `docs/contracts/target-owned-relay.md` — delivered Stage-3 behavior and precise diff semantics.

No package, dependency, module, adapter, registry, schema, or workflow phase was added.

## Validation

Evidence is retained under `.agent-manager/slices/ASSURANCE-3/iteration-4-evidence/`.

| Check | Result |
|---|---|
| A3-C01 exact policy filter | **EXECUTED PASS** — 4 tests |
| A3-C02 candidate identity/scope | **EXECUTED PASS** — 1 multi-case test |
| A3-C03 evidence outcomes/readiness | **EXECUTED PASS** — 3 tests |
| A3-C04 target-relay evidence gate | **EXECUTED PASS** — 10 tests |
| A3-C05 reviewer contract | **EXECUTED PASS** — 5 tests |
| A3-C06 mutation/publication ordering | **EXECUTED PASS** — 5 tests |
| A3-C07 `npm test -- --runInBand` | **EXECUTED PASS** — 168/168 |
| A3-C08 build + hermetic built CLI | **EXECUTED PASS** — build and 1 matching test |
| A3-C09 scoped architecture inspection | **OBSERVED PASS** — exactly seven authorized paths; no structural additions |
| A3-C10 typecheck + diff check | **EXECUTED PASS** |

A3-C08’s captured reviewer input covered:

- unequal staged and working bytes;
- 100644 → 100755 mode change;
- staged content cancelled by working bytes matching `HEAD`;
- staged and unstaged deletions;
- binary patches for both state transitions;
- untracked base64 content;
- out-of-scope refusal with zero provider calls.

`npm run lint` remains **EXECUTION-FAILED** from earlier validation because the declared ESLint executable is not installed. Installing or changing package files was outside authority.

## Abstraction accounting

- **Allocation metadata** — users: Stage-3 admission, builder context, completion coverage; variation: implement/preserve/change slices; rejected prose extraction because omissions would be nondeterministic.
- **Evidence/review outcome sums** — users: builder-result validation and reviewer routing; variation: pass/fail/not-run/execution-failed and accept/refine/decision; rejected nullable fields because invalid combinations would be representable.
- **Candidate checkpoint** — users: evidence binding, reviewer subject, drift checks; variation: independent index/working bytes and modes; rejected HEAD or porcelain alone because neither identifies the complete candidate.
- **Candidate-observation seam** — users: live CLI and disposable Git tests; boundary: Git/filesystem facts versus pure policy; rejected mechanism calls inside core.
- **Candidate-tracking state** — users: build resume and evidence reuse checks; variation: building versus evidence-bound; rejected process-local state because interruption would lose the bound subject.
- **Verification/review records** — users: operator handoff and future Stage-4 input; variation: provider claims versus runtime-bound identity; rejected local logs alone because cleanup would erase evidence.
- **Exclusive-create seam** — users: ordered two-record publication and failure tests; variation: successful creation versus either write failure; rejected direct application-layer filesystem writes.
- **Role output-contract union** — users: builder/reviewer live composition and dry-run; variation: legacy, v2 document, and v3 implementation protocols; rejected repeated unchecked strings because a typo could misroute role output.

No commit, real-provider invocation, actual-candidate evidence publication, operator acceptance, release, or deployment was performed. The uncommitted candidate is ready for independent review.
