# StarWork 项目中心规则

## 开始前先读

1. `projects/registry.json`
2. `projects/coordination/README.md`
3. `skills/registry.json`
4. `.incoming/`
5. `workspace/README.md`

## 项目中心职责

- 维护跨项目共享身份、教训、知识和正式 skills。
- 维护项目注册表和跨项目联络中央路由。
- 审核中心管理项目工作台的回写候选。
- 在 `workspace/` 中开发通用规则草稿、实验和 skill 原型。

## 写入边界

- 项目注册信息写入 `projects/registry.json`。
- 跨项目中央路由写入 `projects/coordination/`。
- 项目中心自己的本地收发队列写入 `.starwork/handoff/`。
- 候选共享内容先写入 `.incoming/`，审核后再合并。
- 草稿、实验和未定稿通用能力只能先写入 `workspace/`。
- 正式共享资产写入 `identity/`、`lessons/`、`knowledge/`、`skills/`。
- 具体项目的进度正文留在各自项目工作台内，不复制进项目中心。

## 需要确认

- 修改身份、教训、共享知识或正式 skill。
- 合并 `.incoming/` 中的候选内容。
- 创建、暂停或归档项目注册。
