# ISSUE-031：Agent 未识别 STARWORK:MULTIAGENT_MESSAGE 回传消息而误当用户指令

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | skill / workflow / product |
| 优先级 | P0 |
| 状态 | new |
| 来源 | 用户反馈 / 真实项目 |
| 发现日期 | 2026-06-22 |
| 关联 GitHub Issue | 无 |
| 关联 SPEC | 待 product-multiagent 设计 |
| 关联验收 | 无 |
| 负责人 | product-multiagent |

## 现象

- 用户可见表现：另一个 Agent 发送的 `<codex_delegation>` / `STARWORK:MULTIAGENT_MESSAGE` 回传消息，被当前 Agent 当成用户本人新指令处理。
- 期望表现：Agent 看到 StarWork 标准消息时，应先识别 message_type、from_lane、to_lane、request_id 和 host_delivery；如果是回传 / acknowledgement / design_response，应作为 lane 汇报处理，进入验收或记录流程，而不是当成用户普通命令。
- 实际表现：product-multiagent 的 `design_response` 回传被当前 product-lead 误读成用户输入上下文，导致后续对“谁在说话”的判断混乱。

## 证据

```text
用户反馈：
“刚刚最近一条消息不是我给你发的，是另一个agent发给你的汇报消息，这也暴露出来一个问题，就是你不认识starwork的规范消息”

消息结构包含：
<codex_delegation>
  <source_thread_id>019eca4d-aa64-7313-8fec-a5cf040dc307</source_thread_id>
  <input><!-- STARWORK:MULTIAGENT_MESSAGE v1 -->
  message_type: design_response
  from_lane: product-multiagent
  to_lane: product-lead
```

## 影响范围

- 影响的功能：跨 lane 回传、产品验收、workflow response、handoff response、acknowledgement。
- 影响的用户：所有使用 MultiAgent 标准消息进行跨会话协作的用户。
- 是否影响发布 / 升级 / A 测：影响 workflow next 可信度和 MultiAgent 组织协作。
- 是否有绕行方式：用户手动提醒“这是 Agent 汇报”，但不可依赖。

## 初步判断

StarWork 标准消息需要在 Skill 主入口硬编码识别规则：先分类消息来源和 message_type，再决定是验收、记录、回传、继续 workflow，还是询问用户。

## 分流结果

- 是否转 SPEC：是，建议进入 MultiAgent message handling / inbox classification 设计。
- 是否转 GitHub：待定。
- 是否转开发 lane：待 SPEC 明确后转。
- 是否需要用户补信息：不需要。

## 下一步

由 product-multiagent 设计标准消息识别规则，包括 `<codex_delegation>` 包装、`STARWORK:MULTIAGENT_MESSAGE v1`、message_type 路由、source_thread_id 作为来源会话而非当前用户会话的处理方式。

## 验收方式

- 验收条件 1：Skill 看到 `design_response` / `instruction_return` / `handoff_response` / `acknowledgement` 时，能按 Agent 回传处理。
- 验收条件 2：Agent 不把标准回传消息误当作用户本人新需求，也不直接覆盖 product-lead gate。
- 关闭标准：至少用 product-multiagent -> product-lead 回传 fixture 复验通过。

