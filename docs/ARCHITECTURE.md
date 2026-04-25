# Agent Manager Architecture

Status: draft

This document defines the intended architectural boundaries for Agent Manager.

It is normative for:

- product boundaries
- module boundaries
- storage boundaries
- role and provider separation
- workflow-state ownership
- self-hosting constraints

It does not yet freeze:

- the final CLI surface
- the exact JSON schemas
- the exact prompt catalog
- the exact adapter command lines

Those belong in later contract documents once the support modules exist.

## 1. Governing Principles

### 1.1 Product purpose

Agent Manager is a role-driven supervisor for software-delivery workflows executed by coding agents.

The product exists to remove the human from the transport loop while preserving the human in the authority loop.

### 1.2 Stable abstraction: roles, not vendors

The durable product concepts are SDLC roles:

- requirements engineer
- developer
- reviewer
- tester

Provider tools such as Claude Code, Codex, or OpenCode are replaceable mechanisms behind those roles.

### 1.3 Files are the system of record

Persistent workflow state is stored as tracked text and JSON artifacts in the repository.

The raw execution trace is stored as gitignored logs.

No database is required for the core architecture.

### 1.4 Self-hosting bootstrap

Agent Manager must be usable to build Agent Manager.

This is a governing architectural constraint, not an aspirational note.

Implications:

- the product must expose its own workflow surfaces early
- the on-disk model must be readable and writable by both humans and agents
- the supervisor must be able to run real slices for this repository
- prompts, templates, and contracts must be tracked product assets

### 1.5 Clean Architecture

Dependency direction points inward.

- core policy does not depend on provider CLIs, terminal tools, or filesystem layout details
- adapters implement ports owned by the core
- the composition root wires concrete providers, storage mechanisms, and CLI entrypoints

## 2. System Context

Agent Manager sits above agent providers and beside repository-intelligence tools.

### External systems

- agent providers
  - Claude Code
  - Codex
  - future providers
- repository under change
- git
- optional tmux session manager
- repo-graph as orientation and quality-control substrate

### Product boundary

Agent Manager owns:

- role definitions
- provider abstraction
- workflow state machine
- artifact routing
- escalation decisions
- prompt/template versioning
- traceability rules

Agent Manager does not own:

- semantic code indexing
- graph extraction
- repository archaeology
- git history
- vendor-specific agent memory as source of truth

## 3. Architectural Layers

## 3.1 Core

Pure product policy.

Contains:

- role entities
- slice entities
- workflow state machine
- artifact classification rules
- escalation policy
- tracked-vs-log storage policy
- provider capability model

Must not depend on:

- Claude Code CLI
- Codex CLI
- tmux
- Node child process APIs directly
- filesystem libraries beyond abstract ports
- repo-graph command invocation details

## 3.2 Application / Use Cases

Orchestrates product policy through ports.

Contains use cases such as:

- create slice
- assign role
- enqueue provider run
- record output
- route review findings
- freeze design
- escalate slice
- close slice

Use cases coordinate multiple core objects but still depend only on ports.

## 3.3 Adapters

Concrete mechanisms that satisfy ports.

Examples:

- provider adapters
  - Claude Code adapter
  - Codex adapter
  - OpenCode adapter
- filesystem storage adapter
- repo-graph adapter
- tmux adapter
- wall-clock / timestamp adapter

Adapters are volatile by definition.
They are expected to change as provider CLIs and local tooling evolve.

## 3.4 Interface / Composition

Outer layer.

Contains:

- CLI entrypoints
- process wiring
- config loading
- dependency assembly
- operator-facing commands

This layer is the only place where concrete adapters are instantiated.

## 4. Proposed Source Layout

This is the intended repository shape.

```text
docs/
  VISION.md
  ARCHITECTURE.md
  contracts/
  decisions/

logs/                       # gitignored raw execution traces
slices/                     # tracked authoritative workflow artifacts
prompts/                    # tracked system prompts and role prompts
schemas/                    # tracked JSON schemas
templates/                  # tracked artifact templates

src/
  core/
    roles/
    slices/
    workflow/
    artifacts/
    providers/
    escalation/
  application/
    use-cases/
    ports/
  adapters/
    providers/
      claude-code/
      codex/
      opencode/
    filesystem/
    repo-graph/
    tmux/
    clock/
  cli/
  main.ts
```

## 5. Core Domain Model

The initial domain model should stay narrow.

### 5.1 Role

Represents a stable SDLC responsibility.

Fields should include:

- role id
- role name
- role purpose
- allowed workflow phases
- required prompt assets
- provider capability requirements

Examples:

- requirements-engineer
- developer
- reviewer
- tester

### 5.2 Provider

Represents a concrete execution mechanism.

Fields should include:

- provider id
- provider name
- execution mode
- supported capabilities
- output modes
- resume support
- schema-constrained output support

Provider is not the role.
A role is assigned to a provider run through policy and configuration.

### 5.3 Slice

The unit of supervised work.

Fields should include:

- slice id
- title
- status
- current phase
- assigned roles
- authoritative artifact references
- escalation status

### 5.4 Artifact

A tracked, authoritative unit of workflow state.

Examples:

- brief
- design draft
- design review
- design freeze
- implementation plan
- diff review
- test evidence
- final status

Artifacts are product state.
They are not interchangeable with logs.

### 5.5 Run Record

Represents one execution attempt against a provider.

Fields should include:

- run id
- slice id
- role id
- provider id
- model
- effort
- prompt asset references
- input artifact references
- output artifact references
- log references
- start time
- end time
- terminal status

### 5.6 Review Finding

Structured criticism emitted by reviewer-like roles.

Fields should include:

- finding id
- severity
- category
- evidence
- required action
- status

### 5.7 Escalation

Represents a handoff to human authority.

Fields should include:

- escalation id
- slice id
- reason code
- summary
- blocking artifacts
- decision status

## 6. Workflow Model

The workflow is an explicit state machine.

The system must never infer progress from provider memory alone.

### 6.1 Initial state set

- `BACKLOG`
- `DESIGN_DRAFT`
- `DESIGN_REVIEW`
- `DESIGN_REWORK`
- `DESIGN_FROZEN`
- `IMPLEMENTATION`
- `IMPLEMENTATION_REVIEW`
- `IMPLEMENTATION_REWORK`
- `TEST_PREPARATION`
- `TEST_EXECUTION`
- `TEST_REVIEW`
- `DONE`
- `ESCALATED`
- `CANCELLED`

The exact initial subset may be smaller in the first implementation, but the architecture should reserve space for traditional SDLC roles.

### 6.2 Transition authority

Only the supervisor may advance the authoritative phase of a slice.

Provider output may propose:

- approval
- revision
- escalation
- completion

But the supervisor decides the resulting state transition after validating the output contract and current slice policy.

### 6.3 Design freeze rule

Once a design is frozen:

- implementation must treat it as authoritative
- design drift must be explicit
- any reviewer-identified design defect discovered during implementation review must either:
  - trigger a controlled return to design work, or
  - be explicitly accepted as a divergence artifact

Silent scope drift is forbidden.

## 7. Storage Model

## 7.1 Tracked artifacts

Tracked artifacts are the system of record and belong under `slices/`.

Example:

```text
slices/R4-4/
  brief.md
  context/
    orient.json
    check.json
  design/
    design-v1.md
    review-1.json
    design-v2.md
    freeze.json
  implementation/
    plan.md
    diff-review-1.json
  verification/
    test-plan.md
    test-review-1.json
  final-status.json
```

These files are authoritative and intended to be committed.

## 7.2 Gitignored logs

Raw execution traces belong under `logs/`.

Examples:

- exact prompts sent
- raw stdout
- raw stderr
- stream events
- terminal captures
- retry traces

Recommended filename pattern:

```text
YYYY-MM-DD_HH-MM-SSZ__<role>__<provider>__slice-<id>.<ext>
```

Examples:

```text
2026-04-25_08-42-00Z__builder__claude-opus-4-5__slice-R4-4.txt
2026-04-25_09-03-00Z__reviewer__gpt-5.4__slice-R4-4.txt
```

These files are operational evidence, not authoritative workflow state.

## 7.3 Prompt assets

System prompts and role prompts are tracked under `prompts/`.

They are versioned product assets.

They must not live as untracked personal machine files once the product has an in-repo equivalent.

The run record should reference:

- prompt file path
- prompt digest
- optional rendered prompt output log

## 7.4 Schemas

Machine contracts belong under `schemas/`.

At minimum:

- role output schemas
- review finding schemas
- slice status schemas
- escalation schemas

The supervisor should validate structured outputs against tracked schemas before state transitions.

## 8. Provider Abstraction

Provider adapters exist to isolate volatile CLI behavior from core workflow policy.

### 8.1 Adapter responsibilities

- build provider-specific command lines
- inject tracked prompt assets
- pass input artifacts
- capture raw output into logs
- normalize results into internal DTOs
- report provider capabilities

### 8.2 Provider capability examples

- supports structured output schema
- supports streaming JSON events
- supports session resume
- supports long-running interactive mode
- supports explicit model selection
- supports explicit reasoning effort selection

### 8.3 Provider neutrality rule

The core workflow must not assume:

- a specific provider name
- a specific session model
- a specific output formatting quirk
- a specific prompt-injection mechanism

If a workflow rule depends on provider-specific behavior, that rule belongs in the adapter or in provider-specific configuration, not in the core.

## 9. Repo-Graph Integration Boundary

Repo-graph is an optional but strategically important external subsystem.

Its role is to provide deterministic orientation and quality-control context to agent runs.

### 9.1 Repo-graph inputs into Agent Manager

Examples:

- orientation summary
- trust check
- focus explanation
- module description
- boundary violations
- quality-control signals

### 9.2 Boundary rule

Agent Manager stores repo-graph outputs as input artifacts.

It does not reimplement repo-graph logic.

It does not become a graph engine.

It treats repo-graph outputs as external deterministic evidence that can be routed into role workflows.

## 10. Optional tmux Boundary

tmux is an operational mechanism, not a core dependency.

Use it only as:

- session host
- observability aid
- manual takeover mechanism
- long-running interactive provider container

Do not use tmux pane text as the primary system-of-record contract.

Primary contract remains tracked artifacts plus gitignored logs.

## 11. Self-Hosting Requirement

Self-hosting must guide sequence and scope.

### 11.1 Meaning

Agent Manager should become capable of supervising real slices in the Agent Manager repository as early as possible.

### 11.2 Initial dogfood slice target

The first usable vertical slice should support:

- one developer role
- one reviewer role
- tracked prompts in repo
- tracked slice artifacts
- gitignored run logs
- one provider adapter for Claude Code
- one provider adapter for Codex
- one supervised review/rework loop

### 11.3 Architectural test

A feature is not mature if it cannot be exercised by the product on itself in a controlled slice.

This mirrors the repo-graph principle of using repo-graph to build repo-graph.

## 12. Module Maturity Model

Modules must declare a maturity level.

Levels:

- `PROTOTYPE`
- `MATURE`
- `PRODUCTION`

Initial expected maturity:

| Module | Initial maturity | Reason |
|---|---|---|
| core workflow model | PROTOTYPE | new product, contracts still being shaped |
| provider adapters | PROTOTYPE | vendor CLIs volatile |
| filesystem artifact model | MATURE target | central to traceability; should stabilize early |
| prompt asset catalog | PROTOTYPE | role protocols still evolving |
| repo-graph adapter | PROTOTYPE | depends on external product evolution |

Promotion requires explicit criteria in later module-level docs.

## 13. Technology Decision

Initial implementation language: TypeScript.

Reasoning:

- compatible with the surrounding repo-graph toolchain
- well-suited for text, JSON, and schema-heavy orchestration
- good fit for provider adapter churn and prompt/template iteration
- supports early self-hosting without premature systems-level complexity

This is an implementation decision, not a core-domain dependency.

If future runtime demands shift toward a persistent systems daemon with heavier concurrency and operational control-plane requirements, the technology choice may be revisited. That would require an explicit architectural decision record, not silent drift.

## 14. Known Open Decisions

Not yet frozen:

- exact CLI commands
- exact JSON schema versions
- exact prompt catalog layout
- exact role-to-provider assignment mechanism
- whether interactive sessions and headless runs share one adapter interface or two
- whether operator notifications are in scope for the first release

## 15. Immediate Next Documents

This architecture document should be followed by:

1. `docs/contracts/slice-model.md`
   - authoritative on-disk slice structure
2. `docs/contracts/provider-adapter.md`
   - provider adapter input/output contract
3. `docs/contracts/logging.md`
   - raw log naming, placement, and retention rules
4. `docs/contracts/prompts.md`
   - tracked prompt asset structure and rendering rules
5. `docs/decisions/0001-typescript.md`
   - decision record for initial implementation language

## 16. Assumptions and Deliberate Constraints

Assumptions:

- provider CLIs remain available as local commands
- text and JSON are sufficient for the first product phase
- git is the canonical version history, not Agent Manager
- repo-graph remains a separate product boundary

Deliberate constraints:

- no database in the core architecture
- no vendor-specific workflow model
- no hidden state required for correctness
- no dependence on raw terminal text as the authoritative protocol
