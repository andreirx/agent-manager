STATUS: escalate

**Blocking feasibility conflict — Codex resumed permission posture.** SPS-L03 requires fresh and resumed calls to preserve read-only/write permission. Fresh Codex runs explicitly use `--sandbox` (`docs/contracts/target-owned-relay.md:290-294`; adapter builds `exec ... --sandbox ... -C ...`). Installed Codex 0.153.2 `codex exec resume --help` accepts model/config options but exposes neither `--sandbox` nor `-C`. Therefore a resumed invocation cannot presently demonstrate that the manager reapplies its required sandbox posture; relying on undocumented session inheritance would make the read-only reviewer claim unsafe.

This needs a human decision before implementation:

| Option | Reward | Risk |
|---|---|---|
| Ratify native Codex session-inherited posture, contingent on an isolated live proof that resume retains the original sandbox/root | Delivers the requested minimal native continuation design. | The relay cannot explicitly reassert those controls on each resumed invocation; CLI behavior may change. |
| Do not resume Codex until its CLI supports explicit equivalent controls | Preserves the existing explicit safety posture. | Does not meet the requested Codex portion of the slice. |
| Relax SPS-L03 for Codex resumes | Enables continuation now. | Weakens SPS-P02/read-only assurance; not recommended. |

**Implementation-critical correction once resolved.** SPS-L04 is not compatible with retaining the current retry shape unchanged. `runWithRetry()` performs failed/cancelled retries internally and only returns the final result (`src/application/use-cases/relay-target.ts:1354-1370`); run records are written only afterward (`1550-1560`, `1704-1715`). Thus a native ID observed on an earlier failed attempt would be lost before the next retry. The implementation must persist the role binding and an attempt record/callback before retrying—not merely add fields to the terminal record.

Everything else is appropriately bounded: the existing provider port is the earned boundary; state belongs beside `status.json`; builder and implementation-reviewer already have distinct dispatch sites and permissions; selection and decision-review remain out of scope. Re-delivering the current reviewed inputs on each call preserves SPS-P01. Baseline confirmed as `6a1c8c9d6737406c838861304753086c01eaad7c`; only the untracked slice document is present.