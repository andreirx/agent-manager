# First Self-Hosting Slice Definition

Status: DRAFT
Version: 0.1.0

This document defines the first vertical slice for self-hosting validation.

## 1. Slice Identity

| Field | Value |
|-------|-------|
| Slice ID | `AM-001` |
| Title | Implement minimal core domain model |
| Target | Agent Manager repository |

## 2. Purpose

Prove that Agent Manager can:
1. Create a tracked slice directory
2. Load a tracked prompt asset
3. Run a provider in headless mode
4. Capture raw output to logs
5. Write authoritative output artifact to slice
6. Record a run record

Builder-only. No reviewer loop.

## 3. Scope

Implement the minimal core entities for Phase 1:
- `Role`
- `Slice`
- `WorkflowPhase`
- `ArtifactRef`
- `RunRecord`

As TypeScript in `src/core/`.

## 4. Minimum Exercised Path

1. Create `slices/AM-001/` with `brief.md` and `status.json`
2. Load prompt assets from `prompts/`
3. Invoke Claude adapter in headless mode
4. Adapter captures output to `logs/` per `log-naming.md`
5. Supervisor writes output artifact to slice directory
6. Supervisor writes run record to `runs/` per `slice-directory.md`
7. Supervisor updates `status.json`

## 5. Success Criteria

1. Slice directory exists with required root files (`brief.md`, `status.json`)
2. At least one output artifact exists in slice
3. Run record exists in `runs/` with:
   - Run ID
   - Slice ID
   - Role
   - Provider
   - Prompt references with digests
   - Log path reference
   - Timestamps
   - Status
4. Log file exists at referenced path
5. All naming follows frozen contracts

## 6. Contracts Consumed

This slice validates:
- `slice-directory.md` — directory structure, required files, `runs/` placement
- `artifact-naming.md` — output artifact naming
- `log-naming.md` — log file naming
- `prompt-assets.md` — prompt loading and digest recording
- `provider-adapter.md` — adapter interface, run request/result

## 7. What This Slice Does Not Test

- Reviewer loop
- Design freeze workflow
- Implementation phase
- Multiple providers
- Artifact routing between roles
- Escalation
- Schema-constrained output

## 8. Definition of Done

1. Phase 0 contracts frozen
2. Phase 1 core entities implemented
3. Phase 2 ports implemented
4. Phase 3 Claude adapter implemented
5. Slice `AM-001` executed
6. All success criteria met
