# Cursor 会话管理能力调研结果（StarWork multiagent）

- 调研日期：2026-06-01
- 调研环境：macOS darwin 25.5.0（arm64）
- Cursor 版本：`3.6.31`（`cursor --version`）
- 调研方式：本地 CLI 实测 + MCP 工具描述取证 + 本地只读存储路径取证
- 边界声明：本次未执行任何会破坏历史的操作；未改写 SQLite / 私有存储；未删除真实会话

## A. 能力矩阵

| 能力 | UI 支持 | 可编程支持 | 稳定性 | StarWork 适配建议 | 证据 |
|---|---|---|---|---|---|
| 获取当前会话 ID | 待补 UI 实测 | 部分支持（CLI 可创建并返回 chat ID；当前 IDE 会话 ID 无官方直出） | 中 | `session_id` 采用“优先官方 ID，降级本地 transcript UUID”策略 | `cursor agent create-chat` 返回 UUID：`5dfbb962-1678-4577-a865-61c754fcf9cc`；`agent-transcripts/<uuid>/<uuid>.jsonl` 结构 |
| 当前会话改名 | 可能支持（标签页标题） | 支持（MCP） | 中高 | 支持 `multiagent bind --session-name`，实现为“可用则调用、失败降级提示手工改名” | `cursor-app-control/tools/rename_chat.json`；`INSTRUCTIONS.md` 明确 `rename_chat` |
| 列出历史会话 | 待补 UI 实测 | 有命令入口但自动化可用性一般 | 中低 | CLI 侧仅做“可选增强”，主流程不依赖自动列举 | `cursor agent ls` 存在；非交互终端触发 raw mode 报错 |
| 读取历史会话 | 待补 UI 实测 | 部分支持（本地 transcript 可读） | 中低 | 仅作为调试/回溯入口，不作为核心协议依赖 | `agent-transcripts/...jsonl` 可直接读取；`User/globalStorage/state.vscdb` 存在但属内部存储 |
| 继续历史会话 | 待补 UI 实测 | 支持（CLI `--resume` / `--continue`） | 中 | 可映射 `multiagent continue <lane>`，但需处理认证与不可用降级 | `cursor agent --help` 含 `--resume [chatId]`、`--continue`；`cursor agent resume --help` |
| 导出会话 Markdown | 未见 | 未见官方入口 | 低 | 不作为依赖；改用 StarWork 自有 worklog/产物归档 | 未发现导出命令；仅发现 transcript/raw 存储 |
| 删除会话 | 待补 UI 实测 | 未见 | 低 | 不做自动化；仅提示用户手工处理 | CLI/MCP 描述中未见会话删除 |
| 归档会话 | 待补 UI 实测 | 未见 | 低 | `release --archive-session` 在 Cursor 适配中应降级为“归档 StarWork 工件，不归档宿主会话” | CLI/MCP 描述中未见 archive 会话能力 |
| 置顶会话 | 待补 UI 实测 | 未见 | 低 | 不纳入适配范围 | CLI/MCP 描述中未见 pin/favorite |
| 多 chat tabs | 可能支持（从“current chat conversation tab title”可侧证） | 无明确 | 中低 | lane 与 Cursor tab 建议保持“弱绑定”，以 lane 元数据为准 | `rename_chat` 描述含 “conversation tab title” |
| `@Past Chats` | 待补 UI 实测 | 未见稳定 API | 低 | 若存在仅作人工增强；不可作为自动恢复主路径 | 本次可见 CLI/MCP 未提供等价 API |
| 长会话摘要 | 待补 UI 实测 | 未见稳定 API | 低 | 继续依赖 StarWork 显式 worklog 交接，不依赖宿主自动摘要 | 本次未发现 `/summarize` 或摘要 API |
| checkpoint / revert | 待补 UI 实测 | 未见会话级官方 API | 低 | 不直接映射 lane 生命周期；代码回退仍以 git 为主 | 本次未发现会话 checkpoint API |
| Background Agent 历史 | 待补 UI 实测 | 未见普通会话统一管理 API | 低 | 视为独立能力面，不并入当前 lane 会话主模型 | 本次可见 MCP/CLI 未给统一读写入口 |

## B. 结论

### 1) 哪些能力可直接适配 StarWork

- **可直接适配（有官方入口）**
  - 会话命名：可用 `cursor-app-control.rename_chat`。
  - 会话继续：CLI 支持 `--resume [chatId]`、`--continue`（需认证）。

- **可降级适配（仅部分能力）**
  - 会话 ID：可拿到“新建 chat 的官方 UUID”，但“当前 IDE 正在对话的会话 ID”没有稳定官方直出，需降级策略。
  - 会话读取：可读取本地 transcript，但它属于实现细节路径，不建议作为唯一依赖。

### 2) 哪些只能人工操作

- 历史会话浏览/筛选/按项目检索：当前以 UI 为主（需后续补 UI 实测截图与步骤）。
- 若存在 `@Past Chats`，当前也更像 UI 能力，不具备可确认的稳定自动化接口。

### 3) 哪些不支持或不建议依赖

- 删除/归档/置顶：未发现官方 CLI/MCP 会话管理接口。
- 直接依赖 `state.vscdb` 等内部数据库：风险高（结构变更、锁冲突、隐私边界），不建议作为生产主路径。

### 4) StarWork 在 Cursor 中如何生成 `session_id`

建议分层策略：

1. **优先**：若通过官方入口获取到 chat ID（如 `create-chat` 返回的 UUID 或未来官方“当前会话 ID”接口），使用 `cursor:<uuid>`。  
2. **降级**：无法直取当前会话 ID 时，使用当前工作区 `agent-transcripts/<uuid>/<uuid>.jsonl` 的 UUID 作为 `cursor_local:<uuid>`。  
3. **兜底**：再不行则使用 `cursor_ephemeral:<timestamp>-<workspace-hash>`，并在 lane 元数据标记 `recoverability=weak`。

### 5) `multiagent bind --session-name` 应支持、降级还是跳过

- **应支持（默认开启）**：优先调用 `rename_chat`。
- **失败时降级**：提示用户手工改名，不阻塞 `bind` 主流程。

### 6) 三个命令的适配判断

- `multiagent status --host`：**适合实现**（可报告“有无官方改名/恢复接口、有无可读 transcript、认证状态”）。
- `multiagent continue <lane>`：**适合实现但需降级**（有 chatId 则 `--resume`，无则提示用户打开对应会话并加载 lane worklog）。
- `multiagent release --archive-session`：**不建议硬实现宿主会话归档**；建议改为“归档 lane 产物 + 提示用户手工处理 Cursor 会话”。

## C. 建议工作流（Cursor 中登记并交接一个 lane）

1. 在 lane `bind` 时记录：
   - `host=cursor`
   - `workspace`
   - `session_id`（按上面的优先/降级策略）
   - `session_title`（若可用则调用 `rename_chat`）
2. 工作中持续写入 StarWork lane worklog（决策、变更、待办、阻塞）。
3. 需要续作时：
   - 有 `chatId`：尝试 `cursor agent --resume <chatId>`（或宿主 UI 打开对应会话）。
   - 无 `chatId`：按 lane worklog 在新会话冷启动恢复。
4. `release` 时：
   - 强制完成 StarWork 侧归档（worklog/交付物/状态）。
   - 对 Cursor 会话仅给“手工清理建议”（删除/归档/置顶若 UI 可用则手工处理）。

## 补充证据清单（关键命令与路径）

- 版本：
  - `cursor --version` → `3.6.31`
- CLI 会话相关帮助：
  - `cursor agent --help`（含 `--resume [chatId]`、`--continue`、`create-chat`、`ls`、`resume`）
  - `cursor agent resume --help`
  - `cursor agent create-chat --help`
- CLI 实测：
  - `cursor agent create-chat` 返回 UUID：`5dfbb962-1678-4577-a865-61c754fcf9cc`
  - `cursor agent --print --continue "测试"` → `No previous chats found.`
  - `cursor agent --print --resume <id> ...`（在未登录状态提示认证）
- MCP 能力描述：
  - `~/.cursor/projects/.../mcps/cursor-app-control/tools/rename_chat.json`
  - `~/.cursor/projects/.../mcps/cursor-app-control/INSTRUCTIONS.md`
- 本地只读路径取证：
  - `~/.cursor/projects/.../agent-transcripts/<uuid>/<uuid>.jsonl`
  - `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb`（仅识别存在，不做写入/改写）
