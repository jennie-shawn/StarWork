# Claude Code 会话管理能力调研结果

## 基本信息

- 日期：2026-06-02
- Claude Code 版本：2.1.153
- 操作系统：macOS Darwin 25.5.0
- 调研方式：在当前 Claude Code CLI 环境中实测，基于环境变量、CLI help、本地存储文件、配置目录和 transcript 格式分析
- 对应指令：`product/docs/multiagent/04-claude-code-session-management-research-instructions.md`

## A. 能力矩阵

| 能力 | UI 或 CLI 支持 | 可编程支持 | 稳定性 | StarWork 适配建议 | 证据 |
|---|---|---|---|---|---|
| 获取当前会话 ID | `CLAUDE_CODE_SESSION_ID` 环境变量（UUID），`claude --session-id <uuid>` 可指定 | 环境变量稳定可读，`--session-id` 可主动设置 | 高 | **可直接适配**。StarWork 使用 `$CLAUDE_CODE_SESSION_ID` 作为 `claude-code:<session-id>` 的 session_id | 实测 `env \| grep CLAUDE_CODE_SESSION_ID` → `631c65eb-2e7e-4e62-89ec-e5ba8ca5eb43` |
| 当前会话改名 | `claude -n/--name <name>` 启动时设置名称；`/rename-conversation`（内置 slash command，来自 tipsHistory `rename-conversation: 222`）；交互式 UI 可改名 | `-n` 参数可程序化传入，无运行时改名 API | 中 | **可直接适配（启动时）**，**降级适配（运行时）**。`multiagent bind --session-name` 在 bind 时若用户是刚启动的新会话可用 `-n` 参数；对于已运行会话，只能提示用户手动 `/rename-conversation` | CLI `--name` 选项已确认；tipsHistory 含 `rename-conversation` 条目 |
| 列出历史会话 | `/resume` 交互式选择器（按 session ID 或标题搜索）；`claude --resume` 打开 picker；`claude --resume <id\|title>` 直接恢复 | `history.jsonl`（`~/.claude/history.jsonl`）可程序化解析，包含 display/prompt、timestamp、project、sessionId | 中（history.jsonl 无标题字段） | **降级适配**。`history.jsonl` 可按 project 字段筛选当前项目会话，但不含会话标题。可解析后按 sessionId 分组展示 | `history.jsonl` 实测 1707 行，覆盖 33 个项目、262 个唯一 session |
| 读取历史会话 | Transcript 文件：`~/.claude/projects/<project-path>/<session-id>.jsonl`（JSONL 格式），含完整 user/assistant/tool_use/attachment 消息 | JSONL 文件可程序化读取 | 高（格式稳定，跨版本兼容） | **可直接适配**。StarWork adapter 可安全读取 transcript 用于 worklog 生成、交接摘要、lane 归档 | 实测当前 transcript 340KB、159 行，含 user/assistant/attachment/file-history-snapshot/mode/permission-mode 等类型 |
| resume 历史会话 | `claude --resume <id\|title>` 或 `claude -r <id\|title>`；`claude --continue` / `claude -c` 恢复最近会话；`claude --from-pr` 恢复 PR 关联会话；`/resume` 内置 slash command | `--resume` 支持 `--print` 非交互模式，可指定 session ID | 高 | **可直接适配**。`multiagent continue <lane>` 可执行 `claude --resume <session-id>` 恢复对应 lane 的会话。resume 后模型获得旧会话完整上下文（transcript 回放） | CLI help 明确列出 `--resume`、`--continue`、`--from-pr`、`--fork-session` |
| 向非当前会话发送 follow-up | 不支持。无 `send_message_to_session` 等价能力 | 无 | 无 | **不支持**。StarWork 若需此能力，应提示用户手动 `claude --resume <id>` 在新终端中操作 | 未发现任何等价接口 |
| 导出会话 | 无官方导出命令。Transcript 文件（JSONL）可直接复制作为「导出」 | JSONL 可用标准工具转换（如 `python3` 转 Markdown） | 中（格式无稳定性承诺） | **降级适配**。建议 StarWork adapter 安全复制 transcript JSONL 到 lane workspace，生成 Markdown 摘要作为 worklog | 未发现 `/export` 或官方导出命令；transcript 是本地可读文件 |
| 删除会话 | `claude project purge [path]` 删除整个项目的所有状态（transcripts、tasks、file history、config）。无单会话删除 | 无单会话删除 API | 低（purge 为不可逆批量操作） | **不建议适配**。项目级 purge 过于粗暴，StarWork 不应自动执行。单会话删除无法程序化实现，只能提示用户手动操作 | `claude project --help` 列出 `purge` 子命令 |
| 归档会话 | 不支持 | 无 | 无 | **不支持**。StarWork 可通过 lane workspace 自建归档索引，不依赖宿主 | 未发现任何归档接口 |
| 置顶会话 | 不支持 pin/favorite/star | 无 | 无 | **不支持**。`/resume` picker 按时间排序，无置顶机制 | history.jsonl 无 pin/star 字段 |
| transcript 本地存储 | `~/.claude/projects/<project-path>/<session-id>.jsonl`（每条消息一行 JSON）；session 元数据在 `~/.claude/sessions/<pid>.json` | JSONL 可读写，但写入可能破坏 Claude Code 状态 | 高（只读安全），低（写入危险） | **可直接适配（只读）**。StarWork adapter 可安全读取 transcript 生成 worklog、摘要、交接文档。**不建议写入** | 实测两个格式：新版 `.jsonl`（当前项目），旧版按 session 分目录（digital-twin 项目含 26 个 session 目录） |
| 项目级 memory / CLAUDE.md | `CLAUDE.md` 文件（项目根目录）；auto-memory 系统（`~/.claude/projects/<project>/memory/`）；`/memory` 内置 slash command；系统 prompt 中自动注入 CLAUDE.md 内容 | `CLAUDE.md` 可被 StarWork 写入 lane 使用规则 | 高 | **可直接适配**。CLAUDE.md 适合承载 lane 使用规则（职责、write_scope、交接要求）。每个 lane 可在自己的 workspace 有独立 CLAUDE.md | `CLAUDE.md` 已在当前项目 active 使用；memory 目录已存在但本项目当前为空 |
| compact / summarize | 系统自动执行上下文压缩（context compression），无手动触发 CLI | 自动触发，不可程序化控制 | 中 | **降级适配**。compact 后旧消息不再可查看（被 summary 替代），resume 使用 compact summary。StarWork **仍需要 worklog 做显式交接**，因为 compact summary 对用户不可见且无结构化保证 | 系统提示中描述了上下文压缩机制；未发现手动 `/compact` 命令入口 |
| 多会话并行 | 支持。多终端/IDE 会话同时打开同一项目；每个会话独立 transcript（按 sessionId 区分）；`--worktree` 创建隔离 git worktree；`--fork-session` 在 resume 时创建新 session ID；`color-when-multi-clauding` tip 确认多会话场景 | `--worktree` + `--session-id` + `--fork-session` 可组合实现 | 高 | **可直接适配**。多 lane 可并行运行（每个 lane 一个终端/IDE 窗口）。worktree 隔离适合不同 lane 的写入边界。建议 StarWork 提示用户不同 lane 用不同终端颜色区分 | CLI `-w/--worktree`、`--fork-session`、`--session-id`；tipsHistory 含 `color-when-multi-clauding` |
| 权限和工作目录状态恢复 | Transcript 记录 cwd、permissionMode、gitBranch、entrypoint、version。resume 后恢复这些状态 | 无显式 API，resume 行为由 Claude Code 内部处理 | 高 | **可直接适配（读取）**。StarWork adapter 可从 transcript 首行读取 lane 绑定时状态。不应依赖 resume 自动恢复所有状态，应在 bind 时主动记录关键状态到 lane workspace | Transcript 首条 user 消息包含 `cwd`、`permissionMode`、`gitBranch`、`version`、`userType`、`entrypoint` |

## B. 结论

### 可直接适配 StarWork 的能力

1. **session_id 生成**：`$CLAUDE_CODE_SESSION_ID` 是稳定 UUID，直接作为 `claude-code:<uuid>` 格式的 session_id。StarWork `multiagent bind` 自动读取此环境变量。

2. **会话命名**：`claude -n/--name "lane-name"` 在启动时设置。对于新建 lane 场景（`multiagent bind --session-name`），如果是从新终端启动，可传入 `-n` 参数实现自动命名。

3. **resume / continue**：`claude --resume <session-id>` 精确恢复指定 lane 会话；`claude --continue` 恢复最近会话。`multiagent continue <lane>` 可映射为 `claude --resume <session-id>`。

4. **transcript 读取**：`~/.claude/projects/<project>/<session-id>.jsonl` 是标准 JSONL，StarWork adapter 可安全读取用于生成 worklog、交接摘要和 lane 归档内容。

5. **CLAUDE.md**：项目级 CLAUDE.md 适合承载 lane 使用规则。每个 lane 可在其 workspace 有独立 CLAUDE.md，新会话启动时自动加载。

6. **多会话并行**：`--worktree` + `--session-id` 组合支持多 lane 并行，每个 lane 有独立 transcript 和（可选）git 隔离。

### 只能降级适配（人工操作，无法自动化）

1. **会话列表**：`history.jsonl` 可按 project 筛选当前项目会话，但不含会话标题，仅含首条 prompt 摘要。StarWork 可解析后分组展示，但无法获取准确会话名称。

2. **会话改名（运行时）**：`/rename-conversation` 是内置 slash command，但无 CLI 或 API 入口。已运行会话改名只能提示用户手动操作。

3. **会话导出**：无官方导出，只能安全复制 transcript JSONL 文件。StarWork adapter 需自行将 JSONL 转为可读摘要格式。

4. **compact**：系统自动管理，无手动触发入口，compact 内容对用户不透明。StarWork 必须维护独立 worklog 做显式交接。

### 不支持或不建议适配

1. **向非当前会话发送 follow-up**：Claude Code 无此能力。每个 lane 的继续操作需在新终端中 `claude --resume <id>`。

2. **单会话删除**：只有 `claude project purge`（全项目删除），无单会话删除。StarWork 不应执行 purge。

3. **归档/置顶**：无原生支持。StarWork 需在 lane workspace 自建归档索引。

4. **写入 transcript 或私有数据库**：写入 JSONL 或 `.claude.json` 可能破坏 Claude Code 状态，**严禁** StarWork adapter 写入这些文件。

### StarWork 在 Claude Code 中如何生成 session_id

直接使用 `$CLAUDE_CODE_SESSION_ID` 环境变量，格式为 `claude-code:<uuid>`。在 `multiagent bind` 时自动捕获。如果需要预先生成 session_id（如 `--session-id` 启动），StarWork 可生成 UUID 并通过 `claude --session-id <pre-generated-uuid>` 传入。

### multiagent bind --session-name 策略

**启动时可自动化**：如果 `multiagent bind` 触发了新 `claude` 进程启动，传入 `-n "<lane-name>"` 参数。

**已运行会话**：降级为提示用户执行 `/rename-conversation` 手动改名。StarWork CLI 输出明确的改名提示。

### Claude Code 是否适合实现 StarWork 关键命令

| StarWork 命令 | 实现判断 | 说明 |
|---|---|---|
| `multiagent status --host` | **可实现** | 读取 `CLAUDE_CODE_SESSION_ID`、transcript cwd、git branch 等元数据 |
| `multiagent continue <lane>` | **可实现** | 将 lane 绑定的 session_id 传入 `claude --resume <session-id>` |
| `multiagent release --archive-session` | **降级实现** | 无法归档/删除宿主会话。可安全复制 transcript 到 lane workspace，并提示用户手动清理（/rename-conversation 加 `[done]` 前缀等） |

## C. 建议工作流

### 将当前 Claude Code 会话登记为 StarWork lane

```text
# 步骤 1：在 Claude Code 新终端中启动一个命名会话（推荐）
claude -n "后端 API Review" --session-id "starwork-lane-api-review"

# 步骤 2：在 Claude Code 会话内，由 StarWork skill 执行
starwork multiagent bind api-review \
  --host claude-code \
  --session-id "$CLAUDE_CODE_SESSION_ID" \
  --session-name "后端 API Review" \
  --write-scope "product/core/,product/cli/src/"

# 步骤 3：StarWork 内部动作
# - 向 lane registry 写入：lane=api-review, host=claude-code, session=<uuid>
# - 向 lane workspace 写入 CLAUDE.md（含职责和 write_scope）
# - 记录 worklog 初始条目
# - 尝试通过 /rename-conversation 同步会话名（非致命）

# 步骤 4：后续交接
# 另一个 Claude Code 终端中：
claude --resume <session-id>
# 或在 StarWork 中：
starwork multiagent continue api-review
# → 自动执行 claude --resume <session-id>
```

### 在多 lane 并行场景中

```text
# 终端 1（lane: api-review，工作树隔离）
claude -n "API Review" -w api-review

# 终端 2（lane: doc-writer，同一项目不同工作树）
claude -n "文档撰写" -w doc-writer

# 终端 3（lane: test-runner，不隔离）
claude -n "测试运行" --fork-session
```

### release 后清理

```text
# StarWork multiagent release api-review 执行：
# 1. 安全复制 transcript 到 lane workspace
# 2. 从 transcript 生成 worklog 摘要
# 3. 提示用户：可在 Claude Code 中将该会话改名为 "[done] 后端 API Review"
# 4. 不执行 claude project purge（不可逆批量操作）
```

## 附加发现

### transcript JSONL 消息类型

当前版本 transcript 包含以下消息类型：

| 类型 | 说明 | StarWork 用途 |
|---|---|---|
| `mode` | 会话模式（normal） | 记录 lane 运行模式 |
| `permission-mode` | 权限模式（bypassPermissions/acceptEdits 等） | 记录 lane 权限状态 |
| `file-history-snapshot` | 文件变更追踪快照 | 了解 lane 改动了哪些文件 |
| `user` | 用户消息（含 cwd、gitBranch、version、timestamp） | 提取操作时间线和上下文 |
| `attachment` | 系统附件（如 skill_listing） | 了解 lane 可用的技能集 |
| `assistant` | assistant 响应（含 model、usage、content blocks） | 提取决策、工具调用、文件修改 |
| `last-prompt` | 当前最新 prompt 引用 | 确认当前会话状态 |

### session 元数据文件格式

`~/.claude/sessions/<pid>.json`：

```json
{
  "pid": 97538,
  "sessionId": "631c65eb-2e7e-4e62-89ec-e5ba8ca5eb43",
  "cwd": "/Users/shuxinding/satellite-starwork",
  "startedAt": 1780382495442,
  "procStart": "Tue Jun  2 06:41:30 2026",
  "version": "2.1.153",
  "peerProtocol": 1,
  "kind": "interactive",
  "entrypoint": "cli",
  "status": "busy",
  "updatedAt": 1780382507703
}
```

### 两种 transcript 存储格式（版本演进）

- **新版**（当前版本 2.1.153）：`<project>/<session-id>.jsonl` 单文件
- **旧版**（早期版本）：`<project>/<session-id>/` 目录（含 `subagents/` 子目录）
- StarWork adapter 应同时兼容两种格式

### 关键局限

1. **session 标题不存储在 transcript 中**：`--name` 设置的名字似乎存储在 `.claude.json` 的项目级配置中（作为交互式 UI 数据），不在 transcript JSONL 中，因此从 transcript 无法恢复会话名称。

2. **history.jsonl 不完整**：只记录用户第一条 prompt，不含完整会话历史、会话名称或状态。仅适合作为「最近活动」索引，不能作为 session registry。

3. **无 API 管理会话**：Claude Code 不提供 HTTP API 或 IPC 接口管理会话。所有管理操作通过 CLI 参数（启动时）或交互式 UI。

4. **compact 不透明**：上下文压缩由系统自动触发，用户无法查看 compact 后的 summary 内容。StarWork 的 worklog 机制是必要的补充。

## 与 Codex 会话能力的对比摘要

| 能力 | Codex | Claude Code | StarWork 统一策略 |
|---|---|---|---|
| session ID | thread ID（含 url） | UUID（环境变量 `CLAUDE_CODE_SESSION_ID`） | 统一格式 `<host>:<id>` |
| 会话命名 | `thread/name/set` API | `-n/--name` CLI + 交互式改名 | 优先用 CLI 参数，降级提示手动 |
| 会话列表 | `list_threads` 工具 | `/resume` picker + history.jsonl | parse history.jsonl + 提示用户手动选择 |
| 非当前会话 follow-up | `send_message_to_thread` | 不支持 | StarWork 本身不支持跨宿主 follow-up |
| 归档 | `set_thread_archived` | 不支持 | StarWork 自建归档索引 |
| 置顶 | `set_thread_pinned` | 不支持 | StarWork 自建优先级标记 |
| 单会话删除 | 不支持 | 不支持（仅全项目 purge） | 不做宿主删除，仅做 StarWork 侧清理 |
| 导出 | 无官方导出 | 无官方导出 | 安全复制 transcript JSONL |
| 多会话隔离 | worktree | worktree + fork-session | lane write_scope + git worktree |
