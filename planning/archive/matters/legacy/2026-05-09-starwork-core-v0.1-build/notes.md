# 过程笔记

## 已接收上下文

- StarWork 是跨 Agent 的 AI 工作系统套件，不是自研完整 Agent Runtime，也不是单纯文件夹模板。
- Core 是开源 AI 工作区协议，负责可信度、标准和传播。
- Core v0.1 必须保持跨行业、跨场景、跨 Agent，不混入自媒体内容创作者 Pack 的专属逻辑。
- 本项目正式产品事实源在 `product/`，过程材料在 `matters/`。
- 旧 `/Users/shuxinding/Project/StarWork` 只作为 `legacy runtime spike` 参考，不作为新版 Core 基础。

## Core v0.1 需要回答的问题

- Agent 每次开始工作前读什么？
- 用户身份、项目状态、决策、教训、当前工作分别放在哪里？
- 当前工作如何进入系统？
- 一个 matter 如何创建、推进和归档？
- 哪些文件默认只读？
- 哪些动作需要用户确认？
- 多个 Agent 如何共享同一工作区上下文？
- Core 如何为 CLI、Packs、Adapters 留接口，但不混入它们的具体实现？

## 关于 `decisions.md` 的抽样观察

2026-05-09 抽样查看了几个已运行卫星项目：

- `satellite-personal-home-agent`、`satellite-life-workbench` 只有 `current-projects.md`，没有 `decisions.md`，说明轻量项目不一定需要独立决策日志。
- `产品经理工作台` 的 `_system/context/decisions.md` 更接近真正的决策账本，记录平台规范、流程门槛、结构调整等会持续影响后续工作的判断。
- `satellite-content-ops` 的 `decisions.md` 很长，已经混入大量内容选题、PPT 版本、单篇交付路线等局部判断，证明该文件确实容易被滥用和膨胀。
- `珍妮丁丁GFM` 的 `decisions.md` 对 StarWork、Starter Kit、事项机制等长期方法论演进很有价值，但它更适合长期复杂项目，不适合作为所有 Core 工作区必需项。

阶段结论：用户已确认 `decisions.md` 可以存在，但应降级为 Core 推荐能力，而不是必需文件；若存在，必须按“高影响决策日志”维护，并设置写入门槛。

## 关于学员模板与事项能力的兼容观察

2026-05-09 根据用户提出的多状态问题，补充查看了两类上下文：

- 学员模板当前使用 `references/` + `outputs/` 模式：`references/` 存放只读原始资料，`outputs/drafts/` 存放 AI 待审产出，`outputs/final/` 存放用户确认后的成果；没有 `matters/` 概念。
- 主库已有事项维护 skill：`/Users/shuxinding/digital-twin-core/skills/matter-workspace/`，定义了创建、定位、更新、暂停、归档 matter 的流程，并要求维护 `matters/registry.md`、`README.md`、`progress.md`、`notes.md`、`drafts/` 等边界。

阶段判断：

- Core v0.1 不能把 `matters/registry.md` 设为所有用户的必需项，否则会把现有学员模板排除在 StarWork Core 之外。
- Core v0.1 应同时支持 Starter mode 和 Matter mode。
- Starter mode 兼容现有 `references/outputs` 工作流，适合轻量交付。
- Matter mode 是增强工作追踪能力，适合长期事项、跨会话接力和过程沉淀。
- 启用 Matter mode 时，仅有目录结构不够，必须配套事项维护规则；推荐通过 `matter-workspace` skill 提供稳定操作入口。

## 关于多语言和多项目模式的修正

2026-05-09 用户指出两个问题：

- 多语言版本不能只是翻译 `_系统/` 路径。
- 多项目结构不能简化理解为 `shared_identity` / `shared_lessons`。

已补充查看主库：

- `/Users/shuxinding/digital-twin-core/AGENTS.md`
- `/Users/shuxinding/digital-twin-core/USAGE.md`
- `/Users/shuxinding/digital-twin-core/projects/README.md`
- `/Users/shuxinding/digital-twin-core/workspace/twin-core-sync/SKILL.md`

阶段修正：

- `profiles/` 应覆盖路径映射、模板语言、CLI 提问、本地化能力名称和 kit 说明，而不是只翻译 system 目录。
- 多项目模式应定义为整体能力 `main-repo-sync`，而不是拆成 `shared-identity` 和 `shared-lessons` 两个局部能力。
- 主库到卫星项目的同步语义包括：`identity/` 快照复制、`lessons/` 快照复制、`.internal/` 选定协议复制、`.obsidian/` 配置复制、`knowledge/` 只读软链接、`.core-sync.json` 元数据、`projects/registry.json` 项目发现与同步元数据、通用 skill 软链接导入。
- 已新增联络单请求主库确认多项目模式口径：`handoff-20260509-175508-starwork-to-digital-twin-core-starwork-core-multi-project-mode`。
- 用户指出初版联络单仍然带有 StarWork Core 的预设判断，已改写为中性请求：请主库详细解释它当前如何进行项目管理，包括主库定位、卫星项目定位、注册、初始化、同步、进度读取、回写、跨项目联络、skills 管理和生命周期。

## 主库回复后的多项目结论

2026-05-09 主库完成回复，核心结论如下：

- 当前真实模型是“一个主库 + 多个卫星项目”，可抽象为 Hub + Satellite。
- 主库负责跨项目可复用、可同步、可审计的公共机制，包括 `identity/`、`lessons/`、`.internal/`、`knowledge/`、正式 skills、`projects/registry.json`、`projects/coordination/` 和 `.incoming/` 审核。
- 主库不保存项目进度正文，不替卫星项目维护业务文件，不直接改写卫星项目事实源。
- 卫星项目负责本项目的状态、当前工作、事项过程、项目决策、业务文件、项目专用 skill 和项目特定经验。
- `projects/registry.json` 是定位表和同步元数据表，不是进度库；主库查看进度时按项目路径读取卫星项目内的状态文件。
- 当前中文多项目兼容事实源仍是 `_系统/上下文/current-projects.md`；StarWork Core 可以引入 `project-status.md` 作为更清晰的新命名，但 CLI / adapter 必须兼容现有 `current-projects.md`。
- `.incoming/` 是卫星项目向主库提交候选公共内容的审核入口；cross-project handoff 是项目之间传递请求、同步和回执的联络机制，两者不能混用。

对 Core v0.1 的修正：

- `main-repo-sync` 应表达完整 Hub + Satellite 模型，而不是共享身份和共享教训的组合。
- Hub-compatible kit 必须保留 `current-projects.md` 兼容入口，并明确只能有一个项目状态事实源。
- 中文多项目 kit 需要补齐 `_系统/跨项目/`、`_系统/diary/`、`.core-sync.json`、`.obsidian/`、`knowledge/` 等主库真实初始化层。

## 关于 Core 协议文档语言

2026-05-09 用户指出当前 Core 协议内容几乎全是英文，导致作为产品共创者无法直接阅读和判断。

阶段结论：

- StarWork 当前的核心使用者、决策者和早期学员都以中文为主，Core 协议事实源应中文优先。
- 英文不是不能存在，但应作为 `en` profile、英文 kit 或未来对外文档的一部分，而不能让核心协议源变成用户看不懂的内容。
- 因此 `product/core/README.md`、`baseline/`、`capabilities/`、`profiles/README.md`、`presets/README.md`、`kits/README.md` 已改为中文表达。
- 英文 profile 和英文 kit 继续保留英文，因为它们的用途是生成英文工作区。

## Core v0.1 第一阅读入口

2026-05-09 用户确认下一步应做 Core v0.1 协议总入口。

已新增 `product/core/core-v0.1-protocol.md`，定位为只读一篇时先读的文档。它承担：

- 用中文解释 Core 是开源协议，不是文件夹模板集合。
- 明确 Core、CLI、Kit、Pack、Adapter 的边界。
- 说明最小工作区三个必需角色。
- 梳理 v0.1 可选能力和首批 presets。
- 明确单项目与 Hub + Satellite 多项目模型。
- 说明 Kit 是参考实现或 CLI 输出，不是协议事实源。
- 记录进入 CLI 前需要确认的问题。
