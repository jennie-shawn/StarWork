# StarWork Core 完整框架与文件边界草案

> 状态：草案  
> 所属事项：`2026-05-09-starwork-core-v0.1-build`  
> 用途：作为后续敲定 StarWork Core v0.1 协议的参考依据

## 一、核心判断

StarWork Core 应该是一套“最小但完整的工作区协议”。

它的重点不是目录多，而是每个文件和文件夹只有一个清晰职责，避免出现功能定义相近、互相抢边界的结构。

我建议先把 Core 理解成五层：

```text
StarWork Core
├── 入口规则层：Agent 先读什么、怎么工作
├── 系统事实层：项目稳定事实、决策、教训、当前工作
├── 事项推进层：一件具体工作怎么推进、沉淀、归档
├── 共享资源层：身份、知识、外部同步快照等只读参考
└── 扩展接口层：CLI / Adapters / Packs 可以接入的位置
```

Core 的目标不是把所有项目都变成同一种业务目录，而是定义一组稳定语义：哪些文件是入口，哪些文件是事实源，哪些地方放过程，哪些地方放正式成果，哪些内容默认只读。

## 二、核心文件与文件夹边界

### 1. `AGENTS.md`：跨 Agent 工作规则入口

唯一职责：告诉任何 Agent 进入这个工作区后，应该怎么读上下文、怎么写文件、哪些边界不能碰。

它应该写：

- 开始前读哪些文件
- 过程材料放哪里
- 正式事实源放哪里
- 哪些目录只读
- 什么动作需要用户确认
- 当前 Agent 适配规则

它不应该写：

- 项目当前状态正文
- 任务清单
- 产品决策正文
- 事项推进记录

一句话：`AGENTS.md` 是“怎么在这里工作”，不是“这里正在做什么”。

### 2. Agent 专用适配文件：如 `CLAUDE.md`、Cursor 规则等

唯一职责：把 `AGENTS.md` 的核心规则翻译成某个 Agent 能稳定遵守的入口。

专用适配文件不应该产生独立事实，也不应该和 `AGENTS.md` 形成两套规则源。

Core 应规定：

- `AGENTS.md` 是跨 Agent 主规则源
- 专用适配文件可以存在
- 专用适配文件不得覆盖或反向定义项目事实
- CLI 后续负责生成或更新这些适配文件

这样可以避免 Codex 看 `AGENTS.md`、Claude 看 `CLAUDE.md`，最后两套规则慢慢分叉。

### 3. `_系统/上下文/`：项目慢变量层

唯一职责：放“Agent 每次进来都需要知道，但不会每小时变化”的项目事实。

更准确地说，`上下文/` 不是“当前正在干什么”，而是“这个项目为什么存在、现在处于什么阶段、已经做过哪些关键判断”。

奥卡姆剃刀下，Core v0.1 不建议保留太多上下文文件。最小必需只需要一个项目状态角色，决策日志可以作为可选能力：

```text
_系统/上下文/
├── project-status.md   # 必需；当前项目暂存为 current-projects.md
└── decisions.md        # 可选；仅用于高影响决策日志
```

文件边界：

- `project-status.md`：项目状态快照，回答“这个项目现在整体处在什么阶段”
- `decisions.md`：高影响决策日志，回答“哪些会持续影响后续工作的判断已经定了，以及为什么这么定”

`project-status.md` 应该写：

- 项目目标
- 当前阶段
- 近期重点
- 主要风险
- 下一步方向
- 重要事实源位置

`project-status.md` 不应该写：

- 单次对话中的临时任务
- 单个事项的详细进展
- 具体草案正文
- 长篇讨论过程

`decisions.md` 应该写：

- 已经确认且会影响后续多个事项的产品、结构、技术、流程决策
- 决策背景
- 决策理由
- 决策影响

`decisions.md` 不应该写：

- 还没定的想法
- 一般性会议纪要
- 任务待办
- 事项推进流水
- 普通内容选题取舍
- 单个交付物的版本选择
- 只影响一个 matter 的小判断

建议：`product-principles.md` 不作为 Core v0.1 必需文件。它可以是某些产品项目的业务事实源，但不是所有 StarWork 工作区都需要。

### 3.1 `decisions.md` 是否有存在必要

看过几个已运行卫星项目后，我的判断是：`decisions.md` 有价值，但不应该作为 Core v0.1 必需文件。

观察到的情况：

- 有些项目只有 `current-projects.md`，没有 `decisions.md`，仍然能运行。
- 产品经理工作台的 `decisions.md` 更接近真正的决策账本，记录的是结构、平台规范、流程门槛等会反复影响后续工作的判断。
- content-ops 的 `decisions.md` 很长，虽然有用，但已经混入大量内容选题、PPT 版本、单篇交付路线等局部决策，容易膨胀成“所有重要事情的历史记录”。
- GFM 项目的 `decisions.md` 在 StarWork、Starter Kit、事项机制等长期方法论演进上很有价值，但也说明它适合长期复杂项目，不适合强行要求每个轻量工作区都维护。

因此，Core 更好的定义是：

> `decisions.md` 是可选的高影响决策日志，不是所有项目必需的上下文文件。

如果一个项目足够轻量，`project-status.md` 加 matter 记录就够了。只有当某些判断会持续影响多个事项、多个 Agent 或未来版本时，才需要写入 `decisions.md`。

为了防止滥用，建议采用五问门槛：

1. 这是已经确认的判断吗？
2. 它会影响后续多个事项吗？
3. 三周后新 Agent 仍需要知道它吗？
4. 如果不记录，未来是否容易走回旧路或重复争论？
5. 它是否比放在某个 matter 里更适合做项目级事实？

五问里至少满足前 1 条，并且满足 2-5 中任意两条，才写入 `decisions.md`。

不满足门槛的内容，按下面规则分流：

| 内容类型 | 应放位置 |
|---|---|
| 讨论过程 | matter 的 `notes.md` |
| 单个事项进展 | matter 的 `progress.md` |
| 当前待确认问题 | `current-work.md` |
| 项目阶段和重点变化 | `project-status.md` |
| 单个交付物版本取舍 | 对应事项或交付目录内的记录 |

一句话：保留 `decisions.md`，但降级为 Core 推荐能力，而不是 Core 必需项；并给它设置高门槛，防止变成“AI 什么都想归档”的垃圾抽屉。

### 4. `_系统/任务/current-work.md`：当前工作入口

唯一职责：承接“现在要处理什么”，并把工作路由到具体 matter。

它是入口、收件箱和调度板，不是项目状态说明书，也不是事项详情页。

`current-work.md` 应该写：

- 用户刚交代但还没整理进 matter 的任务
- 当前进行中的 matter 索引
- 阻塞问题
- 等用户确认的问题
- 当前阶段的一两条工作记录

`current-work.md` 不应该写：

- 项目的长期背景
- 已经确认的关键决策正文
- 单个事项的完整推进过程
- 长篇方案草案
- 已经晋升到正式事实源的内容

一句话：`current-work.md` 负责让 Agent 知道“现在该接哪件事、去哪里接”，但不承载那件事的全部内容。

### 4.1 `project-status.md` 与 `current-work.md` 的区别

这两个文件最容易混淆，建议用“天气预报”和“今日待办板”来区分。

- `project-status.md` 像天气预报：告诉 Agent 这个项目的大气候是什么，当前季节是什么，有哪些长期风险。
- `current-work.md` 像今日待办板：告诉 Agent 这一次进门先处理哪张便签、哪个事项卡住了、哪个问题要等用户拍板。

判断一个内容该放哪里，可以用三个问题：

1. 这个内容一周后还需要作为项目背景被读到吗？如果是，放 `project-status.md`。
2. 这个内容只是为了推动当前阶段的一小段工作吗？如果是，放 `current-work.md`。
3. 这个内容属于某一件可闭环事项的细节吗？如果是，放对应 matter，不放这两个文件。

例子：

| 内容 | 应放位置 | 原因 |
|---|---|---|
| “StarWork v0.1 先做 Core，CLI 和 Pack 并行” | `project-status.md` 或 `decisions.md` | 这是项目方向和关键决策 |
| “本轮先讨论 Core 与 CLI 边界” | `current-work.md` | 这是当前推进入口 |
| “Core 事项的第 3 轮草案修改记录” | matter 的 `progress.md` | 属于具体事项进度 |
| “Core 不复用旧 Runtime spike” | `decisions.md` | 已确认的关键边界 |
| “用户刚说 current-projects 和 current-work 分不清” | 当前 matter 的 `notes.md` | 属于本事项过程判断 |
| “等待用户确认是否采用 project-status.md 命名” | `current-work.md` | 是待确认问题 |

### 4.2 `project-status.md`、`decisions.md`、`current-work.md` 的维护时机

这三个文件的区别，不只在“写什么”，更在“什么时候写”。

可以把它们理解成三种节奏：

- `project-status.md`：低频维护，像更新项目地图。
- `decisions.md`：事件触发维护，像盖章归档。
- `current-work.md`：高频维护，像当前桌面上的便签。

#### `project-status.md` 的维护时机

当项目整体状态发生变化时维护。

典型时机：

- 项目进入新阶段
- 本周或近期重点改变
- 主要风险发生变化
- 下一步方向发生变化
- 项目事实源或工作区结构发生明显调整
- 一个重要 matter 完成后，影响了项目整体状态

不需要每次对话都改。

如果一次更新只影响某个事项内部，就不要写 `project-status.md`，写 matter 的 `progress.md`。

例子：

- “StarWork 项目已从初始化阶段进入 Core v0.1 构建阶段” -> 写 `project-status.md`
- “某次讨论了 current-work 的定义” -> 不写 `project-status.md`，写当前 matter 的 `notes.md`

#### `decisions.md` 的维护时机

当一个关键判断被明确确认时维护。

典型时机：

- 用户明确拍板
- 多个方案中选择了一个
- 某个边界被正式确认
- 某个方向被明确否定
- 一个约束会影响后续多个事项

`decisions.md` 不记录“讨论过什么”，只记录“定下了什么”。

例子：

- “Core v0.1 中项目状态角色命名为 `project-status.md`” -> 如果用户确认，写 `decisions.md`
- “我们正在讨论要不要改名” -> 不写 `decisions.md`，写 matter 的 `notes.md` 或 `current-work.md` 的待确认问题

#### `current-work.md` 的维护时机

当当前工作入口、待办、阻塞或等待确认事项变化时维护。

典型时机：

- 用户新交代一个任务
- 当前正在推进的 matter 发生变化
- 出现需要用户确认的问题
- 某个任务暂时阻塞
- 本轮工作结束，需要留下下一步入口
- 一个任务已经进入具体 matter，需要把入口从“临时待办”转成 matter 索引

`current-work.md` 可以比较频繁地更新，但不要写成流水账。它只保留对“下一次 Agent 进来接着干”有帮助的内容。

例子：

- “等待用户确认 Core 是否采用 `project-status.md` 命名” -> 写 `current-work.md`
- “本轮已生成 HTML 阅读稿” -> 可以简短写工作记录
- “Core 框架草案全文” -> 不写 `current-work.md`，放 matter 的 `drafts/`

#### 三者的维护顺序

一次工作结束时，可以按这个顺序判断：

1. 有没有当前入口变化？有，更新 `current-work.md`。
2. 有没有关键决策被确认？有，更新 `decisions.md`。
3. 有没有项目整体阶段、重点、风险或下一步变化？有，更新 `project-status.md`。
4. 如果只是某个事项内部进展，更新 matter 的 `progress.md` 或 `notes.md`。

这能避免三份文件互相污染：`current-work.md` 不变成项目总览，`project-status.md` 不变成待办清单，`decisions.md` 不变成会议纪要。

### 5. `matters/`：事项推进层

唯一职责：一件可闭环工作的过程工作区。

这是 Core 里很关键的增强层之一。它能避免长期工作都挤进当前工作、上下文、正式事实源或输出目录。

但 `matters/` 不应该是所有用户的入门门槛。对学员当前模板来说，`references/` + `outputs/` 已经能完成轻量交付；`matters/` 更适合持续推进、跨会话接力、需要沉淀过程判断的复杂工作。

单个 matter 的建议最小结构：

```text
matters/<date>-<matter-id>/
├── README.md
├── progress.md
├── notes.md
├── drafts/
└── handoff.md   # 可选
```

文件边界：

- `README.md`：事项定义，回答“这件事是什么、范围是什么、不做什么”
- `progress.md`：推进记录，回答“做到哪一步了、下一步是什么”
- `notes.md`：过程判断、讨论、调研摘记
- `drafts/`：未定稿草案，成熟后晋升到正式事实源
- `handoff.md`：跨项目或跨 Agent 同步记录，可选

规则：

- 事项过程不直接写进 `_系统/上下文/`
- 未定稿草案不直接放入正式事实源
- 成熟内容从 `drafts/` 晋升到正式事实源，晋升后以正式事实源为准

### 6. `matters/registry.md`：事项注册表

唯一职责：定位事项。

它不是事项进度详情，也不是任务列表。

建议只保留索引字段：

- `matter_id`
- `status`
- `codex_thread_id` 或其他会话 ID
- `path`
- `updated`
- `archived_at`

注册表的价值是跨会话、跨 Agent 快速找到事项。事项内容仍然在 matter 自己的目录里。

边界提醒：

- 不在注册表写事项详细进展
- 不在注册表写完整任务拆解
- 不让注册表替代 `progress.md`

### 7. `identity/`：用户或组织身份快照

唯一职责：提供用户、组织、偏好、长期背景的只读参考。

它不应该记录项目进度，不应该写事项判断，也不应该被随手修改。

Core 应抽象出以下规则：

- 身份信息是高稳定事实
- 默认只读
- 修改需要用户明确确认
- 项目只引用，不随意重写

在当前 StarWork 项目里，`identity/` 来自主库同步，因此默认只读。

### 8. `lessons/` 或 `_系统/教训/`：教训库

唯一职责：记录可复用的“以后不要再犯”的工作经验。

它不是决策记录，也不是普通复盘。

一个教训应该满足：

- 来自一次真实错误或偏差
- 能指导未来行为
- 跨事项复用
- 足够具体

例如：“不要把过程草稿直接写入 `product/`”可以成为教训。  
“某次讨论了 Core”不是教训。

### 9. `knowledge/`：共享知识参考

唯一职责：外部或主库共享知识的参考入口。

它不应该成为当前项目的事实源。项目事实源仍然在项目自己的 `_系统/上下文/`、正式事实源目录或具体 matter 里。

Core 应明确：

- `knowledge/` 默认只读
- 可引用、可摘录
- 如需变成本项目事实，必须重新写入本项目合适位置，并说明来源

### 10. `.internal/`：系统协议和同步机制

唯一职责：存放机器或系统级协议，比如同步、回写、合并策略。

它不服务普通事项推进，不放产品草案，不放用户任务。

默认规则：

- Agent 可以读取
- 非必要不修改
- 修改需要明确知道系统后果

### 11. 正式业务事实源：Core 不固定名称，但定义原则

这里需要特别小心。

当前 StarWork 产品项目有 `product/`，但不是所有 StarWork Core 工作区都一定叫 `product/`。课程项目可能有自己的课程目录，内容运营项目可能由 Pack 创建专属业务目录。

因此 Core 不应该强制所有项目都有 `product/`。

Core 应定义原则：

> 每个项目必须明确“正式事实源目录”在哪里；过程材料不得直接混入正式事实源。

在本项目里，正式事实源就是 `product/`。在其他项目里，可以由初始化时或 Pack 定义。

## 三、Core v0.1 的最小必需项

如果要做到极简但完整，我建议 Core v0.1 先定义这些必需项：

```text
AGENTS.md
_系统/
  上下文/
    project-status.md
  任务/
    current-work.md
```

Core v0.1 必需的是“工作追踪入口”，但不强制所有用户都启用 matter。

工作追踪可以有两种模式：

```text
Starter mode:
  references/
  outputs/

Matter mode:
  matters/registry.md
  matters/<matter-id>/
```

推荐但非必需能力：

```text
_系统/
  上下文/
    decisions.md
identity/        # 可为主库快照或本地身份层
lessons/         # 可为主库快照或本地教训层
.internal/       # 如有同步协议
knowledge/       # 如有共享知识入口
matters/         # 如果启用 Matter mode
```

其中，`decisions.md`、`identity/`、`lessons/`、`.internal/`、`knowledge/`、`matters/` 在不同项目中可能是同步快照、软链接或可选能力，但 Core 需要定义它们一旦存在时的读取和写入边界。

## 四、路径语言问题：中文路径还是英文路径

这里有一个需要单独敲定的关键问题：

Core 标准到底用中文路径 `_系统/上下文/任务`，还是用英文路径 `_system/context/tasks`？

我的倾向是：

- 协议层先定义语义角色，不被中英文路径绑死
- v0.1 可以允许“中文实现”和“英文实现”两种 profile
- CLI 以后负责选择 profile 并生成对应结构
- Core 定义 canonical role，再映射到具体路径

例如：

| canonical role | 中文 profile | 英文 profile |
|---|---|---|
| `system.context.project_status` | `_系统/上下文/project-status.md` | `_system/context/project-status.md` |
| `system.context.decisions` | `_系统/上下文/decisions.md` | `_system/context/decisions.md` |
| `system.tasks.current_work` | `_系统/任务/current-work.md` | `_system/tasks/current-work.md` |
| `matters.registry` | `matters/registry.md` | `matters/registry.md` |

这样既保留当前中文工作台已经验证过的使用心智，也为后续英文用户和开源传播留出空间。

## 五、已形成的阶段结论与后续问题

已形成阶段结论：

1. `decisions.md` 可以存在，但不作为 Core v0.1 必需运行文件。
2. `decisions.md` 的定位是“高影响决策日志”，不是讨论摘要、会议纪要、任务流水或普通事项记录。
3. 写入 `decisions.md` 必须满足明确门槛，防止被 AI 滥用。

后续仍需敲定：

1. Core v0.1 是否确认只把 `AGENTS.md`、`project-status.md` 和 `current-work.md` 作为必需运行文件？
2. 是否将 Core v0.1 的项目状态角色命名为 `project-status.md`，并把当前项目的 `current-projects.md` 视为历史兼容命名？
3. 中文 profile 与英文 profile 是否同时进入 v0.1，还是先只定义 canonical role？
4. Starter mode 和 Matter mode 是否都进入 Core v0.1，以及如何升级切换？
5. 正式事实源目录是否必须在某个 manifest 中声明？
6. CLI 后续如何读取 Core 的 canonical role 与路径映射？

## 六、Core v0.1 当前不确定性清单

截至目前，Core v0.1 的方向已经比较清楚，但仍有几类问题需要拍板。

我建议把不确定性分成三档：

- 必须在 Core v0.1 拍板：不定下来，协议无法写清。
- 可以在 v0.1 给默认方案：不影响启动，但需要先给一个推荐口径。
- 留给 CLI / v0.2：现在过早定义会增加复杂度。

### 必须在 Core v0.1 拍板

#### 1. 必需运行文件到底是哪几个

当前倾向：

```text
AGENTS.md
_系统/上下文/project-status.md
_系统/任务/current-work.md
```

`decisions.md`、`identity/`、`lessons/`、`knowledge/`、`.internal/`、`matters/` 都作为推荐或可选能力。

需要拍板的问题：

- Core v0.1 是否确认只把上面三个作为必需运行文件？
- 一个项目没有 `matters/registry.md`，是否仍可以称为 StarWork Core 工作区？

我的修正建议：可以。为了兼容学员现有模板，`matters/registry.md` 不应作为 Core v0.1 必需项。Core 必需的是 `current-work.md` 这个工作入口；matter 是更强的工作追踪能力。

#### 2. `project-status.md` 是否正式替代 `current-projects.md`

当前倾向：Core v0.1 使用 `project-status.md` 作为 canonical role，当前项目的 `current-projects.md` 作为历史兼容命名。

需要拍板的问题：

- 是否接受 `project-status.md` 这个名字？
- 是否允许中文 profile 中继续兼容旧路径 `_系统/上下文/current-projects.md`？

我的建议：新协议用 `project-status.md`，但 CLI / adapter 未来可以识别旧项目的 `current-projects.md` 并提示迁移。

#### 3. 工作追踪模式如何定义

当前需要同时支持两种模式：

```text
Starter mode:
  references/        # 用户原始资料，只读
  outputs/drafts/    # AI 待审产出
  outputs/final/     # 用户确认后的产出

Matter mode:
  matters/registry.md
  matters/<matter-id>/
    README.md
    progress.md
    notes.md
    drafts/
```

需要拍板的问题：

- Starter mode 和 Matter mode 是否都进入 Core v0.1？
- Matter mode 是否需要配套 `matter-workspace` skill 才算完整启用？
- 从 Starter mode 如何升级到 Matter mode？

我的建议：两种模式都进入 Core v0.1。Starter mode 兼容现有学员；Matter mode 是增强能力。启用 Matter mode 时，必须配套事项管理规则或 skill，否则 AI 很容易乱建、漏登记或忘记归档。

#### 4. 正式事实源如何声明

当前 StarWork 项目用 `product/`，但 Core 不能强制所有项目都叫 `product/`。

需要拍板的问题：

- Core v0.1 是否要求每个工作区声明“正式事实源目录”？
- 这个声明写在 `AGENTS.md` 里，还是写进某个 manifest？

我的建议：v0.1 不新增 manifest，先要求在 `AGENTS.md` 和 `project-status.md` 中明确写出正式事实源位置。manifest 留给 CLI v0.2。

### 可以在 v0.1 给默认方案

#### 5. 中文路径与英文路径

当前倾向：协议定义 canonical role，路径由 profile 映射。

需要给默认方案的问题：

- v0.1 默认使用中文 profile 还是英文 profile？
- 开源传播时是否需要同时提供英文 profile？

我的建议：Core 协议文档先写 canonical role；本项目继续使用中文 profile；产品化 CLI 默认可以支持 `zh` 和 `en` 两个 profile，但这属于 CLI 设计，不阻塞 Core 草案。

#### 6. `identity/`、`lessons/`、`knowledge/` 的地位

当前倾向：不作为 Core 必需文件，但定义一旦存在时的边界。

需要给默认方案的问题：

- 它们是推荐项、可选项，还是外部同步项？
- 如果没有主库，普通用户是否需要本地 `identity/`？

我的建议：在 Core v0.1 中定义为 optional reference layers。也就是：可存在，可被读取，但不是工作区成立的前提。

#### 7. `decisions.md` 的启用门槛

已确认：可以存在，但不是必需项。

还需默认方案：

- 新建工作区时默认创建空 `decisions.md` 吗？
- 还是只有启用高级/复杂项目模式时才创建？

我的建议：Core 协议允许存在；CLI `init` 默认不创建，或创建时必须带说明和写入门槛。这样能降低滥用概率。

### 留给 CLI / v0.2

#### 8. canonical role 与路径映射文件

未来 CLI 需要知道：

- `system.context.project_status` 对应哪个文件
- `system.tasks.current_work` 对应哪个文件
- `matters.registry` 对应哪个文件

但 v0.1 不一定要立刻设计机器可读 manifest。

我的建议：Core v0.1 先在文档中定义 role 和路径表；CLI 初版硬编码 profile；等 v0.2 再考虑 `starwork.json` 或 `.starwork/config.json`。

#### 9. 自动迁移和兼容策略

例如：

- `current-projects.md` 如何迁移到 `project-status.md`
- Starter mode 如何升级到 Matter mode
- 不同语言 profile 如何互转

我的建议：这些是 CLI `doctor` / `migrate` 的事情，不在 Core v0.1 里过度展开。

#### 10. Pack 和 Adapter 扩展协议

Core 只需要留扩展点，不需要在 v0.1 完整定义 Pack 安装协议和所有 Agent 适配细节。

我的建议：Core v0.1 只写“扩展不得覆盖 Core 事实源；Pack 过程材料进入约定的工作追踪模式；Adapter 不得制造第二套事实源”。具体安装和适配留给 CLI / Adapters 设计。

## 七、我建议下一步优先拍板的 4 件事

为了推进 Core v0.1，下一步最好先确认：

1. Core v0.1 必需文件是否就是 `AGENTS.md`、`project-status.md`、`current-work.md`。
2. `project-status.md` 是否正式替代 `current-projects.md`，旧名只做兼容。
3. Core v0.1 是否同时支持 Starter mode 与 Matter mode，并把 Matter mode 定义为增强能力。
4. v0.1 是否不新增 manifest，正式事实源位置先写在 `AGENTS.md` 和 `project-status.md`。

## 八、Core 多版本维护：Baseline、Profile 与 Capability

用户实际使用 StarWork Core 时不会只有一种形态。

目前已经看到至少三类差异：

1. 语言差异：中文版路径与英文版路径。
2. 事项偏好差异：有的用户喜欢按 matter 分类存储，有的用户只想轻量维护当前工作。
3. 主库形态差异：单项目用户的 `identity/`、`lessons/` 应直接存在于项目内；多项目用户则更适合由主库分发或软链接。

如果把这些都做成“Core 不同版本”，会很快失控。比如：

- Core zh single project with matters
- Core en single project without matters
- Core zh multi project with shared identity
- Core en multi project with local lessons

这样版本组合会爆炸。

因此我建议 Core 不用“多套版本”维护，而采用三层模型：

```text
Core Baseline
    + Profile
    + Capability
```

### 1. Core Baseline：不可变的最小语义协议

Baseline 定义所有 StarWork Core 工作区都必须遵守的最小语义。

它不关心路径是中文还是英文，也不关心用户是否启用某个增强能力。

Baseline 应包含：

- 有一个跨 Agent 入口规则：`AGENTS.md`
- 有一个项目状态角色：`system.context.project_status`
- 有一个当前工作入口角色：`system.tasks.current_work`
- 有一个工作追踪入口：`system.tasks.current_work`
- 可启用事项索引角色：`matters.registry`
- 有明确的过程材料与正式事实源分流规则
- 有明确的只读、可写、需确认边界

Baseline 解决的是“什么才算 StarWork Core 工作区”。Matter 是增强能力，不是所有工作区的入门门槛。

### 2. Profile：同一语义的路径和语言实现

Profile 解决“同一套 Core 语义，用什么路径和语言落地”。

典型 Profile：

- `zh`：中文路径，适合当前中文用户和既有项目
- `en`：英文路径，适合开源、国际化和英文工作区

例如：

| canonical role | zh profile | en profile |
|---|---|---|
| `system.context.project_status` | `_系统/上下文/project-status.md` | `_system/context/project-status.md` |
| `system.tasks.current_work` | `_系统/任务/current-work.md` | `_system/tasks/current-work.md` |
| `matters.registry` | `matters/registry.md` | `matters/registry.md` |

Profile 不改变语义，只改变路径、文件名和模板语言。

### 3. Capability：可启用的增强能力

Capability 解决“这个工作区启用了哪些增强机制”。

建议能力拆分：

| capability | 作用 | 是否 Core 必需 |
|---|---|---|
| `decisions` | 高影响决策日志 | 否 |
| `starter_outputs` | 传统 `references/` + `outputs/` 工作流 | 否 |
| `matters_light` | 轻量事项索引，仅要求 `matters/registry.md` | 否 |
| `matters_full` | 完整事项工作区，含 `README.md`、`progress.md`、`notes.md`、`drafts/` 等 | 否 |
| `matter_workspace_skill` | 事项创建、定位、更新、暂停、归档 skill | 否，但启用 Matter mode 时强烈建议 |
| `shared_identity` | 主库分发身份信息 | 否 |
| `local_identity` | 单项目本地身份信息 | 否 |
| `shared_lessons` | 主库分发教训库 | 否 |
| `local_lessons` | 单项目本地教训库 | 否 |
| `knowledge_link` | 共享知识入口 | 否 |
| `handoff` | 跨项目联络单机制 | 否 |

Capability 不应该互相复制整套 Core，而是在 Baseline 上增加明确能力。

### 4. 用组合表达用户形态

这样，不同用户不需要不同 Core 版本，而是不同组合。

#### 中文单项目用户

```yaml
core: v0.1
profile: zh
capabilities:
  - local_identity
  - local_lessons
  - decisions
  - matters_full
```

特点：

- `identity/`、`lessons/` 直接存在于项目内
- 不依赖主库
- matter 可以完整使用

#### 中文多项目用户

```yaml
core: v0.1
profile: zh
capabilities:
  - shared_identity
  - shared_lessons
  - knowledge_link
  - handoff
  - decisions
  - matters_full
```

特点：

- `identity/`、`lessons/` 来自主库快照或软链接
- 项目自身只维护项目事实源
- 跨项目同步通过 handoff

#### 英文轻量用户

```yaml
core: v0.1
profile: en
capabilities:
  - local_identity
  - starter_outputs
```

特点：

- 不默认启用 `decisions.md`
- 使用 `references/` 和 `outputs/`，不强制启用 matter
- 更像轻量 AI workspace starter

#### 不喜欢 matter 分类的用户

这个场景要谨慎。

为了兼容学员现有模板，Core v0.1 应允许用户不启用 matter。

更好的处理是：

- Baseline 保留 `current-work.md`
- Starter mode 使用 `references/` + `outputs/`
- 当工作需要跨会话、沉淀过程、草稿、进度和归档时，再升级为 `matters_light` 或 `matters_full`

也就是说，matter 不应该强行存在于所有项目里，但 Core 应该提供从 Starter mode 升级到 Matter mode 的路径。

### 5. Core 版本号如何维护

建议版本号只给 Baseline，不给每种组合单独发版本。

例如：

- Core Baseline v0.1
- Core Baseline v0.2

Profile 和 Capability 有自己的兼容声明，但不形成独立 Core 大版本。

```text
core baseline version: 0.1
profile: zh@0.1
capabilities:
  decisions: 0.1
  starter_outputs: 0.1
  matters_full: 0.1
  shared_identity: 0.1
```

这样 CLI 可以判断：

- 当前工作区使用哪个 Core baseline
- 当前路径属于哪个 profile
- 当前启用了哪些 capabilities
- 哪些能力可以迁移、升级或修复

### 6. v0.1 是否需要 manifest

前面曾建议 v0.1 不新增 manifest。但考虑到 Profile / Capability 后，至少需要一个轻量声明文件的设计预留。

我建议 v0.1 分两步：

1. 协议草案先定义 Baseline、Profile、Capability 模型。
2. CLI v0.1 可以先不强制 manifest，但 `doctor` 应该能推断当前工作区形态。
3. v0.2 再引入机器可读 manifest，例如：

```json
{
  "core": "0.1",
  "profile": "zh",
  "capabilities": [
    "decisions",
    "matters_full",
    "shared_identity",
    "shared_lessons",
    "knowledge_link",
    "handoff"
  ]
}
```

### 7. 当前阶段结论

Core 不应该维护一堆互相复制的版本。

更稳的方式是：

- Baseline 管“共同语义”
- Profile 管“路径和语言”
- Capability 管“可启用能力”

这能同时支持中文、英文、单项目、多项目、轻量事项、完整事项等不同用户形态，而且不会让 Core 文档和 CLI 实现指数级膨胀。

### 8. 换成人话：Core 多状态到底怎么处理

这里最容易误解。

Core 多状态不是让用户选择一堆复杂版本，也不是每种用户都维护一套 Core。

更像是：

> Core 有一个最小地基，然后根据用户情况打开几个开关。

这些开关很少，v0.1 先控制在 3 个主开关：

```text
语言开关：中文 / 英文
身份与教训开关：本项目自带 / 主库分发
工作追踪开关：Starter 输出模式 / 轻量事项 / 完整事项
```

#### 开关一：语言

解决“目录和模板用中文还是英文”。

- 中文用户：用 `_系统/上下文/`
- 英文用户：用 `_system/context/`

这只是门牌语言不同，房子结构不变。

#### 开关二：身份与教训来源

解决 `identity/`、`lessons/` 放在哪里。

- 单项目用户：直接放在当前项目里
- 多项目用户：由主库统一维护，再同步或链接到各项目

这像“身份证和经验手册”：

- 只有一个项目时，放在项目抽屉里就好。
- 有很多项目时，放在总档案柜里，各项目拿副本。

#### 开关三：工作追踪模式

解决用户是否使用 matter，以及使用到什么程度。

这里要兼容学员现有模板。学员现在使用的是：

```text
references/        # 原始资料，只读
outputs/drafts/    # AI 待审产出
outputs/final/     # 用户确认后的产出
```

这套模式应该被 Core v0.1 兼容，不能直接废掉。

因此工作追踪应分三档：

- Starter 输出模式：使用 `references/` + `outputs/`，不启用 matter。
- 轻量事项：维护 `matters/registry.md`，用于登记持续事项。
- 完整事项：每件事有独立目录，包含 `README.md`、`progress.md`、`notes.md`、`drafts/`。

这像任务管理：

- 只交付文档：放 `outputs/drafts/` 和 `outputs/final/`。
- 需要持续追踪：进入 `matters/registry.md`。
- 复杂长期工作：开完整 matter 文件夹。

#### 四种最常见用户状态

| 用户状态 | Core 怎么落地 | 适合谁 |
|---|---|---|
| 中文单项目 Starter 版 | 中文路径 + 本地身份/教训 + `references/outputs` | 学员当前模板 |
| 中文单项目 Matter 版 | 中文路径 + 本地身份/教训 + 完整事项 | 想认真沉淀项目过程的用户 |
| 中文多项目完整版 | 中文路径 + 主库身份/教训 + 完整事项 + 跨项目联络 | 像当前这种多卫星项目工作台 |
| 英文 Starter 版 | 英文路径 + 本地身份 + `references/outputs` | 面向开源和英文用户 |

注意：这些不是四套 Core。

它们都是同一个 Core，只是开关不同。

#### CLI 如何处理这些状态

用户不应该手动理解这些开关。

CLI 以后可以用几个问题帮用户选择：

```text
你想使用中文还是英文？
你是只管理一个项目，还是有多个项目？
你想用简单 outputs/references，还是启用事项？
```

然后 CLI 生成对应结构。

例如：

```bash
starwork init --lang zh --identity local --work starter
starwork init --lang zh --identity shared --matters full
starwork init --lang en --identity local --work starter
```

用户看到的是简单选择；Core 内部记录的是当前工作区状态。

#### 如果用户后悔了怎么办

状态应该允许升级，而不是一开始就选死。

推荐升级路径：

```text
Starter 输出模式 -> Matter 模式
轻量事项 -> 完整事项
本地 identity/lessons -> 主库分发 identity/lessons
中文 profile -> 英文 profile（后续迁移能力，不放 v0.1）
```

v0.1 先保证前两种升级方向合理，语言迁移可以留给以后。

#### 关键原则

Core 多状态的处理原则是：

1. 共同规则只有一套。
2. 用户选择的是模板组合，不是产品分叉。
3. CLI 负责帮用户选择和生成。
4. 复杂状态可以后续升级，不要求新用户一开始理解。

所以，多状态不是“多版本 Core”，而是“同一个 Core 的几种使用档位”。最重要的是：学员现有 `references/outputs` 模式可以继续存在；事项机制是可升级能力，不是强制替换。

### 9. 事项维护为什么必须配套 skill

事项不是一个目录名，而是一组动作：

- 创建事项
- 绑定当前线程
- 更新注册表
- 维护进度
- 记录讨论和判断
- 把草稿晋升到正式事实源
- 暂停或归档事项

这些动作如果只靠 AGENTS.md 文字约束，AI 很容易漏步骤。

主库已有正式 skill：

```text
/Users/shuxinding/digital-twin-core/skills/matter-workspace/
```

该 skill 已定义：

- 什么时候创建 matter
- 如何读取 `CODEX_THREAD_ID` 定位当前事项
- 如何更新 `matters/registry.md`
- `README.md`、`progress.md`、`notes.md`、`drafts/` 分别怎么维护
- 如何把 matter 草稿晋升到正式事实源
- 如何暂停和归档

因此 Core v0.1 应写清楚：

> 启用 Matter mode 的工作区，必须同时具备事项维护规则；推荐通过 `matter-workspace` skill 提供稳定操作入口。

CLI 后续在用户选择 Matter mode 时，应自动安装或软链接该 skill。

## 九、一句话总结

StarWork Core v0.1 应该先定义一套清晰的工作区语义协议：入口规则、系统事实、当前工作、事项推进、共享参考和正式事实源各归其位。目录可以适配不同语言和项目类型，但每个文件和文件夹的职责必须稳定、单一、可解释。

## 十、给普通用户看的解释

前面的 Baseline、Profile、Capability 是产品设计语言。换成人话，StarWork Core 最终应该是：

> 一套让 AI 看得懂、用户也看得懂的工作区基础骨架。

它最终不是一个 App，也不是一个 CLI 命令，更不是新的 Agent。

它最终交付的东西应该包括：

1. 一份规则入口：告诉 AI 进来先读什么、怎么工作。
2. 一组基础文件：让项目状态和当前工作有固定位置，并为事项追踪预留升级路径。
3. 一套文件边界说明：哪些写项目状态，哪些写当前任务，哪些写过程材料和正式成果。
4. 一组模板：用户可以直接复制使用。
5. 一份检查标准：以后 CLI 可以按这个标准判断工作区是否健康。

### Core 的最终形态像什么

可以把 Core 想成“房子的基础户型图”。

- Core 不是装修队。
- Core 不是家具。
- Core 是这套房子的承重墙、水电口、门在哪里。

用户可以自己照着户型图搭，也可以让 CLI 帮他一键搭好。

```text
StarWork Core
  = 规则说明
  + 基础目录
  + 文件模板
  + 维护边界
  + 检查标准
```

### 用户不装 CLI，可以直接用吗？

可以。

最简单的直接使用方式是：

1. 复制一套 Core 模板到自己的项目文件夹。
2. 打开 `project-status.md`，写清楚这个项目是什么、当前阶段是什么。
3. 打开 `current-work.md`，写下现在要 AI 帮忙做什么。
4. 轻量交付先用 `references/` 和 `outputs/`；如果一件事需要持续推进，再启用 Matter mode。
5. 让 Codex、Claude Code 或其他 Agent 读取 `AGENTS.md` 开始工作。

这个时候，用户不需要理解 CLI，也不需要理解内部术语。

Core 直接用的样子大概是：

```text
我的项目/
├── AGENTS.md
├── _系统/
│   ├── 上下文/
│   │   └── project-status.md
│   └── 任务/
│       └── current-work.md
├── references/         # Starter mode 可选：原始资料
└── outputs/            # Starter mode 可选：AI 草稿和确认产出
```

这就是最小可用形态。

如果用户启用 Matter mode，再增加：

```text
matters/
├── registry.md
└── <matter-id>/
    ├── README.md
    ├── progress.md
    ├── notes.md
    └── drafts/
```

### CLI 是做什么的

CLI 不是 Core 本身。

CLI 是帮用户“自动搭好、检查好、适配好”的工具。

没有 CLI，Core 也应该能用；有 CLI，用户更省心。

对应关系：

| 用户想做的事 | 不用 CLI 时 | 用 CLI 时 |
|---|---|---|
| 创建工作区 | 手动复制模板 | `starwork init` |
| 检查文件是否齐全 | 自己对照文档看 | `starwork doctor` |
| 适配 Codex / Claude / Cursor | 自己写规则文件 | `starwork adapt` |
| 安装场景包 | 手动复制目录和规则 | `starwork pack install` |
| 升级 Core | 自己看差异合并 | CLI 提示缺失和冲突 |

一句话：

> Core 定义“应该长什么样”；CLI 负责“帮你搭出来，并检查有没有搭歪”。

### Core、CLI、Agent 的关系

```text
用户的真实工作
        ↓
StarWork Core：规定工作区怎么摆
        ↓
StarWork CLI：帮用户创建、检查、适配
        ↓
Codex / Claude Code / Cursor：进入工作区干活
```

更口语一点：

- Core 是说明书和地基。
- CLI 是安装工和质检员。
- Agent 是真正进来干活的人。

### 为什么还要有多种形态

因为用户不同：

- 中文用户希望看到中文目录。
- 英文用户希望看到英文目录。
- 单项目用户希望身份和教训就在项目里。
- 多项目用户希望身份和教训由主库统一分发。
- 轻量用户不想每件事都建完整 matter。
- 重度用户需要完整 matter 来沉淀过程。

但这些不应该变成很多套 Core。

更简单的理解是：

> Core 是同一套房屋结构；不同用户只是选择中文门牌还是英文门牌、要不要书房、要不要储藏室。

所以我们维护一套 Core，再提供不同模板组合。

### 这一版 Core v0.1 应该先做到什么

v0.1 不需要解决所有高级能力。

它先做到三件事就够：

1. 用户可以复制模板后直接开始用。
2. Agent 进来后知道先读哪里、写哪里、不该碰哪里。
3. CLI 以后能根据这套标准创建和检查工作区。

如果这三件事成立，Core v0.1 就成立。
