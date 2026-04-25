# Prompt Assets Contract

Status: DRAFT
Version: 0.1.0

This contract defines structure and referencing rules for prompt assets. Prompts are tracked product assets, not ephemeral configuration.

## 1. Location

All prompt assets live under `prompts/` at repository root.

```
prompts/
  system/
  roles/
  templates/
```

The `prompts/` directory is tracked in git.

## 2. Directory Structure

| Directory | Purpose |
|-----------|---------|
| `prompts/system/` | System prompts shared across roles |
| `prompts/roles/` | Role-specific prompts |
| `prompts/templates/` | Prompt templates with variable placeholders |

## 3. Filename Rules

Prompt filenames follow artifact naming rules:

**Rule**: `^[a-z][a-z0-9-]*\.md$`

**Examples**:
- `system/base.md`
- `roles/builder.md`
- `roles/reviewer.md`
- `templates/design-review-request.md`

Prompts are Markdown files. They may contain structured frontmatter.

## 4. Frontmatter

Prompt files may include YAML frontmatter.

Frontmatter is optional. When used, it is advisory metadata for human and tooling convenience.

**Example**:

```markdown
---
version: 1
role: builder
---

# Builder System Prompt

...
```

**Common advisory fields**:
- `version` — human-tracked version
- `role` — which role this prompt serves
- `requires` — other prompts to include
- `variables` — template variables used

Frontmatter fields are not frozen by this contract. Tooling may define additional fields as needed.

## 5. Prompt Composition

A complete prompt sent to a provider may be composed from:
1. System prompt(s)
2. Role prompt
3. Slice context (brief, artifacts)
4. Task-specific instructions

Composition rules are adapter-specific. This contract defines only the asset structure.

## 6. Run Record Reference

When a run is recorded, it must reference prompts used:

```json
{
  "prompts": [
    {
      "path": "prompts/system/base.md",
      "digest": "sha256:abc123..."
    },
    {
      "path": "prompts/roles/builder.md",
      "digest": "sha256:def456..."
    }
  ]
}
```

| Field | Purpose |
|-------|---------|
| `path` | Relative path from repository root |
| `digest` | Content hash at time of use |

The digest ensures reproducibility even if the prompt file changes later.

## 7. Digest Algorithm

Use SHA-256 for prompt digests.

Format: `sha256:<hex-digest>`

Compute over the raw file content (including frontmatter).

## 8. Template Variables

Template prompts may contain variables:

```markdown
You are reviewing slice {{slice_id}}.

The brief is:
{{brief_content}}
```

Variable syntax: `{{variable_name}}`

Variable substitution happens at render time, not in the stored asset.

## 9. Rendered Prompt Logging

The fully rendered prompt (after composition and substitution) may be logged to `logs/`.

This is operational evidence, not an authoritative asset.

Log filename should follow log naming contract with appropriate identifiers.

## 10. Versioning

Prompt files are versioned through git.

The `version` field in frontmatter is advisory for human tracking.

The `digest` in run records is authoritative for reproducibility.

## 11. Reserved Names

| Path | Purpose |
|------|---------|
| `prompts/system/base.md` | Default system prompt |
| `prompts/roles/builder.md` | Builder role prompt |
| `prompts/roles/reviewer.md` | Reviewer role prompt |
| `prompts/roles/tester.md` | Tester role prompt |

These are reserved conventions, not required files. Create as needed.

## 12. What This Contract Does Not Define

- Prompt content or writing guidelines
- Provider-specific prompt formatting
- Prompt selection logic (adapter concern)
- Maximum prompt lengths
- Prompt caching strategies
