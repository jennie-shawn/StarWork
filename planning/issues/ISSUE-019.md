# ISSUE-019：doctor 应检查必需 Kit Skills 并给出安全修复指引

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | cli / core / kit-pack / skill |
| 优先级 | P1 |
| 状态 | closed |
| 来源 | GitHub Issue #7 |
| 发现日期 | 2026-06-10 |
| 关联 GitHub Issue | <https://github.com/jennie-shawn/StarWork/issues/7> |
| 关联 SPEC | `product/planning/features/workspace-doctor/specs/v0.1-required-kit-skills-and-preserve-names-paths.md` |
| 关联验收 | 2026-06-13 product-planning 复验通过 |
| 负责人 | development lane |

## 现象

- 用户可见表现：Hub 工作区缺少 Kit 自带 Skills 时，`starwork doctor` 仍可能报告结构健康或 strict OK。
- 期望表现：`doctor` 应根据 `workspace_type`、`kit`、已安装 Pack 和启用能力检查必需 Skill，并提示安全修复路径。
- 实际表现：`doctor` 只检查通用 Skill manifest / mount 信息；如果 `.starwork/skills.json` 为空，它不会发现 Hub Kit 必需的 `starworkSpawn`、`starworkAudit` 缺失。

## 证据

GitHub Issue：

```text
https://github.com/jennie-shawn/StarWork/issues/7
```

真实发现的 preserve-names Hub 工作区缺失：

```text
skills/starworkSpawn
skills/starworkAudit
.agents/skills/starworkSpawn
.agents/skills/starworkAudit
.claude/skills/starworkSpawn
.claude/skills/starworkAudit
```

同时：

```text
.starwork/skills.json existed but had skills: []
```

`starwork doctor` 没有指出该 Hub 缺少用于 Agent 工作流的 Hub Kit Skills。

## 影响范围

- 影响的功能：`starwork doctor`、Hub Kit、Project Kit、Kit-bundled Skills、Skill mount 检查、repair 指引。
- 影响的用户：使用 Hub 创建项目工作台、审计项目中心或升级 preserve-names Hub 的用户。
- 是否影响发布 / 升级 / A 测：影响 Hub 可用性诊断。结构检查通过但关键 Agent 工作流无法运行，会削弱 doctor 的可信度。
- 是否有绕行方式：用户可人工检查 Skills，但新用户和 Agent 很难知道哪些 Kit Skills 是必需项。

## 初步判断

Kit-bundled Skills 是工作区行为的一部分，`doctor` 不能只验证“已声明的 Skills 是否挂载正常”，还需要验证“该 workspace/kit 必须具备的 Skills 是否存在和挂载”。CLI 已有 `KIT_BUNDLED_SKILLS` 信息，可作为 required skills 检查的事实源之一。

## 分流结果

- 是否转 SPEC：已转入 `product/planning/features/workspace-doctor/specs/v0.1-required-kit-skills-and-preserve-names-paths.md`；如后续涉及自动 repair 命令形态，再另起 SPEC。
- 是否转 GitHub：已有关联 GitHub Issue #7。
- 是否转开发 lane：需要。
- 是否需要用户补信息：暂不需要，GitHub issue 已包含缺失清单、期望 JSON 输出和修复方向。

## 下一步

development lane 需要为 `doctor` 增加 required Kit Skills 检查：

1. 根据 `workspace_type`、`kit`、Pack 和 capability 推导 required skills。
2. 对 Hub Kit 至少检查 `starworkSpawn` 和 `starworkAudit`。
3. 检查 source、`.starwork/skills.json` manifest、host mounts 和 Skill frontmatter。
4. JSON 输出暴露 `skills.required[]`，包含 status、expected source path、expected mounts 和 repair hint。
5. 缺失 required Skill 时，默认 warn，`--strict` 下按产品口径决定是否 fail。

## 验收方式

- 验收条件 1：Hub Kit 缺少 `starworkSpawn` 或 `starworkAudit` 时，`doctor` 明确输出 required Skill 缺失。
- 验收条件 2：`.starwork/skills.json` 为空时，`doctor` 仍能基于 kit 推导必需 Skill，而不是静默通过。
- 验收条件 3：JSON 输出包含可机器读取的 `skills.required[]` 检查结果和安全修复提示。
- 验收条件 4：`doctor` 只给出修复指引，不静默修改工作区，也不鼓励全局安装 Kit-bundled Skills。
- 关闭标准：实现 required Kit Skills 检查，覆盖 Hub Kit 缺失 / 完整两类测试，并通过一次 preserve-names Hub smoke。

## 处理记录

- 2026-06-13：development lane 按 Workspace Doctor v0.1 完成实现。Hub Kit required skills 从 `KIT_BUNDLED_SKILLS.hub` 推导，覆盖 `starworkSpawn` / `starworkAudit`，检查 source、`.starwork/skills.json` manifest、`.agents` / `.claude` mounts 和 `SKILL.md` 基础 frontmatter；`doctor --json` 新增 `skills.required[]`。
- 2026-06-13：product-planning 复验通过。确认普通 `doctor` 对 required skill 缺失输出 warn、`ok=true`、退出码 0；`doctor --strict` 输出 `strict_ok=false`、退出码 1；修复提示明确不要全局安装 Kit-bundled Skills。手工 smoke 通过：缺失 Hub required skill 时 `starworkSpawn` 状态为 `missing_source`，repair hint 不含“全局安装”；preserve-names Hub 的 required source path 使用 `skills/starworkSpawn` / `skills/starworkAudit`，不检查 `技能/<skill>`。验证通过：`node --check product/cli/src/cli.js`、`node --check product/cli/test/init.test.js`、`git -C product diff --check`、目标回归测试 110/110、`npm test` 110/110。
