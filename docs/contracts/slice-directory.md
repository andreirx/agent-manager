# Slice Directory Contract

Status: DRAFT
Version: 0.1.0

This contract defines filesystem invariants for slice directories. It does not define workflow semantics, artifact content schemas, or agent behavior beyond what tooling and traceability require.

## 1. Location

All slice directories live under `slices/` at repository root.

```
slices/
  <slice-id>/
  <slice-id>/
  ...
```

## 2. Slice ID

A slice ID is a directory-safe string.

**Rule**: `^[A-Za-z0-9][A-Za-z0-9._-]*$`

**Valid examples**:
- `R4-4`
- `S001`
- `feature-auth-flow`
- `JIRA-123`

**Invalid examples**:
- `-leading-hyphen`
- `has spaces`
- `has/slash`

Business meaning of IDs is user-defined. The system treats IDs as opaque stable identifiers.

## 3. Required Root Files

Every slice directory must contain:

| File | Purpose |
|------|---------|
| `brief.md` | Human-readable slice brief. Required to open a slice. |
| `status.json` | Authoritative slice state. Single source of truth for current phase. |

To close a slice:

| File | Purpose |
|------|---------|
| `final-status.json` | Terminal state record. Required when slice reaches DONE, ESCALATED, or CANCELLED. |

## 4. Status File

`status.json` is authoritative.

Current phase is read from `status.json`, not inferred from artifact presence.

Minimal required fields:

```json
{
  "sliceId": "<slice-id>",
  "phase": "<workflow-phase>",
  "updatedAt": "<ISO-8601 timestamp>"
}
```

Additional fields may be added. The schema will be defined in `docs/contracts/slice-status-schema.md` when frozen.

## 5. Reserved Subdirectory Names

The following subdirectory names are reserved for conventional use:

| Name | Conventional purpose |
|------|---------------------|
| `context/` | External context artifacts (repo-graph outputs, orientation data) |
| `design/` | Design artifacts and design reviews |
| `implementation/` | Implementation artifacts and implementation reviews |
| `verification/` | Test plans, test evidence, verification reviews |
| `runs/` | Run records for provider executions |

All reserved subdirectories are optional. A slice may use none, some, or all.

New subdirectories may be created. Names should follow the same slug rule as slice IDs.

## 6. File Format Rules

Default rules:

| Content type | Format |
|--------------|--------|
| Human-authored narrative | Markdown (`.md`) |
| Machine-structured artifacts | JSON (`.json`) |
| Supervisor state | JSON (`.json`) |

These are defaults, not absolute constraints. Mixed-content formats may be documented in future artifact-specific contracts.

## 7. Artifact Versioning

Versioning is local per artifact family within a subdirectory.

Use `-v<n>` suffix only when multiple revisions of the same artifact kind exist.

**Examples**:
- First design: `design.md` or `design-v1.md`
- After revision: `design-v1.md`, `design-v2.md`
- First review: `design-review.json`
- After re-review: `design-review-1.json`, `design-review-2.json`

Version numbers are sequential integers starting at 1.

There is no global slice-wide revision counter.

See `artifact-naming.md` for full naming rules.

## 8. Review Artifact Placement

Review artifacts live beside the artifact they review.

**Example**:
```
design/
  design-v1.md
  review-1.json      # reviews design-v1.md
  design-v2.md
  review-2.json      # reviews design-v2.md
```

The relationship between review and reviewed artifact must be explicit in the review artifact's metadata, not implied solely by path adjacency.

## 9. Freeze Artifacts

A freeze artifact records a workflow control event, not just file presence.

Freeze artifacts are JSON with required fields:

```json
{
  "frozenArtifact": "<relative path within slice>",
  "version": "<artifact version if applicable>",
  "frozenAt": "<ISO-8601 timestamp>",
  "frozenBy": {
    "role": "<role-id>",
    "runId": "<run-id>"
  },
  "note": "<optional human note>"
}
```

Naming convention: `<artifact-family>-freeze.json`

**Example**: `design/design-freeze.json`

## 10. Authoritative vs Derived

| Category | Examples | Rule |
|----------|----------|------|
| Authoritative | `brief.md`, `status.json`, `design/design-v2.md`, `design/design-freeze.json`, `runs/run-001.json` | Tracked in git. Source of truth. |
| Derived / Ephemeral | Rendered views, cached summaries | May be gitignored or regenerated. Not source of truth. |

If it affects workflow state, it must be authoritative.

## 10.1 Run Records

Run records are authoritative artifacts.

Run records live in `runs/` subdirectory within the slice.

A run record captures:
- What was executed (role, provider, prompts used)
- When it was executed
- What artifacts were produced
- Where raw logs are stored

Run records enable traceability from workflow state back to execution evidence.

See `provider-adapter.md` for run record fields.

## 11. Example Slice Structure

```
slices/R4-4/
  brief.md                    # required
  status.json                 # required
  context/                    # optional
    orient.json
    check.json
  design/                     # optional
    design-v1.md
    design-review-1.json
    design-v2.md
    design-review-2.json
    design-freeze.json
  implementation/             # optional
    plan.md
    diff-review.json
  verification/               # optional
    test-plan.md
    test-evidence.json
  runs/                       # optional, authoritative
    run-001.json
    run-002.json
  final-status.json           # required at close
```

## 12. Extensibility

This contract defines invariants. It does not constrain:

- Additional subdirectories beyond reserved names
- Additional files within subdirectories
- Artifact content beyond what routing and traceability require
- Business semantics of slice IDs
- Workflow creativity within phases

Extensions should be documented in separate contracts or decision records.

## 13. What This Contract Does Not Define

- Content schemas for individual artifact types (separate contracts)
- Workflow state machine transitions (see `docs/ARCHITECTURE.md`)
- Provider behavior (see `docs/contracts/provider-adapter.md`)
- Log file placement (see `docs/contracts/log-naming.md`)
