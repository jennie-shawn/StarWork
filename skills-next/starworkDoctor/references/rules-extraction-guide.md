# Rules Extraction Guide

Use this reference when generating an upgrade blueprint for a workspace that already has Agent-facing rule documents.

The goal is not to copy old rules into the new `AGENTS.md`. The goal is to preserve the user's useful intent while making StarWork rules shorter, clearer, and checkable.

## Read These Sources

Read only likely rule documents:

```text
AGENTS.md
CLAUDE.md
.cursorrules
.cursor/rules/*
.trae/rules/*
README.md sections that clearly describe Agent behavior
```

Do not scan all business documents just to find possible rules.

## Classify Old Rules

Classify each meaningful rule into one of five buckets:

| Bucket | Meaning | Output |
|---|---|---|
| Keep | Still valid behavior rule. | `rules/user-preserved-rules.md` |
| Merge | Same intent as StarWork boundary rules. | `rules/core-boundaries.md` |
| Covered | Already covered by Core / Kit / Pack. | `notes/original-rules-summary.md` |
| Conflict | Conflicts with StarWork state, unclear, or outdated. | `rules/rule-conflicts.md` |
| Background | Context, history, rationale, meeting notes. | Do not inject into `AGENTS.md` |

## What Counts As A Rule

Valid rules usually say:

- Read this first.
- Write here, not there.
- Treat this folder as read-only.
- Ask before changing this type of file.
- Use this command before committing.
- Do not overwrite or delete this category of content.

Not rules:

- Project history.
- Product pitch.
- Meeting notes.
- Long explanations.
- Low-confidence guesses.
- Old implementation details that no longer affect behavior.

## Required Upgrade Outputs

When generating an upgrade blueprint, produce:

```text
rules/core-boundaries.md
rules/user-preserved-rules.md
rules/rule-conflicts.md
notes/original-rules-summary.md
```

If no useful old rules exist, say so clearly and omit the `user.preserved.*` injection action.

## Injection Policy

Only inject concise rule fragments:

```json
{
  "type": "inject_agent_rules",
  "target": "AGENTS.md",
  "from": "rules/user-preserved-rules.md",
  "slot": "user.preserved.original_rules"
}
```

Never generate a full replacement `AGENTS.md`.

## Conflict Policy

Do not silently choose between conflicting rules.

Examples:

- Old rule says `输出/` is final, but user confirmed `成稿/` as final.
- Old rule says to edit `knowledge/`, but StarWork treats it as Hub read-only.
- Old rule says all project notes go into `README.md`, but StarWork requires current work entry.

Put these into `rules/rule-conflicts.md` and ask the user at most three questions.
