# Existing Project Agent Docs

已有非空项目必须走保守路径。

## 安全预告

dry-run 前先说明：

```text
我检测到这是已有项目时，会按更保守的方式处理：
- 保留你的业务代码和现有资料；
- 不直接覆盖已有 AGENTS.md、README.md、CLAUDE.md 或其他 AI 规则入口；
- 先生成待整合草稿；
- 让你确认后再合并入口说明。
```

## 必须使用 agent-docs draft

已有非空项目不能把 `--yes` 当成最终 AI 入口文档确认。命令必须使用：

```bash
starwork init --type project --pack general --language <zh|en> --target <workspace-path> --agent-docs draft --dry-run
starwork init --type project --pack general --language <zh|en> --target <workspace-path> --agent-docs draft --yes
```

执行后读取：

- `.starwork/drafts/agent-docs-plan.json`
- `.starwork/drafts/AGENTS.proposed.md`
- `.starwork/drafts/README.proposed.md`
- 相关宿主 proposed 草稿

再保留用户已有入口规则，整合 StarWork read-first、写入边界、Skill 目录和 MultiAgent lane workflow，经用户确认后写入最终入口。

## pending merge 口径

如果出现 `pending merge` / `pending_merge` / 待整合，不要说入口已经完成：

```text
工作台骨架已经写入，但 AI 入口还没有最终生效。
因为你的项目已有规则文件，我只生成了待整合草稿，没有直接覆盖。

下一步我会把现有规则和 StarWork 建议放在一起，让你确认后再合并。
```

## 不得做

- 不直接覆盖已有 `AGENTS.md`、`README.md`、`CLAUDE.md`。
- 不把缺少 `--agent-docs draft` 的 `init --adapter codex --yes` 当成已有项目完整接入方案。
- 不把待整合草稿说成最终入口已生效。
