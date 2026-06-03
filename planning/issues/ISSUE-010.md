# ISSUE-010：MultiAgent 创建 Agent 时应强制使用可读会话命名格式

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | cli / skill / workflow |
| 优先级 | P2 |
| 状态 | closed |
| 来源 | 用户反馈 / 产品补充要求 |
| 发现日期 | 2026-06-03 |
| 关联 GitHub Issue | 无 |
| 关联 SPEC | `product/planning/features/multiagent/specs/v0.3-team-onboarding-fix.md` |
| 关联验收 | `product/planning/issues/ISSUE-007.md` |
| 负责人 | development lane |

## 现象

- 用户可见表现：创建多个 Agent 会话后，如果会话名不规范，用户很难在宿主会话列表中区分哪个会话对应哪个项目、哪个职责。
- 期望表现：StarWork 创建 Agent 时必须生成稳定、可读、可区分的宿主会话名。
- 实际表现：当前已有 `<项目名> <职责名> Agent` 的默认方向，但用户反馈项目名前缀会让会话名过长、重复，命名规则需要改为只表达 Agent 职责。

## 证据

用户补充要求：

```text
还有加个要求，就是创建Agent时，对于会话的命名格式要有个要求
```

## 影响范围

- 影响的功能：`starwork multiagent launch`、未来团队级创建命令、`starworkMultiagent` Skill、Codex / 其他宿主会话命名。
- 影响的用户：使用 MultiAgent 创建多个 Agent 会话的用户。
- 是否影响发布 / 升级 / A 测：影响 A 测体验，但不是阻断性问题。
- 是否有绕行方式：用户可手动改名，但多会话场景成本高且容易混淆。

## 初步判断

命名格式应统一为：

```text
<职责名> Agent
```

核心规则：

- `<职责名>` 优先使用 lane 的可读职责名 / display name，不直接暴露难懂 lane id。
- 中文工作台使用中文职责名；英文工作台使用英文职责名。
- 不在会话名里默认加入项目名；项目归属由 StarWork lane binding、workspace 路径和状态输出表达。
- 不把 thread id、UUID、日期、状态词、`lane`、`session` 等内部词放进用户可见会话名。
- 批量创建时每个会话名必须不同。
- 宿主不支持自动改名时，仍要输出建议会话名，提示用户手动改名。

## 分流结果

- 是否转 SPEC：已补入 MultiAgent v0.3 SPEC。
- 是否转 GitHub：否，先走本地 issue。
- 是否转开发 lane：是。
- 是否需要用户补信息：否。

## 下一步

development lane 复核当前 `buildLaneLaunchSessionName` 和相关测试：

1. 确认默认会话名不再包含项目名或目录名。
2. 确认职责名来源是否优先使用可读职责名，而不是直接使用 lane id。
3. 增加或更新测试，覆盖中文 / 英文工作台、批量创建、命名失败 warning 和建议会话名输出。

## 验收方式

- 验收条件 1：批量创建 Agent 时，每个新会话名符合 `<职责名> Agent`。
- 验收条件 2：中文工作台使用中文职责名，英文工作台使用英文职责名。
- 验收条件 3：会话名不包含项目名、目录名、thread id、UUID、日期、状态词、`lane`、`session` 等内部词。
- 验收条件 4：宿主命名失败时，JSON / 文案仍输出建议会话名。
- 关闭标准：development lane 修复并通过命名相关回归测试。

## Development 处理记录

2026-06-03 development lane 已修复：

- `multiagent launch` 默认会话名由 `<项目名> <职责名> Agent` 改为 `<职责名> Agent`。
- 职责名优先来自 lane `purpose`；为空时才降级到 lane id。
- JSON 和 state 中继续输出 `session_name`，宿主命名失败时仍保留建议名和 `rename_warning`。
- 回归测试覆盖批量创建的中文职责名：`产品规划 Agent`、`功能开发 Agent`，并确认不包含临时目录 / 项目名。

验证：`npm test` 通过 90/90。

## 产品复验

2026-06-03 product-planning lane 复验通过，`ISSUE-010` 关闭。

复验结论：

- `multiagent launch --dry-run --lanes product-planning,development` 默认输出 `产品规划 Agent`、`功能开发 Agent`。
- 默认会话名不包含项目名、目录名、thread id、UUID、日期、状态词、`lane` 或 `session` 等内部词。
- JSON 中保留 `session_name`、`rename_status`、`binding_status`，宿主命名失败时仍可输出建议名与 warning。
- 回归测试覆盖批量创建中文职责名，并断言不包含临时目录 / 项目名。

复验结果：

- dry-run JSON 的 `session_name` 符合 `<职责名> Agent`。
- `npm test` 通过 90/90。
