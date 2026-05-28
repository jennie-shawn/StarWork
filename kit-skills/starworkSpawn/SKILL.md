---
name: starworkSpawn
description: 'Design customized project workspaces created from a Project Center with `starwork spawn --blueprint`: choose language, draft blueprint.json, rules, seed files, and validation steps.'
---

# starworkSpawn

使用这个 skill，把用户的项目想法转成 StarWork Spawn Blueprint（从项目中心创建项目工作台的定制单）。

Spawn Blueprint 是一个小型配置包：

- `blueprint.json`：机器可读的结构和路径配置
- `rules/*.md`：项目专属 Agent 规则
- `seed/**`：可选的初始化占位文件

Blueprint 由 `starwork spawn --blueprint` 执行。除非用户明确要求落地文件，否则这个 skill 只负责设计，不直接修改用户的项目中心或目标工作区。

## 参考

需要字段细节、校验规则或命令行为时，读取：

```text
../../cli/spawn-blueprint-spec.md
```

不要在 skill 内重复维护完整 schema，避免和 SPEC 漂移。

## 工作流程

1. 识别用户要创建的工作台。
   - 项目是什么？
   - 这是怎样的具体项目？
   - 是否需要专门的资料区、草稿区、交付区或跨会话追踪？

2. 选择基础模式。
   - 需要多阶段交接或多条推进线时，也使用 `project`，再通过 blueprint 定制目录和规则。
   - `starter` 是旧兼容参数，不主动推荐；新项目默认使用 `project`。
   - 默认会叠加 General Pack；`参考资料/` 和 `输出/` 这类业务目录来自 Pack，不是 Project Kit 固定结构。

3. 判断应该用 Blueprint 还是 Pack。
   - 一次性项目定制，用 Blueprint。
   - 多个项目或多个用户会反复复用的结构，再建议沉淀为 Pack。
   - 不要把每个目录偏好都做成 Pack。

4. 设计工作台路径。
   - 定义 `formal_source`：确认成果或最终交付物放在哪里。
   - 定义 `business_work_area`：当前工作在哪里推进。
   - 只新增未来确实会用到的目录。
   - 避免装饰性、含义模糊的目录。

5. 编写项目规则。
   - `rules/file-boundaries.md`：不同信息分别应该放哪里。
   - `rules/workflow.md`：Agent 如何在工作台里推进工作。
   - `rules/handoff.md`：只有涉及跨项目或跨会话交接时才创建。

6. 产出或更新文件。
   - 用户只是讨论时，用文字描述方案。
   - 用户要求实现时，创建 blueprint 文件夹和文件。
   - 用 `blueprint.json` 管结构，用 Markdown 管 Agent 规则；不要把长规则塞进 JSON。

7. 说明执行方式。
   - 先用 `starwork spawn --blueprint ... --dry-run` 预览。
   - 确认后再执行，或使用 `--yes`。
   - 最后用 `starwork doctor` 检查。

## 输出结构

实现 blueprint 包时使用：

```text
<project>-blueprint/
├── blueprint.json
├── rules/
│   ├── file-boundaries.md
│   ├── workflow.md
│   └── handoff.md
└── seed/
    └── ...
```

`handoff.md` 和 `seed/` 是可选的，不要创建空的可选文件。

## 约束

- `blueprint.json` 不写项目中心路径和 target 路径，它们属于 CLI 参数。
- 不覆盖用户文件。
- 不修改 Kit 源目录。
- 不直接写项目中心，除非通过 `starwork spawn` 的 registry 登记行为。
- 不删除 `AGENTS.md`、`.starwork/`、`.core-sync.json`、系统目录、共享知识挂载或 skill 链接。
- 除非用户有明确理由，否则优先新增清晰目录，而不是重命名系统目录。
- Markdown 规则要具体、可执行，避免泛泛的效率建议。

## 最小示例

```json
{
  "schema": "starwork.spawn_blueprint.v0.1",
  "name": "内容产品官网",
  "project_id": "content-site",
  "base": {
    "mode": "project",
    "kit": "project",
    "language": "zh"
  },
  "paths": {
    "formal_source": "交付物/确认版本/",
    "business_work_area": "资料库/"
  },
  "folders": [
    "资料库/",
    "草稿/",
    "会议纪要/",
    "版本记录/",
    "交付物/确认版本/"
  ],
  "agent_rules": [
    {
      "slot": "project.file_boundaries",
      "from": "rules/file-boundaries.md"
    },
    {
      "slot": "project.workflow",
      "from": "rules/workflow.md"
    }
  ]
}
```

## 执行命令

根据用户机器上的实际路径替换：

```bash
starwork spawn --hub <hub-path> --target <target-path> --blueprint <blueprint.json> --dry-run
starwork spawn --hub <hub-path> --target <target-path> --blueprint <blueprint.json> --yes
starwork doctor --target <target-path>
```
