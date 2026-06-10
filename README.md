# StarWork

StarWork 是给 AI 协作准备的项目工作台。

它帮你把一个普通项目目录整理成 AI 能长期理解和接手的工作环境：项目是什么、现在在做什么、哪些文件能改、重要资料在哪里、上一个 AI 会话交接了什么，都有固定位置可读。

如果你经常遇到这些情况，StarWork 就是为你准备的：

- 每次打开 AI，都要重新解释项目背景。
- 换一个 AI 会话后，上下文又断了。
- 项目资料、草稿、最终版本混在一起，AI 也分不清。
- 想让多个 AI 分工协作，但不知道谁负责什么。
- 项目做久了，重要判断、经验和交接记录散落在聊天里。

StarWork 做的事情很简单：把项目变成一个 AI 看得懂、你也放心的工作台。

## StarWork 能帮你做什么

### 让 AI 先读懂项目

StarWork 会给项目补上清晰的项目说明、当前任务、协作规则和健康检查入口。AI 进入项目时，不需要从零猜上下文。

### 保护你的项目文件

第一次接入项目时，StarWork 会先预览将要写入的协作文件，不会直接改业务代码，也不会直接覆盖已有 AI 规则文件。

### 留住长期知识

你可以开启项目知识库，把客户背景、产品规则、术语解释、长期策略和复盘结论沉淀下来。原始资料仍放在资料区，临时草稿仍放在草稿区。

### 支持多个 AI 分工

你可以给一个项目创建产品规划、开发、验收、资料整理等不同 Agent。StarWork 会记录每个 Agent 的职责、可写范围、共享输出和交接状态。

### 管理多个项目

如果你有很多项目，可以建立一个项目中心，再从项目中心创建新的项目工作台，统一登记和巡检。

## 它不是什么

StarWork 不是另一个笔记软件，也不是自动替你写完整项目的黑盒。

它更像一套项目协作底座：帮 AI 找到正确上下文，帮你保留规则、边界、任务、知识和交接记录。

## 第一次使用

最推荐的方式：让你的 AI 助手带你完成。

把下面这段话发给 Codex、Claude Code、Cursor 或你正在使用的 AI 工具：

```text
请用 `starwork` 主入口帮我开始使用 StarWork。

请先阅读 StarWork 引导文档，理解 StarWork 是什么：
https://raw.githubusercontent.com/jennie-shawn/StarWork/main/README.md

如果本机还没有安装 StarWork CLI 或 Skills，请先按这份 Agent 安装指南完成安装：
https://raw.githubusercontent.com/jennie-shawn/StarWork/main/docs/agent-install-guide.md

请先说明 StarWork 是什么、能帮我做什么、接下来我应该走哪个能力。
然后先预览将要写入的文件，不要直接写入。
等我确认后，再正式初始化并运行健康检查。
```

如果你想自己在终端试用，也可以先用 `npx` 预览，不需要全局安装：

```bash
npx @jennie-shawn/starwork init \
  --type project \
  --pack general \
  --language zh \
  --target ~/Desktop/my-starwork-project \
  --dry-run
```

确认预览没问题后再写入：

```bash
npx @jennie-shawn/starwork init \
  --type project \
  --pack general \
  --language zh \
  --target ~/Desktop/my-starwork-project \
  --yes
```

最后检查工作台：

```bash
npx @jennie-shawn/starwork doctor --target ~/Desktop/my-starwork-project
```

## 三种常见用法

### 我只是想试试

创建一个新的空项目工作台。StarWork 会生成一套推荐结构，你可以安全体验。

### 我已经有一个真实项目

把现有项目接入 StarWork。它会保留已有文件，先预览要补充的协作结构；如果项目里已经有 AI 规则文件，会先生成待整合草稿，不直接覆盖。

### 我有很多项目

创建项目中心。项目中心用来登记多个项目，再为每个项目创建自己的工作台。

## 你还可以开启的功能

StarWork 的基础能力是“让 AI 读懂并安全接手项目”。在此基础上，你可以按需要开启更多功能。

### 项目知识库

适合资料多、规则多、需要长期复用背景的项目。你可以把客户信息、产品规则、术语解释、复盘结论和长期判断沉淀到项目知识库里，让后续 AI 不再只依赖聊天记录。

### 多智能体分工

适合一个项目里有多类工作要同时推进的情况。你可以把产品规划、开发、验收、资料整理等职责分给不同 Agent，StarWork 会记录每个 Agent 负责什么、能改哪里、要交接什么。

### 项目中心

适合同时管理多个项目的用户。项目中心可以登记多个项目工作台，帮助你从一个入口创建、查看和巡检不同项目。

### 旧项目诊断

适合已经有很多历史文件、AI 规则或旧模板的目录。StarWork 可以先诊断目录状态，再给出保守的接入或升级建议。

## 给 AI 工具安装 StarWork Skills

如果你希望 AI 更懂 StarWork 的使用流程，可以安装 StarWork Skills。安装后，普通请求先交给 `starwork` 主入口；明确的知识库、多智能体、诊断或初始化场景，也可以直接点名对应专家能力。

当前默认面向 Codex：

```bash
npx skills add jennie-shawn/StarWork -g -a codex -y
```

安装后，AI 会拥有一个 StarWork 主入口和几个专家 Skills，可以更自然地帮你：

- 判断你现在应该走哪个 StarWork 能力。
- 创建或接入项目工作台。
- 诊断旧目录能否升级为 StarWork 工作台。
- 开启和维护项目知识库。
- 创建多个 Agent 分工协作。

更完整的安装说明见 [Agent 安装指南](docs/agent-install-guide.md)。

## 当前状态

StarWork 目前处于 alpha 测试阶段，适合愿意尝鲜、愿意反馈体验问题的用户。

当前版本重点关注：

- 第一次初始化是否容易理解。
- 预览和写入是否让人放心。
- AI 是否能正确读取项目规则。
- 知识库和多 Agent 分工是否真的减少重复解释。
- 项目中心是否适合管理多个项目。

如果你正在试用，欢迎重点反馈：哪里看不懂、哪里不放心、哪里不像一个普通用户会说的话。

## 继续了解

- [A 测安装指南](docs/alpha-test-guide.md)
- [Agent 安装指南](docs/agent-install-guide.md)
- [CLI 与 Skill 能力表](docs/cli-skill-registry.html)
