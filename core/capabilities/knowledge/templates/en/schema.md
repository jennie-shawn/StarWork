# Knowledge Base Maintenance Rules

## What Belongs Here

- Project understanding that will be useful again.
- Important concepts, objects, methods, patterns, examples, and counterexamples.
- Judgment supported by multiple sources or repeated project experience.
- Knowledge the user explicitly wants to preserve long term.

## What Does Not Belong Here

- Raw PDFs, screenshots, full webpages, or meeting transcripts.
- Temporary drafts, one-off task notes, or command output.
- Final deliverables that the user has not approved.
- Vague summaries without source or context.

## `pages/` Rules

`pages/` stores stable topic pages. Each page should focus on one topic, concept, object, or method.

Suggested structure:

```markdown
# Topic

## Current Understanding

## Key Facts

## Examples And Counterexamples

## Related Topics

## Sources
```

## `synthesis/` Rules

`synthesis/` stores synthesized judgment. It should connect multiple topic pages, sources, and project experience.

Good fits:

- Stage reviews.
- Strategy decisions.
- Method summaries.
- Relationships and tradeoffs across topics.

## Source Rules

- Important judgment should be traceable to sources.
- Source summaries and locations belong in `sources/`.
- Mark uncertain content as unverified.

## Update Rules

After maintaining the knowledge base:

1. Update related `pages/` or `synthesis/`.
2. Update `index.md`.
3. Record the change in `log.md`.
