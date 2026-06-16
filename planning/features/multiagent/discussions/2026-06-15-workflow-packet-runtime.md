# Workflow Packet Runtime 设计讨论

日期：2026-06-15

状态：discussion accepted，尚未进入正式 SPEC。

负责人：product-multiagent lane

原始草案：`_系统/协作/lanes/product-multiagent/workspace/drafts/2026-06-15-workflow-packet-runtime-spec.md`

product-lead 验收判断：核心判断成立，尤其是“Workflow Definition 是静态剧本，Workflow Packet 是运行时传棒”。但本文仍有待拍板问题，且验收标准也写明“第一版进入正式 SPEC 前应满足”。因此本轮晋升为 MultiAgent discussion，不作为可开发 SPEC，也不通知 development。

## 1. 核心判断

Agent 不可靠地“记住 workflow”，但可以可靠地“接收当前节点任务卡”。

因此 StarWork Lane Workflow 不应设计成让每个 Agent 在执行时反复阅读完整 workflow 文档，而应设计成：

```text
Workflow Definition 在触发时读取
  ↓
生成本次 Workflow Instance
  ↓
把当前节点要求编译成 Workflow Packet
  ↓
Workflow Packet 放进 Agent-to-Agent Message
  ↓
目标 Agent 只执行当前节点，并按 Return Contract 回传
  ↓
来源 Agent 或 workflow owner 根据回传生成下一节点 Packet
```

一句话：

```text
Workflow Definition 是静态剧本；Workflow Packet 是运行时传棒。
```

## 2. 要解决的问题

当前 MultiAgent 已能发送结构化消息，但如果引入复杂 workflow，会遇到一个关键问题：

- Agent 会话可能压缩。
- Agent 可能换会话接手。
- 不同宿主可能不重新读取 `AGENTS.md` / `CLAUDE.md`。
- 目标 Agent 可能只看到当前交接消息，看不到完整 workflow 设计文档。
- 如果靠“Agent 记得流程”，流程会在第二三轮后漂移。

所以本设计要保证：

- 触发 workflow 时能读到完整定义。
- 每次跨 Agent 交接时，消息里都带当前节点的完整执行要求。
- 每个 Agent 只需要理解“我当前节点要做什么”，不需要记住整个循环。
- 每个节点完成后有明确 return contract，供下一节点生成。
- 循环不能无限自动滚动，必须有 gate / stop 条件。

## 3. 非目标

本版不做：

- 不做后台 daemon。
- 不做自动文件监听。
- 不做完整 Loop Engineering 系统。
- 不做复杂 DAG 调度器。
- 不做跨项目全局任务队列。
- 不让 Agent 自动推断下一步。
- 不要求目标 Agent 在执行时阅读完整 Workflow Definition。
- 不用 workflow 绕过 lane write_scope、pending_merge 或 product-planning gate。

## 4. 概念模型

### 4.1 Workflow Definition

静态流程定义。只在触发 workflow 或需要生成下一节点时读取。

它回答：

- 这个 workflow 有哪些节点。
- 每个节点由哪个 lane 承担。
- 每个节点需要哪些输入。
- 每个节点产出什么。
- 完成后转到哪个节点。
- 哪些节点必须人工确认。
- 哪些状态会停止循环。

示例：

```yaml
workflow_id: product_iteration_loop
title: 产品迭代流程
version: 1
owner_lane: product-planning
nodes:
  product_spec:
    lane: product-planning
    goal: 整理问题并形成 SPEC 草案
    required_inputs:
      - user_problem
      - related_issue
    outputs:
      - spec_path
      - acceptance_criteria
      - open_questions
    next:
      accepted: development_implementation
      needs_decision: human_gate
      rejected: stop
  development_implementation:
    lane: development
    goal: 按 SPEC 实现并验证
    required_inputs:
      - spec_path
      - acceptance_criteria
    outputs:
      - changed_files
      - verification
      - known_risks
    next:
      done: product_review
      blocked: human_gate
  product_review:
    lane: product-planning
    goal: 复验实现并决定通过或退回
    required_inputs:
      - changed_files
      - verification
      - acceptance_criteria
    outputs:
      - acceptance_result
      - issue_status
    next:
      passed: stop
      failed: development_implementation
```

### 4.2 Workflow Instance

一次具体运行中的流程实例。

它回答：

- 这次循环的 id 是什么。
- 由谁触发。
- 当前走到哪个节点。
- 已完成哪些节点。
- 当前状态是 running、waiting_review、blocked 还是 done。

示例：

```yaml
workflow_instance_id: WF-20260615-product-iteration-001
workflow_id: product_iteration_loop
triggered_by: product-planning
created_at: 2026-06-15T00:00:00+08:00
status: running
current_node: product_spec
history:
  - node: product_spec
    status: running
```

### 4.3 Workflow Packet

运行时传给某个 Agent 的当前节点任务卡。

这是目标 Agent 真正需要执行的内容。

它回答：

- 我在哪个 workflow instance 中。
- 我当前负责哪个 node。
- 我的输入材料在哪里。
- 我这一步要做什么。
- 我不能做什么。
- 我完成后必须回传什么。
- 下一步由谁决定。

示例：

```yaml
workflow_packet:
  workflow_id: product_iteration_loop
  workflow_instance_id: WF-20260615-product-iteration-001
  node_id: development_implementation
  node_owner_lane: development
  previous_node: product_spec
  goal: 按 SPEC 实现并验证
  inputs:
    spec_path: product/planning/features/multiagent/specs/v0.11.md
    issue_path: product/planning/issues/ISSUE-022.md
  required_actions:
    - 阅读 SPEC 和 issue
    - 只在 development write_scope 内修改
    - 完成实现
    - 运行验收标准要求的测试
    - 更新 development worklog
  return_contract:
    - changed_files
    - verification_commands
    - verification_result
    - known_risks
    - review_request_to: product-planning
  next_transition:
    decided_by: product-planning
    candidate_next_nodes:
      - product_review
      - human_gate
```

### 4.4 Agent-to-Agent Message

现有 `STARWORK:MULTIAGENT_MESSAGE v1` 是传输外壳。

Workflow Packet 应嵌入到 message 中，而不是另起一套投递格式。

### 4.5 Return Contract

当前节点完成时必须回传的结构化内容。

如果没有 Return Contract，workflow owner 不能安全生成下一节点 Packet。

### 4.6 Transition

根据当前节点回传结果，决定下一节点。

第一版 Transition 不自动后台执行。它由当前 Agent 或 workflow owner 在收到回传后显式判断。

## 5. 运行流程

### 5.1 触发 workflow

用户说：

```text
现在进入产品迭代流程循环。
```

触发 Agent 执行：

1. 识别 workflow intent：`product_iteration_loop`。
2. 读取 Workflow Definition。
3. 创建 Workflow Instance id。
4. 判断第一个 node。
5. 生成第一个 Workflow Packet。
6. 将 Packet 放入 `STARWORK:MULTIAGENT_MESSAGE`。
7. 投递给第一个 node 对应 lane，或如果当前 lane 就是第一个 node，则直接开始。

### 5.2 节点执行

目标 Agent 收到消息后，不需要读取完整 Workflow Definition。

它必须先恢复当前 Packet：

```text
我已恢复当前 workflow packet：
- workflow_instance_id: ...
- current_node: ...
- 我的目标: ...
- 我的输入: ...
- 我的 return contract: ...
```

然后只执行 Packet 中的 required actions。

### 5.3 节点完成

目标 Agent 完成后，回传：

```text
workflow_instance_id: WF-...
completed_node: development_implementation
node_status: done

## 产物
- changed_files: ...

## 验证
- command: ...
- result: ...

## 风险
- ...

## 请求下一步
- 请 product-planning 进入 product_review 节点
```

### 5.4 生成下一节点 Packet

workflow owner 或当前负责转交的 Agent：

1. 读取回传结果。
2. 必要时读取 Workflow Definition。
3. 根据 Transition 规则选择下一 node。
4. 生成下一节点 Packet。
5. 投递给下一 lane。

关键点：

```text
下一节点不是由目标 Agent 自己凭感觉决定。
下一节点由 Return Contract + Workflow Definition + owner/gate 决定。
```

## 6. Message 格式扩展

### 6.1 Instruction Message

```text
<!-- STARWORK:MULTIAGENT_MESSAGE v1 -->

# StarWork MultiAgent Workflow Instruction

message_type: workflow_instruction
request_id: REQ-...
from_lane: product-planning
to_lane: development
created_at: 2026-06-15T00:00:00+08:00
recorded_in: _系统/协作/shared.md

## Workflow Packet

workflow_id: product_iteration_loop
workflow_instance_id: WF-20260615-product-iteration-001
node_id: development_implementation
node_owner_lane: development
previous_node: product_spec
workflow_status: running

## 当前节点目标

按 SPEC 完成实现，并回传产品复验所需材料。

## 输入材料

- SPEC: product/planning/features/<feature>/specs/vX.Y.md
- Issue: product/planning/issues/ISSUE-XXX.md

## 本节点必须完成

1. 阅读 SPEC 和 issue。
2. 只在你的 write_scope 内主动修改。
3. 完成实现。
4. 运行 SPEC 要求的验证。
5. 更新 lane worklog。

## 本节点禁止

- 不修改 write_scope 之外的文件。
- 不改变 SPEC 验收标准。
- 不把消息送达说成目标完成。
- 不自行跳过 product review。

## 完成后请回传

1. changed_files
2. verification_commands
3. verification_result
4. known_risks
5. review_request_to: product-planning

## 下一步规则

完成后不要自行继续下一节点。
请向 product-planning 回传，由 product-planning 决定是否进入 product_review。

<!-- /STARWORK:MULTIAGENT_MESSAGE -->
```

### 6.2 Handoff Response Message

```text
<!-- STARWORK:MULTIAGENT_MESSAGE v1 -->

# StarWork MultiAgent Workflow Response

message_type: workflow_response
request_id: REQ-...
from_lane: development
to_lane: product-planning
created_at: 2026-06-15T00:00:00+08:00
recorded_in: _系统/协作/shared.md

workflow_id: product_iteration_loop
workflow_instance_id: WF-20260615-product-iteration-001
completed_node: development_implementation
node_status: done

## Return Contract

changed_files:
- product/cli/src/cli.js
- product/cli/test/init.test.js

verification_commands:
- node --check product/cli/src/cli.js
- npm test

verification_result:
- passed

known_risks:
- none

next_request:
- 请 product-planning 进入 product_review 节点。

<!-- /STARWORK:MULTIAGENT_MESSAGE -->
```

## 7. 保证机制

### 7.1 不保证记忆，保证 Packet 完整

StarWork 不承诺目标 Agent 记住 workflow。

StarWork 承诺每条 workflow instruction 都包含足够完整的 Packet，使目标 Agent 可以仅凭当前消息执行当前节点。

### 7.2 不保证 Agent 主动读文档，保证触发方编译节点

Workflow Definition 不要求每个目标 Agent 执行时读取。

触发方或 workflow owner 必须在投递前读取 Definition，并把当前节点编译成 Packet。

### 7.3 不保证自动转移，保证 Return Contract

节点完成后不自动进入下一节点。

只有当目标 Agent 按 Return Contract 回传后，workflow owner 才能生成下一 Packet。

### 7.4 不保证循环无限可靠，保证 Gate 和 Stop

所有 workflow 必须定义：

- 哪些节点可以自动生成下一 Packet。
- 哪些节点必须人工确认。
- 哪些状态停止。
- 最大回退次数或最大循环次数。

第一版建议所有跨 development / product review 的循环都必须有 product-planning gate。

## 8. Rehydrate 机制

### 8.1 Rehydrate 的对象

Lane Rehydrate 不恢复完整 workflow 文档，只恢复当前执行上下文。

必须恢复：

- 当前 lane 身份。
- 当前 write_scope。
- 当前 Workflow Packet。
- 当前 request id。
- 当前 node 的 return contract。
- 当前节点输入材料。

### 8.2 Rehydrate Checklist

目标 Agent 收到 workflow message 后，第一步必须读取：

```text
1. AGENTS.md
2. _系统/协作/agent-lanes.md
3. _系统/协作/shared.md
4. 自己的 lane worklog
5. 当前 STARWORK:MULTIAGENT_MESSAGE 中的 Workflow Packet
6. Packet 指向的 SPEC / issue / evidence
```

然后在 worklog 或回复中写：

```text
已恢复 workflow packet：
- lane: development
- workflow_instance_id: WF-...
- current_node: development_implementation
- return_contract: changed_files / verification / known_risks / review_request
```

### 8.3 Rehydrate 验收

如果目标 Agent 没有明确恢复 Packet：

- 不能视为 workflow 正常进入节点。
- 来源 lane 可以要求目标 Agent 先补 Rehydrate。
- product-planning 复验时可以把它判为流程执行不合格。

## 9. 存储与事实源

第一版可以不做复杂状态机，但需要最低限度留痕。

### 9.1 Workflow Definition 存放

候选路径：

```text
product/planning/features/multiagent/workflows/
product/core/workflows/
product/packs/<pack>/workflows/
```

建议第一版先放规划侧或 Pack 草案，不进入 Core。

### 9.2 Workflow Instance 记录

第一版可以先记录在：

```text
_系统/协作/shared.md
```

以及 lane worklog 中。

未来如需要机器状态，再考虑：

```text
.starwork/workflows/state.json
```

但第一版不急于新增状态文件，避免过早引入复杂迁移。

### 9.3 Packet 留痕

每次投递的 Packet 已包含在 `STARWORK:MULTIAGENT_MESSAGE` 中，因此天然进入：

- 来源 lane 的消息记录。
- 目标 lane 的上下文。
- `_系统/协作/shared.md` request 摘要。

## 10. Skill 行为要求

### 10.1 触发 workflow

当用户说“进入某个流程循环”时，`starworkMultiagent` 应：

1. 识别 workflow_id。
2. 找到 Workflow Definition。
3. 用用户语言说明即将进入哪个流程。
4. 说明第一节点是谁、会写入什么、会等待谁确认。
5. 生成 Workflow Instance id。
6. 生成第一节点 Packet。
7. 投递或交给当前 lane 执行。

### 10.2 节点投递

Skill 投递时必须：

- 使用现有 `STARWORK:MULTIAGENT_MESSAGE v1` 外壳。
- 带完整 Workflow Packet。
- 带当前节点 return contract。
- 带 stop / gate 说明。
- 成功投递后用 `request record` 记录 delivery status。

### 10.3 工具不可用

如果无法自动投递：

- 输出 `manual_handoff_required`。
- 展示完整 Workflow Packet message。
- 明确还没有自动送达。

### 10.4 目标 lane 未绑定

如果目标 lane 未绑定：

- 不生成“已进入下一节点”的成功口径。
- 可以生成 Packet 草稿。
- 询问用户是绑定已有会话、创建新会话，还是手动复制。

## 11. CLI 边界

第一版 CLI 不需要执行 workflow 调度。

CLI 可以做：

- `multiagent status` 读取 lane / binding。
- `multiagent request record` 记录一次投递状态。
- 未来可增加 `workflow record`，但非第一版必需。

CLI 不做：

- 不读取 Workflow Definition 后自动生成下一 Packet。
- 不后台推进 workflow。
- 不判断目标节点是否完成。
- 不替代 Skill 调用宿主线程工具。

## 12. Stop / Gate 规则

每个 Workflow Definition 必须定义停止条件。

建议内置几类：

| gate | 含义 |
| --- | --- |
| `human_gate` | 必须等待用户或 product-planning 确认 |
| `owner_gate` | workflow owner lane 确认 |
| `acceptance_gate` | 验收通过后才能停止或进入下一轮 |
| `blocked_gate` | 遇到阻塞时停止并回报 |
| `max_loop_gate` | 达到最大回退次数后停止 |

产品迭代流程中，至少这些地方必须有 gate：

- SPEC 草案进入 development 前。
- development done 进入 acceptance 前。
- acceptance failed 再退回 development 时。
- 连续失败超过阈值时。

## 13. 示例：产品迭代流程

### 13.1 用户触发

```text
现在请进入产品迭代流程循环，先把 ISSUE-022 走成 SPEC。
```

### 13.2 第一节点 Packet

目标：product-planning 或 product-multiagent。

```yaml
node_id: product_spec
goal: 把 ISSUE-022 形成 SPEC 草案
inputs:
  issue_path: product/planning/issues/ISSUE-022.md
required_actions:
  - 阅读 issue
  - 形成 SPEC 草案
  - 标出非目标和验收标准
return_contract:
  - spec_path
  - open_questions
  - recommendation_to_develop_or_hold
next_transition:
  accepted: development_implementation
  needs_decision: human_gate
```

### 13.3 第二节点 Packet

目标：development。

```yaml
node_id: development_implementation
goal: 按 SPEC 实现
inputs:
  spec_path: <from previous node>
  issue_path: ISSUE-022
required_actions:
  - 实现
  - 测试
  - 更新 worklog
return_contract:
  - changed_files
  - verification_result
  - known_risks
  - review_request
next_transition:
  done: product_review
  blocked: human_gate
```

### 13.4 第三节点 Packet

目标：product-planning。

```yaml
node_id: product_review
goal: 复验实现
inputs:
  changed_files: <from development>
  verification_result: <from development>
  acceptance_criteria: <from spec>
required_actions:
  - 复验
  - 更新 issue 状态
  - 判断通过或退回
return_contract:
  - acceptance_result
  - issue_status
  - next_action
next_transition:
  passed: stop
  failed: development_implementation
```

## 14. 验收标准

第一版进入正式 SPEC 前，应满足：

1. 能用一个 Workflow Definition 生成第一个 Workflow Packet。
2. Packet 能独立说明当前节点，不依赖目标 Agent 读取完整 workflow 文档。
3. Packet 能嵌入现有 `STARWORK:MULTIAGENT_MESSAGE v1`。
4. Return Contract 足够生成下一节点 Packet。
5. 每个 Transition 都有 owner 或 gate。
6. 不存在无限自动循环。
7. 目标 Agent 可以通过 Rehydrate Checklist 复述当前节点。
8. `manual_handoff_required` 时仍能完整复制 Packet。
9. delivery status 和 node status 分离。
10. 不改变 v0.8 Skill / CLI 最小边界。

## 15. 待拍板问题

1. Workflow Definition 第一版放在哪里：planning、Core、Pack，还是 lane workspace 试验。
2. 是否需要 `.starwork/workflows/state.json`，还是先只用 shared request + worklog 留痕。
3. Workflow Instance id 是否由 Skill 生成，还是 CLI 提供纯记录工具。
4. 第一条正式 workflow 是不是选择 `product_iteration_loop`。
5. 是否要求所有 workflow node 都必须有 product-planning / owner gate，还是允许部分 node 自动传递。

## 16. 建议下一步

不要先实现 daemon。

建议下一步只做一个可手工执行的 workflow prototype：

```text
product_spec -> development_implementation -> product_review
```

验证重点不是自动化程度，而是：

- Packet 是否足够完整。
- Agent 是否按 Packet 执行。
- Return Contract 是否足够生成下一节点。
- Gate 是否能防止流程失控。

如果这个 prototype 稳定，再考虑把 Workflow Definition 抽成 Pack / Core 的正式能力。
