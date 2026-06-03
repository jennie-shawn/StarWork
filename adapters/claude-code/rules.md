# Claude Code Adapter Rules

Claude Code uses `CLAUDE.md` as its project rule entry.

The entry should point Claude Code back to:

- `AGENTS.md`
- `.starwork/workspace.json`
- `.starwork/skills.json`
- `.claude/skills/`
- `.agents/skills/`

Claude Code can bind or resume sessions, and transcripts may be read as candidate evidence. It cannot safely receive background messages to another session in StarWork v0.1.
