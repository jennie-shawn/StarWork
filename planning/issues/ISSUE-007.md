# ISSUE-007：MultiAgent 创建会话后没有自动改成对应 Agent 名称

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | cli / skill / workflow |
| 优先级 | P2 |
| 状态 | closed |
| 来源 | 用户反馈 |
| 发现日期 | 2026-06-03 |
| 关联 GitHub Issue | 无 |
| 关联 SPEC | `product/planning/features/multiagent/specs/v0.2-codex-orchestration.md` |
| 关联验收 | 无 |
| 负责人 | development lane |

## 现象

- 用户可见表现：用户让 multiagent 创建会话后，新创建的会话没有自动改名。
- 期望表现：创建某个 Agent 对应的宿主会话后，应自动把会话标题改成对应 Agent 名称，方便用户在会话列表中识别。
- 实际表现：会话创建后没有自动命名成对应 Agent 名称，需要用户额外识别或手动改名。

## 证据

用户原话：

```text
再反馈一个问题，我让他创建会话后，并没有自动给会话改名，理论上来说创建会话后，应该把会话改名成对应的Agent名称
```

关联上下文：

```text
ISSUE-006：MultiAgent 创建团队只生成 lane，没有创建和绑定独立会话
```

该问题与 `ISSUE-006` 同属 multiagent 团队创建体验，但边界不同：`ISSUE-006` 跟踪会话是否被创建和绑定，本 issue 跟踪创建后的宿主会话标题是否按 Agent 名称同步。

## 影响范围

- 影响的功能：`starworkMultiagent`、`starwork multiagent launch` / 团队创建流程、Codex host orchestration、`--session-name` / thread title sync。
- 影响的用户：通过 multiagent 一次创建多个 Agent 会话的用户。
- 是否影响发布 / 升级 / A 测：影响 A 测体验。会话未按 Agent 名称命名，会降低多 Agent 团队可辨识度，但可手动改名绕行。
- 是否有绕行方式：用户可以手动修改会话标题，但多会话团队场景下成本较高，且容易改错。

## 初步判断

- 当前 multiagent 创建 / 绑定流程可能只写入 lane binding，没有在创建宿主会话后调用会话重命名能力。
- 既有 `multiagent bind --session-name` 已具备命名意图，但团队创建流程没有稳定复用该能力，或未在 host thread 创建成功后执行 rename。
- 需要明确 Agent 名称来源：通常应来自 lane display name / session name 规划，而不是仅使用 lane id。

## 分流结果

- 是否转 SPEC：暂不新建 SPEC，先关联 MultiAgent v0.2 Codex orchestration SPEC。
- 是否转 GitHub：否，先走本地 issue。
- 是否转开发 lane：是。
- 是否需要用户补信息：否。

## 下一步

development lane 复核并修复：

1. 梳理 multiagent 创建会话流程中 Agent 名称的来源和格式。
2. 在宿主会话创建成功后，自动调用会话改名能力，将标题改为对应 Agent 名称。
3. 如果改名失败，应输出 warning，但不影响会话创建和 lane binding。
4. 在状态或结果输出中明确显示每个 lane 的会话 ID 和最终会话名。

## 验收方式

- 验收条件 1：multiagent 创建新会话后，Codex 会话标题自动变成对应 Agent 名称。
- 验收条件 2：多个 lane 批量创建时，每个会话都使用各自 Agent 名称，不混用、不留默认标题。
- 验收条件 3：改名失败时有明确 warning，且 lane binding 不被错误回滚。
- 关闭标准：development lane 修复并通过真实 Codex 会话创建 / 改名复验。

## 处理结果

2026-06-03 development lane 已完成修复：

- `multiagent launch` 批量创建 Codex thread 时默认按 `<项目名> <职责名> Agent` 命名。
- JSON 输出逐 lane 包含 `session_name`、`rename_status` 和 `rename_warning`。
- 命名失败时返回 warning，但不回滚成功的 lane binding。
- 新增回归测试覆盖批量命名成功和命名失败 warning。

## 产品复验

2026-06-03 product-planning lane 复验通过：

- dry-run 复验显示 `product-planning` lane 默认命名为 `<临时项目名> 产品规划 Agent`，`development` lane 默认命名为 `<临时项目名> 功能开发 Agent`。
- 回归测试 `multiagent launch names each batch-created Codex thread by lane role` 验证每个 lane 使用各自 Agent 名称，并写入 `.starwork/agent-lanes/state.json`。
- 回归测试 `multiagent launch warns when host session rename fails after creation` 验证改名失败时 `rename_status: "warning"`，且 lane binding 保持 `bound`。
- `node --check cli/src/cli.js` 通过。
- `node --check cli/test/init.test.js` 通过。
- `node --test cli/test/init.test.js --test-name-pattern 'multiagent launch'` 通过。
- `npm test` 通过：86/86。

## 关闭结论

`ISSUE-007` 已关闭。批量创建会话时已有默认 Agent 名称；命名失败时可见 warning，不影响成功绑定。

## 后续校准

2026-06-03 product-planning lane 根据用户反馈调整命名格式。

`ISSUE-007` 关闭时验证的是“会话会自动命名”这个能力本身；当时使用的 `<项目名> <职责名> Agent` 格式已不再作为最新产品口径。

最新命名格式以 `ISSUE-010` 为准：

```text
<职责名> Agent
```

会话名不默认加入项目名或目录名；项目归属由 StarWork lane binding、workspace 路径和状态输出表达。
