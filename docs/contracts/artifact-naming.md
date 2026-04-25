# Artifact Naming Contract

Status: DRAFT
Version: 0.1.0

This contract defines naming rules for artifacts within slice directories. It complements `slice-directory.md` which defines directory structure and placement.

## 1. Scope

This contract covers:
- Artifact filename rules
- Extension rules
- Reserved artifact names

This contract does not cover:
- Artifact content schemas (separate contracts)
- Directory placement (see `slice-directory.md`)
- Log file naming (see `log-naming.md`)

## 2. Artifact Categories

| Category | Pattern | Extension |
|----------|---------|-----------|
| Narrative artifact | `<family>[-v<n>].md` | `.md` |
| Structured artifact | `<family>[-v<n>].json` | `.json` |
| Review artifact | `<subject>-review[-<n>].json` | `.json` |
| Freeze artifact | `<family>-freeze.json` | `.json` |

## 3. Filename Rules

Artifact filenames must be directory-safe strings.

**Base name rule**: `^[a-z][a-z0-9-]*\.(md|json|txt)$`

This regex describes the base filename structure. Version and sequence suffixes (described below) are additional patterns applied to the base name before the extension.

**Components**:
- Lowercase alphanumeric with hyphens
- Starts with a letter
- Required extension

**Version/sequence suffixes** (applied to base name):
- Narrative versions: `-v<n>` (e.g., `design-v1.md`, `design-v2.md`)
- Review sequences: `-<n>` (e.g., `design-review-1.json`, `design-review-2.json`)

**Valid examples**:
- `brief.md`
- `design.md`
- `design-v1.md`
- `design-v2.md`
- `design-review.json`
- `design-review-1.json`
- `design-review-2.json`
- `diff-review.json`
- `design-freeze.json`

**Invalid examples**:
- `Brief.md` (uppercase)
- `design_v1.md` (underscore)
- `1-design.md` (starts with number)
- `design` (no extension)

## 4. Narrative Artifacts

Human-authored content. Markdown format.

**Pattern**: `<family>[-v<n>].md`

**Examples**:
- `brief.md`
- `design.md` or `design-v1.md`
- `plan.md`
- `test-plan.md`

Use `-v<n>` suffix only when multiple versions exist.

## 5. Review Artifacts

Structured review output. JSON format.

**Pattern**: `<subject>-review[-<n>].json`

**Examples**:
- `design-review.json` (single review)
- `design-review-1.json`, `design-review-2.json` (multiple reviews)
- `diff-review.json`
- `test-review.json`

The subject identifies what is being reviewed. Use `-<n>` suffix for sequential reviews of the same subject.

## 6. Freeze Artifacts

Structured freeze records. JSON format.

**Pattern**: `<family>-freeze.json`

**Examples**:
- `design-freeze.json`
- `plan-freeze.json`

One freeze artifact per frozen family.

## 7. Reserved Root Artifact Names

These filenames are reserved at slice root level:

| Name | Purpose | Required |
|------|---------|----------|
| `brief.md` | Slice brief | Yes |
| `status.json` | Authoritative slice state | Yes |
| `final-status.json` | Terminal state record | At close |

## 8. Extension Rules

| Extension | Use |
|-----------|-----|
| `.md` | Human-authored narrative content |
| `.json` | Machine-structured artifacts, supervisor state |
| `.txt` | Plain text when markdown structure not needed |

Default to `.md` for human content, `.json` for machine content.

## 9. What This Contract Does Not Define

- Which artifacts are required in which workflow phase
- Content schemas for specific artifact types
- How artifacts are created or updated
- Artifact relationships beyond naming convention
