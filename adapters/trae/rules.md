# Trae Adapter Rules

Trae uses `.trae/rules/starwork.md` as the StarWork entry.

Trae can discover project Skills from `.trae/skills/` and `.agents/skills/`. When the same Skill exists in both locations, `.trae/skills/` wins. StarWork still treats `.starwork/skills.json` as the project Skill fact source.

Trae is a manual-handoff host in v0.1. It should not be described as supporting automatic background cross-session delivery.
