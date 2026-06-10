# Skill Management

本功能档案记录 StarWork Skill 的调用入口、分发层级、路由关系和跨宿主兼容设计。

Skill Management 不是单个 Skill 的文案优化，而是回答：

- 用户应该先看到哪个 StarWork Skill？
- 哪些能力应该保留独立专家 Skill？
- 哪些 Skill 只随工作台、Kit 或 Capability 分发？
- 主 Skill 如何路由到专家 Skill，而不吞掉专家能力？
- README、安装指南和 CLI/Skill 注册表如何保持同一口径？

## 当前规格

- [v0.2-main-router-and-specialist-skills.md](specs/v0.2-main-router-and-specialist-skills.md)：新增 `starwork` 主 Skill，同时保留专家子 Skill 的直接触发能力。

