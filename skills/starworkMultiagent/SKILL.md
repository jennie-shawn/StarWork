---
name: starworkMultiagent
description: 'Design and maintain StarWork Agent Lanes with `starwork multiagent`, and in Codex App directly use standard session tools for thread creation, messaging, reading, title, pin, and archive actions.'
---

# starworkMultiagent

使用这个 skill，把用户关于“常用智能体”“当前会话职责”“多 Agent 分工”“跨 Agent 输出共享”“跨会话指令”“查看其他 lane 进度”“创建 Agent 团队”的自然语言请求，转换成安全的 StarWork 协作流程。

`starworkMultiagent` 不是 `starwork multiagent` 命令本身。Skill 负责判断用户意图、确认 lane 语义和写入边界，并在 Codex App 中直接调用标准会话控制工具。CLI 只负责 StarWork 文件状态、消息模板和记录辅助。

不要把职责写死为前端、后端、测试。lane ID、职责和写入范围必须来自当前项目语境。

## 参考

需要完整边界、验收标准和子命令映射时，读取：

```text
../starworkMultiagent-spec.md
../../core/agent-lanes-spec.md
../../planning/features/multiagent/specs/v0.7-codex-standard-session-tools.md
```

不要在 skill 内重复维护 Agent Lanes 协议细节；以 Core SPEC 和 MultiAgent 版本 SPEC 为事实源。

## 先读上下文

开始前优先读取当前工作区内这些文件，存在多少读多少：

```text
AGENTS.md
_系统/上下文/current-projects.md
_系统/上下文/decisions.md
_系统/上下文/product-principles.md
_系统/任务/current-work.md
_系统/协作/agent-lanes.md
_系统/协作/shared.md
_system/context/current-project.md
_system/context/decisions.md
_system/tasks/current-work.md
_system/collaboration/agent-lanes.md
_system/collaboration/shared.md
```

中文项目使用 `_系统/协作/`；英文项目使用 `_system/collaboration/`。不要在英文项目里新建中文协作路径，也不要在中文项目里新建英文协作路径。

如果用户指定了目标目录，所有 CLI 命令都加 `--target <path>`。如果没有指定，默认目标是当前工作区。

## 前置边界

`starworkInit` 负责把普通项目变成 StarWork 工作台；`starworkMultiagent` 只负责已有 StarWork 工作台里的团队协作。

开始任何 `multiagent init/add/bind/launch` 写入前，先确认目标目录是 StarWork 工作台：

```bash
starwork doctor --target <path> --json
```

如果目标不是 StarWork 工作台，立即停止 multiagent 写入，不要尝试局部初始化，不要新建 `AGENTS.starwork-new.md` 或只补 `_系统/协作/`。下一步是切换到 `starworkInit` Skill，由它采访用户、选择工作台类型和 Pack、处理已有规则入口，并在用户确认后调用 CLI。

如果 `starwork doctor --target <path> --host <host> --json` 或 `.starwork/adapters.json` 显示 `rules_entry_status: pending_merge`，也必须停止 `multiagent init/add/bind/launch`。这表示 AI 入口文档还只是 `.starwork/drafts/` 草稿，先切回 `starworkInit` 整合最终 `AGENTS.md` / 宿主规则入口；完成并重新 doctor 后，才能继续创建或绑定团队。

## Codex 标准工具

在 Codex App 中，以下动作由 Skill 直接调用标准工具：

| 场景 | 标准工具 |
|---|---|
| 创建 lane 会话 | `create_thread` |
| 向 lane 会话发送指令 | `send_message_to_thread` |
| 读取 lane 会话状态 | `read_thread` |
| 搜索或确认历史会话 | `list_threads` |
| 设置会话标题 | `set_thread_title` |
| 置顶或取消置顶 | `set_thread_pinned` |
| 归档或取消归档 | `set_thread_archived` |

如果这些工具没有出现在当前可用工具列表里，先用工具发现能力查找。仍不可见或调用失败时，不要宣称已创建、已发送或已改名；输出 `manual_handoff_required`，并展示完整可复制的 `STARWORK:MULTIAGENT_MESSAGE`。

## 判断用户意图

优先把用户话语归到一个入口，不要一开始讲 CLI 子命令。

| 用户意图 | Skill 解释 | 主流程 |
|---|---|---|
| “把当前会话创建为常用智能体，负责 X” | 登记当前会话为一个稳定职责位 | 必要时 CLI `init/add`，再用当前 thread id 执行 CLI `bind` |
| “初始化多 Agent 协作层” | 创建 Agent Lanes 协议文件 | CLI `multiagent init` |
| “增加一个负责 X 的 Agent / lane” | 新增职责位，暂不一定绑定会话 | CLI `multiagent add` |
| “把当前工具会话绑定到 X” | 将具体 session 绑定到已有 lane | 可先 `set_thread_title` / `set_thread_pinned`，再 CLI `bind` |
| “这个会话不再负责 X” | 释放 lane 当前绑定 | 可先 `set_thread_archived`，再 CLI `release` |
| “看看现在有哪些 Agent 分工” | 读取 StarWork 协作状态 | CLI `multiagent status --json` |
| “这个输出给其他 Agent 看” | 登记共享输出索引 | CLI `multiagent share` |
| “让开发 lane 开始开发” | 生成指令消息，直接投递到目标 Codex 会话 | CLI `message instruct`，再 `send_message_to_thread`，再 CLI `request record` |
| “看看开发 lane 做到哪了” | 读取 StarWork binding，再直接观察 Codex thread | CLI `status --json`，再 `read_thread` |
| “帮我创建产品、开发、验收三个智能体” | 设计 lanes 后创建并绑定可工作的独立会话 | CLI `init/add`，CLI `message launch`，再 `create_thread` / `bind` |

## 创建 Agent 团队

“创建 Agent 团队 / 创建多个智能体 / 产品、开发、验收三个智能体”不是只创建 lane。完整成功标准是：每个目标职责都有 lane、每个 lane 已绑定可工作的独立 session，或者输出中明确说明哪些 lane 未完成以及阻塞原因。

流程：

1. 先按“前置边界”确认目标是 StarWork 工作台，并确认宿主入口不是 `pending_merge`。
2. 读取 `agent-lanes.md` 和 `.starwork/agent-lanes/state.json`，判断哪些 lane 已存在，哪些需要新增。
3. 对缺失 lane 先 dry-run CLI `multiagent add`，确认 `lane-id`、职责和写入范围；用户确认后执行 `--yes`。
4. 对每个需要独立 Codex session 的 lane，生成 Launch Message：

```bash
starwork multiagent message launch <lane> --target <path> --json
```

读取 JSON 里的 `message` 和 `session_name`。`session_name` 是唯一的默认标题建议；不要从 `purpose`、Launch Message 或用户使用场景长句自行拼标题。

5. 直接调用 `create_thread`，把 `message` 作为 prompt，目标工作区使用当前项目 local 环境。
6. 如需要命名，直接调用 `set_thread_title(threadId, session_name)`。默认标题只能使用 CLI 返回的 `<职责名> Agent`，不要加入项目名、目录名、thread id、UUID、日期、`lane`、`session` 等内部词。
7. 如用户要求置顶，直接调用 `set_thread_pinned`。
8. 只有 `create_thread` 返回 thread id 后，才记录绑定：

```bash
starwork multiagent bind <lane> --session codex:<threadId> --target <path> --yes
```

9. 如果 `create_thread`、标题或置顶工具不可见或失败，说明具体失败点，并展示 Launch Message 供用户手动复制。不能说这个 Agent 已创建并绑定。

只有用户明确说“先只初始化协作层 / 先只建职责位 / lane-only”时，才可以停在 `multiagent init/add`。

## 绑定当前会话

把当前会话登记为某个 lane 时：

1. 如果当前上下文能获得当前 thread id，直接使用；否则询问用户提供 `codex:<thread-id>`。
2. 如果 lane 不存在，先用 CLI `multiagent add` 建立职责和写入范围。
3. 如用户要求改名，先直接调用 `set_thread_title`。
4. 如用户要求置顶，直接调用 `set_thread_pinned`。
5. 用 CLI 记录 StarWork binding：

```bash
starwork multiagent bind <lane> --session codex:<threadId> --target <path> --yes
```

不要把 `--session-name` 或 `--pin` 当成 CLI 触发宿主动作的入口；这些宿主动作由 Skill 直接完成。

## 发送指令

向另一个 lane 发送结构化跨会话指令时：

1. 用 CLI 读取 StarWork 状态：

```bash
starwork multiagent status --target <path> --json
```

2. 如果目标 lane 未绑定，先询问用户要绑定已有会话还是创建新会话。
3. 生成标准 Instruction Message：

```bash
starwork multiagent message instruct <to-lane> --from <from-lane> --message "<text>" --target <path> --json
```

4. 对 Codex session，直接调用 `send_message_to_thread(threadId, message)`。
5. 投递成功后，用 CLI 记录 StarWork request：

```bash
starwork multiagent request record --from <from-lane> --to <to-lane> --message "<text>" --host-delivery delivered --delivery-tool send_message_to_thread --target <path> --yes
```

成功时可以说“已投递到目标会话”。不要说“目标任务已完成”。目标完成仍需通过目标 lane worklog、shared outputs、回传消息或 `read_thread` 观察。

如果 `send_message_to_thread` 不可见或失败，输出 `manual_handoff_required`，展示完整 Instruction Message，并说明尚未自动送达。不得改用 CLI 去模拟自动投递。

## 读取 lane 状态

如果用户问“某个 lane 做到哪了”：

1. 先读 StarWork 协作状态：

```bash
starwork multiagent status --target <path> --json
```

2. 对已绑定的 Codex session，直接调用 `read_thread`。需要查找历史会话时，调用 `list_threads`。
3. 汇总时区分：
   - Codex thread 最近 turn 和状态。
   - lane worklog 是否有正式进展记录。
   - shared outputs / cross-lane requests 是否有可验收输出。

`read_thread` 是宿主观察，不替代 lane worklog。正式交接仍以 lane worklog 和 shared outputs 为准。

## 归档与释放

如果用户要归档某个 Agent：

1. 如需归档 Codex thread，直接调用 `set_thread_archived(threadId, true)`。
2. 如需释放 StarWork binding，再执行：

```bash
starwork multiagent release <lane> --target <path> --yes
```

释放前提醒用户先更新该 lane 的 worklog，至少写清当前状态、输出和下一步。

## 只做 StarWork 文件状态的 CLI 命令

以下 CLI 命令仍由 Skill 调用，用于维护项目内事实源：

- `starwork multiagent init`
- `starwork multiagent add`
- `starwork multiagent bind`
- `starwork multiagent release`
- `starwork multiagent status`
- `starwork multiagent share`
- `starwork multiagent message launch`
- `starwork multiagent message instruct`
- `starwork multiagent request record`

这些命令不能替代 Codex 标准会话控制工具。CLI `launch` 只是旧兼容入口，用于生成手动 Launch Message；不要把它当成 Codex 创建会话的主流程。

## 非 Codex 宿主

Cursor、Trae、Claude Code 的策略按各自 Host Adapter 文档执行。在没有等价标准会话工具前，不要宣称可以自动创建、发送、改名、置顶或归档；使用人工 handoff 或只读 transcript 摘要。

## Lane Workspace 与正式输出

每个 lane 默认有自己的过程工作区：

```text
_系统/协作/lanes/<lane-id>/workspace/
_system/collaboration/lanes/<lane-id>/workspace/
```

使用规则：

- 草稿、调研笔记、中间分析和临时实验结果，优先放入当前 lane workspace。
- 用户认可的最终交付物、项目正式文档、发布稿和确认稿，应晋升到项目正式输出目录。
- workspace 内容需要其他 lane 读取时，用 `starwork multiagent share` 登记到当前语言对应的 `shared.md`。
- 晋升后，以项目正式输出目录中的文件为准；workspace 保留过程记录。
- 不要把 workspace 当成新的长期事实源或归档库。

## 安全规则

- 写入类 CLI 命令默认先 `--dry-run` 或征得用户确认。
- 用户明确要求执行后，写入类 CLI 命令使用 `--yes`。
- `status` 是只读命令，可以直接运行。
- 不写入 `matters/registry.md`。
- 不创建任务系统、锁系统或 JSON manifest。
- 不自动决定项目该有哪些 lane。
- 不把示例 lane 当默认模板。
- 不把 lane workspace 当成项目正式输出目录。
- lane 外文件修改前，先登记共享请求或取得用户明确授权。

## 输出格式

对用户汇报时：

- 清楚区分“StarWork 状态已记录”和“Codex 工具动作已成功”。
- 只有标准工具调用成功且 CLI 记录成功时，才说 Agent 已创建并绑定或消息已投递。
- 工具不可见或失败时，直接给出 `manual_handoff_required` 和完整可复制消息。
- 不承诺目标任务完成；完成状态必须来自目标 lane 的明确回报、worklog、shared output 或 `read_thread` 观察。
