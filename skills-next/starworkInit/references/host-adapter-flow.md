# Host Adapter Flow

Host Adapter 是初始化完成后的“让具体 AI 工具正确进入工作台”的步骤。普通用户不需要理解 adapter profile；只需要问清楚用户主要准备用哪个 AI 工具打开工作台。

## 轻量询问

```text
你主要会用哪个 AI 工具打开这个工作台？Codex、Claude Code、Cursor、Trae，还是暂时不确定？
```

规则：

- 用户明确说了 Codex / Claude Code / Cursor / Trae：直接采用。
- 用户不确定：跳过宿主适配，先生成通用 StarWork 工作台。
- 不默认给所有宿主都生成入口。
- 宿主选择不是工作台类型，也不是 Pack。

## 预览和写入

初始化主体结构完成后，如果用户选择了宿主，先运行：

```bash
starwork adapt <host> --target <path> --agent-docs draft --dry-run
```

用人话解释会补哪些入口：

- Codex：`AGENTS.md` 和 `.agents/skills/`
- Claude Code：`CLAUDE.md` 和 `.claude/skills/`
- Cursor：`.cursor/rules/starwork.mdc` 和 `.cursor/skills/`
- Trae：`.trae/rules/starwork.md` 和 `.trae/skills/`

用户确认后再执行：

```bash
starwork adapt <host> --target <path> --agent-docs draft --yes
starwork doctor --target <path> --host <host>
```

如果出现 `rules_entry_status: pending_merge`，按 `existing-project-agent-docs.md` 处理，不要告诉用户宿主入口已经完成。

不要把 `adapter profile`、`host_native_dirs`、`capabilities` 这些内部词直接讲给普通用户。
