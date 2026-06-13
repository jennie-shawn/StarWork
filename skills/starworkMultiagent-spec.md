# `starworkMultiagent` Skill SPEC

## 状态

- 版本：v0.8 accepted implementation note
- 所属模块：StarWork Skills
- Skill 名称：`starworkMultiagent`
- 相关命令：`starwork multiagent`
- 相关 Core 能力：Agent Lanes
- 实现状态：已按 Codex 标准线程工具边界收敛
- 目标：帮助 Agent 把用户关于常用智能体、会话职责、多 Agent 分工、跨 lane 消息和共享输出的自然语言请求，转换成安全的 StarWork 协作流程

## 一句话定义

`starworkMultiagent` 是 StarWork 多 Agent 协作设计与 Codex App 线程控制 skill。

它不是 `starwork multiagent` 命令本身。Skill 在 Codex App 正常路径中直接调用标准线程工具；CLI 只记录 StarWork 项目事实源。

```text
用户说“让开发 lane 开始修复 issue”
  ↓
starworkMultiagent 读取 StarWork binding
  ↓
Skill 组装 STARWORK:MULTIAGENT_MESSAGE
  ↓
send_message_to_thread 投递到目标 Codex thread
  ↓
multiagent request record 记录真实投递状态
```

## 事实源

Agent Lanes 协议事实源是：

```text
product/core/agent-lanes-spec.md
product/planning/features/multiagent/specs/v0.8-skill-cli-minimal-boundary.md
```

本 SPEC 只规定 skill 如何判断、追问、调用标准线程工具和记录 CLI 状态，避免重复维护协议。

## 设计边界

`starworkMultiagent` 应该做：

- 判断用户是在初始化协作层、登记当前会话、增加 lane、绑定会话、释放会话、查看状态、发送跨 lane 指令，还是登记共享输出。
- 采访 lane ID、职责、写入范围、真实 Codex thread id、共享输出受众。
- 在 Codex App 中直接调用 `create_thread`、`send_message_to_thread`、`read_thread`、`list_threads`、`set_thread_title`、`set_thread_pinned`、`set_thread_archived`。
- Skill 自己组装 `STARWORK:MULTIAGENT_MESSAGE v1`。
- 用 `multiagent status --target <path> --json` 读取绑定。
- 用 `multiagent bind` 记录真实 thread 绑定。
- 用 `multiagent request record` 记录真实投递结果。
- 用 `multiagent share` 登记共享输出索引。

`starworkMultiagent` 不应该做：

- 写死前端、后端、测试等默认职责。
- 自动创建任务系统、锁系统或 JSON manifest。
- 静默修改 `matters/registry.md`。
- 替用户决定项目一定需要多少 lane。
- 把 lane workspace 当成项目正式输出目录。
- 搬运或复制共享输出文件。
- 在 Codex App 正常路径中把会话创建、消息投递、读取、命名、置顶或归档交给 CLI 伪装完成。
- 在标准工具不可见或失败时宣称已自动送达。

## 用户语义与主流程

| 用户语义 | Skill 判断 | 主流程 |
|---|---|---|
| “把当前会话创建为一个常用智能体，负责 X” | 登记当前会话为一个稳定职责位 | 必要时 `init` / `add`，标准工具处理宿主显示动作，再 `bind` |
| “初始化 multiagent / Agent Lanes” | 创建协议文件和可选空 lane | `multiagent init` |
| “新增一个负责 X 的 Agent” | 创建稳定职责位，当前不一定绑定 session | `multiagent add` |
| “把当前 Codex 绑定到 review” | 将当前具体会话绑定到已有 lane | `multiagent bind` |
| “释放这个职责位” | 解除当前 session 绑定 | `set_thread_archived` 可选，再 `multiagent release` |
| “看看当前分工” | 只读查看协作状态 | `multiagent status --target <path> --json` |
| “这个输出给 writing 和 review 看” | 登记共享输出索引 | `multiagent share` |
| “让开发 lane 开始开发” | 结构化跨会话指令 | `status` 读取绑定，Skill 组装消息，`send_message_to_thread` 投递，`request record` 记录 |
| “看看开发 lane 做到哪了” | 宿主观察加 StarWork 状态汇总 | `status` 读取绑定，再 `read_thread` / `list_threads` |
| “创建产品、开发、验收三个智能体” | 创建并绑定可工作的独立会话 | 必要时 `doctor` / `init` / `add`，再 `create_thread` / `set_thread_title` / `set_thread_pinned` / `bind` |

## Skill-owned Message

Skill 直接渲染完整消息，不向 CLI 索要消息模板。

Instruction Message 必须包含：

- `STARWORK:MULTIAGENT_MESSAGE v1` 包装。
- `message_type: instruction`。
- `request_id`、`from_lane`、`to_lane`、`created_at`、`recorded_in`。
- 用户指令正文。
- write scope、安全边界和当前工作区。
- 完成后回报要求。

Launch Message 使用同一包装，但正文应描述 lane 职责、写入范围、当前工作区、启动后的第一步和回报方式。

## 常见入口：创建 Agent 团队

“创建 Agent 团队”不是只创建 lane。完整成功标准是：每个目标职责都有 lane、每个 lane 已绑定可工作的独立 session，或者输出中明确说明哪些 lane 未完成以及阻塞原因。

流程：

1. `starwork doctor --target <path> --json` 确认工作台健康；如需启用协作层，使用 `multiagent init`。
2. 对缺失 lane 使用 `multiagent add`，先 dry-run，用户确认后写入。
3. Skill 为每个 lane 组装 Launch Message。
4. 用 `create_thread` 创建独立 Codex thread。
5. 用 `set_thread_title` 设置短标题，格式固定 `<职责名> Agent`。
6. 用户要求置顶时，用 `set_thread_pinned`。
7. `create_thread` 返回 thread id 后，用 `multiagent bind` 记录绑定。
8. 任一标准工具失败时，输出 `manual_handoff_required`，给出完整可复制 Launch Message，并明确尚未自动创建或绑定。

## 常见入口：发送跨 lane 指令

流程：

1. 用 `multiagent status --target <path> --json` 读取目标 lane binding。
2. 未绑定时，先协助用户绑定已有会话或创建新会话。
3. Skill 组装 Instruction Message。
4. 用 `send_message_to_thread` 投递。
5. 成功后运行：

```bash
starwork multiagent request record --from <from-lane> --to <to-lane> --message "<text>" --host-delivery delivered_via_codex_thread_tool --delivery-tool send_message_to_thread --target <path> --yes
```

6. 如果标准工具失败，输出 `manual_handoff_required` 和完整消息；如果只是补记已经发生的人工动作，使用 `recorded_only`。

## `request record` 状态语义

`--host-delivery` 支持：

- `delivered_via_codex_thread_tool`：Codex App 标准线程工具真实投递成功。
- `recorded_only`：仅记录事实，不表示自动送达。
- `manual_handoff_required`：需要用户复制消息到目标会话。
- `failed`：投递或记录失败。
- `delivered`：历史兼容值；Codex App 正常路径不要新写入该状态。

## Lane Workspace 与正式输出

每个 lane 默认拥有一个过程工作区：

```text
_系统/协作/lanes/<lane-id>/workspace/
_system/collaboration/lanes/<lane-id>/workspace/
```

它用于：

- 调研笔记。
- 未确认草稿。
- 中间分析。
- 临时实验结果。
- 给同一 lane 后续会话看的上下文材料。

项目正式输出目录用于：

- 用户认可的最终交付物。
- 项目正式文档。
- 发布稿、确认稿、版本记录。
- 可被整个项目长期引用的稳定成果。

workspace 内容需要其他 lane 读取时，建议生成 `starwork multiagent share ... --path "_系统/协作/lanes/<lane-id>/workspace/<file>"`。

## 安全约束

- 写入类 CLI 命令默认先 dry-run。
- 用户明确要求执行或确认后，才使用 `--yes`。
- 只读 `status` 可以直接运行。
- 不创建默认 lane 模板。
- 不静默覆盖已有绑定。
- 不绕过 StarWork 工作区边界。
- 不修改 `matters/registry.md`。
- 不把 lane workspace 当成项目正式事实源。
- 标准线程工具不可见或失败时，不调用 CLI 子命令伪装自动投递或自动创建。

## 验收标准

- 给定“让开发 lane 开始实现”，skill 用 `multiagent status --target <path> --json` 查绑定，自己组装 `STARWORK:MULTIAGENT_MESSAGE v1`，用 `send_message_to_thread` 投递，再用 `multiagent request record` 写入 `delivered_via_codex_thread_tool`。
- 给定“创建产品、开发、验收三个智能体”，skill 用 `create_thread` 建会话，用 `set_thread_title` 设置 `<职责名> Agent`，必要时用 `set_thread_pinned`，再用 `multiagent bind` 记录。
- 给定“看看开发 lane 做到哪了”，skill 用 `multiagent status --target <path> --json` 查绑定，再用 `read_thread` 或 `list_threads` 观察。
- 给定标准线程工具不可见或失败，skill 输出 `manual_handoff_required` 和完整可复制消息，并说明尚未自动送达。
- 给定“这个输出给 writing 和 review 看”，skill 生成 `starwork multiagent share ...`，不移动原文件。
