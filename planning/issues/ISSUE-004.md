# ISSUE-004：Host Adapter 覆盖用户规则文件且 sidecar 状态不一致

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | cli / skill |
| 优先级 | P0 |
| 状态 | closed |
| 来源 | Host Adapter v0.1 产品验收 |
| 发现日期 | 2026-06-03 |
| 关联 GitHub Issue | 无 |
| 关联 SPEC | `product/planning/features/host-adapters/specs/v0.1-implementation.md` |
| 关联验收 | Host Adapter v0.1 验收 |
| 负责人 | development lane |

## 现象

- 用户可见表现：用户已有 `CLAUDE.md` 等宿主规则文件时，执行 `starwork adapt <host>` 可能覆盖用户原内容，或生成 sidecar 后状态文件仍指向原入口。
- 期望表现：只有带 StarWork 管理标记的入口文件可以被自动更新；用户自写规则文件不能被覆盖。若生成 sidecar，`.starwork/adapters.json`、`.starwork/workspace.json.adapters` 和 `doctor --host` 都必须指向真实入口，或不得标记该 host 已启用。
- 实际表现：
  - `CLAUDE.md` 包含 `AGENTS.md` 或 `StarWork` 字样时会被直接覆盖。
  - `CLAUDE.md` 不含这些字样时会生成 `CLAUDE.starwork.md`，但 adapter state 仍写 `rules_entry: "CLAUDE.md"`，doctor 也检查 `CLAUDE.md`。
  - Phase 2 要求更新 `starworkUpgrade` / `starworkRepair` 相关 Skill，但当前没有对应独立 Skill，也未明确由现有 Skill 承接。

## 证据

### 1. 用户规则文件被覆盖

复现步骤：

```bash
tmp=$(mktemp -d)
node product/cli/bin/starwork.js init --type project --pack general --target "$tmp" --yes
printf '# My Claude Rules\n\n请先阅读 AGENTS.md，但不要覆盖我。\n' > "$tmp/CLAUDE.md"
node product/cli/bin/starwork.js adapt claude-code --target "$tmp" --yes
sed -n '1,40p' "$tmp/CLAUDE.md"
```

实际结果：`CLAUDE.md` 被替换成 StarWork Adapter 内容。

相关代码：

```text
product/cli/src/cli.js:2246
```

当前逻辑只要已有文件包含 `StarWork` 或 `AGENTS.md` 就允许覆盖，这会误伤用户自写规则。

### 2. sidecar 状态不一致

复现步骤：

```bash
tmp=$(mktemp -d)
node product/cli/bin/starwork.js init --type project --pack general --target "$tmp" --yes
printf '# My Claude Rules\n\n这是我的私人规则，不要覆盖。\n' > "$tmp/CLAUDE.md"
node product/cli/bin/starwork.js adapt claude-code --target "$tmp" --yes
find "$tmp" -maxdepth 1 -name 'CLAUDE*' -print
cat "$tmp/.starwork/adapters.json"
node product/cli/bin/starwork.js doctor --target "$tmp" --host claude-code --json
```

实际结果：

```text
CLAUDE.starwork.md 已生成
.starwork/adapters.json 仍记录 rules_entry: "CLAUDE.md"
doctor --host claude-code 仍检查 CLAUDE.md，并提示缺少 AGENTS.md / .starwork/skills.json 引导
```

相关代码：

```text
product/cli/src/cli.js:2278
product/cli/src/cli.js:2312
```

### 3. Skill Wrapper 交付缺口

SPEC 要求：

```text
product/planning/features/host-adapters/specs/v0.1-implementation.md:920
```

Phase 2 交付物包括 `starworkUpgrade` 和 Hub 相关 `starworkRepair` 的 adapter 包装口径。当前实际仓库中只有：

```text
product/skills/starworkDoctor/SKILL.md
product/skills/starworkInit/SKILL.md
product/skills/starworkKnowledge/SKILL.md
product/skills/starworkMultiagent/SKILL.md
product/kit-skills/starworkAudit/SKILL.md
```

没有独立 `product/skills/starworkUpgrade/SKILL.md` 或 `starworkRepair` Skill，也没有明确说明由哪个现有 Skill 承接这些流程。

## 影响范围

- 影响的功能：`starwork adapt`、`starwork init --adapter`、`starwork doctor --host`、Host Adapter Skill Wrapper。
- 影响的用户：已有 `CLAUDE.md`、Cursor rules、Trae rules 或自定义 Agent 规则文件的用户。
- 是否影响发布 / 升级 / A 测：影响。该问题可能覆盖用户规则，是 Host Adapter v0.1 发布阻塞。
- 是否有绕行方式：用户可先备份规则文件，但这不应成为正式绕行方式。

## 初步判断

- `adapterEntryAction()` 的覆盖判断过宽，应该只允许覆盖带 `STARWORK:ADAPTER_ENTRY` 管理标记的文件。
- `buildAdaptPlan()` / adapter state 写入需要知道实际生成的入口路径。
- sidecar 生成时应二选一：
  - 将 `rules_entry` / `generated_entries` / doctor 检查目标指向 sidecar。
  - 或不标记 host enabled，只提示用户需要手动合并。
- `starworkUpgrade` / `starworkRepair` Skill 交付缺口需要产品和开发共同确认：补独立 Skill，还是写明由 `starworkDoctor` / `starworkAudit` 承接。

## 分流结果

- 是否转 SPEC：已关联 Host Adapter v0.1 implementation SPEC。
- 是否转 GitHub：暂不转，先由本项目 development lane 修复。
- 是否转开发 lane：是。
- 是否需要用户补信息：否。

## 下一步

development lane 修复：

1. 收紧入口文件覆盖条件：只有 StarWork 管理标记允许自动覆盖。
2. sidecar 生成后，adapter state 和 doctor 检查必须指向真实入口，或 host 不标记 enabled。
3. 补充回归测试：
   - 已有 `CLAUDE.md` 包含 `AGENTS.md` 但无 StarWork marker，不得覆盖。
   - sidecar 生成后 state / doctor 目标一致。
4. 明确 `starworkUpgrade` / `starworkRepair` 的 Skill 承接方式。

## 处理结果

2026-06-03 development lane 已完成修复：

- `adapterEntryAction()` 的覆盖条件已收紧：仅不存在、空文件或带 `STARWORK:ADAPTER_ENTRY` 管理标记的入口会被自动写入；用户自写 `CLAUDE.md` 即使包含 `AGENTS.md` 或 `StarWork` 字样也不会被覆盖。
- `buildAdaptPlan()` 现在会记录实际写入的规则入口路径。若生成 `CLAUDE.starwork.md` 等 sidecar，`.starwork/adapters.json`、`.starwork/workspace.json.adapters` 和 `doctor --host` 都指向 sidecar。
- `doctor --host` 改为优先检查 adapter state 中的 `rules_entry`，不再固定检查 profile 默认入口。
- 补充回归测试：
  - 用户自写 `CLAUDE.md` 包含 `AGENTS.md` 时不得覆盖。
  - sidecar 生成后 state / doctor 目标一致。
  - 带 StarWork 管理标记的 `CLAUDE.md` 仍可安全更新。
- Skill 承接方式已明确：
  - 旧 `starworkUpgrade` 系统 Skill 职责由 `starworkDoctor` 的 upgrade blueprint 流程承接。
  - 没有独立 `starworkRepair` Skill；Hub repair blueprint 由 `starworkAudit` 承接，`starwork repair` CLI 只执行用户确认过的蓝图。

### 开发复验

- `node --check cli/src/cli.js` 通过。
- `node --check cli/test/init.test.js` 通过。
- `git diff --check` 通过。
- `node --test cli/test/init.test.js --test-name-pattern 'adapt|doctor --host'` 通过：83/83。
- `npm test` 通过：83/83。

## 产品复验

2026-06-03 product-planning lane 复验通过。

复验命令：

```bash
node --check cli/src/cli.js
node --check cli/test/init.test.js
node --test cli/test/init.test.js --test-name-pattern 'adapt|doctor --host'
npm test
git -C product diff --check
```

复验结果：

- 目标测试通过：83/83。
- 全量测试通过：83/83。
- `git diff --check` 通过。
- 用户自写 `CLAUDE.md` 即使包含 `AGENTS.md` 也不会被覆盖，会生成 `CLAUDE.starwork.md`。
- `.starwork/adapters.json`、`.starwork/workspace.json.adapters`、`doctor --host claude-code` 均指向真实 sidecar 入口。
- 带 `STARWORK:ADAPTER_ENTRY` 管理标记的 `CLAUDE.md` 可以安全更新，不生成 sidecar。
- `starworkUpgrade` / `starworkRepair` 承接方式已明确：旧模板升级由 `starworkDoctor` 的 upgrade blueprint 流程承接；Hub repair blueprint 由 `starworkAudit` 承接，`starwork repair` CLI 执行用户确认过的蓝图。

## 验收方式

- 验收条件 1：已有用户 `CLAUDE.md`、`.cursor/rules/starwork.mdc`、`.trae/rules/starwork.md` 不含 StarWork 管理标记时，`adapt` 不覆盖原文件。
- 验收条件 2：生成 sidecar 时，`.starwork/adapters.json` 和 `doctor --host` 与实际入口一致。
- 验收条件 3：已有 StarWork 管理标记的入口可以安全更新。
- 验收条件 4：Phase 2 中 `starworkUpgrade` / `starworkRepair` 的 Skill 包装交付方式明确。
- 关闭标准：已满足。Issue 关闭。
