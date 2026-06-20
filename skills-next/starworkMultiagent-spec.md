# `starworkMultiagent` Skill SPEC

## 状态

- 版本：next v0.13 decomposition note
- 所属模块：StarWork Skills
- Skill 名称：`starworkMultiagent`
- 相关命令：`starwork multiagent`
- 相关 Core 能力：Agent Lanes
- 实现状态：短主入口 + references 分场景加载 + workflow Builder / Runner references
- 目标：把用户关于多 AI 协作和 workflow 的自然语言请求，转成“先解释、再检查、先设计、先预览、确认后执行”的安全协作流程

## 一句话定义

`starworkMultiagent` 是 StarWork 的多 AI 协作顾问。

它面向用户时讲“AI 岗位、当前 AI 会话、可以整理或修改的范围、交接消息”；面向项目事实源时维护 Agent Lanes；面向 Codex App 时直接调用标准线程工具。CLI 只做 StarWork 项目事实源。

Workflow 是 next 内测能力。Skill 必须标注同源 channel，并在 CLI / Skill / references 错配时停止 workflow 操作。

## v0.13 结构

主 `SKILL.md` 只保留：

- 主入口边界和 next channel 提醒。
- reference loading table。
- 当前会话 ID 硬规则。
- 必须投递、工具发现、manual handoff 和 request record 顺序。
- CLI / 宿主工具边界。
- workflow Builder / Runner 路由摘要。
- compact + reference / full packet 摘要。
- 消息已送达不等于目标任务已完成。
- StarWork / pending_merge / compatibility 前置保护。

长流程迁入：

```text
starworkMultiagent/references/
  README.md
  intent-routing.md
  context-and-compatibility.md
  session-tools.md
  delivery-guarantee.md
  team-onboarding.md
  message-templates.md
  lane-workspace-output-promotion.md
  safety-output-rules.md
  workflow-builder.md
  workflow-runner.md
  workflow-packet-budget.md
```

当用户请求命中某个场景时，先读取该场景 reference，再执行动作。reference 文件不存在或无法读取时，停止对应高风险动作，并提示 Skill 安装不完整。

## next workflow 边界

### Workflow Builder

用户说“设计 workflow / 自动通知流程 / 产品开发循环”时进入 Builder。Builder 只设计、采访、预览和保存 lane workspace 草案；不投递、不创建 instance、不写 `.starwork/workflows/state.json`、不写 `product/`、不记录 delivery status。

### Workflow Runner

用户说“启动 / 进入 / 执行 workflow”时进入 Runner。Runner 只读取已确认 definition；默认生成 compact + reference packet；full packet 只在目标 Agent 无法访问项目文件、manual handoff 必须自包含或用户明确要求时使用。

Runner 的跨 lane 节点仍受必须投递规则约束。workflow 当前节点消息已送达只代表消息送达和 request 已记录，不代表目标任务完成。

## 硬规则

### 当前会话 ID

任何会话控制、workflow Runner 或跨会话操作前，必须确认当前会话 ID。`<codex_delegation>` 的 `source_thread_id` 优先作为当前来源会话 ID；不得用历史 worklog、旧 binding、相似标题或最近更新时间推断当前会话。当前会话 ID 不明时，停止绑定、改名、置顶、归档、释放和以当前会话为来源的投递记录。

### 必须投递

目标是另一个 lane / Agent / session 的步骤是必须投递步骤，不能用当前回复说明替代。合法结果只有真实自动投递成功、明确人工转交、明确阻塞。

### 工具发现与 handoff

`send_message_to_thread` 或宿主标准工具不可见时，先工具发现。发现失败或调用失败时，输出 `manual_handoff_required`、完整可复制 `STARWORK:MULTIAGENT_MESSAGE`，并明确尚未自动送达。

### request record 顺序

只有宿主标准发送工具真实成功后，才记录 `delivered_via_codex_thread_tool` 或对应 delivered 状态。未投递成功不得记录 delivered，不得说已通知、已完成交接或目标任务已完成。

### CLI 边界

Codex App 正常路径中，创建、投递、读取、命名、置顶、归档由 Skill 调用标准线程工具。CLI 只记录项目事实源：doctor、status、init、add、bind、release、share、request record。

## 验收标准

- next 主 `SKILL.md` 不超过 260 行。
- 主 Skill 命中 hard-rule 关键词和 next workflow 关键词。
- 主 Skill 中列出的每个 reference 文件真实存在。
- next 包含 workflow Builder / Runner / packet budget references。
- v0.8 禁止项未恢复。
- v0.12 投递保证未丢失：未真实投递不得记录 delivered。
