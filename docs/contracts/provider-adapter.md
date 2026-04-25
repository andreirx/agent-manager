# Provider Adapter Contract

Status: DRAFT
Version: 0.1.0

This contract defines the interface between the supervisor and provider adapters. It does not define artifact semantics, which belong to slice and artifact contracts.

## 1. Purpose

A provider adapter translates between:
- Supervisor run requests (provider-agnostic)
- Provider CLI invocations (provider-specific)

The adapter isolates provider volatility from core workflow logic.

## 2. What an Adapter Does

1. Accepts a run request from the supervisor
2. Builds provider-specific command line
3. Injects prompt assets
4. Passes input artifacts
5. Executes the provider
6. Captures raw output to logs
7. Extracts structured result
8. Returns normalized run result to supervisor

## 3. Run Request

The supervisor sends a run request to the adapter.

**Required fields**:

| Field | Type | Purpose |
|-------|------|---------|
| `runId` | string | Unique identifier for this run |
| `sliceId` | string | Which slice this run belongs to |
| `role` | string | Role being executed (e.g., `builder`, `reviewer`) |
| `prompts` | list | Prompt references (path + digest) |
| `inputArtifacts` | list | Input artifact references (path + type) |

**Optional fields**:

| Field | Type | Purpose |
|-------|------|---------|
| `outputSchema` | object | JSON schema for structured output |
| `model` | string | Model override |
| `effort` | string | Reasoning effort level |
| `timeout` | number | Timeout in milliseconds |

The adapter must not interpret artifact content. It passes artifacts as opaque inputs.

## 4. Run Result

The adapter returns a normalized result.

**Required fields**:

| Field | Type | Purpose |
|-------|------|---------|
| `runId` | string | Matches request runId |
| `status` | enum | `completed`, `failed`, `timeout`, `cancelled` |
| `logPath` | string | Path to raw log file |
| `startedAt` | string | ISO-8601 timestamp |
| `completedAt` | string | ISO-8601 timestamp |

**Conditional fields**:

| Field | When | Purpose |
|-------|------|---------|
| `outputArtifacts` | on success | List of produced artifacts (content, suggested path, type) |
| `exitCode` | on failure | Provider exit code |
| `error` | on failure | Error description |

The supervisor decides where to write artifacts. The adapter only suggests paths.

## 5. Capability Declaration

Each adapter declares its capabilities at registration.

**Required capability fields**:

| Field | Purpose |
|-------|---------|
| `providerId` | Unique identifier (e.g., `claude`, `codex`) |
| `providerName` | Human-readable name |
| `supportsStructuredOutput` | Can enforce JSON schema |
| `supportsStreaming` | Can stream output |
| `supportsResume` | Can resume sessions |
| `supportsModelSelection` | Can override model |
| `supportsEffortSelection` | Can set reasoning effort |
| `supportedModes` | List of `headless`, `interactive` |

The supervisor uses capabilities to select appropriate adapters and configure runs.

## 6. Raw Output Capture

The adapter must capture raw provider output to logs.

Capture includes:
- stdout
- stderr
- stream events (if streaming)
- exit code
- timing

Log filename follows `log-naming.md` contract.

The adapter returns `logPath` in the result so the run record can reference it.

## 7. Prompt Injection

The adapter is responsible for injecting prompts in the provider-specific way.

Examples:
- Claude Code: `--system-prompt` flag or stdin
- Codex: `--prompt` flag or file input

The adapter reads prompt files from paths provided in the request.

## 8. Schema-Constrained Output

If `outputSchema` is provided in the request:
- Adapter should use provider's schema enforcement if available
- Claude Code: `--json-schema`
- Codex: `--output-schema`

If provider does not support schema enforcement, adapter may:
- Attempt to parse output as JSON
- Return parse error in result

## 9. Error Handling

**Two error categories with distinct handling:**

| Category | When | Handling |
|----------|------|----------|
| Composition/boot errors | Before runner executes (e.g., provider not installed, invalid config) | May throw. Caller handles before run starts. |
| Runtime execution failures | During provider execution (e.g., timeout, provider crash, parse failure) | Return `RunResult` with `status: 'failed'`. Never throw. |

This separation ensures callers have one error channel during execution.

## 10. Execution Mode Selection

Some providers support multiple modes (e.g., `codex exec` vs `codex review`).

Mode selection is adapter-internal based on:
- Role in the request
- Artifact types in input
- Adapter configuration

The supervisor does not specify provider-specific modes.

## 11. What Adapters Must Not Do

- Interpret artifact content semantics
- Make workflow decisions
- Modify authoritative artifacts directly
- Store state outside of logs and returned results
- Assume specific slice directory structure beyond paths provided

## 12. Adapter Registration

Adapters are registered with the supervisor at composition time.

Registration provides:
- Provider ID
- Capabilities
- Factory or runner instance

The runner exposes a single method to execute a run request and return a result.

## 13. Known Provider Surfaces

For reference, known provider CLI surfaces:

### Claude Code
- `claude --print` for headless output
- `--output-format json` for JSON output
- `--json-schema` for schema enforcement
- `--model` for model selection
- `--effort` for reasoning effort
- `--resume` / `--continue` for session management

### Codex
- `codex exec` for non-interactive execution
- `codex review` for code review mode
- `--model` for model selection
- `--output-schema` for schema enforcement
- `--json` for JSON output

## 14. What This Contract Does Not Define

- Artifact content semantics (see slice contracts)
- Workflow state transitions (supervisor concern)
- Which adapter to use for which role (configuration concern)
- Provider-specific configuration details
- Session management beyond single runs
- Exact interface signatures (implementation concern)
