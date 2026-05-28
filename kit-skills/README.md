# StarWork Kit Skills

这里存放 StarWork Kit 自带 skill。

这些 skill 不应该通过 `npx skills add jennie-shawn/StarWork` 安装到全局 Agent 环境，而是由 `starwork init` 按工作区类型写入具体工作台。

## 当前工作台自带 Skills

- `starworkSpawn/`：项目中心工作台自带，帮助已有项目中心设计 `starwork spawn --blueprint` 工作台定制单。
- `starworkAudit/`：项目中心工作台自带，帮助项目中心巡检它管理的项目工作台，并生成 `starwork repair --blueprint` 修复蓝图。
- `neat-freak/`：项目工作台自带，帮助项目工作台进行阶段性收尾、整理和归档。
