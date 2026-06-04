# StarWork 产品里程碑

本文用于回答一个问题：StarWork 接下来应该按什么顺序推进。

它不是具体任务清单，而是产品从“能跑起来”到“能发布、能教学、能扩展”的阶段地图。功能规划、版本 SPEC、讨论沉淀、参考资料和验收材料统一进入 `product/planning/`。

## 当前判断

StarWork 现在不缺想法，缺的是一条清晰的主线。

当前已经完成了产品地基、Core v0.1 封版，以及 CLI v0.1 最小闭环：

- Core 被定义为开源 AI 工作区协议。
- Kit 被定义为 Core 协议的参考落地结构。
- CLI 被定义为稳定生成、检查、适配和安装 Pack 的工具。
- Pack 被定义为场景定制工作流包。
- `starwork init` 第一版已经可以把 Kit 和 Pack 组装成工作台。
- `starwork spawn` 第一版已经可以从项目中心创建并登记新项目工作台。
- `starwork doctor` 第一版已经可以检查工作台健康状态。
- `starwork upgrade` 第一版已经可以按 skill 生成的 blueprint 保守升级历史模板。
- `starwork adapt` 第一版已经可以生成或登记 Agent 适配入口。
- `starwork pack install` 第一版已经可以在健康工作台上补装 Pack。
- `starwork spawn --blueprint` 第一版已经可以按工作台定制单创建定制化项目工作台；`starworkSpawn` skill 第一版用于生成工作台定制单。
- `starwork --version` 与产品化 help 文案已补齐，方便 A 测用户确认安装版本和入口命令。
- `starwork audit` / `starwork repair` 第一版已经可以让项目中心巡检并保守修复已登记项目。
- `starwork multiagent` 已从早期 Codex 单宿主编排升级为 v0.4 runtime host routing：能识别宿主能力、返回 `manual_handoff_required` / `unbound` / `needs_adapt` 等状态，并在无法自动投递时输出可复制交接消息。
- Host Adapter v0.2 已补齐 Cursor transcript 只读摘要、Cursor agent status 安全探测和 Trae 人工宿主收敛。
- M2.8 已统一工作台命名体系，对外使用“项目工作台 / 项目中心 / 中心管理的项目工作台”。
- M2.10 已完成 Core Kit / Pack 边界清理：Project Kit 不再固定通用工作目录，General Pack 负责参考资料、草稿和确认成果目录。
- M2.11 知识库能力已进入当前公开口径：Project Kit 不再默认包含 `知识/knowledge`，项目知识库通过 `starwork knowledge` 和 `starworkKnowledge` 按需开启。

所以，下一步不应该立刻进入新场景 Pack。当前应进入 M2.12 发布与 A 测稳定化，先把 `0.1.0-alpha.20` 的 README、docs、CLI、Skills、本机安装和 npm latest 口径彻底对齐，再用 Golden Demo Workspaces 验证 StarWork 是否能被新人稳定理解。

## 总路线

```text
M0 项目地基
  ↓
M1 Core v0.1 封版
  ↓
M2 CLI v0.1 最小闭环
  ↓
M2.5 公开 A 测分发与安装验证
  ↓
M2.6 既有功能优化与 A 测稳定化
  ↓
M2.8/M2.10 命名体系与 Kit/Pack 边界清理
  ↓
M2.11 知识库能力
  ↓
M2.12 发布与 A 测稳定化
  ↓
M2.13 Golden Demo Workspaces
  ↓
M3 Content Creator Pack v0.1
  ↓
M4 Demo 工作区
  ↓
M5 内测与修正
  ↓
M6 v0.1 发布
  ↓
M7 v0.2 扩展
  ↓
M8 v1.0 稳定产品
```

## M0 项目地基

状态：已完成。

目标：建立 StarWork 正式产品项目，不再混用课程项目和旧 Runtime spike。

已完成：

- 建立 `product/` 产品事实源；历史推进材料后续归档到 `product/planning/`。
- 将 `product/` 初始化为独立 Git 仓库。
- 明确 StarWork 四层：Core、CLI、Packs、Course。
- 明确 Course 继续由 `珍妮丁丁GFM` 承载，本项目只承载产品本体。
- 明确旧本地 Runtime spike 只作为历史参考。

验收标准：

- 产品事实源只认 `product/`。
- 功能规划、版本 SPEC、讨论和验收材料进入 `product/planning/`。
- 当前项目状态、当前工作和产品规划入口可读。

## M1 Core v0.1 封版

状态：已封版。

目标：冻结 StarWork 最小工作区协议，让不同 Agent 都知道该读什么、写什么、保护什么。

当前成果：

- `product/core/core-v0.1-protocol.md`
- `product/core/baseline/`
- `product/core/profiles/`
- `product/core/capabilities/`
- `product/core/presets/`
- `product/core/kits/`
- `product/core/kits/kit-structure-reference.md`

封版结论：

- Core v0.1 的最小协议、Project Kit / 项目中心 Kit 和 Kit 事实依据可以作为后续 CLI 检查、适配和 Pack 安装的基础。
- 后续不再继续扩张 Core v0.1 的范围；发现问题时优先通过 `doctor` 检查、Pack 规则或 v0.2 候选项处理。

验收标准：

- 人能用中文读懂 Core 的最终形态。
- Agent 能从 Core 文档判断一个工作区是否健康。
- CLI 可以按 Core 定义生成和检查工作区。

## M2 CLI v0.1 最小闭环

状态：已完成。

目标：让普通用户不用理解 Core 内部结构，也能初始化、检查、适配和安装场景包。

当前成果：

- `starwork init` 第一版已落地。
- `init` 已支持工作区类型选择、Pack 选择、语言配置、dry-run 和冲突保护。
- `starwork spawn` 第一版已落地，可从健康项目中心创建项目工作台，并回写项目中心项目注册表。旧 `starter` 参数只作为兼容别名。
- `starwork doctor` 第一版已落地，可检查 workspace state、Core 必需角色、Kit 文件、正式事实源、业务工作区和 Pack 落地结果。
- `starwork adapt` 第一版已落地，可为 Codex、Claude Code、Cursor、Trae 生成或登记轻量适配入口。
- `starwork pack install` 第一版已落地，可在健康工作台上补装 Pack。

后续增强项：

- `init` 交互体验继续打磨。
- `spawn --blueprint` 增强：支持 `renames`、`removals`、更完整的 schema 校验和迁移。
- `doctor` 内容边界 warning 和 strict / verbose 增强。
- Pack 升级、卸载和迁移机制。

验收标准：

- 用户可以从空文件夹初始化一个可用工作台。
- 用户可以检查当前工作区缺什么、错什么、危险在哪里。
- 用户可以为当前 Agent 生成或更新适配文件。
- 用户可以安装或更新 Pack，并且不会覆盖已有内容。

## M2.5 公开 A 测分发与安装验证

状态：已形成可公开测试的基线，继续收集反馈。

目标：让外部 A 测用户可以通过公开 GitHub 与 npm 入口安装 StarWork，并验证 CLI 与 Skills 的最小流程。

当前成果：

- GitHub 仓库已推送到 `jennie-shawn/StarWork`。
- npm 包名为 `@jennie-shawn/starwork`。
- `starworkInit`、`starworkDoctor`、`starworkMultiagent` 可通过一条 `npx skills add` 命令安装为系统 Skill；`starworkDoctor` 同时承担历史模板诊断、类似项目中心的旧工作区诊断和升级蓝图生成；`starworkSpawn`、`starworkAudit` 改为项目中心自带 Skill。
- 公开 README 已改为中文首页。
- 已新增面向 Agent 的安装指南：`product/docs/agent-install-guide.md`。
- npm `latest` 已发布到 `@jennie-shawn/starwork@0.1.0-alpha.20`，本机 CLI 与系统 Skills 已完成更新验证。
- `starwork --version` 已可直接输出包版本，`starwork --help` 已改为面向 A 测用户的命令入口说明。
- `starwork upgrade --blueprint`、`starworkDoctor`、类似项目中心的旧工作区 preserve-names 接入和 Skill 分发第一版已进入公开包。
- `starwork audit` / `starwork repair` 已进入公开包，项目中心可巡检并按 blueprint 保守修复它管理的项目工作台。
- `starwork multiagent` v0.4 已进入公开口径：通过 runtime host routing 解释宿主能力，不再用低层 thread/resume + turn/start 模拟跨会话投递；无法自动送达时返回 `manual_handoff_required` 并输出可复制交接消息。
- Host Adapter v0.2 已进入公开口径：Cursor 支持 transcript 只读摘要和 `cursor agent status` 安全探测；Trae 收敛为人工宿主，不读取私有会话存储。

验收标准：

- A 测用户能安装 CLI 并看到 `starwork --help`。
- A 测用户能安装系统 Skills，并让 Agent 识别 `starworkInit`、`starworkDoctor`、`starworkMultiagent`。
- 项目中心能带出工作台模板自带的 `starworkSpawn`、`starworkAudit`，单项目工作台能带出模板自带的 `neat-freak`。
- `init -> doctor -> hub init -> spawn -> doctor` 的最小流程能被外部用户跑通。
- 历史模板用户能跑通 `doctor --json -> starworkDoctor -> upgrade --blueprint -> doctor` 的保守升级验证流程。
- 类似项目中心的旧工作区用户能在确认路径映射后，以保留原目录名的方式接入 StarWork，不创建重复的标准目录壳。
- A 测反馈中暴露的安装、skill 调用和真实用户体验问题被记录到 `product/planning/issues/`。

## M2.6 既有功能优化与 A 测稳定化

状态：已推进完成一轮关键边界清理，继续作为 A 测稳定化背景线。

目标：不急着扩张新能力，先把已经有的 CLI、Skills、Kit 和文档链路打磨到外部用户和 Agent 都不容易走偏。

优化主线：

- 安装链路：README、A 测指南、Agent 安装指南、系统级 Skills 安装命令保持一致。
- 新建工作台链路：继续打磨 `starworkInit` 与 `starwork init` 的语言选择、项目工作台 / 项目中心判断、Pack 默认值和定制采访。
- 历史模板升级链路：继续打磨 `doctor --json -> starworkDoctor -> upgrade --blueprint -> doctor`，重点保证规则文档质量和用户原有规则提炼。
- 项目中心链路：继续打磨 `hub -> spawn -> audit -> repair`，确保项目中心自带 Skill、项目中心 Skill registry 和中心管理项目的结构边界清楚。
- Skill 范围治理：维护系统级 Skill、工作台模板自带 Skill、项目中心托管 Skill、Pack Skill 和项目本地 Skill 的分发边界。
- 多 Agent 协作：继续优化 `multiagent status`、`bind`、`launch`、`read`、`instruct`、`share` 的人类可读输出和 worklog 提醒。

验收标准：

- 文档中的当前版本、当前阶段和下一步不互相矛盾。
- A 测用户能按公开 README 和 A 测指南完成 CLI 与系统 Skills 安装。
- Agent 读取 `starworkInit`、`starworkDoctor`、`starworkMultiagent` 时不会被旧 Pack、旧事项模式或旧 skill 分发口径误导。
- 历史模板升级生成的 `AGENTS.md` 简洁、清晰，没有内部占位符泄露。
- 项目中心 / 项目工作台模板自带 Skill 不会被系统级安装命令误装。

## M2.8/M2.10 命名体系与 Kit/Pack 边界清理

状态：已完成。

目标：清理外部用户和 Agent 最容易走偏的命名和结构边界。

当前成果：

- 对外统一使用“项目工作台 / 项目中心 / 中心管理的项目工作台”，不再要求用户理解 Satellite。
- Project Kit 只保留基础工作台骨架，不再固定 `参考资料/` 和 `输出/`。
- General Pack 接管通用工作目录：`参考资料/`、`输出/草稿/`、`输出/确认成果/`，英文镜像为 `references/`、`outputs/drafts/`、`outputs/final/`。
- 中文项目中心使用中文可见目录；英文 Project Center 使用英文可见目录；隐藏机制目录保持英文。
- `doctor` 已能识别项目中心同义目录重复，例如 `知识/` 和 `knowledge/` 同时存在。
- M2.10 验收补丁已清理 Core profile 中的 `work.starter.*` 当前角色残留。

验收标准：

- 只看 Project Kit 时，不会看到通用 Pack 目录。
- 普通 `init --type project --pack general` 仍能生成用户熟悉的参考资料和输出目录。
- 中文 / 英文项目中心的可见目录语言一致。
- Core profile 不再把 General Pack 目录写成基础事实源。

## M2.11 知识库能力

状态：已完成本地验收，并进入当前 A 测口径。

目标：把 `知识/knowledge` 从“默认目录”进一步定义为可选知识库能力，避免它在项目资料、长期理解和项目中心共享知识之间语义混乱。

当前判断：

- 参考资料是输入。
- 输出是成果。
- 知识库是 Agent 持续维护的长期理解层。
- 项目知识库和项目中心共享知识不是同一个东西。

当前成果：

- Project Kit 已移除默认 `知识/knowledge`。
- 新增 `core/capabilities/knowledge/`，提供中文 `知识库/` 和英文 `knowledge-base/` 模板。
- 新增 `starwork knowledge init/status/check/apply`，并支持 `init --knowledge`。
- `doctor` 不把缺少知识库当作结构错误；旧 `知识/knowledge` 只作为线索暴露。
- 新增系统级 skill `starworkKnowledge`，负责引导创建、吸收资料、回答并沉淀、形成综合判断、健康检查和生成整理 blueprint。

下一步：

- 用真实 A 测样本验证 `starworkKnowledge` 是否能避免把原始资料、草稿和知识库混在一起。
- 继续观察项目中心共享知识库是否需要另开需求。

## M2.12 发布与 A 测稳定化

状态：当前阶段。

目标：把已经进入公开包的 CLI、Skills、文档和发布材料统一成可信的 A 测入口，减少“代码可用但用户被旧文档带偏”的风险。

当前重点：

- 对齐 README、A 测指南、Agent 安装指南、CLI/Skill 注册说明和 roadmap 的版本号、命令和能力边界。
- 为 `manual_handoff_required`、Cursor transcript 只读摘要、Trae 人工宿主等 host adapter 行为补齐用户可理解说明。
- 建立每次 npm 发布后的 release checklist：版本检查、latest 检查、本机 CLI/Skill 更新、关键命令 smoke test、文档漂移检查。
- 继续复验 `init -> doctor -> hub init -> spawn -> audit -> repair`、`knowledge`、`multiagent`、`adapt` 这些 A 测高频链路。

验收标准：

- `product/README.md`、`product/docs/`、`product/cli/README.md` 和 A 测指南中的 latest 版本与实际 npm latest 一致。
- 新用户只按公开文档操作时，不会遇到已经废弃的 alpha 版本、旧 MultiAgent 状态名或旧宿主能力说法。
- 每个无法自动化的跨会话动作，都有可复制消息和明确的人工交付说明。

## M2.13 Golden Demo Workspaces

状态：建议紧随 M2.12 启动。

目标：用少量高质量示例证明 StarWork 的价值，不再只靠命令和 SPEC 解释产品。

建议最小样本：

- 一个项目工作台：展示 `init`、`doctor`、`knowledge`、`general pack` 和基础规则入口。
- 一个项目中心：展示 `hub init`、`spawn`、`audit`、`repair` 和中心管理项目登记。
- 一个 MultiAgent 协作样本：展示 product-planning、development、operations 等 lane 的职责边界、worklog、shared 消息和人工交接。

验收标准：

- 新人能在 10 分钟内看懂 StarWork 到底解决什么问题。
- Demo 能暴露真实工作流，而不是只展示目录树。
- Demo 中的 CLI 输出、Skill 行为和文档说明一致。

## M3 Content Creator Pack v0.1

状态：后续阶段，等待 M2.12/M2.13 稳定后再启动，并结合 GFM 新一期课程内容整理。

目标：做出第一个真正能解决场景问题的 Pack，而不是只有目录结构。

Pack 应覆盖的最小内容闭环：

```text
灵感输入
  ↓
选题整理
  ↓
内容大纲
  ↓
正文或脚本
  ↓
发布记录
  ↓
数据复盘
  ↓
下一轮选题
```

还需要做：

- 创建内容创作者 Pack v0.1 功能档案。
- 确认目录结构。
- 确认每个目录下的 Agent 规则。
- 确认模板和 seed 示例。
- 确认中文和英文版本的路径与文案。

验收标准：

- 内容创作者不用懂 Core，也能看懂这个工作台。
- Agent 知道素材、选题、草稿、发布记录、数据复盘分别放哪里。
- Pack 能被 CLI 安装到一个 Core Kit 上。

## M4 Demo 工作区

状态：未开始。

目标：用一个真实例子证明 StarWork 能跑，而不是只在文档里成立。

建议 Demo：

- 中文内容创作者单项目工作台。
- 初始化方式：`starwork init` + `content-creator` Pack。
- 至少跑完一条内容链路：灵感、选题、草稿、发布、复盘。

验收标准：

- 新 Agent 进入 Demo 工作区后，能快速知道项目状态。
- 用户能看到 StarWork 对真实工作的帮助。
- Demo 能暴露 Core、CLI、Pack 的不一致之处。

## M5 内测与修正

状态：未开始。

目标：用真实使用反馈修正，而不是继续凭想象扩写。

内测对象：

- 用户本人当前工作流。
- 一到两个学员现有单项目模板。
- 一个新建空项目。

重点观察：

- 初始化流程是否顺。
- 目录命名是否直觉。
- Agent 是否会乱写、漏读或覆盖。
- Pack 是否真的减少了用户解释成本。

验收标准：

- 至少完成三次初始化和一次 Pack 安装验证。
- 形成明确的问题清单。
- 修完 v0.1 发布前必须修的问题。

## M6 v0.1 发布

状态：未开始。

目标：发布第一个可以被外部理解和试用的 StarWork 版本。

发布内容：

- Core v0.1 协议。
- CLI v0.1。
- General Pack。
- 项目中心管理 Pack。
- Content Creator Pack v0.1。
- Demo 工作区。
- 入门文档。

验收标准：

- 用户能知道 StarWork 是什么。
- 用户能按文档初始化一个工作台。
- 用户能理解 Core、Kit、CLI、Pack 的关系。
- 用户能用 Content Creator Pack 跑一次最小内容生产闭环。

## M7 v0.2 扩展

状态：规划中。

目标：在 v0.1 验证成立后，再扩展能力。

候选方向：

- 更完整的 `adapt`，支持 Codex、Claude Code、Cursor、Trae 等适配差异。
- `doctor` 自动修复建议。
- Pack 升级、卸载和迁移机制。
- 更多 Packs。
- 更强的项目中心与项目工作台同步能力。
- schema 校验和版本迁移。

进入条件：

- v0.1 已经能被真实用户跑通。
- Core、CLI、Pack 的边界没有重大摇摆。

## M8 v1.0 稳定产品

状态：远期。

目标：形成可以长期维护、教学、开源传播和商业化的稳定产品。

v1.0 应具备：

- 稳定 Core 协议。
- 稳定 CLI。
- 可复用 Pack 生态。
- 清楚的 Adapter 层。
- 完整文档和 Demo。
- 与 Course 层的清晰衔接。

## 当前下一步

当前最应该做的不是重开 Core、继续无边界扩张 CLI，或立刻进入新 Pack，而是完成 M2.12 发布与 A 测稳定化：

1. 用公开安装命令验证 `@jennie-shawn/starwork@latest`、系统级 Skills 和本机更新链路。
2. 清理 README、docs、CLI README、A 测指南和 Skill 注册说明中的版本漂移。
3. 用真实项目验证知识库能力是否能清楚区分参考资料、输出和长期知识。
4. 用真实宿主继续验证 `multiagent read/status/instruct/launch` 的状态输出，尤其是 `manual_handoff_required` 是否足够清楚。
5. 继续优化安装、`init`、`doctor -> starworkDoctor -> upgrade`、`hub -> spawn -> audit -> repair`、`multiagent`、`knowledge` 和 `adapt` 这些既有链路。
6. 制作 Golden Demo Workspaces，把产品价值从“命令能跑”推进到“新人能看懂”。
7. 等 M2.12/M2.13 稳定后，再启动 Content Creator Pack v0.1 功能档案，把首个场景 Pack 的目录、规则、模板和 Demo 定下来。

如果只能选一个，先修复版本、发布和文档漂移，因为这直接决定 A 测用户能不能按公开入口跑通。

原因：M2 已经提供了最小 CLI 工具链，A 测版本也已发布；现在最容易产生体验落差的是 CLI 与 Skill 之间的协同、提示、容错、宿主能力边界和文档状态漂移。
