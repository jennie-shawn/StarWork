# Workflow Runner

Workflow Runner 是 next 内测能力，只执行已确认 definition，不执行未确认 draft。

## 触发

用户明确说“启动 / 进入 / 执行 workflow”时进入 Runner。如果用户指定 draft，先问是否要确认后再启动。

## 流程

1. 读取已确认 Workflow Definition。
2. 先确认 v0.10 compatibility 为 `current`；否则转入旧结构保护。
3. 检查目标 lane 存在。
4. 检查目标 lane `current_session`。
5. 检查当前会话 ID 与目标 lane session ID，目标 lane 不能是当前会话。
6. 生成 workflow instance id，格式可用 `WF-<YYYYMMDD>-<short-id>`。
7. 生成当前节点 compact + reference packet。
8. 发送前再次确认当前会话 ID、目标 lane session ID、两者不相同。
9. 对 Codex App 正常路径直接调用 `send_message_to_thread`；如果工具不可见，先工具发现，仍不可用或调用失败时输出 `manual_handoff_required`。
10. 投递成功后，用 `multiagent request record` 记录真实 delivery status；未真实投递成功时不得记录 delivered。

## 当前会话保护

如果目标 lane 绑定的是当前会话，默认阻断投递并说明：

```text
目标岗位绑定的是当前会话，直接发送会形成自我交接。
```

只有用户明确要求当前会话执行当前节点，才进入本地执行模式；本地执行模式不调用 `send_message_to_thread`。

## 成功口径

投递成功只能说：

```text
workflow 当前节点消息已送达，并已记录 StarWork request。
```

不得说目标 Agent 已完成、workflow 已完成。目标完成必须来自目标 lane 回传、worklog、shared output 或明确会话观察。
