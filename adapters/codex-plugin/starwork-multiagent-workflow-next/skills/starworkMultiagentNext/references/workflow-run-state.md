# Workflow Run State

Workflow run state 是 Workflow Runner 的运行事实源，路径固定为：

```text
.starwork/workflows/runs/<run-id>.json
```

它只记录当前 workflow run 的状态、路由事件和阻断原因，不代表后台自动执行。

## 最小字段

```json
{
  "schema": "starwork.multiagent.workflow_run.v0.1",
  "schema_version": 1,
  "run_id": "WF-20260622-130500-issue-027",
  "workflow_id": "issue_027_guard_fixture",
  "workflow_version": "0.14",
  "workflow_definition_path": "_系统/协作/lanes/testing/workspace/workflow-definition.json",
  "status": "ready",
  "current_node": "testing_intake",
  "current_step": "testing_intake",
  "current_actor_lane": "testing",
  "next_target_node": "product_design",
  "next_target_lane": "product-lead",
  "blocked_reason": null,
  "route_source": "definition + run_state",
  "events": []
}
```

## 合法状态口径

- `ready`：路由已计算，可在用户确认和工具可用时投递。
- `delivering`：正在投递，尚未确认成功。
- `delivered`：真实投递成功后才可记录。
- `blocked_self_delivery`：lane 或 session guard 阻断，不能投递。
- `manual_confirmation_required`：缺少目标 lane、目标 session、当前会话 ID 或用户确认。
- `self_step_recorded`：definition 显式允许 self step，只记录本地步骤，不做跨 Agent 投递。
- `completed` / `failed`：流程结束或失败。

禁止把 `blocked_self_delivery`、`self_step_recorded` 直接改成 `delivered`。`delivered` 必须先经过 `delivering`，并且只能在真实发送工具成功后记录。

## Run Progression

`workflow event record --status delivered` 成功后，run state 必须推进到上一轮 route 的目标节点：

- `current_node = previous.next_target_node`
- `current_step = previous.next_target_node`
- `current_actor_lane = previous.next_target_lane`
- 清空 `next_target_node` / `next_target_lane`
- 追加 `step_entered` workflow event，记录 `from_node` / `from_lane` 和进入的目标节点

下一跳 `workflow route` 必须从新的 current node 计算，不能继续从 entry node 计算。

## Step Router 规则

Step Router 只能读取：

1. Workflow Definition。
2. Workflow Run State。
3. 当前 completion event。

不得根据当前聊天对象、最近活跃 Agent、compact packet 文本或猜测来决定 target lane。

## 阻断事件

发生 `blocked_self_delivery` 或 `manual_confirmation_required` 时，run state 必须追加 workflow event，记录：

- `status`
- `blocked_reason`
- `target_lane`
- `target_session`
- `route_event`

阻断事件不是投递事件；不得同步写 `delivered_via_codex_thread_tool`。
