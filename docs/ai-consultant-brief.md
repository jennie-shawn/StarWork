# StarWork AI 顾问简报

日期：2026-06-10

本文面向第一次接触 StarWork 的外部 AI 顾问，目标是让顾问快速理解：

- StarWork 是什么，以及它不是什么。
- 当前产品已经做到哪里。
- 本仓库各个文件夹分别承担什么职责。
- 哪些问题已经有明确决策，哪些仍在设计中。
- 顾问可以从哪些角度提出优化意见。

## 10 分钟版概览

StarWork 是给 AI 协作准备的项目工作台。

它不是一个新的 Agent Runtime，也不是单纯的文件夹模板。它的核心价值是把用户的真实项目整理成 AI 能长期理解、接手、分工、复盘和审计的工作环境。

StarWork 解决的问题：

- 用户每次打开 AI 都要重新解释项目背景。
- 换一个 Agent 或会话后，上下文断掉。
- 项目资料、草稿、最终成果和任务记录混在一起。
- 多个 Agent 可以同时工作，但缺少职责、边界、交接和验收机制。
- 重要判断、经验和问题修复散落在聊天记录里，无法沉淀成项目事实。

StarWork 的产品心智可以概括为：

```text
不要让一个 Agent 扮演所有角色；
让系统把目标拆成可分配、可验收、可沉淀的协作循环。
```

## 产品定位

StarWork 是跨 Agent 的 AI 工作系统套件，服务 Codex、Claude Code、Cursor、Trae 等 AI 工具。

它的产品价值在“工作系统层”：

- Core 定义 AI 工作区协议。
- CLI 负责生成、检查、适配、安装和修复。
- Skills 负责帮助 Agent 判断用户意图、生成方案和安全调用 CLI。
- Packs 负责把通用工作台扩展成具体场景工作流。
- Adapters 负责不同 AI 宿主的入口、能力探测和降级策略。
- Agent Lanes 负责多 Agent 分工、写入边界、共享输出和跨会话指令。

StarWork 不做的事情：

- 不自研完整 Agent Runtime。
- 不依赖单一宿主。
- 不把所有协作能力塞进一个大 prompt。
- 不把项目正式事实藏进 `.starwork/`。
- 不把课程材料直接放进产品项目。

## 四层产品结构

StarWork 当前按四层思考：

| 层级 | 作用 | 当前项目位置 |
|---|---|---|
| Core | AI 工作区协议、结构边界、必需入口和能力模型 | `product/core/` |
| CLI | 初始化、体检、适配、Pack、知识库、多 Agent 等命令 | `product/cli/` |
| Packs | 面向场景的工作流包，例如通用工作、项目中心、自媒体 | `product/packs/` |
| Course | 方法论、教学、陪跑、商业转化 | 不在本仓库，继续由 `珍妮丁丁GFM` 承载 |

本项目只承载 StarWork 产品本体：Core、CLI、Packs、Skills、Adapters、Schemas、Examples、Docs、Planning、Releases。

## 当前阶段

当前 StarWork 处于 alpha 测试稳定化阶段。

公开包：

```text
@jennie-shawn/starwork@0.1.0-alpha.20
```

截至 2026-06-10，已经完成或基本完成：

- Core v0.1 协议和 Project / Hub 两类 Kit 方向。
- `starwork init`、`doctor`、`spawn`、`adapt`、`pack install`、`knowledge`、`multiagent` 等 CLI 主链路。
- General Pack 与 Hub Management Pack 的稳定 A 测口径。
- Knowledge Capability v0.1。
- Host Adapter v0.2：Codex / Claude Code / Cursor / Trae 的能力边界和降级策略。
- MultiAgent v0.7：Codex 主流程改为由 `starworkMultiagent` 直接调用 Codex 标准会话工具，CLI 只做模板、状态和降级辅助。
- Project Structure v0.2：初始化第一屏、dry-run、确认写入和 Init-family Skill 体验优化。
- Skill Management v0.2：本地正在推进 `starwork` 主入口 Skill + 专家 Skill 分层。

近期正在讨论或准备推进：

- Release Hygiene / A 测稳定化。
- Golden Demo Workspaces。
- Lane Workbench / Agent Workbench：让每个 Agent lane 拥有自己的岗位工作台机制，而不是只有一个空 workspace 目录。
- Content Creator Pack MVP。

## 关键产品概念

### 工作台

StarWork 把一个普通项目目录整理成 AI 能读懂的工作台。

工作台里有固定入口：

- 项目是什么。
- 当前正在做什么。
- AI 应该读哪些规则。
- 哪些文件可以修改。
- 重要决策在哪里。
- 问题和反馈如何跟踪。
- 多 Agent 怎么分工和交接。

### `.starwork/`

`.starwork/` 是机制运行层，只放 StarWork 机制运行需要的状态、索引、manifest、缓存、报告和 adapter state。

它不放项目正文、草稿、知识、正式成果、Agent worklog 或产品事实。

判断规则：

> 如果这个内容脱离 StarWork 仍有独立业务价值，就不应该放入 `.starwork/`。

### `product/`

`product/` 是 StarWork 产品事实源。

凡是会进入正式产品、协议、CLI、Pack、Skill、Adapter、用户文档、发布材料或产品规划的内容，都应该进入 `product/`。

### Agent Lanes

Agent Lanes 是 StarWork 的多 Agent 分工机制。

它追踪的是“职责位”，不是“任务”：

```text
lane = 稳定职责位
session = 当前接手该职责位的 Agent 会话
worklog = 该职责位的持续工作记录
workspace = 该职责位的过程工作区
write_scope = 该职责位可以主动修改的范围
```

示例 lane：

- CEO / product-planning
- development
- feedback-issues
- visual
- operations
- feature-research
- capability-research

### Lane Workbench

这是最新讨论中的产品概念。

当前已有 `workspace/`，但它更像一个空目录。用户指出：AI 不会主动使用空 workspace，它需要随职位出现而自动生成岗位机制。

初步判断：

```text
lane workspace 应从过程存放目录升级为岗位工作台。
```

每个 lane 创建时，应自动生成适合该职责的结构，例如：

```text
_系统/协作/lanes/<lane-id>/
  worklog.md
  workspace/
    README.md
    active/
    drafts/
    notes/
    evidence/
    handoff/
```

不同岗位可有不同 scaffold：

- CEO：`agenda/`、`delegations/`、`review-queue/`、`retrospectives/`
- Development：`patch-plans/`、`implementation-notes/`、`test-results/`
- Feedback：`incoming-feedback/`、`evidence/`、`triage-notes/`、`issue-drafts/`
- Research：`sources/`、`comparisons/`、`synthesis/`
- Visual：`references/`、`concepts/`、`assets/`、`prototypes/`

这个能力尚未形成正式 SPEC，但可能会成为后续重要产品方向。

## 产品机制概览

### 初始化

用户可以通过 `starwork init` 创建或接入项目工作台。

关键原则：

- 先解释 StarWork 是什么。
- 先 dry-run 预览。
- 不直接覆盖业务代码。
- 不直接覆盖已有 AI 规则文件。
- 用户确认后再写入。
- 写入后运行 `doctor` 检查。

### 体检与升级

`starwork doctor` 检查工作台健康状态。

`starworkDoctor` Skill 负责解释 doctor 结果，判断旧目录是否适合接入或升级。

升级原则：

- CLI 只执行确认过的 blueprint。
- Skill 负责判断目录语义和生成方案。
- 保守迁移，不自动破坏用户原目录。

### 知识库

Knowledge Capability 是可选能力。

它不再是 Project Kit 的默认目录，而是通过 `starwork knowledge` 按需开启。

知识库适合沉淀：

- 长期背景。
- 术语。
- 产品规则。
- 客户信息。
- 复盘结论。
- 多次任务都会复用的稳定知识。

### 多 Agent

MultiAgent 不是简单创建多个聊天窗口。

它要求：

- 每个 Agent 有明确 lane。
- 每个 lane 有写入边界。
- 每个 lane 有 worklog 和 workspace。
- 跨 lane 输出登记到 `shared.md`。
- 跨会话指令必须区分“已投递”和“任务已完成”。
- 无法自动投递时必须给出可复制 handoff message，不能假装已通知。

### Host Adapters

StarWork 不假设所有宿主能力一样。

当前口径：

- Codex：可使用标准会话工具创建、投递、读取、改名、置顶、归档。
- Claude Code：主要依赖规则入口和 transcript / resume 能力。
- Cursor：只做 transcript 只读摘要和 `cursor agent status` 安全探测，不做自动跨 IDE 会话投递。
- Trae：收敛为人工宿主，不读取私有会话存储。

### Skills

StarWork Skill 分四层：

| 层级 | 位置 | 是否全局安装 | 作用 |
|---|---|---:|---|
| L0 主入口 | `product/skills/starwork/` | 是 | 产品解释、安装引导、模糊意图路由 |
| L1 系统专家 | `product/skills/starworkInit/` 等 | 是 | 初始化、诊断、知识库、多 Agent |
| L2 Kit 自带 | `product/kit-skills/` | 否 | 项目中心或项目工作台自带能力 |
| L3 Capability 项目内 | `product/core/capabilities/<capability>/skills/` | 否 | 能力开启后写入项目的维护能力 |

最新方向不是取消专家 Skill，而是：

```text
starwork 主入口路由 + 专家 Skill 保留直接触发
```

尤其 `starworkMultiagent` 必须继续直接触发，因为它涉及宿主工具、跨会话安全和多 Agent 编排。

## 仓库目录导览

### 根目录

```text
/Users/shuxinding/satellite-starwork/
```

这是 StarWork 产品卫星项目的工作台外壳。

根目录不是主要产品仓库；`product/` 才是产品 Git 仓库。

重要文件：

| 路径 | 说明 |
|---|---|
| `AGENTS.md` | 当前项目给 Agent 的最高优先级工作规则和路由规则 |
| `CLAUDE.md` | Claude Code 兼容入口规则 |
| `README.md` | 当前 StarWork 产品工作台说明 |
| `.core-sync.json` | 与主库同步的 legacy 状态 |
| `.starwork/` | StarWork 机制运行层 |
| `_系统/` | 当前项目自己的系统层和协作层 |
| `identity/` | 从主库同步的身份信息快照，默认只读参考 |
| `lessons/` | 从主库同步的跨项目教训快照，默认只读参考 |
| `.internal/` | 主库内部协议快照，默认只读参考 |
| `.agents/skills/` | 当前项目内 Agent skill 挂载入口 |
| `.claude/skills/` | Claude Code skill 挂载入口 |
| `product/` | StarWork 产品事实源和产品 Git 仓库 |

### `_系统/`

当前 StarWork 产品工作台的系统层。

重点路径：

| 路径 | 说明 |
|---|---|
| `_系统/上下文/current-projects.md` | 当前项目状态 |
| `_系统/上下文/decisions.md` | 高影响决策记录 |
| `_系统/上下文/product-principles.md` | 产品原则 |
| `_系统/任务/current-work.md` | 当前工作入口 |
| `_系统/协作/agent-lanes.md` | 当前 Agent Lanes 定义 |
| `_系统/协作/shared.md` | 跨 Agent 共享输出和请求 |
| `_系统/协作/lanes/` | 各 lane 的 worklog 和 workspace |
| `_系统/跨项目/` | 与其他项目的联络记录 |

顾问一般不需要直接修改 `_系统/`，但应理解它是 StarWork 自己吃自己产品能力的样板。

### `.starwork/`

机制运行层。

重点路径：

| 路径 | 说明 |
|---|---|
| `.starwork/workspace.json` | 工作台身份、类型、语言、Pack 等机器状态 |
| `.starwork/skills.json` | 项目技能 manifest |
| `.starwork/agent-lanes/state.json` | lane 与宿主 session 的绑定状态 |
| `.starwork/handoff/` | 跨项目联络队列 |

`.starwork/` 中的内容是机制状态，不是产品说明文档，也不是业务事实源。

### `product/`

StarWork 产品事实源。

这是顾问最应该阅读的目录。

| 路径 | 说明 |
|---|---|
| `product/README.md` | 面向用户的 StarWork 介绍和第一次使用入口 |
| `product/core/` | Core 协议、Kit、Capability、运行层边界 |
| `product/cli/` | CLI 源码、测试和命令级规格 |
| `product/skills/` | 全局系统级 StarWork Skills |
| `product/kit-skills/` | Kit 自带 Skills，不全局安装 |
| `product/packs/` | 场景工作流包 |
| `product/adapters/` | Codex、Claude Code、Cursor、Trae 等宿主适配规则 |
| `product/schemas/` | CLI / Core / Pack 使用的 schema |
| `product/examples/` | 示例工作台或示例片段 |
| `product/docs/` | 用户文档、安装指南、路线图和 HTML 阅读稿 |
| `product/planning/` | 功能档案、SPEC、issue、决策、验收和规划 |
| `product/releases/` | 发布材料和 release 包 |

### `product/core/`

Core 是 StarWork 的协议层。

推荐阅读：

- `product/core/README.md`
- `product/core/core-v0.1-protocol.md`
- `product/core/starwork-runtime-layer-spec.md`
- `product/core/agent-lanes-spec.md`
- `product/core/skill-management-spec.md`
- `product/core/kits/two-kit-architecture-spec.md`

子目录：

| 路径 | 说明 |
|---|---|
| `baseline/` | 所有 Core 工作台都需要遵守的共同语义 |
| `profiles/` | 语言、路径、模板映射，例如中文和英文 |
| `capabilities/` | 可选能力，如 knowledge、agent-lanes、local-identity |
| `presets/` | 面向用户状态的组合配方 |
| `kits/` | 可复制的参考工作台结构 |
| `legacy/` | 历史 Kit 和旧结构参考 |

### `product/cli/`

CLI 是 StarWork 的确定性执行层。

重点：

| 路径 | 说明 |
|---|---|
| `product/cli/src/cli.js` | 当前 CLI 主实现 |
| `product/cli/bin/starwork.js` | 可执行入口 |
| `product/cli/test/init.test.js` | 当前主要回归测试 |
| `product/cli/README.md` | CLI 说明 |
| `product/cli/spawn-blueprint-spec.md` | spawn blueprint 规格 |

CLI 负责：

- `init`
- `doctor`
- `spawn`
- `audit`
- `repair`
- `upgrade`
- `adapt`
- `pack install`
- `knowledge`
- `multiagent`

### `product/skills/`

系统级全局 Skills。

当前重点：

| Skill | 说明 |
|---|---|
| `starwork/` | L0 主入口，解释 StarWork、安装引导、模糊意图路由 |
| `starworkInit/` | 创建或接入项目工作台 |
| `starworkDoctor/` | 诊断旧目录、解释 doctor、生成升级方案 |
| `starworkKnowledge/` | 开启和维护项目知识库 |
| `starworkMultiagent/` | 多 Agent lane、跨会话消息、Codex 标准会话工具 |

顾问应特别关注：

- 主 Skill 和专家 Skill 的边界是否清楚。
- L0 / L1 / L2 / L3 分层是否降低用户认知成本。
- `starworkMultiagent` 是否应该继续强直接触发。

### `product/kit-skills/`

Kit 自带 Skills，不作为全局系统 Skill 安装。

| Skill | 说明 |
|---|---|
| `starworkSpawn/` | 项目中心创建项目工作台 |
| `starworkAudit/` | 项目中心巡检和保守修复 |
| `neat-freak/` | 项目阶段收尾、整理、归档 |

### `product/packs/`

场景工作流包。

| Pack | 当前定位 |
|---|---|
| `general/` | 通用工作目录和规则 |
| `hub-management/` | 项目中心管理 |
| `content-creator/` | 内容创作者 Pack，后续场景验证方向 |

Pack 当前采用语言无关业务角色 + `languages/zh.json` / `languages/en.json` 的落地方式。

### `product/adapters/`

宿主适配层。

| 路径 | 说明 |
|---|---|
| `codex/` | Codex 适配规则 |
| `claude-code/` | Claude Code 适配规则 |
| `cursor/` | Cursor 适配规则 |
| `trae/` | Trae 适配规则 |
| `contract.md` | Host Adapter 合同 |
| `README.md` | Adapter 总览 |

### `product/planning/`

产品规划事实源。

这是顾问理解“为什么这么设计”的关键目录。

| 路径 | 说明 |
|---|---|
| `features/` | 按功能归档的 SPEC、讨论、验收和参考 |
| `issues/` | 本地 issue 跟踪台账 |
| `decisions/` | 跨功能产品决策 |
| `roadmap/` | 路线图和阶段复盘 |
| `archive/` | 历史 matters 和旧过程材料 |
| `inbox/` | 暂未分拣材料 |

当前功能档案：

- `host-adapters/`
- `knowledge-base/`
- `multiagent/`
- `project-structure/`
- `skill-management/`

### `product/docs/`

正式产品文档和发布说明。

推荐阅读：

- `product/docs/product-direction.md`
- `product/docs/roadmap.md`
- `product/docs/alpha-test-guide.md`
- `product/docs/agent-install-guide.md`
- `product/docs/cli-skill-registry.html`

### `product/releases/`

发布材料和示例 release 工作台。

当前包含 `starwork-project-zh-general/`，用于验证中文 general project 的发布结构。

## 推荐阅读路径

### 如果只有 30 分钟

1. `product/README.md`
2. `product/docs/product-direction.md`
3. `product/docs/roadmap.md`
4. `product/planning/features/README.md`
5. `product/core/README.md`
6. `product/skills/README.md`

### 如果要看产品机制

1. `product/core/core-v0.1-protocol.md`
2. `product/core/starwork-runtime-layer-spec.md`
3. `product/core/agent-lanes-spec.md`
4. `product/core/skill-management-spec.md`
5. `product/planning/features/multiagent/README.md`
6. `product/planning/features/skill-management/specs/v0.2-main-router-and-specialist-skills.md`

### 如果要看当前问题和风险

1. `product/planning/issues/index.md`
2. `product/planning/features/project-structure/specs/v0.2-init-onboarding-language.md`
3. `product/planning/features/multiagent/specs/v0.7-codex-standard-session-tools.md`
4. `product/planning/features/host-adapters/specs/v0.2-cursor-session-adapter.md`
5. `_系统/协作/lanes/product-planning/worklog.md`

### 如果要看工程实现

1. `product/cli/src/cli.js`
2. `product/cli/test/init.test.js`
3. `product/skills/starwork/SKILL.md`
4. `product/skills/starworkMultiagent/SKILL.md`
5. `product/adapters/contract.md`

## 当前需要外部顾问重点评价的问题

### 1. 产品定位是否清晰

StarWork 现在的定位是“AI 工作系统套件”，不是 Runtime，也不是模板。

请评估：

- 这个定位是否容易被普通用户理解？
- “项目工作台”这个词是否足够准确？
- 是否需要更强的类比或一句话卖点？

### 2. 主入口与专家 Skill 是否合理

当前方向是 `starwork` 主入口 + 专家 Skill 直接触发。

请评估：

- 是否会降低新用户认知成本？
- 专家 Skill 是否仍过多？
- `starworkMultiagent` 保留强直接触发是否合理？
- README 是否应该只暴露主入口，还是适度介绍专家能力？

### 3. MultiAgent 是否形成真正产品壁垒

当前 MultiAgent 已有 lane、write_scope、worklog、shared、cross-lane request、Codex 标准会话工具。

正在思考的下一步是 Lane Workbench。

请评估：

- Lane Workbench 是否应该成为核心能力？
- lane workspace 应该多结构化？
- 是否需要 CLI 支持 `promote`、`review`、`archive` 等操作？
- 如何避免 workspace 变成新的垃圾堆？

### 4. `.starwork/` 与项目内容层边界是否清楚

当前原则是 `.starwork/` 只放机制运行状态。

请评估：

- 这个边界是否适合普通用户理解？
- 哪些内容应该可见，哪些应该隐藏？
- 是否需要 doctor 更强地检查边界漂移？

### 5. 当前目录结构是否过重

StarWork 自己作为产品项目，结构很完整，但也比较复杂。

请评估：

- 新用户看到这个仓库会不会被吓到？
- 哪些目录是产品必需，哪些只是当前研发过程需要？
- README 是否需要更清晰地区分“用户使用 StarWork”和“开发 StarWork 产品”？

### 6. 场景 Pack 的优先级

当前稳定 Pack 是 `general` 和 `hub-management`，`content-creator` 仍是后续验证方向。

请评估：

- 是否应该尽快用 Content Creator Pack 证明场景价值？
- 还是应先把 core / CLI / multiagent / skill management 稳定到更低摩擦？
- 最小可演示 Demo Workspace 应该是什么？

### 7. 商业化路径

当前判断：

- Core 和 CLI 提供可信底座。
- Packs 提供场景价值。
- Course 和陪跑提供转化和高客单。

请评估：

- 开源 Core + CLI 是否足够形成传播？
- Packs 是否应该作为商业化重点？
- Course 与产品之间的边界是否清楚？

## 已知风险

1. 产品概念多：Core、Kit、Pack、Skill、Adapter、Capability、Lane、Workbench 容易让新人迷路。
2. 工作台结构强，但初次使用必须足够轻。
3. 多 Agent 协作如果没有 gate / report / promote 机制，容易退回多个聊天窗口。
4. Host Adapter 能力差异很大，不能对用户承诺过度自动化。
5. `product/` 是 Git 仓库，根目录不是；顾问如果做工程建议要注意这个边界。
6. 旧历史结构和当前结构存在漂移，例如 legacy `matters/` 心智、旧 Runtime spike 参考、部分 doctor 状态仍可能引用旧路径。
7. 当前有本地未提交的 Skill Management v0.2 相关改动，顾问阅读时应区分“已发布 alpha.20”和“本地正在推进的下一步”。

## 给顾问的输出期望

如果你作为外部 AI 顾问阅读本项目，请优先给出：

1. 产品定位和叙事优化建议。
2. 目录结构和信息架构优化建议。
3. Skill / CLI / Pack / MultiAgent 的边界问题。
4. Lane Workbench 是否值得作为核心能力，以及最小可行设计。
5. 从 alpha 到外部可推广版本的优先级排序。
6. 哪些机制可能过度设计，哪些机制反而还不够。
7. 普通用户第一次使用时最可能卡住的地方。

请尽量把建议分成：

- 必须现在改。
- 可以 alpha 期间改。
- 可以 v0.2 再考虑。
- 不建议做。

