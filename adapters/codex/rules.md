# Codex Adapter Rules

Codex uses `AGENTS.md` as the primary project rule entry.

The adapter should ensure Codex can find:

- `AGENTS.md`
- `.starwork/workspace.json`
- `.starwork/skills.json`
- `.agents/skills/`

Codex can support automatic MultiAgent `launch`, `read`, and `instruct`, but completion must still be verified through StarWork state and target thread reads.
