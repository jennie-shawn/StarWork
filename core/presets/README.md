# Presets

Presets 是组装 StarWork 工作台的内部配方，普通用户通常不需要直接理解或选择。

一个 preset 会选择：

- 一个 profile
- 零个或多个 capabilities
- 默认正式事实源
- 可选的主库同步预期

Presets 主要供 CLI 和 kit 生成使用。

## v0.1 包含

- `project.yaml`
- `hub.yaml`

`project` 和 `hub` 是正式 v0.1 主入口：

- `project`：项目工作台。
- `hub`：项目中心。

旧 `local-starter` 已从 Core 正式材料中移除；CLI 如遇到旧别名，会映射到新的 `project` 结构。

旧 `satellite-starter` 已降级到 `core/legacy/`。中心管理的项目不再由独立 Kit 表达，而是：

```text
project 工作台 + project_center 连接信息
```

## 命名原则

Preset ID 不携带语言标签，只表达内部工作区形态。

当前 v0.1 的正式 preset 默认使用中文 profile。英文 profile 通过 CLI 语言参数映射，不再维护独立的 `local-starter` 参考 Kit。
