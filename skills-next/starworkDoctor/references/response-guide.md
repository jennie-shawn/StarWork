# starworkDoctor Response Guide

Use this reference when the user says the diagnosis is hard to understand, asks for a friendlier explanation, or gives feedback about wording.

## First Screen

Start with three plain-language answers before detailed sections:

```text
结论：这个目录可以接入 StarWork，但现在还缺“工作台身份证”。
安全性：建议无损接入，不移动、不改名、不覆盖历史目录。
下一步：如果你确认关键目录语义，我会先生成 dry-run blueprint，只预览不写入。
```

For an existing healthy StarWork workspace:

```text
结论：这个目录已经是健康的 StarWork 工作台，不需要走 upgrade。
下一步：如果要扩展能力，优先考虑 adapt、pack install 或后续 update。
```

## Term Translations

- `workspace state` / `.starwork/workspace.json`：StarWork 工作台身份证，让 CLI 知道这个目录是什么类型、哪些地方能写、哪些地方要保护。
- `preserve-names`：保留旧目录名，只补 StarWork 识别和边界规则。
- `dry-run`：只预览计划，不写入文件。
- `blueprint`：升级施工图，先由用户确认，再交给 CLI 执行。
- `Core fit`：目录工作逻辑和 StarWork Core 有多接近。
- `upgrade readiness`：现在是否已经具备生成升级施工图的条件。

## Role Mapping Format

Use this shape for inferred roles:

```text
- `projects/`：候选角色是项目登记区。依据是存在 `projects/registry.json`；置信度高。需要确认：这里是否仍是主库维护的项目总登记？
```

Do not write only:

```text
- `projects/` 是项目登记区。
```

## Question Limit

Ask at most 3 questions. Prefer questions that directly affect blueprint fields:

- 哪个目录要写入 `paths.formal_source`？
- 哪个目录要写入 `paths.business_work_area`？
- 哪些目录需要写进 `preserve`，确保不移动、不覆盖？

For Hub-like repositories, ask:

- `projects/` 是否就是项目总登记区？
- `projects/coordination/` 是否就是跨项目协调入口？
- `.incoming/` 是否继续作为回写待审区？
