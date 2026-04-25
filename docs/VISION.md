# Agent Manager Vision

Status: draft

## Core Direction

Agent Manager is a supervisor for long-running software development workflows executed by coding agents.

It is not a code-analysis engine.
It is not a chat frontend.
It is not a generic prompt playground.

Its purpose is to coordinate specialized agent roles across a software-delivery workflow, preserve traceable state on disk, and reduce unnecessary human relay work between builder and reviewer agents.

## Problem

Current multi-agent development often degrades into manual message passing:

- the human briefs one agent
- forwards the result to another agent for critique
- relays critique back for revision
- repeats this across design, implementation, and review

This keeps the human in the transport loop instead of the decision loop.

That is the wrong allocation of attention for mature product development.

## Product Thesis

The supervisor should own workflow state, artifact routing, role protocol, and traceability.

The human should only be required for:

- product-direction changes
- architectural decisions
- conflict resolution
- escalations
- final acceptance when required by policy

Everything else should be explicit, machine-routable, and replayable from files.

## Primary Use Case

The first target use case is product development on serious codebases, including large legacy and enterprise repositories where orientation cost is high and architectural drift risk is real.

The initial motivating workflow is:

1. A slice is assigned to a builder.
2. The builder produces a design.
3. A reviewer critiques the design.
4. The builder revises until the design is accepted or escalated.
5. The builder implements against the accepted design.
6. The reviewer critiques the implementation and diff.
7. The builder reworks until the slice passes or escalates.

The supervisor manages this loop without requiring the human to manually forward outputs between tools.

## Role-Based SDLC Model

Agent Manager is organized around traditional software-delivery roles rather than around vendor-specific tools.

Examples:

- requirements engineer
- developer
- reviewer
- tester

These roles are stable product concepts.
Concrete agent tools are replaceable delivery mechanisms.

Examples of tool providers that may back a role:

- Claude Code
- Codex
- OpenCode
- future providers

This separation is mandatory.
The workflow should depend on role contracts, not on a specific vendor CLI.

## Product Boundary

Agent Manager owns:

- workflow orchestration
- role definitions
- provider abstraction
- artifact contracts
- traceability
- escalation logic
- session supervision

Agent Manager does not own:

- code graph intelligence
- repository archaeology
- architectural orientation facts
- semantic code indexing

Those concerns belong to tools such as repo-graph.

Repo-graph and Agent Manager are intended to complement each other:

- repo-graph provides deterministic architectural truth and orientation surfaces
- Agent Manager provides role-driven workflow supervision over agent work

## Traceability Model

Traceability is a first-class requirement.

The system should preserve:

- slice briefs
- role prompts
- system prompts
- input artifacts
- output artifacts
- review findings
- design freeze points
- implementation diffs
- test evidence
- escalation decisions
- final outcomes

The source of truth is text and JSON on disk.

The system should remain inspectable with normal engineering tools:

- editor
- grep
- diff
- git
- shell

No database is required for the core product model.
If durable structured state cannot be understood by reading files in the repository, the design is drifting away from the intended operating model.

## Architectural Principles

### 1. Roles before providers

The stable abstraction is the SDLC role.
The provider adapter is a replaceable mechanism.

### 2. Files before hidden state

Workflow state should be reconstructible from persisted files.
Agent memory is not the system of record.

### 3. Structured contracts before prose

Free-form prose may exist for humans, but machine routing should depend on explicit schemas and typed artifacts.

### 4. Supervisor as protocol authority

The supervisor decides:

- what phase a slice is in
- what artifacts are authoritative
- what findings must be addressed
- when to loop
- when to escalate
- when a slice is complete

### 5. Critic independence

Reviewer roles should preserve independent judgment.
The same agent that implements a slice should not be trusted as the sole authority on whether it is acceptable.

### 6. Tool-provider openness

The system should be built so that new providers can be added without redefining the workflow model.

## Initial Workflow Shapes

The earliest product shape is expected to support at least:

- design review loops
- implementation review loops
- test / verification loops
- escalation handoff to human

Each loop should be grounded in persisted artifacts rather than transient terminal output.

## Relationship to Repo-Graph

Repo-graph is strategically important because it can supply deterministic orientation and trust surfaces for large codebases.

Agent Manager should be able to feed role-specific agents with repo-graph outputs such as:

- orientation summaries
- focus explanations
- trust checks
- module and boundary information
- quality-control signals

This is especially important for enterprise repositories where raw file reading is too expensive and too lossy for high-quality agent planning.

Agent Manager should therefore be compatible with TypeScript-friendly tooling and workflows used around repo-graph, while still keeping provider integration open.

## Near-Term Vision

In the near term, Agent Manager should become a reliable local supervisor that:

- manages long-running builder/reviewer sessions
- routes structured artifacts between them
- records a complete slice trail on disk
- supports multiple provider adapters
- reduces the human from transporter to authority

## Long-Term Vision

In the long term, Agent Manager should evolve into a role-driven software-delivery supervisor for agentic product development.

That means:

- explicit SDLC roles
- reusable role protocols
- provider-agnostic orchestration
- traceable decisions
- replayable workflows
- integration with deterministic engineering-intelligence systems such as repo-graph

The long-term value is not "many chat sessions."
The long-term value is controlled, inspectable, role-based execution of software work across large and evolving codebases.

## Non-Goals

At this stage, Agent Manager is not trying to be:

- a replacement for git
- a replacement for project management systems
- a generalized agent swarm platform
- a code indexer
- a persistent database application
- a vendor-specific wrapper permanently tied to Claude Code or Codex

## Current Assumptions

These are working assumptions, not yet frozen architecture:

- persistent state should be plain files, primarily text and JSON
- multiple providers should be supported through adapters
- traditional SDLC roles are the stable product abstraction
- repo-graph is an important companion system for orientation on large codebases
- the first practical workflow is builder/reviewer supervision

## Open Decisions

The following are intentionally not locked by this vision document:

- implementation language
- runtime model (CLI tool, daemon, hybrid)
- tmux as required substrate versus optional substrate
- exact on-disk artifact schema
- exact provider adapter API
- exact role catalog and promotion path from prototype to mature

These belong to architecture and design documents, not to the vision layer.
