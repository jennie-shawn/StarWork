# ISSUE-023：Init / Doctor 缺少面向 MultiAgent-only 用户的友好起步

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | skill / cli / docs / onboarding / workflow |
| 优先级 | P1 |
| 状态 | closed |
| 来源 | product-mainflow review / 运营 Agent 优化建议 / MultiAgent 发布路径 |
| 发现日期 | 2026-06-15 |
| 关联 GitHub Issue | 无 |
| 关联 SPEC | `product/planning/features/mainflow/specs/v0.1-init-doctor-multiagent-onboarding.md` |
| 关联验收 | `_系统/协作/lanes/product-lead/workspace/2026-06-16-mainflow-v0.1-issue023-acceptance.md` |
| 负责人 | product-lead lane |

## 现象

- 用户可见表现：用户从“想开启多 AI 协作”进入 StarWork 时，会被 `starworkInit` / `starworkDoctor` 带回较工程化的初始化或诊断语言，难以判断这一步和创建多 AI 分工有什么关系。
- 期望表现：Init / Doctor 应先解释“这是多 AI 协作前的安全接入”，再用最少提问补齐项目入口、当前任务和写入边界，并清楚区分检查、预览、写入、整合和复查。
- 实际表现：MultiAgent v0.9 已经完成“AI 岗位”友好引导，但 Init / Doctor 尚未完整承接同一体验标准。

## 证据

```text
product-mainflow 已提交 lane 草案：

- _系统/协作/lanes/product-mainflow/workspace/init-doctor-friendly-onboarding-spec-draft.md
- _系统/协作/lanes/product-mainflow/workspace/init-doctor-friendly-onboarding-dev-handoff.md

product-lead 已将草案晋升为正式 SPEC：

- product/planning/features/mainflow/specs/v0.1-init-doctor-multiagent-onboarding.md
```

## 影响范围

- 影响的功能：`starworkInit`、`starworkDoctor`、`starwork` 主入口、CLI `init` / `doctor` 的用户解释层，以及 MultiAgent 非 StarWork 目录回流体验。
- 影响的用户：从 MultiAgent 入口进入 StarWork 的小白用户、A 测用户、只安装 CLI + Skills 的 Agent 用户。
- 是否影响发布 / 升级 / A 测：影响 MultiAgent 发布后的首轮 A 测体验，优先级 P1。
- 是否有绕行方式：熟悉 StarWork 的用户可按现有 Init / Doctor 流程继续，但小白用户需要人工解释。

## 初步判断

这是主流程体验缺口，不是 MultiAgent v0.8 / v0.9 线程工具边界问题。第一阶段应优先改 Skill 文案、流程约束、文档和文本扫描测试；如 Skill 难以稳定判断，再由 CLI 增补 `doctor --json` 的 MultiAgent preflight 事实结构。

## 分流结果

- 是否转 SPEC：是，已转 `Mainflow v0.1` SPEC。
- 是否转 GitHub：暂不需要。
- 是否转开发 lane：已转 development lane，request id：`REQ-20260616-013740Z-product-lead`。
- 是否需要用户补信息：暂不需要。

## 下一步

已关闭：development lane 已按 `Mainflow v0.1` SPEC 完成实现，product-lead 复验通过。

## 验收方式

- `starworkInit` MultiAgent 回流第一屏讲清“多 AI 协作前先补齐项目入口、当前任务和写入边界”，并明确确认前不会改业务内容。
- `starworkInit` 默认只问最小必要问题，不主动展开知识库、Pack、Capability、复杂目录定制或多宿主适配。
- 已有项目 dry-run 前明确保护业务代码和已有 AI 规则文件，写入后如存在 pending merge，不能误报 AI 入口已最终生效。
- `starworkDoctor` 输出 MultiAgent preflight 结论层，首屏先回答能否继续开启多 AI 协作、这次是否改文件、下一步是什么。
- Doctor 检查阶段必须说明只读，不自动 repair / upgrade。
- 缺失项必须翻译成用户影响，例如“另一个 AI 接手时可能不知道当前目标”，不能只输出内部检查名。
- 测试中增加 `starworkInit` / `starworkDoctor` 文案扫描，确保友好起步关键词存在，且小白第一屏不出现 `adapter profile`、`host_native_dirs`、`rules_entry_status` 等内部词。
- 回归验证至少包括 `node --check product/cli/src/cli.js`、`node --check product/cli/test/init.test.js`、`git -C product diff --check`、目标测试和 `npm test`。

## 验收记录

2026-06-16 product-lead 复验通过。

验收结论：

- `starworkInit` MultiAgent-only 回流第一屏已覆盖多 AI 协作前的安全接入解释、项目目标、当前任务、可整理或修改范围、确认前不改业务内容和不覆盖已有 AI 规则文件。
- `starworkInit` 快速起步默认只问目标目录、新建或已有、语言和主要 AI 工具；不默认展开知识库、Pack、Capability、复杂目录定制或多宿主适配。
- 已有项目和 pending merge 话术已区分“工作台骨架已写入”和“AI 入口尚未最终生效”。
- `starworkDoctor` 已新增 MultiAgent preflight 结论层，明确准备度、文件影响和下一步建议。
- Doctor 检查阶段明确只读，不自动 repair / upgrade / 写入文件。
- 缺失项已翻译成用户影响，覆盖另一个 AI 是否看懂项目、知道当前任务、分清草稿和确认版、理解写入边界。
- 本轮未新增 CLI JSON preflight 字段；实现保持在 Skill / 文档解释层，CLI 行为未变。

验证：

```text
node --check product/cli/src/cli.js：通过
node --check product/cli/test/init.test.js：通过
git -C product diff --check：通过
node --test product/cli/test/init.test.js --test-name-pattern "mainflow|init|doctor|multiagent|friendly|onboarding"：115/115 通过
npm test：115/115 通过
```

关闭标准已满足。
