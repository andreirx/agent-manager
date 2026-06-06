# Technical Debt Registry

Status: active

This document tracks technical debt, assumptions, and known divergences from the intended architecture.

## Format

Each entry should include:
- **ID**: Sequential identifier (TD-001, TD-002, etc.)
- **Date**: When the debt was incurred
- **What**: What was done
- **Why acceptable**: Why this was acceptable at the time
- **Proper solution**: What the proper implementation would be
- **When to address**: Trigger condition or timeline for resolution
- **Status**: OPEN | RESOLVED | ACCEPTED

---

## Current Entries

### TD-001

- **ID**: TD-001
- **Date**: 2026-06-06
- **What**: Relay composition now pins provider defaults to `claude-opus-4-8` for the builder and `gpt-5.5` with high reasoning effort for the reviewer, but the system does not preflight whether the installed provider CLIs currently expose those exact model selections.
- **Why acceptable**: Provider model selection is already a volatile adapter concern and the current request was a narrow setup update. The model strings are passed through existing provider selection mechanisms without changing core workflow policy.
- **Proper solution**: Add provider capability/model preflight at composition or adapter startup, surface unsupported model/effort combinations as composition errors, and document CLI/provider upgrade requirements.
- **When to address**: Before promoting provider adapters or the relay module beyond PROTOTYPE, or before relying on the relay loop for unattended production work.
- **Status**: OPEN

---

## Resolved Entries

(none yet)
