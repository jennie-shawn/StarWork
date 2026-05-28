# Repair Blueprint Guide

`starworkAudit` 生成的 repair blueprint 必须保守。

## 输出位置

repair blueprint 和配套规则是 StarWork 巡检 / 修复过程材料，只能写入项目中心的机制目录：

```text
<project-center>/.starwork/audit-runs/<YYYY-MM-DD-or-run-id>/
├── audit-result.json
├── repair-blueprint.json
└── rules/
```

不要写入项目中心或项目工作台的业务工作区，例如：

- `workspace/`
- `输出/`、`outputs/`
- `知识/`、`knowledge/`
- `参考资料/`、`references/`
- 项目正式成果目录

默认不要生成 `.mjs`、`.js`、`.sh` 等脚本型中间产物。修复应通过 `repair-blueprint.json` 表达，规则片段用 Markdown 放入 `rules/`。

## 允许动作

允许的首版动作：

- `ensure_dir`
- `write_file_if_missing`
- `rewrite_core_sync`
- `update_hub_registry`
- `update_workspace_state`

默认不要生成：

- 删除动作
- 移动用户目录
- 覆盖正式成果
- 合并 `.incoming/`
- 修改 identity / lessons / knowledge 正文

执行前应提示用户先运行：

```bash
starwork repair --blueprint repair-blueprint.json --dry-run
```

确认后再运行：

```bash
starwork repair --blueprint repair-blueprint.json --yes
```
