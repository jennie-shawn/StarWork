# Workflow Runner

Workflow Runner 是 next 内测能力，只执行已确认 definition，不执行未确认 draft。它是由 AI 辅助推进的内测 workflow，不是后台守护进程，也不会无人看管地持续执行整条流程。

## 触发

用户明确说“启动 / 进入 / 执行 workflow”时进入 Runner。如果用户指定 draft，先问是否要确认后再启动。

## 必读状态

启动或推进前同时读取：

- Workflow Definition：已确认的流程定义。
- Workflow Run State：`.starwork/workflows/runs/<run-id>.json`。
- 当前 completion event：用户或目标 lane 回传的事件 key / JSON。

下一步目标只能由 Workflow Definition + Workflow Run State + 当前 completion event 计算。不得从当前会话是谁、用户正在和谁说话、最近活跃 Agent 或 compact packet 缺失内容中猜测。

## CLI 辅助

Runner 可以用这些 CLI 命令维护项目事实源：

```bash
starwork multiagent workflow start --definition <path> --entry-node <node> --actor-lane <lane> --target <path> --json --yes
starwork multiagent workflow status --run <run-id> --target <path> --json
starwork multiagent workflow route --run <run-id> --event <event-json-or-key> --target <path> --json
starwork multiagent workflow event record --run <run-id> --type <type> --status <status> --target <path> --json --yes
```

`start` 创建 run state；`status` 读取 run state；`route` 写入 route event；`event record` 只记录 workflow event，不替代真实投递。

## 投递前预览

每次投递前必须向用户展示：

| 字段 | 来源 |
|---|---|
| run id | Workflow Run State |
| current step | Workflow Run State |
| from lane | Workflow Run State / Definition |
| target lane | Step Router |
| target session | Agent Lanes 状态 |
| route source | `definition + run_state` |
| delivery mode | Step Router |

## Self-Delivery Guard

- `from_lane == to_lane` 默认阻断，状态为 `blocked_self_delivery`。
- `current_session_id == target_lane.current_session` 默认阻断，状态为 `blocked_self_delivery`。
- 投递前必须同时确认当前会话 ID 与目标 lane session ID；两者相同不得继续。
- 缺少目标 lane、目标 session、当前会话 ID 或用户确认时，进入 `manual_confirmation_required` / `unbound` / `needs_confirmation`。
- 只有 definition 显式 `allow_self_step: true` 时，记录 `self_step_recorded`；这不是跨 Agent 投递。

阻断或 self step 时必须：

- 不调用 `send_message_to_thread` 或其他宿主发送工具。
- 不执行 `multiagent request record --host-delivery delivered_via_codex_thread_tool`。
- 不说“已投递到目标会话”或“workflow 当前节点消息已送达”。
- 确认 workflow event 已写入 run state，并说明阻断原因。

## 正常投递顺序

1. `starwork multiagent workflow route ... --json`，确认 `route_status` 为 `ready`。
2. 生成当前节点 compact + reference packet；需要时按 `workflow-packet-budget.md` 升级为 full packet。
3. 对 Codex App 正常路径直接调用 `send_message_to_thread`；如果工具不可见，先工具发现。
4. 只有 `send_message_to_thread` 成功后，才运行 `multiagent request record --host-delivery delivered_via_codex_thread_tool --delivery-tool send_message_to_thread`。
5. 然后用 `workflow event record --status delivering|delivered` 记录 run state。

`workflow event record --status delivered` 是推进 current node 的动作：它会把 run state 从上一节点推进到上一轮 route 的 `next_target_node` / `next_target_lane`，并追加 `step_entered` event。下一跳 route 必须在该推进后再计算。

工具发现仍不可用或调用失败时，输出 `manual_handoff_required` 和完整可复制 `STARWORK:MULTIAGENT_MESSAGE v1`，并明确尚未自动送达。未真实投递成功时不得记录 delivered。

## 成功口径

投递成功只能说：

```text
workflow 当前节点消息已送达，并已记录 StarWork request。
```

不得说目标 Agent 已完成、workflow 已完成。目标完成必须来自目标 lane 回传、worklog、shared output 或明确会话观察。
