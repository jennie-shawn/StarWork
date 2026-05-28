# 项目中心 Kit

Preset: `hub`

适合希望统一管理多个项目工作台的用户。项目中心是共享资产、项目注册、跨项目路由、回写审核和通用能力草稿的管理层，不是具体项目工作台。

## 包含

- `AGENTS.md`
- `.starwork/workspace.json`
- `.starwork/skills.json`
- `.starwork/handoff/`
- `.internal/`
- `.incoming/`
- `projects/registry.json`
- `projects/coordination/`
- `identity/`
- `lessons/`
- `knowledge/`
- `skills/`
- `workspace/`

`.starwork/` 是 StarWork 机制运行层。项目中心的 `identity/`、`lessons/`、`knowledge/`、`skills/`、`projects/` 和 `.incoming/` 都是可理解、可审核的工作区内容，不放进 `.starwork/`。

## 不包含

- 业务项目的正式事实源
- 直接承载具体项目进度正文
- 单项目的当前项目状态和当前工作入口
- `templates/`
- 自媒体、产品经理等业务 Pack

从项目中心创建项目工作台应由 `starwork spawn` 完成。
