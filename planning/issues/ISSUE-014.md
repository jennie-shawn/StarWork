# ISSUE-014：MultiAgent 创建流程不应额外生成 AGENTS.starwork.md 和 README.starwork-new.md

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | cli / skill / workflow |
| 优先级 | P1 |
| 状态 | closed |
| 来源 | GitHub Issue #3 / 用户反馈 |
| 发现日期 | 2026-06-04 |
| 关联 GitHub Issue | <https://github.com/jennie-shawn/StarWork/issues/3> |
| 关联 SPEC | `product/planning/features/multiagent/specs/v0.5-skill-owned-agent-docs.md` |
| 关联验收 | 无 |
| 负责人 | development lane |

## 现象

- 用户可见表现：在已有项目中按 MultiAgent 创建 / 绑定流程操作后，工作区额外出现 `AGENTS.starwork.md` 和 `README.starwork-new.md`。
- 期望表现：用户目标是“创建 MultiAgent / 绑定当前会话为某个职责 lane”时，流程不应默认产生这两个额外文件。若目标目录尚未初始化为 StarWork 工作台，应明确预览和确认会产生哪些入口文件或 README 副本。
- 实际表现：流程先判断目标项目不是 StarWork 工作台，随后执行 `starwork init --type project --pack general --language zh --adapter codex --target ... --yes`，最终生成了额外的 adapter 入口和 README 副本。

## 证据

GitHub Issue：

```text
https://github.com/jennie-shawn/StarWork/issues/3
```

用户提供的复现目标项目：

```text
/Users/gouzi/dingshuxinRepo/ai-discussion
```

用户提供的执行流程：

```bash
starwork doctor --target /Users/gouzi/dingshuxinRepo/ai-discussion --json
starwork init --type project --pack general --language zh --adapter codex --target /Users/gouzi/dingshuxinRepo/ai-discussion --yes
starwork multiagent init/add/bind ...
```

实际出现的额外文件：

```text
AGENTS.starwork.md
README.starwork-new.md
```

GitHub issue 中的关键说明：

```text
在用户目标是“创建 MultiAgent / 绑定当前会话为某个职责 lane”时，流程不应默认产生上述两个额外文件。
```

## 影响范围

- 影响的功能：`starworkMultiagent`、`starwork init --adapter codex`、MultiAgent onboarding、非 StarWork 项目接入流程。
- 影响的用户：在已有代码仓库中只想启用 MultiAgent 职责位 / lane binding 的用户。
- 是否影响发布 / 升级 / A 测：影响 A 测。该问题会污染用户工作区，让用户误以为 MultiAgent 流程修改了项目入口规则或生成了不应提交的文档副本。
- 是否有绕行方式：用户可以手动删除副本或不用 `--adapter codex` 初始化，但这要求用户理解内部初始化边界，不适合作为正式路径。

## 初步判断

- `starworkMultiagent` 在非 StarWork 目标目录上把“创建 / 绑定 lane”的用户意图升级成完整 `starwork init --adapter codex --yes`。
- 完整 init 会触发 adapter sidecar 和 README 冲突保护逻辑，导致 `AGENTS.starwork.md` / `README.starwork-new.md` 出现。
- 该问题与 `ISSUE-005` 和 `ISSUE-009` 相关，但本 issue 的重点是：MultiAgent 创建 / 绑定流程不应在未明确确认的情况下生成 adapter / README 副本。

## 分流结果

- 是否转 SPEC：已转入 `product/planning/features/multiagent/specs/v0.5-skill-owned-agent-docs.md`。
- 是否转 GitHub：已有关联 GitHub Issue #3。
- 是否转开发 lane：是。
- 是否需要用户补信息：暂不需要，GitHub issue 已包含目标项目、命令和实际文件。

## 下一步

development lane 按 v0.5 SPEC 修复：

1. 明确产品原则：CLI 只生成工作台结构、机器可验证状态和 AI 入口文档草稿；最终 `AGENTS.md` / `CLAUDE.md` / Cursor rules / Trae rules 由 Skill 读取项目上下文后生成或整合。
2. `starwork init` / `starwork adapt` 在已有非空项目中不得默认生成根入口 sidecar 或 `.starwork-new` 文档副本；默认生成 `.starwork/drafts/agent-docs-plan.json` 和 proposed 草稿。
3. `starworkInit` 接管最终 AI 入口文档整合：读取已有 `AGENTS.md` / `README.md` / 项目上下文和 CLI 草稿，用户确认整合结果后再写最终入口。
4. `starworkMultiagent` 在非 StarWork 项目或入口文档 `pending_merge` 时不得继续 `init/add/bind/launch`。
5. `doctor --host` 能解释 AI 入口文档 `pending_merge` / draft 状态。

## 验收方式

- 验收条件 1：在已有非 StarWork 项目中执行 MultiAgent 创建 / 绑定流程，未经用户确认最终整合结果前，不生成 `AGENTS.starwork.md`、`AGENTS.starwork-new.md` 或 `README.starwork-new.md`。
- 验收条件 2：CLI 默认生成 `.starwork/drafts/agent-docs-plan.json` 和 proposed 草稿，不把 AI 入口文档草稿当作最终入口。
- 验收条件 3：`starworkInit` 明确接管最终 `AGENTS.md` 整合；`starworkMultiagent` 不再把完整 `init --adapter codex --yes` 当作非 StarWork 项目的直接下一步。
- 验收条件 4：`doctor --host` 能报告并解释 adapter / AI 入口文档 `pending_merge` 状态。
- 验收条件 5：有回归测试或真实项目复验覆盖已有 `AGENTS.md` / `README.md` 的非 StarWork 项目。
- 关闭标准：development lane 按 v0.5 SPEC 修复并通过测试 / 真实项目复验，同时在 GitHub Issue #3 回填处理结果。

## 产品复验记录

2026-06-04 product-planning lane 复验暂不通过。

已通过项：

- `node --check cli/src/cli.js` 通过。
- `node --check cli/test/init.test.js` 通过。
- 目标回归测试通过：`node --test cli/test/init.test.js --test-name-pattern 'agent-docs|pending merge|overwrite existing user files|adapt creates a Claude adapter|adapt does not overwrite user-authored Claude rules|multiagent launch refuses non-StarWork'`，98/98。
- 全量 `npm test` 通过，98/98。
- 手工复验已有普通项目包含 `AGENTS.md`、`README.md`、`package.json` 后执行 `starwork init --type project --pack general --language zh --adapter codex --target <dir> --yes`：
  - 未生成 `AGENTS.starwork.md`。
  - 未生成 `AGENTS.starwork-new.md`。
  - 未生成 `README.starwork-new.md`。
  - 已生成 `.starwork/drafts/AGENTS.proposed.md`、`.starwork/drafts/README.proposed.md`、`.starwork/drafts/adapter.codex.proposed.md`、`.starwork/drafts/agent-docs-plan.json`。
  - `.starwork/adapters.json` 中 `codex.enabled` 为 `false`，`rules_entry_status` 为 `pending_merge`。
  - `doctor --host codex --json` 报告 `agent_docs.plan.pending` 和 `adapter.codex.rules.pending_merge` warning。
  - `multiagent init --target <dir> --yes` 被阻断，stderr 明确提示先使用 `starworkInit` 整合入口文档。

阻塞项：

1. `starwork init --type project --pack general --language zh --adapter codex --target <existing-project> --dry-run` 没有预览 AI 入口文档草稿和 pending merge 结果。当前 dry-run 只显示普通工作台结构文件，并只提示“初始化完成后将继续适配 AI 工具：codex”；未列出 `.starwork/drafts/AGENTS.proposed.md`、`.starwork/drafts/README.proposed.md`、`.starwork/drafts/adapter.codex.proposed.md` 或 `.starwork/drafts/agent-docs-plan.json`。这不满足 v0.5 SPEC 中“如流程需要初始化工作台，dry-run / 预览必须明确列出入口草稿、adapter 入口和 README 冲突处理”的要求。
2. 空目录默认初始化仍直接写最终 `AGENTS.md` / `README.md`，没有进入 `draft`。v0.5 SPEC 默认表写的是空目录也默认为 `draft`；SPEC 允许 development lane 分阶段保留空目录写最终入口，但必须在实现记录或 SPEC 中标注为兼容过渡。当前未见该兼容说明。此项不直接阻塞 ISSUE-014 的复现路径，但需要在修复回合中明确取舍。

复验结论：

- 当前实现已经解决了 `ISSUE-014` 的主要污染结果，但尚未满足 v0.5 的预览 / 确认原则。
- `ISSUE-014` 保持 `failed-review`，development lane 需补齐 `init --dry-run --adapter` 的 agent docs / adapter draft 预览，或调整实现使 dry-run 能完整呈现后再申请复验。

## 二次产品复验

2026-06-04 product-planning lane 二次复验通过，`ISSUE-014` 关闭。

新增通过项：

- `starwork init --type project --pack general --language zh --adapter codex --target <existing-project> --dry-run` 已能预览 AI 入口文档草稿和 pending merge 状态。
- dry-run 输出包含：
  - `.starwork/drafts/AGENTS.proposed.md`
  - `.starwork/drafts/README.proposed.md`
  - `.starwork/drafts/adapter.codex.proposed.md`
  - `.starwork/drafts/agent-docs-plan.json`
  - `AI 入口文档状态：pending_merge`
- dry-run 不写入任何新文件，复验目录中仍只有用户原有 `AGENTS.md` / `README.md`。
- 已有普通项目正式执行 `init --adapter codex --yes` 后，不生成 `AGENTS.starwork.md`、`AGENTS.starwork-new.md`、`README.starwork-new.md`，只生成 `.starwork/drafts/*` 和 adapter `pending_merge`。
- `doctor --host codex --json` 报告 `agent_docs.plan.pending` 和 `adapter.codex.rules.pending_merge` warning。
- `multiagent init --target <dir> --yes` 在 pending merge 状态下被阻断，并提示先使用 `starworkInit` 整合入口文档。

验证命令：

```bash
node --check cli/src/cli.js
node --check cli/test/init.test.js
node --test cli/test/init.test.js --test-name-pattern 'agent-docs|pending merge|overwrite existing user files|adapt creates a Claude adapter|adapt does not overwrite user-authored Claude rules|multiagent launch refuses non-StarWork'
npm test
git diff --check
```

验证结果：

- `node --check cli/src/cli.js` 通过。
- `node --check cli/test/init.test.js` 通过。
- 目标回归测试通过，99/99。
- 全量 `npm test` 通过，99/99。
- `git diff --check` 通过。

非阻塞观察：

- 空目录默认初始化仍直接写最终 `AGENTS.md` / `README.md`。这与 v0.5 默认 draft 原则存在方向差异，但不影响 `ISSUE-014` 的已有项目 / MultiAgent onboarding 复现路径；后续如要彻底贯彻“空目录也由 Skill 生成最终入口”，建议另开 issue 或作为 v0.6 入口文档体验优化处理。

关闭结论：

`ISSUE-014` 已关闭。当前实现满足：已有项目不会在 MultiAgent onboarding 中未经确认生成根入口 sidecar 或 README 副本；CLI 会生成 AI 入口文档草稿和 plan；MultiAgent 在 pending merge 前不会继续创建 / 绑定 lane。
