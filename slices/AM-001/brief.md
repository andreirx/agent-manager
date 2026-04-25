# AM-001: Implement Minimal Core Domain Model

## Objective

Implement the minimal core domain model for Agent Manager Phase 1.

## Scope

Implement these five entities in `src/core/`:
- Role
- Slice
- WorkflowPhase
- ArtifactRef
- RunRecord

## Constraints

- No hidden time generation (timestamps provided by caller)
- No filesystem path derivation (storage layer concern)
- No built-in role catalogs (deferred)
- Serializable to JSON for file contracts
- Strict TypeScript

## References

- `docs/ARCHITECTURE.md` - architectural layers and domain model
- `docs/contracts/slice-directory.md` - status.json structure
- `docs/contracts/provider-adapter.md` - run record fields

## Acceptance Criteria

1. All five entities have TypeScript types/interfaces
2. Validation functions for IDs (slice ID, role ID)
3. Factory functions that accept explicit timestamps
4. No dependencies on external systems
5. Compiles with strict TypeScript settings
