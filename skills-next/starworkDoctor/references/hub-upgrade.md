# Hub-like Main Repository Upgrade

Use this reference when `doctor --json` shows main-repository or Hub-like signals such as `identity/`, `lessons/`, `knowledge/`, `skills/`, `projects/registry.json`, `projects/coordination/`, or `.incoming/`.

## Diagnosis Policy

Treat the directory as a Hub-like main repository candidate, not as a normal `project` legacy template.

Recommended wording:

```text
这个目录更像“主库 / 多项目中枢”候选，而不是普通单项目旧模板。它已经有共享身份、教训、知识、skills、项目登记和回写待审入口。建议按 Hub preserve-names 方式无损接入：保留 `projects/`、`knowledge/`、`skills/` 等原名，只补 StarWork 工作台身份证和 Agent 边界规则。
```

Avoid:

```text
建议按 project 升级。
```

## Blueprint Defaults

For a confirmed Hub-like main repository:

```json
{
  "base": {
    "workspace_type": "hub",
    "kit": "hub",
    "language": "zh",
    "pack": null
  },
  "strategy": "preserve-names",
  "paths": {
    "formal_source": "projects/",
    "business_work_area": "projects/coordination/"
  }
}
```

`pack:null` is intentional. It prevents `starwork upgrade` from installing `hub-management` Pack seed files and creating duplicate standard paths. New Hub workspaces use standard paths such as `projects/` and `knowledge/`, but preserve-name upgrades should keep the user's existing Hub-like structure.

## Required Role Mapping

Include confirmed mappings when they exist:

```json
[
  { "role": "projects", "path": "projects/", "confidence": "high", "reason": "用户确认这是项目总登记区" },
  { "role": "project_registry", "path": "projects/registry.json", "confidence": "high", "reason": "用户确认这是项目注册表" },
  { "role": "coordination", "path": "projects/coordination/", "confidence": "high", "reason": "用户确认这是跨项目协调入口" },
  { "role": "incoming", "path": ".incoming/", "confidence": "high", "reason": "用户确认这是回写待审区" },
  { "role": "identity", "path": "identity/", "confidence": "high", "reason": "用户确认这是共享身份事实源" },
  { "role": "lessons", "path": "lessons/", "confidence": "high", "reason": "用户确认这是共享教训事实源" },
  { "role": "knowledge", "path": "knowledge/", "confidence": "high", "reason": "用户确认这是共享知识事实源" },
  { "role": "skills", "path": "skills/", "confidence": "high", "reason": "用户确认这是共享 skill 来源" }
]
```

## Safe Actions

Use only low-risk actions:

```json
[
  { "type": "ensure_dir", "path": ".starwork/" },
  { "type": "write_workspace_state" },
  { "type": "copy_kit_missing_files" },
  { "type": "inject_agent_rules", "target": "AGENTS.md", "from": "rules/hub-boundaries.md", "slot": "upgrade.hub_boundaries" }
]
```

Do not add `copy_seed` for standard Hub Pack seed unless the user explicitly asks to create standard StarWork Hub directories.
