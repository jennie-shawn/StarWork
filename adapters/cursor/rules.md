# Cursor Adapter Rules

Cursor uses `.cursor/rules/starwork.mdc` as the StarWork entry.

Cursor can discover project Skills from `.cursor/skills/` and `.agents/skills/`, and can also see compatible `.claude/skills/` and `.codex/skills/` directories. StarWork still treats `.starwork/skills.json` as the project Skill fact source.

Cursor session automation is read-only in v0.2. StarWork may summarize `agent-transcripts/<uuid>/<uuid>.jsonl` for `multiagent read/status --host`, but must not write Cursor transcripts, create chats, or claim automatic cross-session delivery.
