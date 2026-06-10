---
name: starwork
description: 'Primary StarWork entrypoint: explain what StarWork is, guide installation, route fuzzy requests to init, doctor, knowledge, multiagent, or project-center flows.'
---

# starwork

使用这个 skill 作为 StarWork 的统一入口。它负责产品解释、安装引导、模糊意图判断和能力路由，不复制专家 Skill 的完整流程。

## 第一屏

当用户说“StarWork 是什么”“怎么开始”“帮我用 StarWork”“把这个项目接入 StarWork”但还没有明确专家场景时，先这样回答：

```text
StarWork 是给 AI 协作准备的项目工作台。

它会把项目说明、当前任务、协作规则、交接记录和健康检查入口放到固定位置，让 AI 每次进入项目时不用从零猜上下文。

我会先判断你现在是哪种情况，再带你走对应流程。整个过程会先预览，不会直接改业务代码，也不会直接覆盖已有 AI 规则文件。
```

然后只问一个问题：

```text
你现在是想：
1. 安装 StarWork；
2. 创建或接入一个项目工作台；
3. 诊断一个旧目录；
4. 开启知识库；
5. 创建多个 Agent 分工；
6. 管理项目中心？
```

如果用户已经表达清楚意图，不要重复问，直接路由。

## 路由

完整路由规则见：

```text
references/routing.md
```

常用判断：

- 安装 StarWork、让 AI 会用 StarWork：按 `references/install.md` 引导安装 CLI 和 Skills。
- 创建、接入、初始化项目工作台或项目中心：进入 `starworkInit`。
- 诊断旧目录、解释 doctor 结果、设计升级方案：进入 `starworkDoctor`。
- 开启、检查、维护项目知识库：进入 `starworkKnowledge`。
- 多 Agent 分工、lane、跨会话消息、Codex 会话控制：进入 `starworkMultiagent`。
- 从项目中心创建项目：如果当前工作台有项目中心 Kit，使用 `starworkSpawn`；否则先引导用户回到项目中心或创建项目中心。
- 巡检项目中心：如果当前工作台有项目中心 Kit，使用 `starworkAudit`。
- 阶段收尾、整理、归档：如果当前工作台有 `neat-freak`，优先使用它。

## 安装

安装最小流程见：

```text
references/install.md
```

安装阶段只做 CLI + 全局系统 Skills 安装和验证，不初始化工作台，不创建测试目录。

全局系统 Skills 是：

- `starwork`
- `starworkInit`
- `starworkDoctor`
- `starworkKnowledge`
- `starworkMultiagent`

Kit 自带 Skill 和 Capability 项目内 Skill 只在对应工作台或能力开启后出现。

## 边界

- 不维护另一套初始化、知识库、诊断或多 Agent 详细流程。
- 不假设宿主支持自动 Skill-to-Skill 调用；用文本级路由契约说明下一步。
- 不在用户确认前执行写入命令。
- 不把 Kit 自带 Skill 当成全局系统 Skill。
- 不把普通资料整理误判成知识库能力；长期稳定知识才进入 `starworkKnowledge`。
