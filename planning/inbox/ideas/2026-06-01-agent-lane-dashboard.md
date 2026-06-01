# Agent Lane 集中管理与任务分发看板

## 来源

- 来源类型：用户想法
- 提出人 / 来源渠道：用户在 product-planning side conversation 中提出
- 日期：2026-06-01

## 原始描述

可以将会话下已注册的 Agent Lane 集中管理，然后通过一个看板来监控状态，分发任务。

## 初步理解

这个需求是在现有 `starwork multiagent` 和 Agent Lanes 机制之上，增加一个更直观的管理层。

它可能用于查看当前项目里有哪些 Agent Lane、每个 lane 绑定了哪个会话、当前状态是什么、有什么共享输出、是否有待处理请求，以及是否需要给某个 lane 分发任务。

## 影响范围

- Core：可能需要扩展 Agent Lane 状态模型，例如任务、状态、待办、阻塞、优先级。
- CLI：可能需要增强 `starwork multiagent status/share`，或新增任务分发相关命令。
- Skill：可能需要一个帮助用户规划、分发和同步多 Agent 工作的 skill。
- Kit / Pack：可能作为项目工作台高级协作能力，不应默认强塞所有项目。
- Docs：需要解释 Agent Lane 看板和普通任务管理看板的区别。
- 产品体验：需要看板视图，用于监控 lane 状态和分发任务。

## 当前判断

- 状态：inbox
- 优先级：未判断
- 是否已有相关功能档案：已有相关能力 `multiagent`，但是否进入该 feature 需进一步判断
- 可能归属：`product/planning/features/multiagent/` 或新建 `agent-lane-dashboard`

## 下一步

- 判断这个看板是 `multiagent` 能力的一部分，还是一个独立的 UI / 管理能力。
- 梳理最小状态字段：lane、session、status、current task、blocked by、shared outputs、last updated。
- 判断任务分发是否只记录在 StarWork 本地，还是需要和会话/Agent 工具联动。

## 备注

这个需求可能比个人任务看板更贴近 StarWork 当前产品主线，因为已有 Agent Lanes 和 `starwork multiagent` 基础。
