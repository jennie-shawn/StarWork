# ISSUE-020：Codex App 中 multiagent instruct 未使用原生线程消息而降级为人工转交

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | cli / skill / adapter / workflow |
| 优先级 | P1 |
| 状态 | new |
| 来源 | GitHub Issue #8 / 用户反馈 |
| 发现日期 | 2026-06-12 |
| 关联 GitHub Issue | <https://github.com/jennie-shawn/StarWork/issues/8> |
| 关联 SPEC | 无 |
| 关联验收 | `ISSUE-008` / `ISSUE-011` / `ISSUE-017` |
| 负责人 | development lane |

## 现象

- 用户可见表现：在 Codex App 环境中，目标 lane 已绑定 Codex 线程，但 `starwork multiagent instruct` 仍返回 `manual_handoff_required`。
- 期望表现：Codex App 中已绑定 `codex:<threadId>` 的目标 lane，应优先通过宿主原生线程工具直接向目标 Agent 线程发送消息。
- 实际表现：CLI 只创建本地 request 记录，并提示 `codex standard background delivery capability is not available in this CLI runtime; low-level turn APIs are not used for multiagent instruct.`，用户仍需手动复制消息。

## 证据

GitHub Issue：

```text
https://github.com/jennie-shawn/StarWork/issues/8
```

环境信息：

```text
StarWork 包：@jennie-shawn/starwork
StarWork 版本：0.1.0-alpha.20
宿主环境：Codex App
日期：2026-06-12
```

已绑定 lane 示例：

```text
product-agent：codex:019e5fad-92b5-74c0-9ab7-8f634025217d
development-agent：codex:019e5fb9-802e-7c51-9c9f-78c0dc0e2b13
issue-manager：codex:019ebab6-6631-7341-b853-f98546fe8e15
```

复现命令摘要：

```bash
starwork multiagent instruct development-agent \
  --from product-agent \
  --message "<产品 Agent 通知开发 Agent 开始开发多个 ISSUE>" \
  --target . \
  --yes
```

实际输出：

```text
Request：REQ-20260612-124622Z-development-agent
Host delivery：manual_handoff_required
codex standard background delivery capability is not available in this CLI runtime; low-level turn APIs are not used for multiagent instruct.
```

## 影响范围

- 影响的功能：`starwork multiagent instruct`、`starworkMultiagent` Skill、Codex App adapter、跨 lane 通知状态记录。
- 影响的用户：在 Codex App 中使用 StarWork 多 Agent 工作流，并期望 Agent 间自动通知的用户。
- 是否影响发布 / 升级 / A 测：影响多 Agent 协作主链路。用户可能误以为任务已通知目标 Agent，但目标线程实际未收到消息。
- 是否有绕行方式：可以人工复制粘贴 `manual_handoff_required` 消息，但会破坏自动协作体验。

## 初步判断

这与 `ISSUE-017` 的边界有关：CLI 本身可能无法调用 Codex App 宿主工具，但 Codex App 中的 Skill / integration 应在 lane 已绑定时使用宿主线程工具完成真实投递。当前体验暴露出 CLI、Skill 与宿主线程工具的职责边界仍不够清晰，或者 `starworkMultiagent` 没有在可用环境中接管投递动作。

## 分流结果

- 是否转 SPEC：暂不转，先作为 Codex App multiagent delivery 缺陷处理；如需重新定义 CLI / Skill 职责边界，再补 SPEC。
- 是否转 GitHub：已有关联 GitHub Issue #8。
- 是否转开发 lane：需要。
- 是否需要用户补信息：暂不需要，GitHub issue 已包含复现命令、环境、绑定状态和预期行为。

## 下一步

development lane 需要复核 Codex App 下 multiagent instruct 的真实投递链路：

1. 明确 CLI 与 `starworkMultiagent` Skill 的职责边界：CLI 负责记录，Codex App Skill / integration 负责调用宿主线程工具。
2. 当目标 lane 已绑定 `codex:<threadId>` 且宿主线程工具可用时，应直接投递到目标线程。
3. 投递状态需要区分 `delivered_via_codex_thread_tool`、`recorded_only`、`manual_handoff_required`。
4. 如果宿主线程工具不可用，输出必须说明缺少的具体能力和下一步处理建议。
5. 补充 Codex App 已绑定 lane 的回归验收，避免“已记录但仍需人工转交”的半成功状态被误认为完成。

## 验收方式

- 验收条件 1：Codex App 中向已绑定 Codex lane 发送 instruct 时，可以无需人工复制粘贴直接送达目标线程。
- 验收条件 2：StarWork request / 状态记录能展示真实投递状态，而不是只显示本地记录成功。
- 验收条件 3：宿主线程工具不可用时，输出包含具体缺失能力和下一步建议。
- 验收条件 4：文档或 Skill 明确 CLI 与 Codex App thread tool 的职责边界。
- 关闭标准：实现或修正 Codex App 投递链路，并通过已绑定 Codex lane 的真实 smoke 或等价宿主工具模拟测试。
