# MultiAgent

StarWork MultiAgent 是同一项目内多个 AI 会话的职责分工、边界管理、交接记录和跨会话协作能力。

它的核心不是“自动启动一群 Agent”，而是让多个会话可以被人和 Agent 稳定管理：

- 谁负责什么。
- 哪个会话接手哪个职责位。
- 哪些文件可以主动修改。
- 过程材料放在哪里。
- 需要其他 lane 读取的输出如何登记。
- 一个 lane 如何向另一个 lane 发送结构化指令。

## 当前重点

当前重点是 Codex 多会话编排 v0.2：

- 读取 Codex thread 状态和历史。
- 向已绑定的 Codex thread 发送跨会话指令。
- 为 lane 创建和绑定新的 Codex thread。
- 让 launch / instruct 发送的消息使用 StarWork 格式化外壳，和人类手写消息区分开。

## 文档

- [v0.2 Codex 多会话编排 SPEC](specs/v0.2-codex-orchestration.md)
