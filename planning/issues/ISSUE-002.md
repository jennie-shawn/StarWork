# ISSUE-002：MultiAgent v0.2 `launch` 失败后仍写入 lane binding

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | cli |
| 优先级 | P0 |
| 状态 | closed |
| 来源 | MultiAgent v0.2 产品验收 |
| 发现日期 | 2026-06-01 |
| 关联 SPEC | `product/planning/features/multiagent/specs/v0.2-codex-orchestration.md` |
| 关联验收 | `product/planning/features/multiagent/acceptance/2026-06-01-v0.2-acceptance-report.md` |
| 负责人 | development lane |

## 现象

- 用户可见表现：`multiagent launch` 返回失败，但 lane 仍显示已绑定到新创建的 Codex thread。
- 期望表现：Launch Message 发送成功后才绑定 lane；如果初始化消息发送失败，不应把失败 thread 作为当前 lane binding。
- 实际表现：真实 Codex app-server 上 `launch` 创建了 thread id，但初始化消息发送失败后，`agent-lanes.md` 和 `.starwork/agent-lanes/state.json` 仍写入了该 thread。

## 关键证据

第二次验收中：

```bash
starwork multiagent launch launch-test --target <tmp> --json --yes
```

返回 `status: failed`，但 registry 已写入 `codex:<thread_id>` binding。随后 `multiagent read launch-test --turns 5 --json` 返回 `thread not loaded`。

## 处理结果

development lane 已修复：

- `launch` 只有在 Launch Message 返回 `completed` 后，才写入 `agent-lanes.md` 和 `.starwork/agent-lanes/state.json` binding。
- 如果 thread 创建成功但 Launch Message 发送失败，JSON 返回 `created_thread_id` 供排查，但不返回可绑定的 `thread_id`，lane 保持 `unbound`。
- `sendCodexInstruction()` 不再把最后一次 `thread/read` 验证超时视为消息发送失败；turn 已完成时返回 `completed`，同时用 `verified_by_thread_read: false` 和 `verification_warning` 标记验证读失败。
- 新增回归测试：thread 创建成功但 `turn/start` 失败时，不写入 binding。
- 新增回归测试：turn 完成但最终 `thread/read` 验证超时时，允许绑定，并保留验证警告。
- 真实 app-server 复验后继续修正：`launch` 新建 thread 时显式传入目标工作台 `cwd`，`turn/start` 使用正式 `UserInput` 形态 `{ type: "text", text, text_elements: [] }`。
- `launch` 默认等待时间改为 90 秒。
- 移除新 thread 后的错误 `thread/resume` 调用。

## 验收记录

第三次产品验收通过：

- `npm test` 通过：72 个测试全部通过。
- `git -C product diff --check` 通过。
- 真实 `multiagent launch launch-test --json --yes` 返回 `status: completed`、`verified_by_thread_read: true`。
- 随后 `multiagent read launch-test --turns 3 --json` 可读到 1 个 completed turn。
- `agent-lanes.md` 和 `.starwork/agent-lanes/state.json` 只在 launch completed 后写入 binding。

## 关闭结论

`ISSUE-002` 已关闭。失败场景已有回归测试保护，真实 launch 主链路已通过。
