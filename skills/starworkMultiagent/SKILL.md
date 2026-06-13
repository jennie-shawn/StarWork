---
name: starworkMultiagent
description: 'Design and maintain StarWork Agent Lanes, multi-agent roles, lane bindings, cross-session messages, and Codex standard session tool workflows.'
---

# starworkMultiagent

使用这个 skill，把用户关于“常用智能体”“当前会话职责”“多 Agent 分工”“跨 Agent 输出共享”“跨会话指令”“查看其他 lane 进度”“创建 Agent 团队”的自然语言请求，转换成安全的 StarWork 协作流程。

`starworkMultiagent` 不是 `starwork multiagent` 命令本身。Skill 负责判断用户意图、确认 lane 语义、直接调用 Codex App 标准线程工具，并把真实结果记录回 StarWork 项目事实源。CLI 只负责项目内状态、绑定、共享输出和请求投递记录。

不要把职责写死为前端、后端、测试。lane ID、职责和写入范围必须来自当前项目语境。

## 主入口边界

如果用户只是询问产品总览、起步路径、安装入口或该用哪个 StarWork 能力，回到 `starwork` 主入口。用户明确说多 Agent、Agent Lanes、lane、跨会话消息、开发 Agent、产品 Agent、验收 Agent 或 Codex 会话控制时，继续直接使用 `starworkMultiagent`。

## 创建 AI 团队的第一屏

当用户说“开启 MultiAgent”“创建 AI 团队”“帮我创建多个 Agent”“给这个项目拆几个智能体”时，先讲清楚这一步对用户有什么帮助，不要直接进入内部流程：

```text
可以。我会先帮你把这个项目拆成几个清楚的 AI 岗位。

每个岗位会有三件事：
1. 它负责什么；
2. 它可以整理或修改哪些内容；
3. 它完成后要怎么交接。

我会按这个顺序来：
1. 先检查当前项目是否准备好；
2. 再给你设计岗位方案；
3. 先预览要写入的协作记录；
4. 等你确认后再正式创建。

检查和预览阶段不会改你的项目文件。
```

如果用户只是说“怎么用 / 安装后怎么开始”，先给可复制提示词，不要把命令作为第一入口：

```text
你可以这样开始：

“请帮我看看当前项目适不适合开启多 AI 分工。
先不要写入，只帮我设计 3 个岗位，并说明每个岗位负责什么、可以整理哪些内容、怎么交接。”
```

## 自然追问

创建团队时，只问用户能自然回答的问题：

```text
这个项目主要想完成什么？
你希望哪些事情交给不同 AI 分开做？
有没有哪些文件或内容不希望 AI 主动修改？
```

不要一上来索要内部字段。由 Skill 根据用户回答生成内部 ID、职责说明、可写范围和回报方式。

如果用户不知道怎么拆，可以给少量示例帮助理解，但必须说清楚：

```text
这些只是参考，我会根据你当前这个项目重新设计，不会直接套模板。
```

示例只用于启发，不要内置固定岗位模板或让用户选择固定模板。

## 预览与确认

创建或调整 AI 岗位前，先给用户看岗位方案表：

| AI 岗位 | 负责什么 | 可以整理或修改的范围 | 交接方式 |
|---|---|---|---|
| 调研助手 | 整理资料和用户痛点 | 调研笔记、资料区 | 共享调研摘要 |
| 写作助手 | 写初稿和改表达 | 草稿、文档区 | 提交草稿给检查助手 |
| 检查助手 | 检查事实和风险 | 检查记录 | 给出修改建议 |

表格后必须加：

```text
如果这个方案没问题，我再创建这些协作记录。
```

所有写入前都要明确：

```text
下面是预览，还不会真正写入。
```

写入后要说明：

```text
这次只写入了协作记录，没有改你的业务内容。
```

如果确实会修改项目正式文件，必须先列出文件和目的，并等待用户确认：

```text
这一步会修改以下文件：
- <path>

修改目的：
- <purpose>

确认后我再继续。
```

## 降级与安全接入

目标目录不是 StarWork 工作台时，不要抛内部错误后停住。先说：

```text
我还不能确认这个目录已经适合开启多 AI 分工。

为了避免写错位置，我建议先完成项目接入检查。这个过程会先预览，不会直接改文件。
```

如果 AI 入口文档仍是待整合草稿，说明这是为了避免不同 AI 读到不一致规则，再自然转入 `starworkInit` 安全接入。

自动线程工具不可用时，不要把能力差异说成失败：

```text
当前这个 AI 工具暂时不能自动把消息送到另一个会话。

我会换成更稳妥的方式：生成一段交接消息，让你复制给目标 AI 会话。
这样项目记录仍然清楚，也不会误以为任务已经自动完成。
```

随后展示完整 `STARWORK:MULTIAGENT_MESSAGE`，并明确：

```text
这段交接消息已经准备好，但还没有自动送达。
```

不得使用任何暗示已经自动送到目标会话的成功口径。

## 状态口径

对用户汇报时严格区分：

| 状态 | 可以说 | 不可以说 |
|---|---|---|
| 岗位已创建 | 已经创建了 AI 岗位 | Agent 已经开始工作 |
| 会话已绑定 | 这个岗位已经有对应 AI 会话 | 任务已经完成 |
| 消息已送达 | 交接消息已发送给目标会话 | 目标会话已经完成任务 |
| 目标任务已完成 | 目标会话已明确回报完成，或 worklog / shared output 有完成证据 | 只因消息已发送就说完成 |

## 参考

需要完整边界、验收标准和子命令映射时，读取：

```text
../starworkMultiagent-spec.md
../../core/agent-lanes-spec.md
../../planning/features/multiagent/specs/v0.8-skill-cli-minimal-boundary.md
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

开始任何多 Agent 写入前，先确认目标目录是 StarWork 工作台：

```bash
starwork doctor --target <path> --json
```

如果目标不是 StarWork 工作台，立即停止 multiagent 写入，不要尝试局部初始化，不要新建 `AGENTS.starwork-new.md` 或只补 `_系统/协作/`。下一步是切换到 `starworkInit` Skill，由它采访用户、选择工作台类型和 Pack、处理已有规则入口，并在用户确认后调用 CLI。

如果 `starwork doctor --target <path> --host <host> --json` 或 `.starwork/adapters.json` 显示 `rules_entry_status: pending_merge`，也必须停止多 Agent 写入。这表示 AI 入口文档还只是 `.starwork/drafts/` 草稿，先切回 `starworkInit` 整合最终 `AGENTS.md` / 宿主规则入口；完成并重新 doctor 后，才能继续创建或绑定团队。

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

## 宿主路由

任何依赖宿主能力的动作（发送、读取、列出、创建、改名、置顶、归档）执行前，先确定**目标会话**属于哪个宿主，再选对应工具表：

- 从目标 lane 的 `current_session` 前缀判断宿主：`codex:<id>` → Codex（用上面的「Codex 标准工具」）；`claude-code:<id>` → Claude Code 桌面端（用下面的「Claude Code Desktop 标准工具」）。
- 选定工具后，**调用前先确认该工具此刻出现在你的可用工具列表里**（必要时用工具发现能力查找）。前缀只说明目标会话属于哪个宿主，不代表你当前环境一定能调用它。
- 如果你当前不在该宿主里、或对应工具不可见，**不要调用另一个宿主的工具，也不要假装已自动完成**：改为输出 `manual_handoff_required`，展示完整可复制 `STARWORK:MULTIAGENT_MESSAGE`，并说明尚未自动送达。
- 某宿主某场景在工具表里标注「无」时，同样走人工 handoff，不要用别的能力凑。

## Claude Code Desktop 标准工具

目标会话是 `claude-code:<id>` 且你正运行在 Claude Code 桌面端时，以下动作由 Skill 直接调用标准工具：

| 场景 | 标准工具 | 注意 |
|---|---|---|
| 向 lane 会话发送指令 | `mcp__ccd_session_mgmt__send_message` | 参数是 `(session_id, message)`，不是 Codex 的 `(threadId, prompt)`；会弹用户确认；仅在有人值守会话可用；`session_id` 不能是当前会话 |
| 搜索或确认历史会话 | `mcp__ccd_session_mgmt__list_sessions` / `mcp__ccd_session_mgmt__search_session_transcripts` | 只读 |
| 读取 lane 会话状态 | `mcp__ccd_session_mgmt__search_session_transcripts` | 宿主观察，不替代 lane worklog |
| 归档会话 | `mcp__ccd_session_mgmt__archive_session` | 会弹用户确认 |
| 创建 lane 会话 / 设置标题 / 置顶 | 无对应标准工具 | 走人工 handoff：请用户在 Claude Code 里手动新建或改名会话，拿到 session id 后再用 `multiagent bind` 记录 |

发送成功后，用 CLI 记录真实投递状态：

```bash
starwork multiagent request record --from <from-lane> --to <to-lane> --message "<text>" --host-delivery delivered_via_claude_code_session_tool --delivery-tool ccd_session_mgmt_send_message --target <path> --yes
```

成功时可以说“已投递到目标会话，并已记录到 StarWork”，不要说“目标任务已完成”。工具不可见、用户拒绝确认或调用失败时，输出 `manual_handoff_required`，展示完整 Instruction Message，并说明尚未自动送达；不得改用 CLI 模拟自动投递。

## 判断用户意图

优先把用户话语归到一个入口，不要一开始讲 CLI 子命令。

| 用户意图 | Skill 解释 | 主流程 |
|---|---|---|
| “把当前会话创建为常用智能体，负责 X” | 登记当前会话为一个稳定职责位 | 必要时 `doctor` / `init` / `multiagent add`，标准工具处理宿主显示动作，再 `multiagent bind` |
| “初始化多 Agent 协作层” | 创建 Agent Lanes 协议文件 | CLI `multiagent init` |
| “增加一个负责 X 的 Agent / lane” | 新增职责位，暂不一定绑定会话 | CLI `multiagent add` |
| “把当前工具会话绑定到 X” | 将具体 session 绑定到已有 lane | 可先 `set_thread_title` / `set_thread_pinned`，再 CLI `multiagent bind` |
| “这个会话不再负责 X” | 释放 lane 当前绑定 | 可先 `set_thread_archived`，再 CLI `multiagent release` |
| “看看现在有哪些 Agent 分工” | 读取 StarWork 协作状态 | CLI `multiagent status --target <path> --json` |
| “这个输出给其他 Agent 看” | 登记共享输出索引 | CLI `multiagent share` |
| “让开发 lane 开始开发” | Skill 组装指令消息并投递到目标 Codex 会话 | `multiagent status --target <path> --json`，再 `send_message_to_thread`，再 `multiagent request record` |
| “看看开发 lane 做到哪了” | 读取 StarWork binding，再直接观察 Codex thread | `multiagent status --target <path> --json`，再 `read_thread` / `list_threads` |
| “帮我创建产品、开发、验收三个智能体” | 设计 lanes 后创建并绑定可工作的独立会话 | `doctor` / `init` / `multiagent add`，再 `create_thread` / `set_thread_title` / `set_thread_pinned` / `multiagent bind` |

## Skill-owned Message 渲染

Codex App 正常路径中，Skill 自己组装 StarWork 消息，不调用 CLI 模板生成器。消息必须是完整可复制文本，并保留如下边界：

```text
<!-- STARWORK:MULTIAGENT_MESSAGE v1 -->

# StarWork MultiAgent Instruction

message_type: instruction
request_id: <REQ-id>
from_lane: <from-lane>
to_lane: <to-lane>
created_at: <ISO time>
recorded_in: _系统/协作/shared.md

## 消息内容

<用户指令或 Launch Message>

## 边界

- 只在你的 write_scope 内主动修改：<write-scope>
- 如需修改 write_scope 之外的文件，先在共享记录中说明需要授权。
- 不要修改与本任务无关的文件。
- 当前工作区：<absolute-target-path>

## 完成后请回报

1. 更新你的 lane worklog。
2. 如有正式输出，登记 Shared Outputs。
3. 如需验收，向来源 lane 回传复验请求。

<!-- /STARWORK:MULTIAGENT_MESSAGE -->
```

Launch Message 使用同一包装格式，但标题可写成 `# StarWork MultiAgent Launch`，正文要包含 lane 职责、写入范围、当前工作区、启动后的第一步和回报方式。

## 创建 Agent 团队

“创建 Agent 团队 / 创建多个智能体 / 产品、开发、验收三个智能体”不是只创建 lane。完整成功标准是：每个目标职责都有 lane、每个 lane 已绑定可工作的独立 session，或者输出中明确说明哪些 lane 未完成以及阻塞原因。

流程：

1. 先按“前置边界”确认目标是 StarWork 工作台，并确认宿主入口不是 `pending_merge`。
2. 读取 `agent-lanes.md` 和 `.starwork/agent-lanes/state.json`，判断哪些 lane 已存在，哪些需要新增。
3. 对缺失 lane 先 dry-run CLI `multiagent add`，确认 `lane-id`、职责和写入范围；用户确认后执行 `--yes`。
4. 对每个需要独立 Codex session 的 lane，由 Skill 组装 Launch Message。标题建议由 lane 职责短名生成，格式固定为 `<职责名> Agent`；不要加入项目名、目录名、thread id、UUID、日期或内部状态词。
5. 直接调用 `create_thread`，把 Launch Message 作为 prompt，目标工作区使用当前项目 local 环境。
6. 如需要命名，直接调用 `set_thread_title(threadId, "<职责名> Agent")`。
7. 如用户要求置顶，直接调用 `set_thread_pinned(threadId, true)`。
8. 只有 `create_thread` 返回 thread id 后，才记录绑定：

```bash
starwork multiagent bind <lane> --session codex:<threadId> --target <path> --yes
```

9. 如果 `create_thread`、标题或置顶工具不可见或失败，说明具体失败点，并展示 Launch Message 供用户手动复制。不能说这个 Agent 已创建并绑定。

只有用户明确说“先只初始化协作层 / 先只建职责位 / lane-only”时，才可以停在 `multiagent init` / `multiagent add`。

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

不要把 CLI 的宿主显示名参数或置顶参数当成触发宿主动作的入口；这些宿主动作由 Skill 直接完成。

## 发送指令

向另一个 lane 发送结构化跨会话指令时：

1. 用 CLI 读取 StarWork 状态：

```bash
starwork multiagent status --target <path> --json
```

2. 如果目标 lane 未绑定，先询问用户要绑定已有会话还是创建新会话。
3. Skill 按“Skill-owned Message 渲染”组装完整 Instruction Message。
4. 对 Codex session，直接调用 `send_message_to_thread(threadId, message)`。
5. 投递成功后，用 CLI 记录 StarWork request：

```bash
starwork multiagent request record --from <from-lane> --to <to-lane> --message "<text>" --host-delivery delivered_via_codex_thread_tool --delivery-tool send_message_to_thread --target <path> --yes
```

成功时可以说“已投递到目标会话，并已记录到 StarWork”。不要说“目标任务已完成”。目标完成仍需通过目标 lane worklog、shared outputs、回传消息或 `read_thread` 观察。

如果 `send_message_to_thread` 不可见或失败，输出 `manual_handoff_required`，展示完整 Instruction Message，并说明尚未自动送达。不得改用 CLI 去模拟自动投递；如只需要把用户已经完成的人工动作补记到账，可使用 `recorded_only`。

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

## 只做 StarWork 项目事实源的 CLI 命令

以下 CLI 命令仍由 Skill 调用，用于维护项目内事实源：

- `starwork multiagent init`
- `starwork multiagent add`
- `starwork multiagent bind`
- `starwork multiagent release`
- `starwork multiagent status --target <path> --json`
- `starwork multiagent share`
- `starwork multiagent request record`

这些命令不能替代 Codex 标准会话控制工具。Codex App 正常路径里，创建、投递、读取、命名、置顶和归档都由 Skill 直接调用标准线程工具。

## 非 Codex 宿主

Claude Code 桌面端的标准工具见上文「宿主路由」与「Claude Code Desktop 标准工具」：发送、列出、读取、归档可由 Skill 直接调用；创建、改名、置顶无标准工具，走人工 handoff。

Cursor、Trae 以及 Claude Code 终端 CLI 在没有等价标准会话工具前，不要宣称可以自动创建、发送、改名、置顶或归档；使用人工 handoff 或只读 transcript 摘要。具体策略按各自 Host Adapter 文档执行。

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
