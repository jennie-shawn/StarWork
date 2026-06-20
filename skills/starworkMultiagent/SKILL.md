---
name: starworkMultiagent
description: 'Design and maintain StarWork Agent Lanes, multi-agent roles, lane bindings, cross-session messages, and Codex standard session tool workflows.'
---

# starworkMultiagent

使用这个 Skill，把用户关于“常用智能体”“当前会话职责”“多 Agent 分工”“跨 Agent 输出共享”“跨会话指令”“查看其他 lane 进度”“创建 Agent 团队”的自然语言请求，转成安全的 StarWork 协作流程。

`starworkMultiagent` 不是 `starwork multiagent` 命令本身。Skill 负责判断意图、读取必要 reference、直接调用宿主标准会话工具，并把真实结果记录回 StarWork 项目事实源。**CLI 只做 StarWork 项目事实源**，不是宿主会话动作执行者。

如果用户只是询问 StarWork 是什么、怎么开始、安装入口或该用哪个能力，回到 `starwork` 主入口。用户明确说多 Agent、Agent Lanes、lane、跨会话消息、开发 Agent、产品 Agent、验收 Agent、Codex 标准会话工具或 Codex 会话控制时，继续使用本 Skill。

workflow 是 next 内测能力；stable Skill 不引导普通用户测试 workflow。如果用户询问 workflow，说明需要 next Skill 或等待正式发布。

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

中文项目使用 `_系统/协作/`；英文项目使用 `_system/collaboration/`。如果用户指定目标目录，所有 CLI 命令都加 `--target <path>`；否则默认当前工作区。

## Reference 加载规则

当用户请求命中某个场景时，先读取该场景 reference，再执行动作。

如果 reference 文件不存在或无法读取，不得继续执行对应高风险动作；先说明 Skill 安装不完整，并要求用户用完整目录重新安装 StarWork Skills。

| 场景 | 必读 reference |
|---|---|
| 判断用户意图 | `references/intent-routing.md` |
| 任何 MultiAgent 写入前 | `references/context-and-compatibility.md` |
| 绑定 / 改名 / 置顶 / 归档 / 创建会话 | `references/session-tools.md` |
| 向其他 lane / Agent / session 投递 | `references/delivery-guarantee.md`、`references/message-templates.md`、`references/session-tools.md` |
| 创建 Agent 团队 | `references/team-onboarding.md`、`references/session-tools.md`、`references/message-templates.md` |
| 读取 lane 状态 | `references/session-tools.md`、`references/lane-workspace-output-promotion.md` |
| 登记 shared output / 晋升输出 | `references/lane-workspace-output-promotion.md` |
| 写入、输出、安全边界 | `references/safety-output-rules.md` |

## 前置保护

`starworkInit` 负责把普通项目接入 StarWork；本 Skill 只负责已有 StarWork 工作台里的团队协作。

开始任何多 Agent 写入前：

1. 先确认目标目录是 StarWork 工作台；目标不是 StarWork 工作台时，停止 multiagent 写入，转 `starworkInit` 安全接入。
2. `rules_entry_status: pending_merge` 时停止写入，转 `starworkInit` 整合最终 `AGENTS.md` / 宿主规则入口。
3. `multiagent.compatibility.status` 不是 `current` 时，不进行写入类 MultiAgent 操作；先走 v0.10 升级预览。
4. 写入类命令先预览或等用户确认；不要覆盖用户业务文件。

## 当前会话 ID

任何会话控制或跨会话操作前，必须确认**当前会话 ID**。

- `<codex_delegation>` 中的 `source_thread_id` 优先作为当前来源会话 ID。
- 宿主或运行环境显式提供 current thread / current session metadata 时，使用该值。
- 不得用历史 worklog、旧 binding、相似标题、最近更新时间或猜测出的 thread id 推断当前会话。
- 如果当前会话 ID 不明，停止绑定、改名、置顶、归档、释放和以当前会话为来源的投递记录。
- 发送前必须检查目标 lane session 不等于当前会话；否则默认阻断自我投递，除非用户明确要求本地执行或仅记录。

## 必须投递

目标是另一个 lane、Agent 或 session 的步骤，都是**必须投递步骤**。必须投递步骤不能用当前回复说明替代，也不能把“消息已准备好”当作完成。

合法结果只有三类：

| 结果 | 要求 |
|---|---|
| 真实自动投递成功 | 确认目标 lane / session / 当前会话 ID，组装完整消息，调用宿主标准线程工具成功，再记录 StarWork request |
| 明确人工转交 | 工具不可见或失败时，先工具发现；仍失败则输出 `manual_handoff_required`、完整可复制消息，并说明尚未自动送达 |
| 明确阻塞 | 目标 lane、目标 session、当前会话 ID 或用户确认缺失时，进入 blocked / unbound / needs_confirmation |

状态写入顺序固定：

```text
确认目标 lane / session / current session
  -> 组装 STARWORK:MULTIAGENT_MESSAGE
  -> 调用 send_message_to_thread 或对应宿主标准工具成功
  -> 再执行 starwork multiagent request record delivered...
```

未真实投递成功不得记录 `delivered_via_codex_thread_tool` 或 `delivered_via_claude_code_session_tool`，不得说“已通知”“已完成交接”或“目标任务已完成”。

如果 `send_message_to_thread` 或对应宿主标准工具不在当前工具列表里，先用工具发现能力查找。工具发现不可见、发现失败或调用失败时，进入 `manual_handoff_required`，展示完整 `STARWORK:MULTIAGENT_MESSAGE v1`，并明确尚未自动送达。

## CLI 与宿主工具边界

Codex App 正常路径中，创建、投递、读取、命名、置顶、归档由 Skill 直接调用标准线程工具：`create_thread`、`send_message_to_thread`、`read_thread`、`list_threads`、`set_thread_title`、`set_thread_pinned`、`set_thread_archived`。

CLI 只维护 StarWork 项目事实源，例如：

- `starwork doctor --target <path> --json`
- `starwork multiagent status --target <path> --json`
- `starwork multiagent init`
- `starwork multiagent add`
- `starwork multiagent bind`
- `starwork multiagent release`
- `starwork multiagent share`
- `starwork multiagent request record`

不得恢复旧 CLI 自动投递或创建路径作为 Codex App 正常路径；宿主工具不可见时走工具发现或人工交接，不用 CLI 模拟自动投递。

## 成功口径

对用户汇报时分层说明：

| 状态 | 含义 |
|---|---|
| 岗位已创建 | StarWork 中已有职责位 |
| 会话已绑定 | 职责位已绑定真实 AI 会话 |
| 消息已送达 | 交接消息已到目标会话，并可记录 request |
| 目标任务已完成 | 必须来自目标 lane 回传、worklog、shared output 或明确会话观察 |

**消息已送达不等于目标任务已完成**。Agent 已创建 / 会话已绑定也不等于任务已经开始或完成。

## Skill-owned Message

Codex App 正常路径中，Skill 自己组装 StarWork 消息，不调用 CLI 模板生成器。消息必须完整可复制，详情读取 `references/message-templates.md`。

## 输出与安全

- 不自动决定项目该有哪些 lane；lane ID、职责和写入范围必须来自当前项目语境。
- 不把示例 lane 当默认模板。
- 不把 lane workspace 当成项目正式输出目录。
- lane 外文件修改前，先登记共享请求或取得用户明确授权。
- 工具不可见或失败时，直接给出 `manual_handoff_required` 和完整可复制消息。
- 完成状态必须来自目标 lane 的明确回报、worklog、shared output 或 `read_thread` 观察。

## 事实源参考

需要完整边界、验收标准和协议细节时读取：

```text
../starworkMultiagent-spec.md
../../core/agent-lanes-spec.md
```

不要在主 Skill 内重复维护 Agent Lanes 协议细节；以 Core SPEC、MultiAgent SPEC 和 references 为事实源。
