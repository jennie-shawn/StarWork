# Agent Rules Template

Use this template for rule fragments that will be injected into `AGENTS.md` through `starwork upgrade`.

Do not write a full `AGENTS.md`. Write only the body of one StarWork rule slot.

## Template

```markdown
### Read First

- ...

### Write Boundaries

- ...

### Preserve

- ...

### Confirm Before

- ...
```

## Style Rules

- Keep each section short.
- Use concrete paths.
- Say whether a path is read-only, draft, working, or final.
- Use "ask before" for risky operations.
- Do not include project history, rationale, or meeting notes.
- Do not write uncertain guesses as rules.

## Good Example

```markdown
### Read First

- Read `README.md` and `AGENTS.md` before changing project files.

### Write Boundaries

- Treat `资料库/` as read-only reference material.
- Put draft work in `输出/草稿/`.
- Treat `成稿/` as confirmed final output.

### Preserve

- Do not rename, move, or delete existing legacy folders during upgrade.

### Confirm Before

- Ask before changing final outputs, identity files, lessons, or shared knowledge.
```

## Bad Example

```markdown
This project started in 2024. The previous team used several folders and had many discussions about the writing process...
```

That is background, not an Agent rule.
