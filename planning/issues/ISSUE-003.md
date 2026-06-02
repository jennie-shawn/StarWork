# ISSUE-003：MultiAgent `instruct` 返回 `sent` 后目标 turn 可能 interrupted

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | cli |
| 优先级 | P1 |
| 状态 | fixed-pending-review |
| 来源 | MultiAgent v0.2 产品验收 |
| 发现日期 | 2026-06-01 |
| 关联 SPEC | `product/planning/features/multiagent/specs/v0.2-codex-orchestration.md` |
| 关联验收 | `product/planning/features/multiagent/acceptance/2026-06-01-v0.2-acceptance-report.md` |
| 负责人 | development lane |

## 现象

- 用户可见表现：`multiagent instruct --yes` 有时返回 `host_delivery.status: sent`，但后续读取目标 thread 时，该 turn 可能是 `interrupted`。
- 期望表现：如果返回状态让用户理解为“已交付”，目标 thread 应至少能继续执行；如果不能保证完成，应明确标记为未完成 / 未验证。
- 实际表现：一次默认 timeout 验收中，`instruct` 返回 `sent` 和 `verification_warning: Codex app-server did not return response 5`；随后 `read development --turns 3` 看到该 turn 状态为 `interrupted`。

## 证据

默认 timeout 执行：

```bash
starwork multiagent instruct development --from product-planning --message "验收复测..." --target <tmp> --json --yes
```

返回：

```json
{
  "host_delivery": {
    "status": "sent",
    "verified_by_thread_read": false,
    "verification_warning": "Codex app-server did not return response 5"
  }
}
```

随后读取目标 thread，最近 turns 中出现：

```json
{
  "id": "019e83cb-4127-7420-88dc-011e8771db4e",
  "status": "interrupted"
}
```

使用更长 timeout 复测：

```bash
starwork multiagent instruct development --from product-planning --message "验收复测二..." --target <tmp> --json --yes --timeout 90000
```

返回 `completed`，随后读取目标 thread 可见 completed turn。

## 影响范围

- 影响的功能：`multiagent instruct`。
- 影响的用户：使用跨会话指令自动驱动其他 lane 的用户。
- 是否影响发布 / 升级 / A 测：不阻塞 `launch` 修复验收，但建议在对外 A 测前优化。
- 是否有绕行方式：用户可显式传 `--timeout 90000`，并在返回 `sent` 时手动 `read <lane>` 确认。

## 初步判断

`sent` 目前表示 `turn/start` 已返回，但没有观察到 `turn/completed` 或最终 `thread/read`。在真实 Codex app-server 中，过早关闭连接可能导致目标 turn interrupted，因此这个状态对用户来说不够安全。

## 下一步

- 默认 `instruct` timeout 可考虑从 30000 调整到 90000，与 `launch` 对齐。
- 如果没有观察到 `turn/completed`，返回状态改为更保守的 `started_unverified` / `pending`，并明确提示需要 `multiagent read <lane>` 复核。
- 增加回归测试：`sent` / 未完成场景下，不应让用户误判为稳定交付。

## 处理结果

2026-06-02 development lane 已完成修复：

- `multiagent instruct` 默认等待时间从 30 秒提升到 5 分钟，避免默认情况下过早关闭 app-server 连接。
- `sendCodexInstruction()` 未观察到 `turn/completed` 时，不再返回 `sent`，改为 `started_unverified`。
- `started_unverified` 会写入 shared context 和 `.starwork/agent-lanes/state.json`，并附带 `verification_warning`，提醒必须用 `multiagent read <lane>` 复核。
- `launch` 新建 Codex thread 时显式使用 `sandbox: "workspace-write"` 和 `approvalPolicy: "on-request"`，避免由 launch 创建的 lane thread 因 read-only sandbox 卡在 worklog 更新等步骤。
- `starworkMultiagent` skill 已补充 `started_unverified` 的处理规则：不能把它解释成已完成交付，必须继续读取目标 lane。
- CLI help 已标注 `instruct --timeout` 默认等待 300000ms。

## 开发复验

- `node --check cli/src/cli.js && node --check cli/test/init.test.js` 通过。
- `node --test cli/test/init.test.js` 通过：72 个测试全部通过。
- 真实 Codex app-server 临时项目复验通过：默认 `multiagent instruct --yes --json` 返回 `host_delivery.status: completed`，`verified_by_thread_read: true`；随后 `multiagent read development --turns 2 --json` 显示目标 instruct turn 为 `completed`。

## 验收方式

- 默认 `instruct --yes --json` 对简单消息应返回 `completed`。
- 若无法完成，返回状态必须明确表示未完成 / 未验证。
- 目标 thread 不应因为 CLI 关闭而稳定变成 `interrupted`。
