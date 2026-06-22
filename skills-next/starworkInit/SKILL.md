---
name: starworkInit
description: 'Create or connect StarWork project workbenches and project centers: choose project/hub, language, target path, dry-run, write, and doctor verification.'
starwork_channel: next
---

# starworkInit

使用这个 skill，把用户“创建 / 接入 / 初始化 StarWork 工作台或项目中心”的请求，带成安全的检查、预览、确认和写入流程。

`starworkInit` 不是 `starwork init` 命令本身。Skill 负责判断、解释、采访、预览、确认和整合入口规则；CLI 负责实际生成 dry-run、写入工作台文件和 doctor 检查。

## 主入口边界

如果用户只是询问产品总览、起步路径、安装入口或该用哪个 StarWork 能力，回到 `starwork` 主入口。`starworkInit` 只处理已经指向创建、接入、初始化项目工作台或项目中心的请求。

除非用户还在讨论阶段，否则不要停在蓝图或建议。用户明确说“创建、初始化、生成、改造成工作台”时，必须继续运行 CLI：先 `starwork init --dry-run`，得到用户确认后再 `starwork init --yes`，最后运行或建议运行 `starwork doctor --target <path>` 验证。

执行 `--yes` 前，必须先让用户确认最终绝对路径。AI 可以建议文件夹名，但必须说明可修改；不要把建议文件夹名当成用户已经同意的路径。

## Reference 加载规则

命中具体场景前，先读取对应 reference。reference 文件不存在或无法读取时，高风险动作必须停止，提示用户“Skill 安装不完整，请重新用完整目录安装 StarWork Skills”，并说明缺失文件路径。完整安装指 Skill 主文件、`references/` 和 `agents/` 随目录一起安装。

高风险动作包括：执行 `--yes`、合并入口规则、修改宿主规则、生成可执行 blueprint、写入定制规则。

| 场景 | 必读 reference |
| --- | --- |
| 判断用户意图 | `references/intent-routing.md` |
| 首次初始化或 MultiAgent 回流 | `references/friendly-onboarding.md`, `references/initialization-flow.md` |
| 标准 project / hub 初始化 | `references/initialization-flow.md`, `references/output-and-safety-rules.md` |
| 定制目录或规则 | `references/custom-blueprint.md`, `references/output-and-safety-rules.md` |
| 已有非空项目 | `references/existing-project-agent-docs.md`, `references/output-and-safety-rules.md` |
| 宿主适配 | `references/host-adapter-flow.md`, `references/existing-project-agent-docs.md` |
| 用户询问知识库 / Pack | `references/knowledge-and-pack-boundaries.md` |

`references/README.md` 说明完整目录安装和 reference 缺失停止规则。不要把长流程、完整 JSON blueprint 示例或大段命令序列堆回主 Skill。

## 第一屏必须先讲产品

用户第一次要求初始化、创建、接入或改造成 StarWork 工作台时，不要一上来问配置或直接给命令。先用用户语言说明：

```text
可以，我先简单说清楚 StarWork 在做什么。

StarWork 是给 AI 协作准备的项目工作台。它会把项目说明、当前任务、协作规则、交接记录和健康检查入口放到固定位置，让 AI 每次进入项目时不用从零猜上下文。

这次我会带你做三件事：
1. 确认这个工作台服务哪个项目；
2. 预览 StarWork 准备补哪些协作文件；
3. 你确认后再正式写入，并做一次检查。

我会先预览，不会直接改你的业务代码，也不会直接覆盖已有 AI 规则文件。
```

讲完产品后，再进入第一个问题，并说明为什么问。每次只问一个问题。不要一次性问完类型、语言、路径、结构、知识库和宿主。

## MultiAgent-only 回流第一屏

当用户是从 `starworkMultiagent` 回流过来，或用户只说“想开启多 AI 协作 / 多 Agent 分工，但这个项目还没接入”时，先用下面这段用户语言开场。不要先讲命令、参数或内部机制：

```text
我先把你带回安全接入这一步。

不是要打断你创建多 AI 分工，而是多个 AI 开始协作前，需要先确认三件事：
1. 这个项目是什么；
2. 当前正在推进什么；
3. 不同 AI 哪些内容能整理，哪些内容不能随便改。

我会先做一份写入预览，只告诉你准备补哪些协作入口和边界。
确认前不会改业务内容，也不会覆盖已有 AI 规则文件。
```

然后只问一个问题：

```text
你现在是想把当前已有项目接入 StarWork，还是新建一个空项目工作台试用？
```

## MultiAgent 快速起步规则

用户目标是“先开启多 AI 协作”时，默认只问最小必要信息：

1. 目标目录。
2. 新建还是已有项目。
3. 工作台语言。
4. 主要使用的 AI 工具；不确定可以跳过。
5. 如已有项目，读取现有入口并生成待整合草稿。

不要默认展开知识库、Pack、Capability、复杂目录定制或多个宿主同时适配。用户主动要求定制时，再进入完整初始化采访。

每一步提问前先说明目的：已有项目要保护原文件；目标目录决定预览；语言影响目录名和规则表达；主要 AI 工具决定入口文件，不会一次性改所有工具规则。

## 检查 / 预览 / 写入分层

所有写入前必须先检查和预览：

- 检查阶段只读。
- `dry-run` 是预览，不写入文件。
- `--yes` 只有在用户确认绝对路径、写入范围和风险后才能执行。
- 完成后运行或建议运行 `starwork doctor --target <path>`。

dry-run 复述必须包含：

```text
这是预览，还没有写入文件。

准备新增：
- ...

准备更新：
- ...

不会改动：
- 你的业务代码
- 已有非空 AI 规则文件

需要你确认：
- 目标路径是否正确
- 是否接受这些 StarWork 协作入口
- 是否继续合并待整合草稿
```

## 已有项目和 pending merge

已有项目 dry-run 前必须先说明：

```text
我检测到这是已有项目时，会按更保守的方式处理：
- 保留你的业务代码和现有资料；
- 不直接覆盖已有 AGENTS.md、README.md、CLAUDE.md 或其他 AI 规则入口；
- 先生成待整合草稿；
- 让你确认后再合并入口说明。
```

已有非空项目必须走 `--agent-docs draft`。不要直接覆盖 `AGENTS.md`、`README.md`、`CLAUDE.md` 或宿主入口；读取 `.starwork/drafts/agent-docs-plan.json` 和 proposed 草稿后，再根据项目上下文整合。

如果出现 `pending merge` / `pending_merge` / 待整合状态，不要说多 AI 协作已经完全可用。要分层说明：

```text
工作台骨架已经写入，但 AI 入口还没有最终生效。
因为你的项目已有规则文件，我只生成了待整合草稿，没有直接覆盖。

下一步我会把现有规则和 StarWork 建议放在一起，让你确认后再合并。
```

## 成功状态口径

成功汇报要分层，不要混成一个状态：

- 已完成检查。
- 已完成写入预览。
- 工作台骨架已写入。
- AI 入口待整合或已生效。
- doctor 检查通过或还有待处理项。
- MultiAgent 可以继续设计 AI 岗位，或需要先补齐入口 / 边界。

## 安全边界

- 不覆盖用户已有业务文件。
- 不把初始化报告、dry-run 结果、doctor 结果、npm 安装过程写进 `AGENTS.md` 或 `.starwork/rules/*.md`。
- 不把 `adapter profile`、`host_native_dirs`、`workspace schema` 这类内部词讲给小白用户。
- 不让 blueprint 决定真实 target 路径；目标路径必须来自命令参数或用户明确确认。
- 不把知识库和 Pack 放进默认采访链路；用户主动要求时再读取对应 reference。
