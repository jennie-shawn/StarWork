# starworkAudit Issue Taxonomy

| Level | Meaning | Examples |
|---|---|---|
| `blocking` | 巡检或项目使用不可靠。 | 路径不存在、workspace state 无法解析、不是 StarWork。 |
| `high` | 项目中心和项目工作台的关系可能错误。 | `project_center.path` 或兼容字段 `hub.path` 错、`project_id` 不一致、sync metadata 指向旧项目中心。 |
| `repairable` | 可通过保守 repair blueprint 补齐。 | 缺 `.starwork/handoff/`、缺 state.json、缺 `.starwork/sync.json`。 |
| `notice` | 提醒，不急于修。 | 旧路径残留、队列积压、长期未更新。 |

不要把 `audit` 的事实直接当成最终判断。先解释依据，再给出需要用户确认的地方。
