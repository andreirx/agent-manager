# Agent Manager - Project Instructions

## Read Order

1. `docs/VISION.md` — product purpose and boundaries
2. `docs/ARCHITECTURE.md` — architectural layers, domain model, storage model
3. `docs/contracts/` — machine contracts (once they exist)
4. This file — execution rules

## Hard Constraints

1. **Self-hosting governs scope.** A feature is not mature if it cannot be exercised by the product on itself in a controlled slice.

2. **Dependencies point inward.** Core never imports adapters. See `docs/ARCHITECTURE.md` section 3.

3. **Files are the system of record.** No database. No hidden state. If correctness requires something not reconstructible from tracked files, the design is wrong.

4. **Roles are stable. Providers are volatile.** Core workflow depends on role contracts. Provider-specific behavior stays in adapters.

5. **Silent drift is forbidden.** Once a design is frozen, any divergence must be explicit.

## Technology Stack

- TypeScript
- Node.js
- Text and JSON files on disk
- Git for version history

## Storage Rules

### Tracked (committed)

| Directory | Contains |
|-----------|----------|
| `slices/` | Authoritative workflow artifacts |
| `prompts/` | System prompts, role prompts |
| `schemas/` | JSON schemas for machine contracts |
| `templates/` | Artifact templates |

### Gitignored

| Directory | Contains |
|-----------|----------|
| `logs/` | Raw execution traces |

### Log naming pattern

```
YYYY-MM-DD_HH-MM-SSZ__<role>__<provider>__slice-<id>.<ext>
```

## Module Maturity Levels

All modules must declare maturity in their header comment or README.

| Level | Meaning |
|-------|---------|
| PROTOTYPE | Contracts still being shaped. Expect breaking changes. |
| MATURE | Stable contracts. Breaking changes require decision record. |
| PRODUCTION | Battle-tested. Breaking changes require migration path. |

## Technical Debt Recording

When creating technical debt, add an entry to `docs/TECH-DEBT.md` with:

- ID (TD-001, TD-002, etc.)
- Date
- What was done
- Why acceptable
- Proper solution
- When to address
- Status

## When Making Changes

1. **Read the architecture first.** `docs/ARCHITECTURE.md` defines layers, entities, and boundaries.

2. **Check module maturity.** PROTOTYPE can break freely. MATURE/PRODUCTION require care.

3. **Check contracts.** Once `docs/contracts/` exists, changes must respect frozen contracts or update them explicitly.

4. **Provider logic stays in adapters.** If you find yourself checking provider name in core, refactor.

5. **Ask before implementing open decisions.** See `docs/ARCHITECTURE.md` section 14 for unfrozen decisions.

## Commands and Workflows

| Command | Purpose |
|---------|---------|
| `npm run relay -- <slice-id>` | Self-host relay on an AM-* slice inside agent-manager |
| `npm run relay-target -- <target-path> [opts]` | Target-owned relay on an external repo (e.g. `../repo-graph`) |
| `npm run am-001` | One-shot builder run for AM-001 |
| `npm run human` | Record a human intervention |
| `npm run typecheck` | `tsc --noEmit` |

`relay-target` options: `--builder claude|codex`, `--supervisor claude|codex`,
`--shared-prompt <path>`, `--max-iter <n>`, `--until <phase>`, `--dry-run`.
See `docs/contracts/target-owned-relay.md`.

## Current Phase

Simplified relay system (READY).

Completed:
- Phase 0-4: Infrastructure validated
- Scope correction: Simplified from "workflow platform" to "relay automation"
- Codex adapter
- Relay loop use case
- Reviewer prompt with verdict format

To run relay: `npm run relay -- <slice-id>`

Minimal filesystem per slice:
```
slices/<id>/
  brief.md       # task description
  current.md     # latest artifact
  context.md     # generated context for actor
  status.json    # phase, updatedAt, lastActor
  notes-for-human.md  # only when blocked
```

Relay loop:
1. Read brief + current
2. Send to builder (claude) or reviewer (codex) based on phase
3. Parse verdict from reviewer (STATUS: approved|revise|escalate)
4. Update current.md and status.json
5. Stop on blocked or max iterations

Human only needed for:
- Deadlock breaking
- Ambiguous decisions
- Final acceptance

### Target-owned relay (PROTOTYPE)

Drives the loop on an external repo with that repo as the system of record.
Distinct from self-host relay: `promptRoot` (agent-manager prompts) and
`workingDir` (target repo) are separate; the builder edits the target's working
tree; the reviewer reads the resulting `git diff`; either role can be Claude or
Codex.

Phase graph: `select-slice` → (`implement` → `review-impl`)* → `done` | `blocked`.
Selection is **read-only** (supervisor only picks a slice; AM writes
`selection.json`). `--max-iter` bounds build/review **cycles**. The active slice
is tracked in `current.json`, so `--until select-slice` then a plain run resume
the same slice (`--slice <id>` / `--reselect` to override). Each provider call
writes a `runs/*.json` run record referencing its log path.

The target is **always** the `<target-path>` argument; no repo is hardcoded
(`../repo-graph` is only an example). The relay provisions
`<target>/.agent-manager/` (committed artifacts + run records; `logs/` ignored)
on first run for any target.

Run: `npm run relay-target -- <target-path>` (add `--dry-run` first to inspect
the exact provider invocations). Full contract: `docs/contracts/target-owned-relay.md`.
