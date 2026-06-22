# Upgrade Blueprint Flow

只有用户明确说“帮我升级”“生成 blueprint”“走 dry-run”“整理成 StarWork 工作台”时，才进入升级设计。

## 采访确认

只问会影响升级蓝图的问题：

- 哪个目录是正式成果 / 确认事实源？
- 哪个目录是当前工作 / 日常推进区？
- 哪些目录是只读参考资料？
- 是否需要事项机制？
- 对项目中心候选：哪个目录是项目登记、跨项目协调和回写待审？
- 希望保留旧目录名，还是逐步标准化？

推荐问法：

```text
未来你希望 Agent 把哪里当成“不能乱改的正式成果”？
```

```text
你平时真正干活的地方在哪里？比如推进事项、写草稿、放待办、记录阶段判断。
```

## 默认策略

默认策略是 `preserve-names`：保留用户已有目录名，通过 `.starwork/workspace.json` 和 Agent 规则建立 StarWork Core 映射。

默认 base：

- 单项目旧模板：`project + project + general`。
- 多线推进旧模板：`project + project + general`。
- 项目中心候选：`hub + hub + pack:null`。

## 输出目录

```text
<workspace>-upgrade/
├── upgrade-blueprint.json
├── rules/
│   ├── core-boundaries.md
│   ├── user-preserved-rules.md
│   └── rule-conflicts.md
└── notes/
    └── original-rules-summary.md
```

规则文件必须是短规则片段，不是完整 `AGENTS.md`。不要把项目背景、历史记录、会议纪要或低置信度推断写进规则片段。

`upgrade-blueprint.json` 中 `generated_by` 写：

```json
"generated_by": "starworkDoctor"
```

## 执行边界

先 dry-run：

```bash
starwork upgrade --target <workspace> --blueprint <workspace>-upgrade/upgrade-blueprint.json --dry-run
```

用户确认后才执行：

```bash
starwork upgrade --target <workspace> --blueprint <workspace>-upgrade/upgrade-blueprint.json --yes
starwork doctor --target <workspace>
```

不直接执行 `starwork upgrade --yes`，除非用户明确要求且已完成 dry-run 确认。
