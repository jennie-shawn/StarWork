# Lane Workflow / Handoff Rules MVP 讨论

日期：2026-06-15

状态：discussion accepted，尚未进入正式 SPEC。

原始草案：`_系统/协作/lanes/product-multiagent/workspace/drafts/2026-06-15-lane-workflow-mvp.md`

product-lead 验收判断：方向成立，但不进入 development。第一版应继续作为 agent-mediated automation 的讨论沉淀，等 `SPEC accepted -> development -> product review` 路径再跑 2 到 3 次真实 workflow 后，再决定是否立正式 SPEC。

## 背景

MultiAgent 已经具备 Agent Lanes、会话绑定、跨会话消息和 shared request 记录。下一步自然会走向“完成一个动作后自动通知下一个岗位”，例如：

- product-planning 完成 SPEC 后通知 development。
- development 完成实现后回传 product-planning 复验。
- product-planning 复验不通过时把阻塞项退回 development。
- operations 完成发布文案后通知 product-planning 审阅。

这类能力容易滑向完整 Loop Engineering、后台 daemon 或复杂调度系统。当前更稳的 MVP 是 Lane Workflow / Handoff Rules：只定义触发条件、目标岗位、交接消息、回传契约和投递状态，由当前 Agent 在完成动作时按规则执行。

## 一句话判断

第一版 Lane Workflow 应该是 agent-mediated automation，而不是后台自动化系统。

```text
Agent 完成一个明确动作
  -> 按 Handoff Rule 生成交接消息
  -> 用当前宿主标准工具投递或生成人工交接
  -> 用 request record 记录真实状态
  -> 不假装目标任务已完成
```

## MVP 字段

### 1. trigger

trigger 描述什么事件使规则有资格触发。

第一版只支持 Agent 明确完成动作后的人工可解释 trigger：

| trigger | 含义 |
| --- | --- |
| `spec_ready` | SPEC 草案已完成，准备交给产品总负责人审定或交给 development |
| `spec_accepted` | product-planning 已接受 SPEC，可进入开发派单 |
| `implementation_done` | development 回报实现完成，等待产品复验 |
| `acceptance_passed` | 产品复验通过，可关闭 issue / spec |
| `acceptance_failed` | 产品复验不通过，需要退回修复 |
| `handoff_response_ready` | 目标 lane 已产出回传消息 |

不做：

- 文件系统 watcher。
- 定时轮询。
- 后台监听 worklog。
- 自动推断“看起来差不多完成了”。

### 2. target lane

target lane 必须是已有 Agent Lane，或由当前 Agent 明确建议创建后再执行。

第一版不自动决定项目应该有哪些 lane。

示例：

| trigger | target lane |
| --- | --- |
| `spec_accepted` | `development` |
| `implementation_done` | `product-planning` |
| `acceptance_failed` | `development` |
| `release_copy_ready` | `operations` 或 `product-planning` |

如果目标 lane 未绑定 session：

- 不直接报成功。
- 输出“目标岗位还没有对应 AI 会话”。
- 询问用户是绑定已有会话、创建新会话，还是只生成人工交接消息。

### 3. message template

message template 仍使用 `STARWORK:MULTIAGENT_MESSAGE v1`，但 Handoff Rule 可以规定正文要包含哪些段落。

第一版模板字段：

```text
message_type: instruction | handoff_response | review_request
request_id: <stable id>
from_lane: <source lane>
to_lane: <target lane>
created_at: <ISO timestamp>
recorded_in: _系统/协作/shared.md

## 背景
<为什么触发这次交接>

## 任务
<目标 lane 要做什么>

## 输入材料
<SPEC / issue / discussion / evidence 路径>

## 边界
<target write_scope 和禁止事项>

## 完成后请回报
<return contract>
```

要求：

- message 由 Skill 组装，不依赖 CLI message helper。
- 正文必须列出路径和验收重点。
- 不把“已投递”写成“已完成”。

### 4. return contract

return contract 定义目标 lane 完成后必须回报什么。

第一版建议固定为四类：

| contract item | 内容 |
| --- | --- |
| worklog | 更新目标 lane worklog，说明做了什么、验证了什么、还有什么风险 |
| output path | 列出正式输出或 workspace 过程输出路径 |
| verification | 列出测试、扫描、人工 smoke 或无法验证的原因 |
| next action | 说明需要谁验收、是否可以关闭 issue、是否需要继续开发 |

示例：

```text
完成后请回报：
1. 更新 development worklog。
2. 列出修改文件和验证命令。
3. 如有正式输出，登记 Shared Outputs。
4. 向 product-planning 回传复验请求。
```

### 5. delivery status

delivery status 必须记录真实投递状态，不混淆目标完成状态。

第一版状态：

| status | 含义 |
| --- | --- |
| `delivered_via_codex_thread_tool` | 已通过 Codex `send_message_to_thread` 成功投递 |
| `delivered_via_claude_code_session_tool` | 已通过 Claude Code Desktop 标准工具投递 |
| `manual_handoff_required` | 当前宿主无法自动投递，需要用户复制消息 |
| `recorded_only` | 只记录了 request，没有尝试投递 |
| `failed` | 尝试投递失败，且不能安全视为人工已转交 |

规则：

- delivery status 只说明消息状态。
- 目标是否完成必须来自目标 lane 回报、worklog、shared output 或会话观察。
- `manual_handoff_required` 必须展示完整可复制消息，并明确还没有自动送达。

## Agent-mediated automation 边界

第一版执行者是当前 Agent，不是后台服务。

允许：

- 当前 Agent 在完成 SPEC、验收或复盘时，按规则生成交接消息。
- 当前 Agent 直接调用可用宿主标准工具投递。
- 投递后用 CLI `request record` 记录真实状态。
- 目标工具不可用时生成人工交接消息。

不允许：

- 后台 daemon 自动扫描文件并发消息。
- 未经用户或明确规则授权自动创建新 lane。
- 未经确认自动修改正式产品文件。
- 根据聊天摘要猜测目标任务已完成。
- 跨宿主用不匹配工具硬凑自动投递。

## MVP 规则形态

第一版可以先不落成独立 schema 文件，而是以 SPEC / Skill 规则形式固化。

建议规则形态：

```yaml
trigger: spec_accepted
from_lane: product-planning
target_lane: development
message_type: instruction
required_inputs:
  - spec_path
  - issue_path
  - acceptance_criteria
return_contract:
  - worklog
  - changed_files
  - verification
  - review_request
delivery:
  preferred: codex_thread_tool
  fallback: manual_handoff_required
```

等 2 到 3 个真实 workflow 稳定后，再考虑是否进入正式 schema。

## 首批适用场景

### SPEC accepted -> development

触发：

- product-planning 明确接受 SPEC，并决定进入开发。

输入：

- SPEC 路径。
- 关联 issue。
- 验收标准。
- 不可修改边界。

回传：

- development worklog。
- 修改文件。
- 验证命令。
- 产品复验请求。

### development done -> product review

触发：

- development 明确回报实现完成。

输入：

- 修改清单。
- 测试结果。
- issue / spec 对应关系。
- 已知风险。

回传：

- product-planning 复验结论。
- issue 状态变更。
- 是否需要退回修复。

### acceptance failed -> development

触发：

- product-planning 复验不通过。

输入：

- 阻塞项。
- 复现路径。
- 期望行为。
- 已通过项。

回传：

- 修复说明。
- 新增测试。
- 重新复验请求。

## 暂不做的事

- 不做完整 Loop Engineering 产品化。
- 不做后台任务队列。
- 不做跨 lane 锁系统。
- 不做自动优先级排序。
- 不做多步骤工作流编排 UI。
- 不把 Handoff Rule 变成不可解释的隐藏自动化。

## 建议下一步

在 v0.10 兼容迁移 SPEC 之后，可以选一个真实路径做最小 SPEC：

```text
SPEC accepted -> development -> product review
```

这条路径已有多轮真实使用记录，收益明确，且不会过早扩张到完整自动化系统。
