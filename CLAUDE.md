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

(To be added as CLI surfaces are implemented)

## Current Phase

Phase 4 — first self-hosting vertical slice (READY TO RUN).

Completed:
- Phase 0: contracts frozen in `docs/contracts/`
- Phase 1: core entities in `src/core/`
- Phase 2: ports in `src/application/ports/`
- Phase 3: Claude adapter in `src/adapters/providers/claude-code/`
- Phase 4: AM-001 slice ready in `slices/AM-001/`

To run: `npm run am-001`

Next: Phase 5 — Codex adapter + review loop
