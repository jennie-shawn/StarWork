---
name: starworkKnowledgeProject
description: Maintain the current project's local StarWork knowledge base after it has been enabled by `starwork knowledge init`.
---

# starworkKnowledgeProject

Use this skill only inside a project that already has a local knowledge base enabled.

Before writing anything, run or inspect:

```bash
starwork knowledge status --json
```

Then read:

1. `schema.md` in the knowledge base root.
2. `index.md` in the knowledge base root.
3. Relevant existing files under `pages/` and `synthesis/`.

## What This Skill Does

- Turn stable, reusable understanding into topic pages under `pages/`.
- Turn cross-topic judgment, strategy, reviews, and decisions into files under `synthesis/`.
- Keep `index.md` useful as a map, not a dumping ground.
- Record meaningful maintenance changes in `log.md`.
- Put unresolved knowledge fragments in `inbox/` with a short reason.
- Keep source pointers in `sources/` when they help future review.

## Boundaries

- Do not put raw source files, meeting transcripts, command output, temporary drafts, or one-off task notes directly into the knowledge base.
- Do not move, delete, or rename old `知识/`, `knowledge/`, or similar folders without a user-confirmed blueprint.
- Do not submit anything to a Project Center shared knowledge area.
- Do not write empty summaries without source context.
- Do not use the knowledge base as the project's current task log or final output folder.

## Pages Versus Synthesis

Use `pages/` for stable subjects:

- concepts
- user groups
- product modules
- research topics
- reusable methods

Use `synthesis/` for connected thinking:

- strategy
- reviews
- phase conclusions
- tradeoff analysis
- cross-topic decisions

After updating either area, update `index.md` and `log.md`.
