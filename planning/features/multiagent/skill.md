# MultiAgent Skill

`starworkMultiagent` should translate user intent into the v0.2 CLI commands.

## New Intent Mapping

| User intent | Skill interpretation | CLI |
| --- | --- | --- |
| 让开发 lane 开始开发 | Send a cross-session instruction | `starwork multiagent instruct development` |
| 看看开发 lane 做到哪了 | Read Codex host observation | `starwork multiagent read development` or `status --host` |
| 创建产品、开发、验收三个智能体 | Launch Codex threads for existing lanes | `starwork multiagent launch --lanes product-planning,development,review` |
| 把这个 lane 固定起来 | Bind and best-effort pin | `starwork multiagent bind --pin` |

## Safety Rules

- Prefer `--dry-run` before write or host-mutation commands.
- Do not auto-create lanes during `launch`; ask the user to define lane purpose and write scope first.
- Explain that Codex front-end refresh is not the success signal. Use host delivery and project records instead.
- Remind the target lane to update its worklog and shared outputs after completing an instruction.
