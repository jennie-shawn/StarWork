# Adapters

这里存放不同 Agent 的适配层，如 Codex、Claude Code、Cursor、Trae 等。

适配层不混入 StarWork Core。

## 当前定位

Adapter 是 StarWork 的全局宿主适配层，不只服务 MultiAgent。

它负责把 StarWork 工作台协议翻译成不同 AI 宿主能正确读取、正确行动、正确保存上下文的方式，包括：

- 规则入口
- Skill 识别
- 会话能力
- transcript / memory 边界
- 宿主 CLI / API 探测
- 私有状态安全边界

## v0.1 当前进度

Host Adapter v0.1 已先落地底座：

- `contract.md`：定义 adapter profile、工作台 adapter state 和宿主安全边界。
- `codex/`、`claude-code/`、`cursor/`、`trae/`：分别维护 `profile.json`、`rules.md`、`safety.md`。
- `starwork adapt <host|all> --capabilities`：只读输出宿主能力，不改工作台。
- `starwork adapt <host|all>`：写入宿主规则入口、Skill 目录和 `.starwork/adapters.json`。
- `starwork doctor --host <host|all>`：检查宿主入口、Skill 目录、Cursor / Trae frontmatter、Trae disabled config 和不安全能力声明。
- `starwork init --adapter <host|all>`：初始化完成后继续生成对应宿主入口。
- `starwork multiagent`：Claude Code 可用 `CLAUDE_CODE_SESSION_ID` 绑定和 `claude --resume` 继续命令；Cursor / Trae 默认走 manual handoff，不伪装后台送达。

Cursor / Trae 的深度 probe、Claude Code 真实本机 transcript 路径适配和更完整用户文档仍需继续 A 测打磨。

产品规划事实源见：

```text
product/planning/features/host-adapters/specs/v0.1.md
product/planning/features/host-adapters/specs/v0.1-implementation.md
```
