# Host Adapters

Host Adapters 是 StarWork 面向不同 AI 宿主的通用适配层。

它不只服务 MultiAgent，而是负责把 StarWork 工作台协议翻译成 Codex、Claude Code、Cursor、Trae 等宿主能正确读取、正确行动、正确保存上下文的方式。

## 当前判断

`starwork adapt` v0.1 目前只生成轻量规则入口，例如 `CLAUDE.md`、Cursor rules、Trae rules。随着 MultiAgent、Knowledge、Skills、Upgrade 等能力变多，adapter 需要升级为全局能力层。

Host Adapter 应覆盖：

- 规则入口：宿主应该读哪个规则文件。
- Skill 入口：宿主如何识别和使用 StarWork Skills。
- 会话能力：session id、命名、读取、继续、发送、创建。
- 记忆和 transcript：宿主自己的 history、summary、memory 如何看待。
- 安全边界：哪些宿主私有文件只能读，哪些绝不能写。
- 能力降级：宿主不支持自动操作时，如何转成人工交付包。

## 文档

- [v0.1 SPEC](specs/v0.1.md)
- [v0.1 implementation SPEC](specs/v0.1-implementation.md)
- [SPEC index](specs/index.md)
