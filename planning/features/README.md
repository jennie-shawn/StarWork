# Feature Planning

这里按功能归档 StarWork 的支线能力材料。

每个功能目录建议包含：

```text
<feature>/
├── README.md
├── specs/
│   ├── index.md
│   └── v0.1.md
├── cli.md
├── skill.md
├── core.md
├── docs.md
├── acceptance/
├── decisions.md
├── references/
├── discussions/
├── examples/
└── archive/
```

## 当前功能档案

- `knowledge-base/`：项目本地知识库能力。
- `multiagent/`：多 AI 会话职责分工、跨会话指令和宿主会话编排能力。
- `project-structure/`：当前 StarWork 产品工作台结构重整。

## 使用规则

- 新功能先确认是否已有功能档案。
- 没有功能档案时，先创建 `README.md` 和 `specs/index.md`。
- 功能 SPEC 按版本放入 `specs/`，不要继续平铺到 `product/docs/`。
- 功能讨论、参考、验收材料都靠近该功能存放。
