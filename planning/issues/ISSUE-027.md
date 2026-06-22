# ISSUE-027：MultiAgent workflow 缺少专门管理机制且可能向当前 Agent 自投递

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | workflow / skill / cli / core / product |
| 优先级 | P0 |
| 状态 | closed |
| 来源 | 用户反馈 / 真实 workflow 使用 |
| 发现日期 | 2026-06-22 |
| 关联 GitHub Issue | 无 |
| 关联 SPEC | `product/planning/features/multiagent/specs/v0.14-workflow-run-state-self-delivery-guard.md` |
| 关联验收 | `ISSUE-024` / `ISSUE-025` |
| 负责人 | development lane |

## 现象

- 用户可见表现：MultiAgent workflow 使用过程中没有独立的 workflow 管理机制；用户向测试 Agent 提交问题后，流程应进入“测试提单 -> 产品设计 -> 开发实现 -> 后续验收”的链路，但出现了测试 Agent 给自己发送消息的情况。
- 期望表现：workflow 应有明确的定义、实例、步骤、参与 lane、当前执行者、下一步目标、消息路由和状态机；任一 Agent 执行 step 时，必须能判断“当前 Agent / 当前线程”和“目标 Agent / 目标线程”是否相同，禁止误向自己投递。
- 实际表现：workflow 缺少专门管理层和路由校验，Agent 可能只根据当前上下文或错误的 lane binding 判断下一步，从而把本应交给产品 Agent 或开发 Agent 的消息发回测试 Agent 自己。

## 证据

用户反馈原话：

```text
提交一个关于multiagent workflow的几个严重问题：
1. workflow没有专门的管理机制
2. workflow有逻辑问题，使用场景：
我有个workflow是测试agent提单，然后产品agent设计，开发agent开发....（后续不赘述），但是我跟测试agent提问题后，出现了测试agent自己给自己发消息的问题
```

典型问题链路：

```text
用户 -> testing agent：提交问题
期望下一步：testing agent 创建/补全问题单后交给 product agent 做设计
再下一步：product agent 设计后交给 development agent 开发
实际异常：testing agent 将 workflow 消息发送给 testing agent 自己
```

## 影响范围

- 影响的功能：MultiAgent workflow builder / runner、workflow step routing、lane binding、当前会话 ID 校验、跨 Agent message delivery、worklog / shared request 状态记录。
- 影响的用户：使用 MultiAgent workflow 做测试提单、产品设计、开发实现、验收流转的用户。
- 是否影响发布 / 升级 / A 测：严重影响 workflow next 能力可信度。自投递会造成流程停滞、循环、误以为已进入下一阶段，甚至让同一个 Agent 反复处理不属于自己的 step。
- 是否有绕行方式：用户可以手动指定下一位 Agent 或人工复制消息，但这说明 workflow runner 本身没有可靠路由能力。

## 初步判断

该问题不是单纯的投递工具不可见，而是 workflow 产品模型和执行层边界不足：

1. workflow 没有独立管理对象：缺少 workflow definition、run instance、step state、handoff target、current actor、transition guard 等一等公民。
2. runner 没有强制路由校验：没有在投递前比较 `current_session`、`from_lane.current_session`、`to_lane.current_session` 和目标 thread。
3. step 语义可能混淆：用户对测试 Agent 说话，不等于下一步目标仍是测试 Agent；workflow 需要根据定义决定下一步 lane，而不是默认回到当前 lane。
4. 状态记录可能弱约束：如果 self-send 发生，shared / worklog 可能仍记录为 delivered，掩盖路由错误。

## 分流结果

- 是否转 SPEC：已转入 `MultiAgent v0.14 Workflow Run State / Self-Delivery Guard SPEC`。
- 是否转 GitHub：暂不转，先在本地问题单跟踪。
- 是否转开发 lane：已转 development lane。
- 是否需要用户补信息：暂不需要；已有真实使用场景足以立项。后续复验时可补具体 workspace / request id / thread id。

## 下一步

development lane 按 v0.14 SPEC 实现 workflow 管理和路由安全方案，至少覆盖：

1. Workflow 专门管理机制：
   - workflow definition：步骤、参与 lane、每步输入/输出、转移条件。
   - workflow run instance：当前 run id、当前 step、当前 actor、下一步目标、状态。
   - workflow event log：每次投递、失败、回退、人工介入都可追踪。
2. 自投递防护：
   - 投递前必须比较来源 lane 和目标 lane。
   - 投递前必须比较当前线程 ID 和目标 `current_session`。
   - 默认禁止把 workflow handoff 发给当前 Agent 自己；除非 workflow 明确声明这是 self-review / self-note，并需记录不同状态。
3. step 路由规则：
   - 用户向某个 Agent 发起请求，只代表当前入口，不代表下一步目标。
   - 下一步目标必须来自 workflow definition / run state，而不是当前会话上下文猜测。
4. 失败状态：
   - 发现 self-send 风险时，必须停止并进入 `blocked_self_delivery` 或等价状态。
   - 不得记录为 `delivered_via_codex_thread_tool`。
5. 用户反馈：
   - 告诉用户“我发现下一步目标会指向当前 Agent 自己，这可能是 workflow 配置或路由错误，已停止自动投递”。

## 处理记录

- 2026-06-22：product-lead 已确认该问题为 P0，不能继续作为 Skill 小修处理；已派发 product-multiagent 输出 `MultiAgent v0.14 Workflow Run State / Self-Delivery Guard SPEC` 草案。草案只写入 product-multiagent lane workspace，待 product-lead 复核后再晋升正式 SPEC 或交 development。
- 2026-06-22：product-lead 复核 product-multiagent 草案通过，并晋升为正式 SPEC：`product/planning/features/multiagent/specs/v0.14-workflow-run-state-self-delivery-guard.md`。product-lead 拍板：definition confirmed 文件第一版仍可留在 lane workspace 或 product planning；runtime state 写入 `.starwork/workflows/runs/<run-id>.json`；fixture 使用明确 lane id；阻断状态写 workflow event log，不得写 delivered request；v0.14 同步更新 next Skill reference 和 A 测 / 用户文档；完整 `starwork skills install` 不作为前置。
- 2026-06-22：已将本 issue 状态改为 `in-development`，并通知 development 按 v0.14 SPEC 实现 run state、Step Router、self-delivery guard、测试 fixture 和 next 文档收紧。
- 2026-06-22：product-lead 初验 development v0.14 实现暂不通过。已验证第一跳 `testing -> product-lead` 路由和 self-delivery guard 通过，但 smoke 发现记录 `delivering` / `delivered` 后，run state 未推进到 `product_design` / `product-lead`，第二跳 `accepted` 仍从 `testing_intake` 计算，返回 `blocked_missing_route`。已登记复验阻塞报告：`_系统/协作/lanes/product-lead/workspace/2026-06-22-multiagent-v014-review-blocked.md`。
- 2026-06-22：product-lead 二次复验通过。确认 `delivered` 后 run state 会推进到上一轮 route 的 `next_target_node` / `next_target_lane`，并追加 `step_entered` event；两跳 smoke 已从 `testing -> product-lead` 成功推进到 `product-lead -> development`。目标测试 132/132、全量 `npm test` 132/132 均通过。验收报告：`_系统/协作/lanes/product-lead/workspace/2026-06-22-multiagent-v014-acceptance.md`。本 issue 关闭。

## 验收方式

- 验收条件 1：workflow 有可检查的管理对象，能展示当前 run、当前 step、下一步目标 lane 和状态。
- 验收条件 2：测试 Agent 提单 -> 产品 Agent 设计 -> 开发 Agent 开发的 workflow fixture 中，测试 Agent 收到用户问题后，下一步目标必须是产品 Agent，而不是测试 Agent 自己。
- 验收条件 3：当来源 lane 和目标 lane 相同，或当前线程 ID 与目标线程 ID 相同时，runner 必须阻断投递并给出 `blocked_self_delivery` / `manual_confirmation_required`。
- 验收条件 4：被阻断的 self-send 不得写成 `delivered_via_codex_thread_tool`，shared / worklog / request 状态必须能看出未送达。
- 验收条件 5：如果 workflow 明确允许 self step，必须使用不同的状态和文案，例如 `self_step_recorded`，不得伪装为跨 Agent handoff。
- 关闭标准：产品规格 accepted，development lane 完成 workflow 管理对象和 self-delivery guard，补至少一个“测试提单 -> 产品设计 -> 开发实现”fixture 和一个 self-send 阻断测试，并通过真实或模拟 Codex thread tool smoke。
