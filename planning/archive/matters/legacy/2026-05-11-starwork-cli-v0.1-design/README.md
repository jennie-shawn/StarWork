# StarWork CLI v0.1 设计

## 目标

定义 StarWork CLI v0.1 的命令边界和用户体验，先从 `starwork init` 开始。

## 范围

- `starwork init` 的交互方式、参数方式、preset 映射和写入安全策略
- `starwork doctor` 的检查边界
- `starwork adapt` 的 Agent 适配边界
- `starwork pack install content-creator` 与 Core / Pack 的边界

## 不在范围内

- 账号、授权、计费
- 消息平台 gateway
- 完整 Agent Runtime
- 复杂插件市场

## 正式事实源晋升目标

- `product/cli/`
- 如涉及结构化 schema，再晋升到 `product/schemas/`
