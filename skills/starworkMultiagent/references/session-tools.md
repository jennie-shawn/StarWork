# Session Tools

宿主动作由宿主标准工具执行，CLI 只记录 StarWork 项目事实源。

## 当前会话 ID

任何会话控制或跨会话操作前，必须确认当前会话 ID：

- `<codex_delegation>` 中的 `source_thread_id` 优先作为当前来源会话 ID。
- 宿主或运行环境显式提供 current thread / current session metadata 时，使用该值。
- 不得用历史 worklog、旧 binding、相似标题或最近更新时间推断当前会话。
- 如果 current session id 不明，停止绑定、改名、置顶、归档、释放和以当前会话为来源的投递记录。
- 发送前必须检查目标 lane session 不等于当前会话。

## Codex App

Codex App 正常路径中：

| 场景 | 标准工具 |
|---|---|
| 创建 lane 会话 | `create_thread` |
| 向 lane 会话发送指令 | `send_message_to_thread` |
| 读取 lane 会话状态 | `read_thread` |
| 搜索或确认历史会话 | `list_threads` |
| 设置会话标题 | `set_thread_title` |
| 置顶或取消置顶 | `set_thread_pinned` |
| 归档或取消归档 | `set_thread_archived` |

如果工具没有出现在当前可用工具列表里，先用工具发现能力查找。仍不可见或调用失败时，不要宣称已创建、已发送或已改名；转 `manual_handoff_required`。

## Claude Code Desktop

目标会话是 `claude-code:<id>` 且你正运行在 Claude Code 桌面端时：

| 场景 | 标准工具 | 注意 |
|---|---|---|
| 向 lane 会话发送指令 | `mcp__ccd_session_mgmt__send_message` | 参数是 `(session_id, message)`；会弹用户确认；`session_id` 不能是当前会话 |
| 搜索或确认历史会话 | `mcp__ccd_session_mgmt__list_sessions` / `mcp__ccd_session_mgmt__search_session_transcripts` | 只读 |
| 读取 lane 会话状态 | `mcp__ccd_session_mgmt__search_session_transcripts` | 宿主观察，不替代 lane worklog |
| 归档会话 | `mcp__ccd_session_mgmt__archive_session` | 会弹用户确认 |
| 创建 lane 会话 / 设置标题 / 置顶 | 无对应标准工具 | 走人工 handoff |

## 非 Codex 宿主

Cursor、Trae 以及 Claude Code 终端 CLI 在没有等价标准会话工具前，不要宣称可以自动创建、发送、改名、置顶或归档。使用人工 handoff 或只读 transcript 摘要。
