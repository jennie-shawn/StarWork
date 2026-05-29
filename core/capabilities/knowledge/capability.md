# Knowledge Capability

知识库是项目工作台的可选能力，不是 Project Kit 的默认目录。

它用于让 Agent 长期维护当前项目的稳定理解。原始资料仍放在 Pack 定义的参考资料区，草稿和成果仍按 Pack 规则进入输出区。

## Standard Paths

中文项目开启后：

```text
知识库/
├── README.md
├── index.md
├── schema.md
├── log.md
├── inbox/
├── sources/
├── pages/
└── synthesis/
```

英文项目开启后：

```text
knowledge-base/
├── README.md
├── index.md
├── schema.md
├── log.md
├── inbox/
├── sources/
├── pages/
└── synthesis/
```

## Boundary

- `参考资料/` or `references/`: raw source materials from the user.
- `输出/` or `outputs/`: drafts and approved deliverables.
- `知识库/` or `knowledge-base/`: long-term project knowledge organized by Agent.
- Project Center shared knowledge is separate and is not defined by this capability.

## Workspace State

When enabled, `.starwork/workspace.json` records:

```json
{
  "capabilities": {
    "knowledge": {
      "enabled": true,
      "root": "知识库",
      "mode": "local"
    }
  }
}
```

This only means the current project has a local knowledge base. It does not imply Project Center submission or synchronization.
