# Cursor Adapter Rules

Cursor uses `.cursor/rules/starwork.mdc` as the StarWork entry.

Cursor can discover project Skills from `.cursor/skills/` and `.agents/skills/`, and can also see compatible `.claude/skills/` and `.codex/skills/` directories. StarWork still treats `.starwork/skills.json` as the project Skill fact source.

Cursor session automation is partial in v0.1. If automatic delivery is not verified, StarWork must generate a handoff message instead of claiming delivery.
