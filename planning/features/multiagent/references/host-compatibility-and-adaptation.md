# Cursor / Trae / Claude Code MultiAgent 兼容性与适配计划

## 文档状态

- 日期：2026-06-02
- 类型：事实支撑文档
- 所属功能：MultiAgent / Agent Lanes
- 适用范围：判断 StarWork MultiAgent 当前能力在 Cursor、Trae、Claude Code 中哪些可兼容、哪些只能降级、哪些暂不支持，并作为后续适配 SPEC 的依据

## 事实来源

- `product/docs/multiagent/01-codex-session-capabilities-and-starwork-implications.md`
- `product/docs/multiagent/cursor-session-management-research-result.md`
- `product/docs/multiagent/trae-session-management-research-result.md`
- `product/docs/multiagent/claude-code-session-management-research-result.md`
- `product/planning/features/multiagent/specs/v0.2-codex-orchestration.md`
- `product/core/agent-lanes-spec.md`

事实等级：

| 等级 | 含义 |
| --- | --- |
| 可兼容 | 可以作为 StarWork 当前能力或近期适配能力使用。 |
| 部分兼容 | 有入口，但不稳定、不完整，或需要明显降级。 |
| 仅人工兼容 | StarWork 可以生成记录、提示词或操作指引，但不能自动控制宿主。 |
| 不兼容 | 当前未发现可用入口，或不建议依赖。 |

## 一句话结论

Cursor、Trae、Claude Code 都能兼容 StarWork MultiAgent 的“项目内协作层”，也就是 lane、写入边界、worklog、shared context 和 session binding。

差异出现在“宿主会话控制层”：

- Cursor 有少量可编程入口，适合做轻量 host adapter：本轮只适配本地 transcript 只读回溯和状态观察，其他会话动作保留人工降级路径。
- Trae 不再做会话能力适配：检测到 Trae 或绑定 `trae:<id>` 时，直接转人工操作。
- Claude Code 适合做 transcript / resume 型 adapter：可以稳定识别 session id、读取 transcript、恢复历史会话和支持多会话并行，但不能像 Codex 一样向非当前会话后台发送 follow-up。

因此，StarWork 对 Cursor / Trae / Claude Code 的适配不应照搬 Codex v0.2 的 `launch/read/instruct` 全能力，而应采用能力分层和降级策略。

## 当前 StarWork MultiAgent 能力分层

| 层级 | 能力 | StarWork 事实源 | 是否依赖宿主 |
| --- | --- | --- | --- |
| L0 项目协作层 | `init`、`add`、`bind`、`release`、`status`、`share`、lane worklog、shared context、write scope | `_系统/协作/` 或 `_system/collaboration/` | 不依赖 |
| L1 宿主观察层 | `status --host`、`read <lane>` | `.starwork/agent-lanes/state.json` + 宿主观察结果 | 依赖宿主读取能力 |
| L2 宿主显示层 | `bind --session-name`、可选 `--pin` | StarWork binding + 宿主标题 / 置顶状态 | 依赖宿主改名 / 置顶能力 |
| L3 宿主交付层 | `instruct <lane>`、`launch <lane>` | shared context + host delivery state | 依赖宿主创建 / 继续 / 发送消息能力 |
| L4 宿主生命周期层 | archive、delete、checkpoint、revert、自动调度 | 暂不进入 MultiAgent v0.2 核心能力 | 高度依赖宿主 |

Cursor / Trae / Claude Code 适配应优先保证 L0，然后按宿主能力逐层增强。

## 跨会话投递硬边界

`instruct <lane>` 的产品语义是“通过宿主标准能力，把一条消息投递给另一个已绑定会话”。它不是“恢复目标会话后在里面模拟输入一个新 turn”。

因此：

- Codex 只能使用 Codex 标准线程投递能力，例如 `send_message_to_thread` 或明确等价的稳定宿主 API。
- 不再把 `thread/resume` + `turn/start` 作为 StarWork 跨会话指令的标准实现。
- `resume`、`continue`、`--resume <id>` 只能映射到 StarWork `continue <lane>`，表示让用户或当前进程恢复某个会话继续工作；不能包装成自动 `instruct`。
- Cursor、Trae、Claude Code 若没有标准后台投递 API，就不支持自动 `instruct`，只能走 `handoff`：生成格式化消息，等待用户手动粘贴或切换会话发送。
- 宿主内部数据库、transcript、低层 turn API、非公开调试接口都不能作为自动派活的正式依据。

## Skill / CLI / adapt 边界

StarWork Skill 不负责维护宿主工具能力百科。Skill 的职责是把用户意图转成 StarWork CLI 调用，并用人话解释 CLI 输出。

边界如下：

| 层级 | 职责 |
| --- | --- |
| Skill | 采访用户、选择 StarWork CLI 命令、优先 dry-run、解释 JSON 输出和下一步。 |
| CLI | 在运行时封装 StarWork 协议、宿主能力判断、执行、降级状态和错误处理。 |
| adapt | 准备宿主环境：生成规则入口、创建宿主 Skill 目录、写入 adapter state，并让 `doctor --host` 可检查。 |
| adapter profile | 记录某个宿主的能力基线、Skill 目录、规则入口和安全降级要求。 |

因此，`starworkMultiagent` Skill 不应直接写入 Codex / Claude Code / Cursor / Trae 的完整能力矩阵，也不应硬编码某个宿主的私有路径、数据库或 transcript 细节。

当工具能力不同，Skill 应依赖 CLI 输出，例如：

```text
delivered
manual_handoff_required
needs_adapt
unbound
unsupported
failed
```

然后只解释“这个工具现在能自动做什么、哪些需要你手动处理”。某次业务命令能不能自动执行，由 CLI 在运行时判断；`adapt` 只提供准备好的宿主入口和 adapter state。

## 能力兼容矩阵

| StarWork 能力 | Cursor 兼容性 | Trae 兼容性 | Claude Code 兼容性 | 适配判断 |
| --- | --- | --- | --- | --- |
| `multiagent init` | 可兼容 | 可兼容 | 可兼容 | 纯项目文件能力，三个宿主都支持。 |
| `multiagent add` | 可兼容 | 可兼容 | 可兼容 | 纯项目文件能力，三个宿主都支持。 |
| `multiagent bind --session <id>` | 可兼容 | 可兼容 | 可兼容 | 支持人工或探测得到的 session id；格式为 `cursor:<id>` / `trae:<id>` / `claude-code:<id>`。 |
| 自动识别当前 session id | 部分兼容 | 不适配 | 可兼容 | Cursor 可从 transcript UUID 获得候选 ID，但当前 IDE 会话 ID 无稳定官方直出；Trae 不再读取私有存储识别会话；Claude Code 可直接读 `$CLAUDE_CODE_SESSION_ID`。 |
| `bind --session-name` | 部分兼容 | 不兼容 | 部分兼容 | Cursor 有 `rename_chat` MCP 线索但 CLI 独立运行时未必可用；Trae 未发现入口；Claude Code 启动时可用 `claude -n`，已运行会话需手工 `/rename-conversation`。 |
| `bind --pin` | 不兼容 | 不兼容 | 不兼容 | 三者都未发现稳定置顶 API。StarWork 只能记录建议，不应自动承诺。 |
| `status` | 可兼容 | 可兼容 | 可兼容 | StarWork 项目状态可读，不依赖宿主。 |
| `status --host` | 部分兼容 | 人工宿主 | 可兼容 | Cursor 可报告 transcript / CLI / 认证状态；Trae 只报告 `manual_host`，不读取私有会话存储；Claude Code 可读取 session id、transcript cwd、git branch、permissionMode 等元数据。 |
| `read <lane>` | 部分兼容 | 不兼容 | 可兼容 | Cursor 可尝试读取本地 transcript；Trae 完整消息在加密数据库中，不应读取；Claude Code transcript JSONL 可安全只读解析。 |
| `instruct <lane>` | 仅人工兼容 | 仅人工兼容 | 仅人工兼容 | 三者当前均未确认有标准后台投递 API。不得用 `resume` / `continue` 冒充自动发送；应生成可复制 handoff 消息，或提示用户恢复对应会话后手动发送。 |
| `launch <lane>` | 仅人工兼容 | 仅人工兼容 | 部分兼容 | Cursor 本轮不实现 create-chat；Trae 无创建会话 API；Claude Code 可生成 `claude -n ... --session-id ...` 启动命令，但不能在当前进程后台启动并完成交付。 |
| `continue <lane>` | 仅人工兼容 | 仅人工兼容 | 可兼容 | Cursor 本轮不把 CLI resume 作为正式能力；Trae 只能通过 UI；Claude Code 可映射到 `claude --resume <session-id>`。 |
| `release` | 可兼容 | 可兼容 | 可兼容 | StarWork 侧解除 binding、提醒更新 worklog，三个宿主都支持。 |
| `release --archive-session` | 不兼容 | 不兼容 | 部分兼容 | 宿主都不支持真正 archive；Claude Code 可安全复制 transcript 到 lane workspace 作为 StarWork 侧归档，但不能删除或归档宿主会话。 |
| 会话列表 | 部分兼容 | 不适配 | 部分兼容 | Cursor 有 transcript 线索；Trae 不再枚举私有会话元数据；Claude Code 可解析 `history.jsonl`，但缺少准确标题。 |
| 会话导出 | 不兼容 | 不兼容 | 部分兼容 | 三者都无稳定官方导出；Claude Code 可安全复制 transcript JSONL 并转换摘要。 |
| checkpoint / revert | 不兼容 | 不兼容 | 不兼容 | Trae / Claude Code 有内部或 worktree 机制，但 StarWork 不应直接依赖宿主 checkpoint。 |

## Cursor 适配判断

2026-06-04 追加实测校准：

- 当前 Cursor 项目下可只读枚举并读取 `~/.cursor/projects/<project-key>/agent-transcripts/<uuid>/<uuid>.jsonl`。
- transcript 可还原用户首条意图、部分助手文本、工具调用名和工具 input；通常缺少完整 stdout / stderr、被读文件全文和富媒体。
- 当前未发现 MCP / Agent 工具可向另一条 Cursor IDE 会话投递消息；`rename_chat` 只作用当前会话。
- `cursor agent --resume <uuid> "<prompt>"` 需要 `cursor agent login` 或 `CURSOR_API_KEY`；未登录会失败。即使登录成功，也应视为 headless resume 实验，不等价于向已打开的 IDE chat 标签发送消息。
- 因此 Cursor 的 `sessions.send_message` 应按 `manual` 处理；本轮只为 `read/status --host` 增加 transcript 只读观察。

### 可做

- 保留 StarWork L0 项目协作层完整能力。
- 支持手动绑定 Cursor 会话：

```bash
starwork multiagent bind research --session cursor:<id> --target . --yes
```

- 增加 Cursor host capability probe，输出当前可用能力，例如：
  - 是否存在 `cursor` CLI。
  - 是否可执行 `cursor agent --help`。
  - 是否可用 `cursor agent status`。
  - 是否已登录或配置 `CURSOR_API_KEY`。
  - 是否找到本地 `agent-transcripts`。
  - 绑定的 session id 是否有对应 JSONL。
  - 是否疑似未登录或认证不可用。
- 除非 Cursor 明确提供标准后台消息投递 API，否则不实现自动 `instruct`。

### 谨慎做

- `bind --session-name` 只作为 best-effort。Cursor MCP 有 `rename_chat` 线索，但 CLI 独立运行时不一定能调用。不能把它作为 StarWork binding 成功条件。
- `read <lane>` 可以先读本地 transcript 摘要，但必须标记为 host observation，不得默认把 transcript 写入项目事实源。
- `launch <lane>` 可以做实验性能力，但必须先验证：
  - 创建 chat 后是否能稳定拿到 chatId。
  - 初始 Launch Message 是否真的进入目标 chat。
  - 用户是否能在 Cursor UI 中找到该 chat。
  - CLI 登录状态和 IDE UI 状态是否一致。

### 不做

- 不直接改写 Cursor 私有数据库。
- 不写 `agent-transcripts/*.jsonl`。
- 不承诺 pin / archive / delete。
- 不承诺向另一条 Cursor IDE 会话自动发送消息。
- 不把 Cursor transcript 当成 StarWork 正式交接记录。

## Trae 适配判断

2026-06-04 追加产品决策：

- Trae 不再继续做会话能力适配。
- 检测到 Trae 或 lane 绑定为 `trae:<id>` 时，StarWork 直接转人工操作。
- `status --host` 只报告 `manual_host`，不读取 Trae 私有会话存储。
- `read`、`instruct`、`continue`、`launch` 都返回人工操作说明或 `unsupported`，不伪装成自动能力。

保留能力：

- StarWork L0 项目协作层仍可用：lane、worklog、shared context、写入边界和人工 handoff。
- 现有 `starwork adapt trae` 若保留，只能维护 StarWork 可控入口，例如 `.trae/rules/`、`.trae/skills/` 和 `.agents/skills/`。

明确不做：

- 不读取 Trae `database.db`。
- 不读取 Trae `state.vscdb` 作为 MultiAgent session 元数据来源。
- 不枚举 Trae session。
- 不读取 Trae transcript。
- 不继续做 Trae observation probe。
- 不实现 Trae 自动 `launch`、`continue` 或 `instruct`。

## Claude Code 适配判断

### 可做

- 保留 StarWork L0 项目协作层完整能力。
- 自动识别当前 Claude Code 会话：

```bash
starwork multiagent bind research --session claude-code:$CLAUDE_CODE_SESSION_ID --target . --yes
```

- 增加 Claude Code host capability probe，输出当前可用能力，例如：
  - 是否存在 `CLAUDE_CODE_SESSION_ID`。
  - 是否存在 `claude` CLI。
  - 是否可执行 `claude --help`。
  - 是否找到当前项目 transcript。
  - 是否可读取 transcript 首条元数据，例如 cwd、gitBranch、permissionMode、version。
- 实现或规划 `multiagent continue <lane>`：对 `claude-code:<id>` 执行 `claude --resume <id>`。
- 实现 `read <lane>` 的 Claude Code 版本：只读 transcript JSONL，输出摘要或最近消息观察，不写回正式事实源。
- 在 `release --archive-session` 中做 StarWork 侧归档：复制 transcript 到 lane workspace，生成交接摘要，解除 StarWork binding。

### 谨慎做

- `bind --session-name` 只能对新启动的 Claude Code 会话通过 `claude -n` 实现；已运行会话应提示用户手工执行 `/rename-conversation`。
- `launch <lane>` 可以生成启动命令，例如 `claude -n "<name>" --session-id <uuid>`，但不应伪装成 Codex 那种后台创建 thread 并自动发送 Launch Message。
- `read <lane>` 读取 transcript 时要控制输出长度，避免把完整历史倾倒到终端或让 Agent 误把宿主 transcript 当成正式交接。
- Claude Code 的 compact / summary 不能替代 StarWork worklog，因为它对用户不可见，也没有结构化保证。

### 不做

- 不写入 Claude Code transcript、`.claude.json` 或其他私有状态文件。
- 不执行 `claude project purge`。
- 不承诺 pin / archive / delete。
- 不承诺向非当前 Claude Code 会话后台发送 follow-up。

## 适配方式计划

### 原则 1：先把 adapter 能力说清楚，而不是硬凑同一套命令

Codex 能做到的，不代表 Cursor / Trae / Claude Code 都能做到。StarWork CLI 应在每个 host adapter 上输出清楚的能力状态：

```text
supported / partial / manual / unsupported
```

用户和 Agent 看到 `partial` 或 `manual` 时，不能把它解释成“已经自动完成”。

### 原则 2：StarWork 项目协作层永远是主路径

无论宿主是否支持读取或继续会话，StarWork 都必须要求 lane 更新：

- worklog
- shared context
- 输出索引
- 当前请求状态

Cursor / Trae / Claude Code 的宿主能力只能增强找回和交付体验，不能替代 StarWork 项目事实源。

### 原则 3：为 Cursor / Trae / Claude Code 增加 adapter capability profile

建议在 `.starwork/agent-lanes/state.json` 或 adapter 输出中记录：

```json
{
  "host": "cursor",
  "capabilities": {
    "detect_session": "partial",
    "rename_session": "partial",
    "list_sessions": "partial",
    "read_session": "partial",
    "send_message": "partial",
    "create_session": "partial",
    "pin_session": "unsupported",
    "archive_session": "unsupported"
  }
}
```

Trae 示例：

```json
{
  "host": "trae",
  "capabilities": {
    "detect_session": "partial",
    "rename_session": "unsupported",
    "list_sessions": "partial",
    "read_session": "unsupported",
    "send_message": "manual",
    "create_session": "manual",
    "pin_session": "unsupported",
    "archive_session": "unsupported"
  }
}
```

Claude Code 示例：

```json
{
  "host": "claude-code",
  "capabilities": {
    "detect_session": "supported",
    "rename_session": "partial",
    "list_sessions": "partial",
    "read_session": "supported",
    "send_message": "manual",
    "create_session": "partial",
    "continue_session": "supported",
    "pin_session": "unsupported",
    "archive_session": "partial"
  }
}
```

### 原则 4：自动交付失败时，生成“人工交付包”

Cursor / Trae / Claude Code 如果不能自动发送跨会话指令，`starworkMultiagent` 应改为生成可复制消息：

```text
请打开 <lane> 对应会话，把下面这段 StarWork MultiAgent Instruction 发给它。
发送后回到当前会话，让我帮你登记状态。
```

这不是退步，而是保证课程首次公开时不因为宿主限制造成体验崩坏。

## 建议实现阶段

### Phase 1：Adapter 能力模型

目标：

- 在 MultiAgent 文档和 CLI 输出中明确 host capability profile。
- `starworkMultiagent` skill 学会按 Codex / Cursor / Trae / Claude Code 分支解释能力。

验收：

- 对 Cursor / Trae / Claude Code 不再说“可以像 Codex 一样 launch/read/instruct”。
- `status --host` 对不支持能力输出清楚的人话解释。

### Phase 2：Claude Code transcript / resume 适配

目标：

- 自动识别 `$CLAUDE_CODE_SESSION_ID`。
- 支持 Claude Code session 手动或自动绑定。
- 支持 `status --host` 读取 transcript 元数据。
- 支持 `read <lane>` 只读 transcript 摘要。
- 规划或实现 `continue <lane>` 映射到 `claude --resume <session-id>`。

验收：

- Claude Code 用户可建立 lanes、绑定当前会话、查看 StarWork 状态和 transcript 观察。
- `continue <lane>` 输出或执行清楚的 `claude --resume` 路径。
- 不写入 Claude Code 私有状态，不执行 `project purge`。

### Phase 3：Cursor transcript 只读适配

目标：

- 支持 Cursor session 手动绑定和 transcript 只读读取。
- 支持 `read/status --host` 输出受控摘要和能力状态。
- 只有 Cursor 明确提供标准后台投递 API 时，才重新评估自动 `instruct`。
- `bind --session-name` 只做 best-effort 或 skill 内操作建议，不影响 StarWork binding。

验收：

- Cursor 用户可建立 lanes、绑定会话、查看 StarWork 状态和 transcript 摘要。
- 在不具备稳定 chatId 或认证不可用时，CLI 不报假成功，而是给人工交付方式。

### Phase 4：Trae 人工操作收敛

目标：

- 停止 Trae session 观察型适配。
- 检测到 Trae 或绑定 `trae:<id>` 时直接返回人工操作。
- 为跨会话指令生成可复制的格式化消息。

验收：

- Trae 用户可使用 StarWork lane、worklog、shared context 和人工 handoff。
- `status --host` 清楚说明 Trae 是 `manual_host`。
- `instruct` 不伪装成自动发送，而是输出人工发送步骤。
- CLI 不读取 Trae `database.db`、`state.vscdb` 或其他私有会话存储。

### Phase 5：课程和 A 测口径

目标：

- 课程中把 MultiAgent 讲成“项目协作协议 + 宿主增强能力”，不是“所有工具都能自动派活”。
- A 测指南分开写 Codex、Claude Code、Cursor、Trae 的能力差异。

验收：

- 用户能理解：Codex 是当前自动编排能力最完整的宿主；Claude Code 适合 resume / transcript 型协作；Cursor 是部分自动化；Trae 当前主要是项目内协作和人工交付。
- Agent 不会在 Cursor / Trae / Claude Code 环境中承诺无法执行的自动操作。

## 待确认问题

1. Cursor `rename_chat` MCP 是否能被 StarWork CLI 独立调用，还是只能由运行在 Cursor 内的 Agent 使用。
2. Cursor 是否存在明确的标准后台消息投递 API；仅有 `cursor agent --resume <chatId>` 不足以支持自动 `instruct`。
3. Trae 是否存在未发现的公开 IPC / CLI session API。除非官方能力明确，否则 StarWork 不再投入 Trae 会话适配。
4. Claude Code transcript JSONL 在不同版本和旧版目录格式下的解析兼容范围。
5. Claude Code `claude --resume <session-id>` 是否适合由 CLI 直接执行，还是只输出命令让用户复制执行。
6. 是否需要新增 `multiagent handoff` 命令，专门生成人工交付包，供 Cursor / Trae / Claude Code 低自动交付场景使用。
