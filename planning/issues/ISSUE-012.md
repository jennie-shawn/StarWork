# ISSUE-012：manual_handoff_required 时不应误报已通知，必须提供可复制消息

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | cli / skill / workflow |
| 优先级 | P1 |
| 状态 | closed |
| 来源 | 用户反馈 / 真实跨 lane 通知 |
| 发现日期 | 2026-06-04 |
| 关联 GitHub Issue | 无 |
| 关联 SPEC | `product/planning/features/multiagent/specs/v0.4-runtime-host-routing.md` |
| 关联验收 | 无 |
| 负责人 | development lane |

## 现象

- 用户可见表现：当 `starwork multiagent instruct` 返回 `manual_handoff_required` 时，Agent 可能仍用“已通知 development lane”这类话术总结结果。
- 期望表现：只要宿主投递没有真实完成，Agent / Skill / CLI 解释层都不得说“已通知”“已发送成功”。
- 实际表现：本次 product-planning lane 向 development lane 发起实现请求时，CLI 正确返回 `manual_handoff_required`，但 Agent 最初回复“已通知 development lane”，随后才说明没有真实自动投递。

## 证据

用户原话：

```text
从你刚才的反应，我发现了几个小点需要我们后面同步优化的：
1. 刚才你回复了“已通知development lane”，但你其实没有发送成功，所以不应该说“已通知”
2. 既然CLI返回：manual_handoff_required，那你应该把消息提供出来，供用户手动复制
```

本次 CLI 返回要点：

```text
status: manual_handoff_required
host_delivery.status: manual_handoff_required
host_delivery.formatted_message: <可复制 StarWork MultiAgent Instruction>
```

2026-06-04 Host Adapter v0.2 复验证据：

```text
执行非 JSON：
starwork multiagent instruct development --from product-planning --message "请实现。" --target <temp-workspace> --yes

输出包含：
Host delivery：manual_handoff_required (Trae host session automation is not adapted. Use manual UI operation.)

输出不包含：
STARWORK:MULTIAGENT_MESSAGE v1
```

因此 CLI JSON 中有 `host_delivery.formatted_message`，但默认交互输出仍没有直接提供可复制 handoff message。

## 影响范围

- 影响的功能：`starwork multiagent instruct`、`starworkMultiagent` Skill、Agent 对 CLI 返回状态的解释。
- 影响的用户：使用 StarWork 多 Agent 协作、跨 lane 派活或验收通知的用户。
- 是否影响发布 / 升级 / A 测：影响 A 测信任度。用户会误以为目标 Agent 已收到消息。
- 是否有绕行方式：用户可手动加 `--json` 并读取 `host_delivery.formatted_message`，但默认交互体验不应要求用户自己挖 JSON。

## 初步判断

这是 v0.4 runtime host routing 的解释层缺口，不是底层投递逻辑错误。

需要同时收敛两层：

- CLI / Skill 输出规范：`manual_handoff_required` 必须展示可复制 handoff message。
- Agent 话术规范：没有真实投递时只能说“已登记请求 / 需要手动转交”，不能说“已通知 / 已发送”。

## 分流结果

- 是否转 SPEC：需要补充到 MultiAgent v0.4 或后续 v0.5 的验收口径。
- 是否转 GitHub：暂不转，先由本地 issue 跟踪。
- 是否转开发 lane：是。
- 是否需要用户补信息：不需要。

## 下一步

development lane 需要：

1. 修复 CLI 非 JSON 输出：在 `manual_handoff_required` 时直接打印完整 handoff message。
2. 保留 Skill 约束：只能说“已生成交付消息，等待用户手动发送”，不得说“已通知”。
3. 检查 README / A 测指南，补充“未真实投递不得说已通知”的状态解释。

## 验收方式

- 验收条件 1：`multiagent instruct` 返回 `manual_handoff_required` 时，用户可直接复制完整 handoff message。
- 验收条件 2：Skill / 文档中不再把 `manual_handoff_required` 表述为“已通知 / 已发送成功”。
- 关闭标准：产品复验一个无标准后台投递能力的 Codex 会话，确认输出为“已登记请求，需要手动转交”，并包含完整可复制消息。

## 复验记录

### 2026-06-04 product-planning 复验通过

复验命令：

```text
starwork multiagent instruct development --from product-planning --message "请实现。" --target <temp-workspace> --yes
```

复验结果：

- 非 JSON 输出包含 `manual_handoff_required`。
- 非 JSON 输出包含“尚未自动送达”。
- 非 JSON 输出包含“需要手动转交以下消息”。
- 非 JSON 输出包含完整 `STARWORK:MULTIAGENT_MESSAGE v1` 起止标记。
- 输出不包含“已通知”或“已发送成功”。

结论：关闭。
