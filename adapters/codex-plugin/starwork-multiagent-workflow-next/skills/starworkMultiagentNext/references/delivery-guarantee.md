# Delivery Guarantee

目标是另一个 lane、Agent 或 session 的步骤都是必须投递步骤。必须投递步骤不能用当前回复说明替代。

## 合法结果

| 结果 | 要求 |
|---|---|
| 真实自动投递成功 | 确认目标 lane、目标 session、当前会话 ID；组装完整消息；宿主标准发送工具成功；再记录 request |
| 明确人工转交 | 发送工具不可见或失败时，先工具发现；仍失败则输出 `manual_handoff_required` 和完整可复制消息，说明尚未自动送达 |
| 明确阻塞 | 缺目标 lane、目标 session、当前会话 ID 或用户确认时，进入 blocked / unbound / needs_confirmation |

## 写入顺序

固定顺序：

```text
确认目标 lane / session / current session
  -> 组装 STARWORK:MULTIAGENT_MESSAGE
  -> 调用 send_message_to_thread 或对应宿主标准工具成功
  -> starwork multiagent request record --host-delivery delivered_via_codex_thread_tool ...
```

未真实投递成功不得记录：

```text
delivered_via_codex_thread_tool
delivered_via_claude_code_session_tool
```

也不得说“已通知”“已完成交接”或“目标任务已完成”。

换句话说，未投递成功不得写 delivered。

## 工具发现与人工转交

如果 `send_message_to_thread` 或目标宿主发送工具不可见：

1. 先用工具发现能力查找。
2. 如果仍不可用或调用失败，输出 `manual_handoff_required`。
3. 展示完整 `STARWORK:MULTIAGENT_MESSAGE v1`。
4. 明确说明“尚未自动送达”。
5. 不记录 delivered；如用户已经人工转交，只能按事实补记 `recorded_only`。

发送成功只代表消息送达和 request 已记录，不代表目标任务完成。
