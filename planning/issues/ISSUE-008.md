# ISSUE-008：MultiAgent `instruct` 默认等待目标会话完成导致发送方阻塞且目标 turn 可能 interrupted

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | cli / workflow |
| 优先级 | P1 |
| 状态 | closed |
| 来源 | 用户反馈 / 真实跨会话通知 |
| 发现日期 | 2026-06-03 |
| 关联 GitHub Issue | 无 |
| 关联 SPEC | `product/planning/features/multiagent/specs/v0.2-codex-orchestration.md`、`product/planning/features/multiagent/specs/v0.3-team-onboarding-fix.md`、`product/planning/features/multiagent/specs/v0.4-runtime-host-routing.md` |
| 关联验收 | 无 |
| 负责人 | development lane |

## 现象

- 用户可见表现：产品规划 lane 向 development lane 发送跨会话指令后，当前会话需要长时间等待目标会话返回；用户中断等待后，目标 development 会话出现 `interrupted`。
- 期望表现：跨会话指令的核心语义应该是“把消息投递给目标会话”。消息投递成功后，发送方会话可以立即结束本次动作，不需要等待目标会话完成任务。
- 实际表现：当前 `multiagent instruct` 默认等待目标 turn 完成。发送方进程持续挂起；本次真实通知中，目标最新 turn 最终显示为 `interrupted`。

## 证据

发送 development lane 开发指令时：

```bash
node product/cli/bin/starwork.js multiagent instruct development \
  --from product-planning \
  --message "<MultiAgent v0.3 开发任务>" \
  --target /Users/shuxinding/satellite-starwork \
  --json \
  --yes
```

执行 30 秒后仍未返回，进程仍在等待：

```text
node product/cli/bin/starwork.js multiagent instruct development ...
```

随后读取 development lane：

```bash
node product/cli/bin/starwork.js multiagent read development --turns 3 --target /Users/shuxinding/satellite-starwork --json
```

返回中最新 turn：

```json
{
  "id": "019e8c49-fcb9-7dd2-9984-ff202739f3d0",
  "status": "interrupted"
}
```

用户反馈：

```text
其实就是发送会话这个功能，发送后当前会话就可以终止了，没必要等待对方会话返回。
而且我刚刚发现就是发送过去后不知道什么原因那边的会话被终止了
```

## 影响范围

- 影响的功能：`starwork multiagent instruct`、`starworkMultiagent` 跨会话派活、团队创建后的派活流程。
- 影响的用户：使用 Codex 多会话自动派活的用户。
- 是否影响发布 / A 测：影响。当前语义容易让发送方会话被迫长时间等待，也可能增加目标 turn interrupted 的风险。
- 是否有绕行方式：可以使用人工 handoff 或中断等待后再 `read`，但这不应是默认体验。

## 初步判断

`instruct` 应拆成两个语义：

1. **投递语义**：确认消息已提交给目标宿主会话。投递成功后即可返回。
2. **完成语义**：后续通过 `read`、目标 lane 回传指令或验收流程判断目标是否完成。

当前 CLI 把投递和完成绑定在一起，默认等待目标 turn 完成。这个设计不适合跨会话指令，因为发送方的目标不是同步等待对方把任务做完，而是把任务可靠送过去。

## 追加发现：StarWork 当前实现与 Codex 运行时线程工具不是同一层能力

当前 StarWork CLI 的 `multiagent instruct` 实现方式是通过 `codex app-server --listen stdio://` 直接调用 JSON-RPC：

```text
thread/read
thread/resume
turn/start
thread/read
```

并把 `<!-- STARWORK:MULTIAGENT_MESSAGE v1 -->` 格式化消息作为普通 text input 发给目标 thread。实现位置：

```text
product/cli/src/cli.js
sendCodexInstruction()
```

而当前 Codex App 运行时暴露给 Agent 的线程管理能力是更高层的工具：

```text
create_thread
read_thread
send_message_to_thread
set_thread_title
set_thread_pinned
set_thread_archived
```

两者差异：

| 维度 | StarWork 当前 CLI | Codex 运行时工具 |
| --- | --- | --- |
| 层级 | app-server JSON-RPC / turn 级 | Agent 可调用的线程管理工具 |
| 发送方式 | `thread/resume` 后 `turn/start` | `send_message_to_thread` |
| 默认语义 | 启动并等待 turn 完成 | 向已有 thread 发送消息 / follow-up |
| UI 形态 | 更像普通用户输入一个新 turn | 更像 Codex 原生跨线程指令 |
| 风险 | 连接等待 / 中断可能影响目标 turn | 由 Codex 运行时托管投递语义 |

这可以解释用户反馈的“消息样式交互和之前测试不一样”。当前 StarWork 并未真正复用 Codex 的 `send_message_to_thread` 语义，而是用 app-server 自行模拟了跨会话消息。

后续修复不应只是在现有 `turn/start` 链路上调整 timeout。需要重新评估：

1. 如果 CLI 环境能调用 Codex 原生线程工具或等价稳定接口，应优先使用 `send_message_to_thread` 风格的投递语义。
2. 如果 CLI 只能使用 app-server JSON-RPC，则必须把该链路明确标为 lower-level / best-effort，并避免默认等待目标完成。
3. 文档和 Skill 不应把 app-server `turn/start` 模拟发送描述成与 Codex 原生 `send_message_to_thread` 完全等价。

## 追加发现：Codex 同一宿主下也可能出现会话级工具差异

2026-06-03 继续排查时发现：用户在其他 Codex 会话中可以通过工具发现找到 `codex_app` 命名空间下的线程管理工具，例如：

```text
send_message_to_thread
list_threads
read_thread
create_thread
set_thread_title
```

但当前 product-planning 会话使用相同或相近查询词，只能发现 `multi_agent_v1` 子智能体工具：

```text
send_input
resume_agent
close_agent
```

这说明 StarWork 不能只根据 `host=codex` 判断“可以自动跨会话发送”。同一个 Codex 宿主下，不同会话 / 启动入口 / 工具注入状态可能导致标准线程工具可用性不同。

产品判断：

- 这类情况应视为运行时能力差异，CLI 必须兼容。
- `multi_agent_v1.send_input` 是对子智能体发送消息，不等价于向既有 Codex thread 发送 `send_message_to_thread`。
- 当 CLI / 当前会话无法发现或调用 Codex 标准线程投递能力时，即使目标 lane 是 Codex，也必须返回 `manual_handoff_required` 或 `unsupported`。
- 不允许用子智能体、`thread/resume + turn/start` 或其他低层链路冒充标准跨会话投递。

## 分流结果

- 是否转 SPEC：是，应作为 MultiAgent v0.3 修复项或独立 v0.4 候选。
- 是否转 GitHub：否，先走本地 issue。
- 是否转开发 lane：是。
- 是否需要用户补信息：否，已有真实复现和用户判断。

## 下一步

development lane 按 v0.4 SPEC 继续修复：

1. 由 CLI 在运行时判断目标 lane 的宿主、adapter state、profile 基线和当前可用能力。
2. `multiagent instruct` 不再在 Skill 层判断 Codex / Cursor / Claude Code / Trae 能力。
3. Codex 自动发送必须走 Codex 标准投递能力，例如 `send_message_to_thread` 或明确等价稳定 API。
4. Cursor / Claude Code / Trae 没有标准后台投递 API 时，CLI 返回 `manual_handoff_required`，并生成可复制 handoff message。
5. adapter state 缺失或宿主未知时，CLI 返回 `needs_adapt`。
6. 默认不等待目标任务完成；完成情况由后续 `read`、worklog 或回传指令确认。

## 验收方式

- 验收条件 1：默认 `multiagent instruct --yes --json` 在消息投递后应快速返回，不等待目标完成全部任务。
- 验收条件 2：返回状态不能让用户误解为目标任务已完成。
- 验收条件 3：目标 lane 收到消息后，发送方可以通过后续 `read` 或目标回传指令继续追踪。
- 验收条件 4：如保留等待完成能力，必须通过显式参数开启。
- 验收条件 5：真实 Codex 复验中，发送跨会话指令后目标 turn 不应因为发送方等待 / 中断而稳定变成 `interrupted`。

## Development 处理记录

2026-06-03 development lane 已按 v0.4 runtime host routing 修复：

- `multiagent instruct` 不再使用 `thread/resume + turn/start` 作为默认跨会话投递主路径。
- CLI 增加运行时宿主路由：`unbound`、`needs_adapt`、`manual_handoff_required`、`unsupported`、`failed` 等状态由 CLI 输出。
- Codex profile 虽声明 `send_message: supported`，但当前 CLI runtime 没有可证明的标准后台投递 API，因此返回 `manual_handoff_required`，并生成格式化 handoff message。
- 显式 `--wait` / `--wait-completion` 也不会绕过标准投递要求去调用低层 turn API。
- 回归测试覆盖：Codex 标准投递不可用不调用 fake app-server、未绑定 lane 返回 `unbound`、未适配非 Codex 返回 `needs_adapt`、已适配但无标准投递返回 handoff。

验证：

```bash
node --check cli/src/cli.js
node --check cli/test/init.test.js
git diff --check
npm test
```

`npm test` 通过 90/90。
- 验收条件 6：Cursor / Claude Code / Trae 在无标准后台投递 API 时返回 `manual_handoff_required`，不得伪装自动发送。
- 验收条件 7：adapter state 缺失或宿主未知时返回 `needs_adapt`。

## 产品复验

2026-06-03 product-planning lane 复验未通过。

已经完成的部分：

- `multiagent instruct` 增加了 `--wait` / `--wait-completion`。
- 默认执行时返回 `delivered`，不再等待 `turn/completed`。
- JSON 和 Skill 文案已开始区分“消息已投递”和“目标任务已完成”。

未通过原因：

- CLI 仍然通过 `codex app-server --listen stdio://` 调用 `thread/resume` + `turn/start` 来模拟跨会话发送。
- 这不是 Codex 当前暴露给 Agent 的标准跨线程能力；标准能力应是 `send_message_to_thread` 或宿主明确提供的等价投递 API。
- 只把 `turn/completed` 等待改成可选，并没有消除低层 turn 插入链路带来的 UI 形态差异和中断风险。

产品规则补充：

- StarWork 不应再把 `thread/resume` + `turn/start` 作为跨会话指令的标准实现。
- Codex 跨会话发送必须走 Codex 标准线程投递能力，例如 `send_message_to_thread` 或明确等价的稳定宿主 API。
- 其他宿主同理：如果宿主没有提供标准的后台消息投递能力，就不支持自动 `instruct`，只能走人工交付 / handoff。
- `resume` / `continue` 只能用于“让用户或当前进程恢复某个会话继续工作”，不能伪装成“后台向另一个会话发送指令”。

## 修复要求

development lane 需要继续修复：

1. 实现 `product/planning/features/multiagent/specs/v0.4-runtime-host-routing.md` 中的 Host Capability Resolver。
2. 移除 `multiagent instruct` 对 `thread/resume` + `turn/start` 的默认依赖。
3. Codex 环境必须先 probe 当前会话 / CLI 进程是否真的可调用 `send_message_to_thread` 或等价标准投递能力。
4. 若 CLI 环境暂时无法调用 Codex 标准投递能力，则 `multiagent instruct` 对 Codex 也应降级为 `manual_handoff_required` 或明确 `unsupported`，不能继续用低层 turn 链路或子智能体工具模拟。
5. Cursor / Trae / Claude Code 等宿主如果没有标准后台投递 API，一律由 CLI 返回 `manual_handoff_required`。
6. 更新回归测试：断言默认 `instruct` 不再产生 `thread/resume` + `turn/start` 调用链。
7. 更新回归测试：Codex profile 标记支持但运行时 probe 不可用时，不返回 `delivered`。

## 产品二次复验

2026-06-03 product-planning lane 二次复验通过，`ISSUE-008` 关闭。

复验结论：

- `multiagent instruct` JSON schema 已升级为 `starwork.agent_lanes.instruct.v0.4`。
- 默认 `instruct` 先走 CLI runtime host routing；当前 CLI runtime 无可证明的标准后台投递 API 时，对 Codex 返回 `manual_handoff_required`，不返回 `delivered`。
- 即使显式传入 `--wait-completion`，当前 Codex 标准投递不可用时仍返回 `manual_handoff_required`，没有退回低层 `thread/resume` + `turn/start` 链路。
- 未绑定目标 lane 返回 `unbound`。
- 非 Codex 目标未适配时返回 `needs_adapt`；已适配但无标准投递能力时返回 `manual_handoff_required`。
- shared request 和 `.starwork/agent-lanes/state.json` 中的 `host_delivery` 与 CLI JSON 状态一致，不再误导为目标任务已完成。

复验命令：

```bash
node --check cli/src/cli.js
node --check cli/test/init.test.js
git diff --check
node --test cli/test/init.test.js --test-name-pattern "multiagent instruct|multiagent launch|starworkMultiagent skill"
npm test
```

结果：

- `node --check` 通过。
- `git diff --check` 通过。
- 目标测试通过。
- `npm test` 通过 90/90。

手工复验：

- 临时 StarWork 工作台中未绑定 `development` lane 时，`instruct` 返回 `unbound`。
- 绑定 `codex:manual-dev-thread` 后执行 `instruct --wait-completion`，返回 `manual_handoff_required`，warning 明确说明不使用低层 turn API。
- 绑定 `cursor:manual-cursor-session` 且未适配时，返回 `needs_adapt`。

残余边界：

- 当前版本尚未实现 Codex 标准自动投递；正确行为是降级为 handoff。后续如要启用自动 `delivered`，必须先接入宿主标准投递 API，不能重新启用 `thread/resume` + `turn/start` 作为 `instruct` 主路径。
