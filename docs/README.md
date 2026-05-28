# Product Docs

这里存放正式产品文档、规格说明、发布说明和对外说明。

- [product-direction.md](product-direction.md)：StarWork 产品方向、四层结构和关键约束
- [agent-install-guide.md](agent-install-guide.md)：面向用户 Agent 的 StarWork CLI 与 Skills 安装指导
- [alpha-test-guide.md](alpha-test-guide.md)：StarWork A 测 CLI 与 Skills 安装、测试和反馈指南
- [m2.6-alpha-core-flows-optimization-spec.md](m2.6-alpha-core-flows-optimization-spec.md)：M2.6 A 测核心链路优化规格，覆盖安装、init、doctor/upgrade、项目中心 管理和 multiagent
- [m2.6-project-init-feedback/README.md](m2.6-project-init-feedback/README.md)：单项目初始化反馈专项 SPEC 索引，包含 5 个可独立实现和验收的反馈项
- [m2.7-init-github-issues-optimization-spec.md](m2.7-init-github-issues-optimization-spec.md)：GitHub Issues #1/#2 对应的 init 目标路径确认与自定义 AGENTS 一致性优化 SPEC
- [m2.8-workspace-naming-optimization-spec.md](m2.8-workspace-naming-optimization-spec.md)：工作台命名体系优化 SPEC，统一“项目工作台 / 项目中心 / 中心管理的项目工作台”等产品语言
- [m2.9-knowledge-capability-note.md](m2.9-knowledge-capability-note.md)：知识库能力备忘，记录将 knowledge 从默认目录调整为可插拔 Agent 维护能力的初步判断
- [m2.10-core-kit-pack-boundary-cleanup-spec.md](m2.10-core-kit-pack-boundary-cleanup-spec.md)：Core Kit / Pack / Capability 边界清理 SPEC，处理 Project Kit 固定目录、项目中心语言一致性和 knowledge 重复问题
- [index.html](index.html)：StarWork HTML 文档中心，统一挂载所有 HTML 阅读稿
- [hub-management.html](hub-management.html)：项目中心管理机制 HTML 阅读版，解释项目中心、项目工作台、项目注册表和回写边界
- [cli-capabilities.html](cli-capabilities.html)：StarWork CLI v0.1 能力说明 HTML 阅读版
- [doctor-capabilities.html](doctor-capabilities.html)：StarWork Doctor 能力说明 HTML 阅读版，解释标准体检和历史模板升级诊断
- [product-shape-business-model.html](product-shape-business-model.html)：StarWork 产品形态与商业模式 HTML 可视化阅读版
- [roadmap.md](roadmap.md)：StarWork 从当前状态到 v0.1 发布、v0.2 扩展和 v1.0 稳定产品的里程碑
- [roadmap.html](roadmap.html)：里程碑 HTML 阅读版，包含 SVG 总路线图和当前焦点图
- [v0.1-plan.md](v0.1-plan.md)：StarWork v0.1 三条并行工作线与首轮事项安排

相关事实源：

- CLI 命令规格在 `product/cli/`，包括 `spawn-blueprint-spec.md`。
- StarWork 系统级 Agent skill 在 `product/skills/`；Kit 自带 skill 在 `product/kit-skills/`，避免被全局安装命令误装。具体分发口径见 `product/core/skill-management-spec.md`。
