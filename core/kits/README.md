# Core Kits

Kits 是由 presets 组装出来的内部工作区模板包。普通用户通常只需要理解“项目工作台”和“项目中心”。

它们不是协议事实源。事实源是：

```text
baseline/ + profiles/ + capabilities/ + presets/
```

在 v0.1 阶段，kits 可以手工组装。后续 `starwork init` 应根据 presets 生成 kits。

## v0.1 正式 Kit

- `project/`：项目工作台基础结构。
- `hub/`：项目中心基础结构。

旧 `satellite-starter` 已移入 `core/legacy/`，不再作为正式 Kit。中心管理的项目工作台由 `project` Kit 加 `project_center` 连接信息表达。

## 结构参考

- [Kit Structure Reference](./kit-structure-reference.md)
- [Two-Kit Architecture SPEC](./two-kit-architecture-spec.md)
