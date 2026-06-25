# ISSUE-030：本地 StarWork CLI / Skill 安装态漂移导致加载旧版能力

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | skill / cli / release / product |
| 优先级 | P0 |
| 状态 | new |
| 来源 | 用户反馈 / 真实项目 |
| 发现日期 | 2026-06-22 |
| 关联 GitHub Issue | 无 |
| 关联 SPEC | 待 product-multiagent 设计 |
| 关联验收 | 无 |
| 负责人 | product-multiagent |

## 现象

- 用户可见表现：用户以为当前正在使用 StarWork next 最新 Skill / CLI，但 Codex 实际加载的是旧版长 Skill。
- 期望表现：Agent 能识别本地 CLI、Skill、references 和 channel 是否同源；发现漂移时先提示更新，不继续执行高风险 MultiAgent / workflow 动作。
- 实际表现：本地 `starwork` CLI 仍为 `0.1.0-alpha.25`；`/Users/shuxinding/.agents/skills/starworkmultiagent/SKILL.md` 为 640 行旧版 v0.11 长 Skill，而仓库 next 版 `product/skills-next/starworkMultiagent/SKILL.md` 已是 174 行分层版。

## 证据

```text
npm list -g @jennie-shawn/starwork --depth=0
└── @jennie-shawn/starwork@0.1.0-alpha.25

starwork --version
0.1.0-alpha.25

wc -l /Users/shuxinding/.agents/skills/starworkmultiagent/SKILL.md product/skills-next/starworkMultiagent/SKILL.md
640 /Users/shuxinding/.agents/skills/starworkmultiagent/SKILL.md
174 product/skills-next/starworkMultiagent/SKILL.md
```

## 影响范围

- 影响的功能：StarWork Skill 安装、MultiAgent workflow next、Skill references 分层、v0.12/v0.14 安全规则。
- 影响的用户：通过 `npx skills add` 安装过旧 Skill、继续使用旧本地全局 Skill 的测试用户。
- 是否影响发布 / 升级 / A 测：影响 workflow next A 测和所有依赖新 Skill 规则的行为。
- 是否有绕行方式：手动重新安装 `@next` CLI 和 `skills-next --full-depth`，但缺少自动检测和提醒。

## 初步判断

这是 release hygiene / local installation drift 问题。仅发布仓库和 npm next tag 不足以保证用户本地 Codex 读取到最新 Skill。

## 分流结果

- 是否转 SPEC：是，建议由 product-multiagent 设计安装态一致性 / doctor / Skill channel guard。
- 是否转 GitHub：待定。
- 是否转开发 lane：待 SPEC 明确后转。
- 是否需要用户补信息：不需要。

## 下一步

由 product-multiagent 设计“StarWork Skill / CLI 安装态一致性检查”方案，至少覆盖本地已安装 Skill version / channel / references 是否与 CLI channel 匹配，以及发现旧 Skill 时的用户提示。

## 验收方式

- 验收条件 1：可检测本地 StarWork CLI 与 StarWork Skill channel / metadata / references 是否错配。
- 验收条件 2：检测到错配时，Skill 不继续 workflow 或跨 lane 投递等高风险动作，先提示更新路径。
- 关闭标准：开发实现并通过真实本地旧 Skill 场景复验。

