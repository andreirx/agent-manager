# Log Naming Contract

Status: DRAFT
Version: 0.1.0

This contract defines naming and placement rules for execution logs. Logs are operational exhaust, not authoritative workflow state.

## 1. Location

All logs live under `logs/` at repository root.

```
logs/
  <log-file>
  <log-file>
  ...
```

The `logs/` directory is gitignored.

## 2. Authoritative vs Logs

| Category | Location | Tracked | Purpose |
|----------|----------|---------|---------|
| Authoritative artifacts | `slices/` | Yes | Workflow state, source of truth |
| Execution logs | `logs/` | No | Operational evidence, debugging, audit |

Logs are never the source of truth for workflow state.

If something affects workflow decisions, it must be extracted into an authoritative artifact.

## 3. Filename Pattern

```
<timestamp>__<role>__<provider>__slice-<id>.<ext>
```

**Components**:

| Component | Format | Example |
|-----------|--------|---------|
| `timestamp` | `YYYY-MM-DD_HH-MM-SSZ` | `2026-04-25_14-32-00Z` |
| `role` | Role identifier | `builder`, `reviewer` |
| `provider` | Provider identifier | `claude`, `codex` |
| `slice-<id>` | Literal `slice-` prefix + slice ID | `slice-R4-4`, `slice-S001` |
| `ext` | File extension | `txt`, `json`, `log` |

**Separator**: Double underscore `__` between components.

**Examples**:
- `2026-04-25_14-32-00Z__builder__claude__slice-R4-4.txt`
- `2026-04-25_15-01-30Z__reviewer__codex__slice-R4-4.json`
- `2026-04-25_16-45-12Z__builder__claude__slice-S001.log`

## 4. Timestamp Rules

- UTC timezone (Z suffix)
- Sortable format: `YYYY-MM-DD_HH-MM-SSZ`
- Hyphen separates date components
- Underscore separates date from time
- Hyphen separates time components

This ensures lexicographic sorting matches chronological order.

## 5. Role Identifier

Use the role that initiated the run:
- `builder`
- `reviewer`
- `tester`
- `requirements`

Role identifiers are lowercase, hyphenated if compound.

## 6. Provider Identifier

Use the adapter/provider identifier, not the model:
- `claude`
- `codex`
- `opencode`

Provider identifiers are lowercase.

Model information (e.g., `opus-4-5`, `gpt-5.4`) belongs in the run record metadata, not the log filename.

## 7. Extension Rules

| Extension | Content |
|-----------|---------|
| `.txt` | Plain text stdout/stderr capture |
| `.json` | Structured output, stream events |
| `.log` | Combined or annotated log |

Default to `.txt` for raw captures, `.json` for structured streams.

## 8. Log Content Types

Logs may contain:
- Raw prompts sent to provider
- Raw stdout/stderr from provider CLI
- Stream events (for streaming providers)
- Terminal captures
- Retry traces
- Timing information

Logs should not contain:
- Secrets or credentials
- Authoritative workflow state (belongs in artifacts)

## 9. Subdirectories

For high-volume logging, subdirectories by date are permitted:

```
logs/
  2026-04-25/
    <log-file>
    <log-file>
  2026-04-26/
    <log-file>
```

This is optional. Flat structure is acceptable for moderate volume.

## 10. Retention

Log retention is not defined by this contract.

Logs are gitignored and may be deleted without affecting workflow correctness.

Operators may implement retention policies externally.

## 11. Correlation

Each log should be traceable to a run record.

The run record (stored as authoritative artifact or in slice state) references the log path.

Direction of reference:
- Run record → log path (authoritative)
- Log filename → slice ID (for grep convenience)

## 12. What This Contract Does Not Define

- Log content schemas
- Compression or rotation policies
- Remote log shipping
- Log parsing for metrics
