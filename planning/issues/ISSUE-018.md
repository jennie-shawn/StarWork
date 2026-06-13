# ISSUE-018：doctor 应尊重 preserve-names Hub 的 Skill 注册表路径

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | cli / core / kit-pack |
| 优先级 | P1 |
| 状态 | closed |
| 来源 | GitHub Issue #6 |
| 发现日期 | 2026-06-10 |
| 关联 GitHub Issue | <https://github.com/jennie-shawn/StarWork/issues/6> |
| 关联 SPEC | `product/planning/features/workspace-doctor/specs/v0.1-required-kit-skills-and-preserve-names-paths.md` |
| 关联验收 | 2026-06-13 product-planning 复验通过 |
| 负责人 | development lane |

## 现象

- 用户可见表现：`starwork doctor` 在 preserve-names Hub 工作区中误报缺少 Hub 托管 Skill 注册表。
- 期望表现：preserve-names Hub 应根据工作区实际角色映射检查 `skills/registry.json`。
- 实际表现：`doctor` 根据 `language: zh` 推导并检查 `技能/registry.json`，即使工作区保留历史英文路径且 `skills/registry.json` 存在有效。

## 证据

GitHub Issue：

```text
https://github.com/jennie-shawn/StarWork/issues/6
```

复现场景摘要：

```json
{
  "workspace_type": "hub",
  "kit": "hub",
  "language": "zh",
  "upgrade": {
    "strategy": "preserve-names",
    "core_role_mapping": [
      { "role": "skills", "path": "skills/", "confidence": "high" }
    ]
  }
}
```

目标工作区存在：

```text
skills/registry.json
```

但执行：

```bash
starwork doctor --target /path/to/hub --json --inventory-depth all
```

观察到输出仍检查：

```text
技能/registry.json
```

并出现警告：

```text
项目中心缺少托管 Skill 注册表。
path: 技能/registry.json
```

## 影响范围

- 影响的功能：`starwork doctor`、Hub Kit、preserve-names upgrade、Hub Skill registry 检查。
- 影响的用户：从历史英文目录升级到 StarWork Hub，且选择保留原目录名称的用户。
- 是否影响发布 / 升级 / A 测：影响升级后健康检查可信度，可能误导用户或 Agent 创建重复中文目录。
- 是否有绕行方式：用户可人工忽略该 warning，但 Agent 容易按 warning 做错误修复。

## 初步判断

`doctor` 当前对 Hub 路径的解析偏向语言默认值，没有优先使用 preserve-names upgrade 中的 `core_role_mapping`。这会让已经通过映射确认的历史路径失效，属于 Core 路径解析和 doctor 诊断口径不一致。

## 分流结果

- 是否转 SPEC：已转入 `product/planning/features/workspace-doctor/specs/v0.1-required-kit-skills-and-preserve-names-paths.md`。
- 是否转 GitHub：已有关联 GitHub Issue #6。
- 是否转开发 lane：需要。
- 是否需要用户补信息：暂不需要，GitHub issue 已包含复现配置、命令和期望行为。

## 下一步

development lane 需要修正 Hub registry path resolution：

1. preserve-names 工作区优先使用 `workspace.upgrade.core_role_mapping` 中的 `skills` 角色路径。
2. `doctor` 的 Hub registry 检查应报告实际采用的路径。
3. 补充 preserve-names Hub 的回归测试，确保 `skills/registry.json` 存在时不误报 `技能/registry.json` 缺失。

## 验收方式

- 验收条件 1：preserve-names Hub 中 `core_role_mapping` 声明 `skills/` 时，`doctor` 检查 `skills/registry.json`。
- 验收条件 2：`skills/registry.json` 存在且有效时，不再输出“缺少托管 Skill 注册表”的 false warning。
- 验收条件 3：非 preserve-names 或没有映射的 Hub 仍能按语言默认路径检查，不破坏现有标准中文 Hub。
- 关闭标准：实现修复并通过针对 preserve-names Hub registry path 的自动化测试和一次手工 smoke。

## 处理记录

- 2026-06-13：development lane 按 Workspace Doctor v0.1 完成实现。新增 `resolveWorkspaceRolePath(state, role, fallbackPath)`，Hub Skill registry 检查优先使用 `workspace.upgrade.core_role_mapping` 中 `role=skills` 的路径；`doctor --json` 暴露 `skills.registry.path_source` 和 `role`。
- 2026-06-13：product-planning 复验通过。确认 preserve-names Hub 的 `skills.registry.path` 为 `skills/registry.json`、`path_source` 为 `upgrade.core_role_mapping`，不再误报 `技能/registry.json` 缺失；标准中文 Hub 仍使用 `技能/registry.json`。验证通过：`node --check product/cli/src/cli.js`、`node --check product/cli/test/init.test.js`、`git -C product diff --check`、目标回归测试 110/110、`npm test` 110/110。
