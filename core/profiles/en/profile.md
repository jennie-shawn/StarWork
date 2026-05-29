# en Profile v0.1

The `en` profile maps Core roles to English workspace paths.

It is suitable for open-source and English-language workspaces.

The profile includes English paths, English templates, English CLI prompts, and English kit language.

## Role Mapping

| Canonical role | Path |
|---|---|
| `agent.entry_rules` | `AGENTS.md` |
| `system.context.project_status` | `_system/context/current-project.md` |
| `system.context.decisions` | `_system/context/decisions.md` |
| `system.tasks.current_work` | `_system/tasks/current-work.md` |
| `identity.local` | `_system/identity/` |
| `lessons.local` | `_system/lessons/` |
| `work.matters.registry` | `matters/registry.md` |

## Historical Notes

Earlier profiles included `work.starter` roles for references, drafts, and final outputs.

After M2.10, those directories are no longer owned by the Core profile. They are owned by the General Pack or by user-defined workspace paths, with the actual mapping declared in `.starwork/workspace.json` and installed Pack rules.
