# zh Profile v0.1

`zh` profile 把 Core 角色映射到中文工作区路径。

它适合中文用户，以及已经在运行的中文 StarWork 卫星项目。

这个 profile 包含中文路径、中文模板、中文 CLI 提问和中文 kit 文案。

## 角色映射

| 标准角色 | 路径 |
|---|---|
| `agent.entry_rules` | `AGENTS.md` |
| `system.context.project_status` | `_系统/上下文/当前项目.md` |
| `system.context.decisions` | `_系统/上下文/决策.md` |
| `system.tasks.current_work` | `_系统/任务/当前工作.md` |
| `identity.local` | `_系统/身份/` |
| `lessons.local` | `_系统/教训/` |
| `work.matters.registry` | `事项/注册表.md` |

## 历史说明

早期 profile 曾包含 `work.starter` 相关角色，用来描述参考资料、草稿和确认成果目录。

M2.10 后这些目录不再属于 Core profile。它们由 General Pack 或用户定制路径负责，具体以 `.starwork/workspace.json` 和已安装 Pack 规则为准。
