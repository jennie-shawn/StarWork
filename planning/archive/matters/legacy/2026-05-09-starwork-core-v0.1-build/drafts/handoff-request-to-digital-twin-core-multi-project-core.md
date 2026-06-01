# 请求主库提供多项目管理机制的准确口径

## 背景

StarWork 产品项目正在落地 Core v0.1。当前已经形成一个初步结构：

- `baseline/`：Core 共同语义
- `profiles/`：中英文路径与模板语言
- `capabilities/`：Starter Mode、Matter Mode、identity、lessons 等能力
- `presets/`：用户状态组合配方
- `kits/`：可复制套件

但在落地过程中发现两处需要向主库确认：

1. 多语言不是只翻译 `_系统/` 路径，而应覆盖完整 profile、capability 文案、kit 文案、路径映射和 CLI 初始化体验。
2. 多项目不是简单的 `shared_identity` / `shared_lessons` 开关，而是主库现有的一整套项目管理、同步、注册和回写机制。

## 已从主库观察到的初步事实

当前主库似乎采用以下机制：

- 主库是规则源，不是项目执行工作台。
- 卫星项目是执行层，各自维护项目事实源。
- `identity/`、`lessons/`、`.internal/` 初始化时复制到卫星项目。
- `knowledge/` 默认作为指向主库 `knowledge/` 的只读共享链接。
- `.obsidian/` 从主库复制为默认配置。
- `.core-sync.json` 记录主库来源、版本、同步资源等元数据。
- `projects/registry.json` 记录项目 ID、路径、状态、同步模式、共享资源。
- 项目进度不写入 registry，而是主库读取各项目 `_系统/上下文/current-projects.md` 或英文对应路径。
- 主库 `.incoming/` 用于待审核回写。
- 通用 skill 应通过软链接导入卫星项目，不应复制成独立副本。

## 请求主库确认

请主库 agent 给出一份准确口径，用于 StarWork Core v0.1 的多项目模式设计：

1. 主库与卫星项目的职责边界应如何表述？
2. 初始化一个多项目卫星工作区时，哪些目录是复制快照，哪些目录是软链接，哪些目录只记录元数据？
3. `identity/`、`lessons/`、`.internal/`、`.obsidian/`、`knowledge/`、`.core-sync.json` 的真实同步语义分别是什么？
4. `projects/registry.json` 与项目内 `project-status/current-projects` 的边界是什么？
5. 卫星项目向主库回写 identity/lessons/规则建议时，应走 `.incoming/` 还是 cross-project handoff，二者边界是什么？
6. 通用 skill 的导入方式应如何产品化表达？是否统一为软链接？是否需要在 Core 中定义 skill mount capability？
7. 对 StarWork Core 来说，“多项目模式”应该命名为 `shared_identity/shared_lessons`，还是更准确地定义为一个整体 capability，例如 `main-repo-sync` 或 `satellite-workspace`？
8. 当前 StarWork Core 已落地的 `product/core/capabilities/shared-identity`、`shared-lessons` 是否过于简化？应该如何修正？

## 期望输出

请输出可直接回填到 StarWork Core 的结论，最好包括：

- 一段“主库/卫星项目模型”的定义
- 一张“资源同步语义表”
- 一张“Core capability 命名建议表”
- 对 StarWork Core 当前落地结构的修正建议

## 相关路径

- StarWork Core 当前落地：`/Users/shuxinding/satellite-starwork/product/core/`
- StarWork Core 当前事项：`/Users/shuxinding/satellite-starwork/matters/2026-05-09-starwork-core-v0.1-build/`
- 主库规则：`/Users/shuxinding/digital-twin-core/AGENTS.md`
- 主库项目注册：`/Users/shuxinding/digital-twin-core/projects/registry.json`
- 主库同步 skill 草稿：`/Users/shuxinding/digital-twin-core/workspace/twin-core-sync/SKILL.md`
