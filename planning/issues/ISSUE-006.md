# ISSUE-006：MultiAgent 创建团队只生成 lane，没有创建和绑定独立会话

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | cli / skill / workflow |
| 优先级 | P1 |
| 状态 | closed |
| 来源 | 用户反馈 / 真实项目 |
| 发现日期 | 2026-06-03 |
| 关联 GitHub Issue | 无 |
| 关联 SPEC | `product/planning/features/multiagent/specs/v0.2-codex-orchestration.md` |
| 关联验收 | 无 |
| 负责人 | development lane |

## 现象

- 用户可见表现：用户尝试使用 multiagent 创建 Agent 团队，但流程只生成 lane，没有自动创建对应独立会话。
- 期望表现：用户说“创建 Agent 团队”时，最终应得到可工作的 Agent 团队。除非用户明确选择只建 lane，否则应创建宿主会话并绑定到对应 lane，或明确说明宿主能力不可用导致无法继续。
- 实际表现：只创建了 `product-planning`、`development`、`feature-research` 三个 lane；当前会话只绑定到 `product-planning`；`development` 和 `feature-research` 仍为 `unbound`。会话最后 Agent 反问用户是否继续创建独立会话。

## 证据

关联会话：

```text
019e8c1e-2749-7ab2-baef-197541c6bc29
```

目标项目：

```text
/Users/shuxinding/satellite-personal-todos
```

会话尾部 Agent 回复摘录：

```text
还没有创建研发 / 功能调研的独立会话。

我已经完成的是：

- 创建三条 Agent lane：`product-planning`、`development`、`feature-research`
- 把当前会话绑定为 `product-planning`
- 同步当前会话名为 `satellite-personal-todos 产品规划 Agent`

`development` 和 `feature-research` 目前只是职责位，还是 `unbound`。
```

目标项目 multiagent 状态：

```bash
starwork multiagent status --target /Users/shuxinding/satellite-personal-todos --json
```

关键结果：

```text
product-planning -> codex:019e8c1e-2749-7ab2-baef-197541c6bc29
development -> unbound
feature-research -> unbound
```

## 影响范围

- 影响的功能：`starworkMultiagent`、`starwork multiagent`、Codex host orchestration、Agent Lanes onboarding。
- 影响的用户：希望一键创建多 Agent 团队的用户。
- 是否影响发布 / 升级 / A 测：影响 A 测。它会让用户以为团队已创建，但实际只有职责位，无法并行工作。
- 是否有绕行方式：用户可以再次要求创建会话，或手动创建 Codex 线程后再 bind，但这违背“创建团队”的直觉。

## 初步判断

- skill 将用户的“创建 Agent 团队”意图降级成了“初始化协作层 + add lane + bind 当前会话”。
- 当前流程没有把“创建团队”与“仅创建 lane”明确区分。
- Codex 环境已经暴露 thread creation / thread steering 能力时，skill 应继续走会话创建和绑定流程；如果不可用，应明确阻塞，而不是把 lane-only 状态当作完成。

## 分流结果

- 是否转 SPEC：暂不新建 SPEC，先关联 MultiAgent v0.2 Codex orchestration SPEC。
- 是否转 GitHub：否，先走本地 issue。
- 是否转开发 lane：是。
- 是否需要用户补信息：否，已有会话 ID 和目标项目状态。

## 下一步

development lane 复核并修复：

1. 明确 `starworkMultiagent` 对“创建 Agent 团队”的解释：默认不止创建 lane，还要创建并绑定宿主会话。
2. 若需要用户确认会话数量、名称或成本，应在执行前一次性确认。
3. Codex 环境下优先调用宿主会话创建能力，创建独立线程后写回 lane binding。
4. 若宿主会话创建不可用，输出必须标记为未完成，并说明哪些 lane 仍为 `unbound`。

## 验收方式

- 验收条件 1：用户请求创建 Agent 团队后，最终 `multiagent status` 中团队成员 lane 不应保持 `unbound`，除非用户明确选择只创建 lane。
- 验收条件 2：如果无法创建宿主会话，skill 输出必须明确说明阻塞原因和未完成 lane。
- 验收条件 3：有验收场景覆盖“创建团队”和“只初始化协作层 / 只新增 lane”的语义差异。
- 关闭标准：development lane 修复并通过真实 Codex 会话创建 / 绑定复验。

## 处理结果

2026-06-03 development lane 已完成修复：

- `starworkMultiagent` Skill 已将“创建 Agent 团队”定义为完整团队流程，不再等同于只创建 lane。
- 团队创建流程要求先新增缺失 lane，再通过 `multiagent launch --lanes ...` 创建并绑定可工作的 Codex sessions。
- `multiagent launch` JSON schema 升级为 `starwork.agent_lanes.launch.v0.3`，逐 lane 输出 `launch_status`、`rename_status`、`binding_status`。
- launch message 未完成时不写入 lane binding，并输出 `binding_status: "unbound"`。
- 新增回归测试覆盖批量 launch 成功绑定、launch 失败不绑定和非 StarWork 目标拒绝执行。

## 产品复验

2026-06-03 product-planning lane 复验通过：

- dry-run 复验健康 StarWork 工作台中批量 launch `product-planning,development`，输出 schema 为 `starwork.agent_lanes.launch.v0.3`，并逐 lane 暴露 `launch_status`、`rename_status`、`binding_status`。
- 回归测试 `multiagent launch names each batch-created Codex thread by lane role` 验证批量 launch 后 state 中写入 lane session 和 session name。
- 回归测试 `multiagent launch does not bind when launch message delivery fails` 验证 launch message 未完成时保持 lane `unbound`。
- `node --check cli/src/cli.js` 通过。
- `node --check cli/test/init.test.js` 通过。
- `node --test cli/test/init.test.js --test-name-pattern 'multiagent launch'` 通过。
- `npm test` 通过：86/86。

## 关闭结论

`ISSUE-006` 已关闭。当前修复已让“创建团队”不再停留在 lane-only 语义；无法创建或未完成绑定时会以 `binding_status` 暴露，不得误报团队完成。
