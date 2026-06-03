# ISSUE-005：MultiAgent 在非 StarWork 项目初始化时生成 AGENTS 副本而非合并入口

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

- 用户可见表现：用户在非 StarWork 标准项目中使用 multiagent 创建 Agent 团队时，Agent 发现当前项目不是 StarWork 后进行了初始化，但没有合并既有 `AGENTS.md`。
- 期望表现：初始化 multiagent 协作层时，应保证主入口规则可被后续 Agent 正常读取。已有 `AGENTS.md` 时，要么安全合并，要么让主入口显式引用 StarWork sidecar，要么停下来让用户确认。
- 实际表现：目标项目同时存在 `AGENTS.md` 和 `AGENTS.starwork-new.md`。原 `AGENTS.md` 仍是默认入口，`AGENTS.starwork-new.md` 没有被主入口引用，形成无人读取的副本。

## 证据

关联会话：

```text
019e8c1e-2749-7ab2-baef-197541c6bc29
```

目标项目：

```text
/Users/shuxinding/satellite-personal-todos
```

目标项目实际文件状态：

```text
AGENTS.md
AGENTS.starwork-new.md
README.md
README.starwork-new.md
_系统/协作/agent-lanes.md
```

检查结果：

```bash
find /Users/shuxinding/satellite-personal-todos -maxdepth 3 \
  \( -iname 'AGENTS*' -o -path '*/协作/*' -o -path '*/agent-lanes.md' \) -print
```

返回包含：

```text
/Users/shuxinding/satellite-personal-todos/AGENTS.md
/Users/shuxinding/satellite-personal-todos/AGENTS.starwork-new.md
/Users/shuxinding/satellite-personal-todos/_系统/协作/agent-lanes.md
```

## 影响范围

- 影响的功能：`starwork multiagent`、`starworkMultiagent`、非标准项目初始化、Host Adapter / AGENTS 入口策略。
- 影响的用户：在已有项目中启用 MultiAgent 的用户，尤其是已有自定义 `AGENTS.md` 的用户。
- 是否影响发布 / 升级 / A 测：影响 A 测。该问题会造成 Agent 入口规则分裂，降低用户对 multiagent 初始化安全性的信任。
- 是否有绕行方式：用户可以手动合并 `AGENTS.starwork-new.md` 到 `AGENTS.md`，但这不应成为默认流程。

## 初步判断

- multiagent 在非 StarWork 项目中触发初始化或适配时，沿用了“保护用户原文件、生成 sidecar”的策略，但没有保证主入口引用 sidecar。
- 对于 multiagent 团队创建场景，仅生成副本不够；后续 Agent 默认读主入口，导致 StarWork 协作规则可能失效。
- 该问题与 Host Adapter 的 sidecar 策略相关，但触发入口是 multiagent 团队创建，应单独跟踪。

## 分流结果

- 是否转 SPEC：暂不新建 SPEC，先关联 MultiAgent v0.2 Codex orchestration SPEC。
- 是否转 GitHub：否，先走本地 issue。
- 是否转开发 lane：是。
- 是否需要用户补信息：否，已有会话 ID 和目标项目状态。

## 下一步

development lane 复核并修复：

1. 在已有 `AGENTS.md` 的非 StarWork 项目中执行 multiagent 团队创建时，不能留下无人读取的 `AGENTS.starwork-new.md`。
2. 如果可以安全合并，应将 StarWork 必需入口规则合并进主 `AGENTS.md`。
3. 如果不能安全合并，主 `AGENTS.md` 必须显式引用 sidecar，或流程停下来请求用户确认。
4. `doctor` 或 `multiagent status` 应能提示存在 sidecar 但主入口未引用的风险。

## 验收方式

- 验收条件 1：已有 `AGENTS.md` 的非 StarWork 项目启用 multiagent 后，不会出现无人读取的 `AGENTS.starwork-new.md`。
- 验收条件 2：若生成 sidecar，主 `AGENTS.md` 必须引用它，或命令 / skill 明确停在待用户确认状态。
- 验收条件 3：有回归 fixture 覆盖已有 `AGENTS.md` 的项目启用 multiagent。
- 关闭标准：development lane 修复并通过对应测试 / 真实项目复验。

## 处理结果

2026-06-03 development lane 已完成修复：

- `multiagent launch` 在非 StarWork 目标上会拒绝执行；产品流程上应由 `starworkInit` Skill 接管标准接入，而不是让用户直接运行 CLI。
- 非 StarWork 目标不会被 MultiAgent 局部初始化，不会生成 `AGENTS.starwork-new.md`。
- `starworkMultiagent` Skill 已明确边界：普通项目必须先走 `starworkInit`，MultiAgent 只负责已有 StarWork 工作台内的团队协作。
- 新增回归测试 `multiagent launch refuses non-StarWork targets without sidecar initialization`。

## 产品复验

2026-06-03 product-planning lane 复验通过：

- 手工创建只有 `AGENTS.md` 的普通目录后执行 `multiagent launch development --json --yes`，命令返回失败，且复验目录中未生成 `AGENTS.starwork-new.md`。
- 补充产品口径：非 StarWork 目录的下一步应是进入 `starworkInit` Skill 接入流程，由 Skill 采访用户、选择方案并在确认后调用 CLI；不能把直接运行 `starwork init` CLI 当成完整用户流程。
- 复验目录中只保留原始 `AGENTS.md`，未生成 `AGENTS.starwork-new.md`。
- `node --check cli/src/cli.js` 通过。
- `node --check cli/test/init.test.js` 通过。
- `node --test cli/test/init.test.js --test-name-pattern 'multiagent launch'` 通过。
- `npm test` 通过：86/86。

## 关闭结论

`ISSUE-005` 已关闭。修复口径从“MultiAgent 合并 AGENTS”调整为“MultiAgent 不绕过 starworkInit 做局部初始化”，与 v0.3 SPEC 一致。
