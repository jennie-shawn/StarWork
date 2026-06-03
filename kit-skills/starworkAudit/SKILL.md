---
name: starworkAudit
description: 'Diagnose `starwork audit --json` Project Center and managed project findings, prioritize issues, ask repair questions, and draft conservative `starwork repair --blueprint` plans.'
---

# starworkAudit

使用这个 skill，把 `starwork audit --json` 暴露的项目中心与项目工作台巡检事实整理成清晰报告；当用户明确要求修复时，生成 `repair-blueprint.json`，交给 `starwork repair --blueprint` 执行。

`starworkAudit` 不是 `starwork audit` 命令本身，也不是 `starwork repair` 执行器。

当前没有独立 `starworkRepair` Skill；项目中心巡检后的修复判断、Host Adapter repair 计划和 `repair-blueprint.json` 设计都由 `starworkAudit` 承接，再交给 `starwork repair` CLI 执行。

```text
starwork audit = 项目中心巡检器，只列事实
starworkAudit = 巡检诊断师 + repair blueprint 设计师
starwork repair = 修复蓝图执行器
```

## 工作流程

1. 优先运行或读取：

```bash
starwork audit --hub <hub-path> --json --inventory-depth all
```

2. 先给用户一句话结论：

```text
这个项目中心登记了 8 个项目，其中 7 个可访问，1 个路径失效。当前最优先处理路径失效和同步关系问题，规则更新可以放在第二批。
```

3. 按严重程度分组：

- `blocking`：路径失效、不是 StarWork、workspace state 无法解析。
- `high`：项目中心路径、project_id 或同步信息不一致。
- `repairable`：缺 `.starwork/handoff/`、缺 state.json、规则插槽缺失。
- `notice`：长期未更新、旧路径残留、联络队列积压。

4. 区分可直接生成蓝图的问题和需要用户确认的问题。

可直接生成蓝图：

- 补 `.starwork/handoff/` 子目录。
- 补 `.starwork/handoff/state.json`。
- 用户已确认后修 registry path。
- 用户已确认后重写 `.starwork/sync.json` 和 legacy `.core-sync.json`。

必须确认：

- 项目是否已归档。
- 失效路径的新位置。
- 断链知识入口是重建软链接还是保留本地副本。
- 旧 `_系统/跨项目/` 是否要迁移内容。

5. 只有用户明确要求“生成修复蓝图 / 执行 dry-run / 帮我修”时，才生成 `repair-blueprint.json`。

## 宿主适配巡检

项目中心巡检时，如果用户关心某个 AI 工具是否能正确使用项目工作台，或项目里存在宿主痕迹，要把 Host Adapter 作为独立健康维度。

对每个登记项目，可以在基础巡检后运行：

```bash
starwork doctor --target <project-path> --host all --json
```

汇总时分开说明：

- 哪些项目适配了 Codex、Claude Code、Cursor 或 Trae。
- 哪些项目只有通用 `AGENTS.md` 入口。
- 哪些项目缺宿主规则入口。
- 哪些项目存在同名 Skill 冲突。
- Trae 是否禁用了 `.starwork/skills.json` 里声明启用的 Skill。

修复蓝图只能修 StarWork 可控文件：

- 宿主规则入口
- `.starwork/adapters.json`
- `.starwork/skills.json`
- 项目内 Skill mount dirs

禁止通过 Hub audit / repair 读取或改写宿主私有 transcript、私有数据库、加密 history 或全局配置。

## 中间产物路径规则

`starworkAudit` 产生的是巡检和修复过程材料，不是项目业务内容。

当需要落地 `audit-result.json`、`repair-blueprint.json`、规则片段或临时说明时，只能写入项目中心的 StarWork 机制目录：

```text
<hub>/.starwork/audit-runs/<YYYY-MM-DD-or-run-id>/
├── audit-result.json
├── repair-blueprint.json
└── rules/
```

禁止写入：

- 项目中心 `工作区/` 或 `workspace/`
- 项目工作台 `workspace/`
- `输出/`、`outputs/`
- `知识/`、`knowledge/`
- `参考资料/`、`references/`
- 任何项目业务目录或正式成果目录

除非用户明确要求调试 CLI，否则不要生成 `.mjs`、`.js`、`.sh` 等脚本型中间产物。修复设计应优先使用 `repair-blueprint.json` 和 `rules/*.md`。如果用户明确要求生成调试脚本，也必须放在同一个 `.starwork/audit-runs/<run-id>/` 下，并在回复中说明它不是项目业务文档。

## 约束

- 不直接改文件。
- 不建议删除项目记录。
- 不移动用户内容。
- 不合并 `.incoming/`。
- 不修改 identity / lessons / knowledge 正文。
- 不把旧 `project` 作为新标准；它只是旧中心管理项目 + 历史事项内容信号。

## 参考

完整边界见：

```text
../starworkAudit-spec.md
../../cli/audit-spec.md
../../cli/repair-spec.md
```
