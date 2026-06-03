# ISSUE-009：非 StarWork 目录的 MultiAgent 引导应转入 starworkInit Skill，而不是直接提示运行 CLI

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | skill / cli / workflow |
| 优先级 | P2 |
| 状态 | closed |
| 来源 | 用户反馈 / 产品验收 |
| 发现日期 | 2026-06-03 |
| 关联 GitHub Issue | 无 |
| 关联 SPEC | `product/planning/features/multiagent/specs/v0.3-team-onboarding-fix.md` |
| 关联验收 | `product/planning/issues/ISSUE-005.md` |
| 负责人 | development lane |

## 现象

- 用户可见表现：在非 StarWork 目录执行 MultiAgent 团队创建时，当前 CLI / 文档容易把下一步表达成“运行 `starwork init`”。
- 期望表现：普通目录接入 StarWork 应由 `starworkInit` Skill 接管。Skill 负责采访用户、选择工作台类型、选择 Pack、处理已有规则入口，并在用户确认后调用 CLI。
- 实际表现：MultiAgent 相关验收记录和部分引导仍残留 CLI 直跑口径，容易让 Agent 跳过 `starworkInit` 的友好交互和安全接入流程。

## 证据

用户反馈：

```text
刚刚我注意到非 StarWork 目录执行时，应该运行的是starworkinit这个skill而不是cli
```

已同步修正的产品文档：

```text
product/skills/starworkMultiagent/SKILL.md
product/planning/features/multiagent/specs/v0.3-team-onboarding-fix.md
product/planning/issues/ISSUE-005.md
```

## 影响范围

- 影响的功能：`starworkMultiagent`、`starworkInit`、`multiagent launch` 非 StarWork 目标引导、A 测新用户 onboarding。
- 影响的用户：在已有普通项目中首次启用 StarWork / MultiAgent 的用户。
- 是否影响发布 / 升级 / A 测：影响 A 测体验，但不阻断已有 StarWork 工作台内的 MultiAgent 使用。
- 是否有绕行方式：Agent 可以手动调用 `starworkInit` Skill，但如果文案继续提示 CLI，容易再次走错。

## 初步判断

CLI 可以拒绝非 StarWork 目录，但不应把“运行 `starwork init`”当成完整用户下一步。更合适的产品口径是：

```text
请让 Agent 使用 starworkInit Skill 帮你完成 StarWork 接入；CLI 只作为 Skill 确认方案后的执行工具。
```

## 分流结果

- 是否转 SPEC：已补入 MultiAgent v0.3 SPEC。
- 是否转 GitHub：否，先走本地 issue。
- 是否转开发 lane：是。
- 是否需要用户补信息：否。

## 下一步

development lane 复核并修正：

1. 检查 `multiagent launch` 非 StarWork 目标的 CLI 报错文案，避免只提示直接运行 `starwork init`。
2. 检查 `starworkMultiagent` Skill 发布包和已安装版本，确保非 StarWork 分支转入 `starworkInit` Skill。
3. 检查 A 测指南、README 或相关安装文档是否还有“直接运行 CLI 接入普通项目”的残留。

## 验收方式

- 验收条件 1：非 StarWork 目录触发 MultiAgent 团队创建时，Skill 输出会转入 `starworkInit` Skill 接入流程。
- 验收条件 2：CLI 如需报错，应表达“当前目录还不是 StarWork 工作台”，并提示通过 Agent / `starworkInit` 完成接入，而不是把一条 CLI 命令包装成完整流程。
- 验收条件 3：产品文档、Skill 源文件和发布包口径一致。
- 关闭标准：development lane 修复文案 / Skill 发布包并通过复验。

## Development 处理记录

2026-06-03 development lane 已修复：

- `requireWorkspaceRoot` 和 `doctor` 非 StarWork 报错改为提示使用 Agent 的 `starworkInit` Skill 完成接入，CLI 仅作为确认方案后的执行工具。
- `starworkMultiagent` Skill 的非 StarWork 分支改为转入 `starworkInit` Skill，不再把 `starwork init --target ...` 当成完整用户流程。
- A 测指南和 README 已同步 MultiAgent / Host Adapter 新口径。
- 回归测试覆盖：非 StarWork 目标 `multiagent launch` 不生成 `AGENTS.starwork-new.md`，stderr 包含 `starworkInit` 且不再提示“请先运行 starwork init”。

验证：`npm test` 通过 90/90。

## 产品复验

2026-06-03 product-planning lane 复验通过，`ISSUE-009` 关闭。

复验结论：

- 非 StarWork 目录执行 `multiagent launch` 会拒绝执行。
- CLI 报错明确提示使用 Agent 的 `starworkInit` Skill 完成接入，CLI 只作为确认方案后的执行工具。
- 非 StarWork 目录不会生成 `AGENTS.starwork-new.md`。
- `starworkMultiagent` Skill 已明确：普通项目先转入 `starworkInit`，不得用 `multiagent init/add/launch` 做局部初始化。
- README、A 测指南和 Skills README 的口径已从“直接运行 CLI 接入”收敛为 Skill 引导 + CLI 执行。

复验结果：

- 非 StarWork 目录命令返回失败，stderr 包含 `starworkInit`。
- `npm test` 通过 90/90。
