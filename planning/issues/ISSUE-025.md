# ISSUE-025：MultiAgent workflow 自动流程中 Agent 未自动投递消息导致中断

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | skill / workflow / adapter / product |
| 优先级 | P1 |
| 状态 | closed |
| 来源 | 用户反馈 / 截图 |
| 发现日期 | 2026-06-18 |
| 关联 GitHub Issue | 无 |
| 关联 SPEC | `product/planning/features/multiagent/specs/v0.12-workflow-delivery-guarantee.md` |
| 关联验收 | `ISSUE-020` / `ISSUE-024` |
| 负责人 | product-lead lane |

## 现象

- 用户可见表现：使用 MultiAgent workflow 功能时，Agent 没有自动向目标 Agent / lane 投递消息，导致自动流程中断，需要用户追问“为什么没有直接投递消息”后才补发。
- 期望表现：workflow 自动流程中的跨 Agent 交接应自动投递到目标线程；如果无法投递，应立即显式中断并给出可复制消息和具体缺失能力，而不是继续推进到半完成状态。
- 实际表现：Agent 选择了保守回复，没有在当轮继续发现或调用 `send_message_to_thread`，后续才补发消息并把状态改成 `delivered_via_codex_thread_tool`。

## 证据

用户反馈原话：

```text
multiangent workflow功能使用过程中，出现agent没有自动投递消息，导致自动流程中断
```

截图证据：

```text
/var/folders/f6/jsztgdln7r5f8t15j97y2bjh0000gn/T/codex-clipboard-ea314f07-7afb-4828-9e35-4c251328e96e.png
```

截图中 Agent 自述摘要：

```text
原因有两个：
一是那条 delegation 的完成要求里写的是“向 development-lead 发送回传指令或在回复中明确说明”，我当时选择了后者；
二是当时 send_message_to_thread 不在可见工具列表里，我没有按 StarWork 规则继续用工具发现去找它。这一步是我的疏漏。

我刚刚已经补上了：已把验收不通过消息直接投递到 development-lead 线程 ... 并把 _系统/协作/shared.md 和 _系统/协作/lanes/testing/worklog.md 里的状态改成了 delivered_via_codex_thread_tool。
```

## 影响范围

- 影响的功能：`starworkMultiagent`、MultiAgent workflow / delegation、跨 Agent 自动交接、workflow 状态记录、Codex App thread tool discovery。
- 影响的用户：使用 MultiAgent workflow 自动拆分、验收、回传或跨 lane 协作的用户。
- 是否影响发布 / 升级 / A 测：影响 MultiAgent workflow 主链路。用户会以为流程已经自动推进，但目标 Agent 实际没有收到消息，流程停在半完成状态。
- 是否有绕行方式：用户手动追问或复制消息可以补救，但这破坏 workflow 自动化体验，也容易造成状态记录和真实投递不一致。

## 初步判断

该问题和 `ISSUE-020` 的“Codex App 正常路径应使用标准线程工具”相关，但本次暴露的是 workflow 层面的执行约束不足：

- delegation / workflow step 的完成条件允许“投递或说明”，导致 Agent 选择了不投递。
- 当 `send_message_to_thread` 不在可见工具列表时，Agent 没有强制使用工具发现或明确失败。
- workflow 状态更新可能晚于真实投递，存在“状态看似完成但目标未收到”的风险。

需要把 MultiAgent workflow 中的“必须投递”步骤建成强约束：不能用自然语言说明替代投递；不能在未投递时记录为完成；工具不可见时必须走 discovery / explicit failure / manual handoff，而不是悄悄跳过。

## 分流结果

- 是否转 SPEC：需要，建议补入 MultiAgent workflow runner / delegation delivery guarantee 规格。
- 是否转 GitHub：暂不转，先在本地问题单跟踪。
- 是否转开发 lane：需要。在 product-lead lane 明确验收口径后交 development lane 修复。
- 是否需要用户补信息：暂不需要，截图已经包含足够问题事实。

## 下一步

product-lead lane 已定义 workflow 自动交接的硬性规则，见 `product/planning/features/multiagent/specs/v0.12-workflow-delivery-guarantee.md`。

development lane 需要按 v0.12 SPEC 修复：

1. 哪些 workflow step 属于必须真实投递，不能用回复说明替代。
2. 必须投递步骤中，`send_message_to_thread` 不可见时的工具发现流程。
3. 工具仍不可用时的失败状态：`manual_handoff_required` / `delivery_tool_unavailable` / `blocked` 的边界。
4. workflow 状态写入顺序：只有真实投递成功后才能记录 `delivered_via_codex_thread_tool`。
5. Agent 回复模板：不得在未投递时说“已通知 / 已完成交接”。
6. 对 workflow runner 或 Skill 文档增加检查清单，避免 Agent 自行选择“说明一下就算完成”。

## 处理记录

- 2026-06-18：feedback-issues lane 登记问题并通过 `REQ-20260618-030858Z-product-lead` 转 product-lead 分析。
- 2026-06-18：product-lead 输出 v0.12 Workflow Delivery Guarantee SPEC，状态改为 `ready-for-development`。
- 2026-06-18：development lane 完成 v0.12 修复，product-lead 复验通过。确认 next / stable `starworkMultiagent` 已加入投递保证规则，`send_message_to_thread` 不可见时要求工具发现或 `manual_handoff_required`，且测试锁定“先真实投递成功，再记录 StarWork request”的顺序。验证通过：`node --check product/cli/src/cli.js`、`node --check product/cli/test/init.test.js`、`git -C product diff --check`、目标回归测试 122/122、`npm test` 122/122。

## 验收方式

- 验收条件 1：给定一个必须回传到目标 lane 的 workflow step，Agent 必须调用 `send_message_to_thread` 或明确进入 `manual_handoff_required`，不能只在当前回复中说明。
- 验收条件 2：当 `send_message_to_thread` 不在可见工具列表时，Agent 必须先走工具发现；仍不可用时输出具体缺失能力和完整可复制消息。
- 验收条件 3：未真实投递时，不得把 shared / worklog / request 状态写成 `delivered_via_codex_thread_tool`。
- 验收条件 4：真实投递成功后，状态记录和目标线程投递结果必须一致。
- 验收条件 5：MultiAgent workflow 文档或 Skill 中明确“自动流程不能用自然语言回复替代跨线程投递”。
- 关闭标准：workflow / delegation 投递规则落地到 Skill 或 runner，补充至少一个“工具不可见”和一个“必须投递成功”的回归验收，并通过真实或模拟 Codex thread tool smoke。
