# `starworkInit` Skill SPEC

## 状态

- 版本：v0.1 draft
- 所属模块：StarWork Skills
- Skill 名称：`starworkInit`
- 相关命令：`starwork init`
- 实现状态：已实现第一版，M2.6 继续优化采访口径
- 目标：帮助 Agent 把用户“我想建一个工作台”的模糊需求，整理成可预览、可执行、可解释、并最终落地验证的 StarWork 初始化流程

## 一句话定义

`starworkInit` 是 StarWork 初始化设计 skill。

它不是 `starwork init` 命令本身，而是命令执行前的 AI 设计助手：

```text
用户说想建工作台
  ↓
starworkInit skill 追问和判断
  ↓
初始化方案 / init blueprint
  ↓
starwork init 或 starwork init --blueprint
  ↓
可用 StarWork 工作台
```

## 为什么它是 skill，不是 CLI 规格

`init` 处在用户最早期的入口。此时用户往往还没想清楚：

- 是要具体项目工作台，还是多项目中枢
- 使用中文工作台，还是英文工作台
- 正式成果应该放哪里
- 当前推进过程应该放哪里
- 是否有自己的命名习惯
- 是否未来会升级成 Hub + Satellite

这些不是 CLI 参数能一次问清的，而是 Agent 应该通过对话帮用户梳理。

所以本 SPEC 的主角是：

> Agent 如何判断、如何追问、如何输出初始化方案，并在用户确认落地时继续执行和验证。

CLI 的 `init --blueprint` 是承接定制方案的执行入口。Skill 不能把 blueprint 文件本身当作最终交付物。

## 与 `starworkSpawn` 的关系

| Skill | 用户状态 | 目标 | 依赖 Hub |
|---|---|---|---:|
| `starworkInit` | 还没有工作台 | 从 0 设计并创建工作台 | 否 |
| `starworkSpawn` | 已有 Hub | 从 Hub 派生一个项目工作台 | 是 |

`starworkInit` 解决的是：

```text
我要建立什么样的工作系统？
```

`starworkSpawn` 解决的是：

```text
这个 Hub 下的新项目要长什么样？
```

二者可以共享“blueprint”思想，但不应共用同一个 schema。

## Skill 输入

用户可能会这样触发：

- “帮我建一个 StarWork 工作台”
- “我要初始化一个内容创作工作台”
- “我想建一个多项目管理系统”
- “我想用 StarWork 管一个项目”
- “这个工作台的目录我想定制一下”
- “init 有没有类似 spawn blueprint 的定制能力”
- “我想开启多 AI 协作，但这个项目还没接入”
- “MultiAgent 说要先安全接入项目”

skill 应在这些场景下启动。

## MultiAgent-only 回流体验

当用户从 `starworkMultiagent` 回流，或只安装了 MultiAgent 相关 Skill、目标是“先创建多个 AI 分工”时，`starworkInit` 要把自己解释为多 AI 协作前的安全接入顾问，而不是打断流程。

第一屏必须说明：

- 多 AI 协作前要先确认项目是什么。
- 多 AI 协作前要先确认当前正在推进什么。
- 多 AI 协作前要先确认哪些内容能整理或修改，哪些内容不能随便改。
- 先做写入预览，确认前不会改业务内容。
- 不会直接覆盖已有 AI 规则文件。

第一问只问：

```text
你现在是想把当前已有项目接入 StarWork，还是新建一个空项目工作台试用？
```

MultiAgent 快速起步默认只问最小必要问题：

1. 目标目录。
2. 新建还是已有项目。
3. 工作台语言。
4. 主要使用的 AI 工具；不确定可跳过。
5. 已有项目时，读取现有入口并生成待整合草稿。

默认不主动展开知识库、场景 Pack、Capability、复杂目录定制、项目中心或多个宿主同时适配。用户主动要求定制时，再进入完整 `starworkInit` 采访。

已有项目场景必须强化安全预告：保留业务代码和现有资料；不直接覆盖已有 `AGENTS.md`、`README.md`、`CLAUDE.md` 或其他 AI 规则入口；先生成待整合草稿；用户确认后再合并入口说明。

如果写入后存在待整合草稿，必须区分：

- 工作台骨架已写入。
- AI 入口还没有最终生效。
- 下一步要把现有规则和 StarWork 建议放在一起，让用户确认后再合并。

## Skill 输出

根据用户需求成熟度，`starworkInit` 可以输出三种结果。

### 1. 初始化建议

当用户还在讨论阶段，输出一份人能读懂的建议：

```text
建议使用：project
基础结构：Project
语言：zh
场景能力：general
正式成果：输出/确认成果/
当前工作：输出/草稿/
额外目录：按用户需求另行定制
原因：用户当前只描述了一个明确项目，先用普通项目工作台降低复杂度。
```

### 2. 初始化定制单

当用户要求定制目录或规则时，先生成：

```text
<workspace>-init/
├── init-blueprint.json
├── rules/
│   ├── file-boundaries.md
│   ├── workflow.md
│   └── startup.md
└── seed/
    └── ...
```

生成定制单不是结束。用户的目标是创建工作台时，Agent 必须继续执行 `starwork init --blueprint` 的 dry-run、确认和正式写入。

### 3. 执行指令

当用户准备测试或明确要求创建时，执行命令：

```bash
starwork init --target <workspace-path> --blueprint <init-blueprint.json> --dry-run
starwork init --target <workspace-path> --blueprint <init-blueprint.json> --yes
starwork doctor --target <workspace-path>
```

注意：定制初始化必须先 dry-run。只有 dry-run 结果里的绝对目标路径、文件夹名和目录计划都被用户确认后，才执行 `--yes`。如果 dry-run 显示会创建用户明确不要的目录，应回到 blueprint 修正，不要强行执行。

## 交互流程

`starworkInit` 不应该像填表工具一样一上来问一长串问题。

它应该像一个会带路的顾问：先判断岔路，再决定哪些问题需要问、哪些问题根本不用问。

### 总流程

```text
Step 1 判断工作台类型
  ├─ hub：继续判断语言，然后直接进入 Hub 初始化建议
  └─ project：继续判断语言和是否需要定制目录

Step 2 判断语言
  ├─ 中文：language=zh
  └─ English：language=en

Step 3 判断是否需要定制工作台
  ├─ 不需要：输出标准初始化建议
  └─ 需要：进入 Step 4-6 的友好采访

Step 4 采访正式成果放哪里
Step 5 采访日常工作在哪里发生
Step 6 采访额外固定区域和 Agent 规则
```

### Step 1：判断工作台类型

先问：

```text
你是想管理一个具体项目，还是建立一个能管理多个项目的中枢？
```

判断：

| 用户意图 | 推荐工作区 |
|---|---|
| 一个具体项目、一个阶段目标、一次成果交付 | `project` |
| 管理多个项目、统一身份/教训/知识/skills | `hub` |

如果用户说“以后可能会有很多项目”，但当前只是一个项目，优先建议：

```text
先用 Project；等多项目需求明确后再建立 Hub。
```

除非用户明确要建立多项目中枢。

#### Hub 分支

如果判断为 `hub`，就不要继续追问“是否需要事项”和“选择哪个 Pack”。仍然要问语言。

Hub 的核心不是一个项目怎么推进，而是统一维护：

- 身份和长期偏好
- 跨项目经验教训
- 共享知识
- skills
- 多个项目的注册、分发和回收

因此 Hub 分支应直接输出：

```text
建议类型：hub
基础结构：Hub
语言：使用 Step 2 的选择
场景能力：无须选择；Hub 使用中枢管理结构
事项：已封存，不作为 Hub 初始化选项
下一步：确认 Hub 名称、项目注册区域、是否需要预置 skills/ 和 .incoming/
```

### Step 2：判断语言

工作台类型判断后，必须问：

```text
这个工作台你想用中文结构，还是英文结构？
```

判断：

| 用户选择 | language |
|---|---|
| 中文结构、中文协作、默认中文 | `zh` |
| English structure, English collaboration | `en` |
| 不确定 | `zh` |

语言会影响目录名称、模板文字和 Agent 规则表达方式，因此不要跳过。

### Step 3：判断是否需要定制工作台

仅当 Step 1 判断为 `project` 时，才进入这一步。

问：

```text
你想先用标准结构，还是希望我帮你按自己的工作习惯稍微改一下目录和规则？
```

判断：

- 不需要、不确定、只有一个明确目标：使用标准 `project`
- 明确有稳定目录偏好：继续采访正式成果、日常工作区和额外目录
- 管理多个项目：返回 Step 1，改为 `hub`

不要再询问 matter、长期/短期、多线事项等已封存分类。

### Pack 选择规则

v0.1 不采访用户选择场景 Pack。

原因：

- 当前稳定 Pack 只有 `general`。
- 内容创作者 Pack 还未完成产品定稿，不应在 init skill 中主动推荐。
- 其他业务场景 Pack 还不存在，不应询问用户“其他场景”。

默认规则：

- 单项目工作台：`pack=general`
- Hub：不让用户选择 Pack；使用 Hub 中枢管理结构
- 用户主动提到业务场景时，只记录为定制需求，不映射成 Pack
- 不把一次性目录偏好误判成新 Pack

### Step 4：判断是否需要定制工作台

这是 Step 4-7 之前必须插入的判断节点。

问法要轻，不要让用户感觉自己在设计数据库：

```text
你想先用标准结构，还是希望我帮你按自己的工作习惯稍微改一下目录和规则？
```

判断：

| 用户选择 | 后续动作 |
|---|---|
| 标准结构就行 | 输出标准项目结构初始化建议 |
| 想改一下 | 进入 Step 5-7 |
| 不确定 | 给 2-3 个具体例子帮用户判断 |

可以这样解释：

```text
标准结构像直接入住酒店；定制结构像把书桌、收纳盒和常用文件夹按你的习惯摆好。
如果你还没形成稳定习惯，先用标准结构更省心。
```

v0.1 的定制边界：

- 只支持基于 `general` 场景能力做目录和规则定制
- 不支持定制 Hub 的中枢结构
- 不把单次定制升级成新 Pack

### Step 5：采访正式成果位置

问：

```text
哪些东西算“最终确认、以后要回看的成果”？
```

更友好的问法：

```text
等这个工作台用一段时间后，你最希望未来的自己回来翻到什么？
是最终交付物、发布记录、客户确认版，还是项目清单？
```

常见映射：

| 用户说法 | formal_source |
|---|---|
| 最终成果、交付物、确认版本 | `输出/确认成果/` 或 `交付物/确认版本/` |
| 已发布内容、发布记录 | `发布记录/` |
| 项目清单、项目注册 | Hub 使用 `projects/`；单项目不单独创建项目注册目录 |

如果用户答不上来，可以先给默认建议：

```text
如果没有特别偏好，我会把正式成果放在“输出/确认成果/”，这样它和草稿、过程材料不会混在一起。
```

### Step 6：采访日常工作区

问：

```text
日常推进过程主要在哪里发生？
```

更友好的问法：

```text
你平时会在哪里“干活”？
比如写草稿、放参考资料、记录推进过程、整理待办和阶段判断。
```

常见映射：

| 工作方式 | business_work_area |
|---|---|
| 轻量资料整理 | `参考资料/` |
| 内容草稿推进 | `输出/草稿/` 或用户明确指定的草稿目录 |
| Hub 管理 | `projects/` |

如果用户说“就是普通项目”，默认：

```text
project：输出/草稿/
```

### Step 7：采访额外目录和 Agent 规则

只添加未来确实会使用的目录。

推荐问法：

```text
除了标准结构外，有没有你明确会反复使用的固定区域？
```

更友好的问法：

```text
有没有一些东西你每次都想单独放，不想和别的文件混在一起？
比如会议纪要、客户沟通、版本记录、素材库、复盘。
```

可以建议：

- `会议纪要/`
- `版本记录/`
- `客户沟通/`
- `资料库/`
- `项目复盘/`

避免：

- 含义重叠的目录
- 只为好看创建的目录
- 与通用结构已有目录重复的目录

至少考虑两类规则：

```text
rules/file-boundaries.md
rules/workflow.md
```

可选：

```text
rules/startup.md
rules/handoff.md
```

规则应具体说明：

- 哪类信息放哪里
- 什么时候写正式成果
- 什么时候写当前工作记录
- 哪些目录只读
- 哪些内容需要用户确认

不要写泛泛的“提高效率”“保持清晰”。

### 采访原则

Step 5-7 的采访要避免抽象词，尽量用“你平时怎么做”的语言。

推荐方式：

- 一次只问一个问题
- 先给用户选项，再允许用户自由描述
- 用户说不清时，用默认值推进
- 每问完一轮，都用一句话复述当前判断

例如：

```text
我先按“正式成果放在 输出/确认成果/，日常推进放在 输出/草稿/”理解。
这样草稿和确认版不会混在一起。你看这个分法顺不顺手？
```

## Init Blueprint 建议结构

当需要产出机器可读方案时，使用：

```json
{
  "schema": "starwork.init_blueprint.v0.1",
  "name": "我的项目工作台",
  "workspace_type": "project",
  "kit": "project",
  "language": "zh",
  "pack": "general",
  "paths": {
    "formal_source": "定稿/",
    "business_work_area": "工作稿/"
  },
  "directories": [
    {
      "path": "资料库/",
      "purpose": "存放用户提供的原始资料和参考信息",
      "write_policy": "read_only_by_default"
    },
    {
      "path": "工作稿/",
      "purpose": "存放 AI 生成的草稿、方案和中间版本",
      "write_policy": "writable"
    },
    {
      "path": "定稿/",
      "purpose": "存放用户确认后的最终成果",
      "write_policy": "confirm_before_write"
    }
  ],
  "folders": [
    "资料库/",
    "工作稿/",
    "定稿/",
    "会议纪要/",
    "客户沟通/",
    "版本记录/"
  ],
  "removals": [
    "参考资料/",
    "输出/"
  ],
  "agent_rules": [
    {
      "slot": "workspace.file_boundaries",
      "from": "rules/file-boundaries.md"
    },
    {
      "slot": "workspace.workflow",
      "from": "rules/workflow.md"
    }
  ],
  "seed": [
    {
      "from": "seed/会议纪要/README.md",
      "to": "会议纪要/README.md",
      "on_conflict": "error"
    }
  ]
}
```

## Blueprint 字段建议

| 字段 | 说明 |
|---|---|
| `schema` | 固定为 `starwork.init_blueprint.v0.1`。 |
| `name` | 工作台名称。 |
| `description` | 工作台说明，可写入项目状态。 |
| `workspace_type` | `project` 或 `hub`。`single-light` 只作为旧别名兼容，不再主动推荐。 |
| `kit` | `project` 或 `hub`。 |
| `language` | `zh` 或 `en`；必须由用户选择，不确定时默认 `zh`。 |
| `pack` | v0.1 单项目默认 `general`；Hub 不让用户选择 Pack。 |
| `paths.formal_source` | 正式成果位置。 |
| `paths.business_work_area` | 当前工作区。 |
| `folders` | 额外目录。 |
| `removals` | 用户明确不要的默认目录；只用于跳过本次 init 将创建的默认路径，不删除已有用户文件。 |
| `agent_rules` | 要注入的规则文件。 |
| `seed` | 初始化占位文件。 |

## 必须遵守的判断边界

### 不用 init 创建卫星项目

如果用户要在已有 Hub 下创建项目，应转向 `starworkSpawn`：

```text
已有 Hub + 新项目 = starworkSpawn
从 0 建工作台 = starworkInit
```

### 不把一次性偏好做成 Pack

如果用户只是想把 `发布记录/` 改成 `成品库/`，这是 Init Blueprint。

如果用户想创建一套未来反复复用的完整结构，才考虑 Pack。

### 不污染 Kit

skill 不能建议用户修改：

```text
product/core/kits/
```

Kit 是基础骨架，不服务于单次定制。

### 不让 blueprint 决定真实 target

真实写入位置必须来自命令参数或用户明确指定。

Blueprint 可以描述“工作台是什么”，不应该擅自决定“写到机器哪里”。

执行 `--yes` 前，skill 必须复述最终绝对路径和文件夹名，并等待用户确认。AI 可以建议文件夹名，但必须说明它可编辑。

文件夹名建议规则：

- 同一个项目名在同一语言下应得到同一个建议，避免每次会话随机换名。
- 中文项目可用简短拼音或用户给出的英文名；英文项目使用小写单词和连字符。
- 建议名只能作为草案。用户改名后，dry-run 和正式执行必须使用用户最终确认的路径。
- 不要把 StarWork 内部词、Pack 名、Kit 名写进用户文件夹名，除非用户明确要求。

示例：

| 项目名 | 建议文件夹名 |
| --- | --- |
| 产品发布计划 | `product-launch-plan` |
| 2026 客户交付资料整理 | `2026-client-delivery` |
| Research Notes | `research-notes` |

## 输出模板

当用户要求“先说方案”时：

```markdown
## 初始化建议

- 工作区类型：
- 基础结构：
- 语言：
- 场景能力：
- 目标目录：
- 文件夹名：
- 正式成果：
- 当前工作区：
- 额外目录：
- 需要注入的规则：

## 为什么这样选

...

## 后续执行

如果用户确认创建，下一步是 dry-run、确认、正式执行和 doctor 检查；不要停在方案。
```

当用户要求“生成定制单”时：

```text
<workspace>-init/
├── init-blueprint.json
├── rules/file-boundaries.md
├── rules/workflow.md
└── seed/...
```

## 与 CLI 的关系

`starworkInit` 的第一目标是把用户需求变成正确方案；用户要求创建时，必须继续运行 CLI。

当前 CLI 支持：

```bash
starwork init --target <path> --blueprint <init-blueprint.json> --dry-run
starwork init --target <path> --blueprint <init-blueprint.json> --yes
```

Agent 必须先执行 dry-run；如果预览里仍出现用户明确不要的默认目录，先修正 `removals` 或 `paths`，不要执行 `--yes`。

## 待确认问题

1. 是否允许一个 Init Blueprint 安装多个 Pack？
2. Hub 初始化是否需要专门的 Hub Init Blueprint 子模式？
3. 是否要把 `init_blueprint` 和 `spawn_blueprint` 抽出共享字段规范？
4. `starworkInit` 生成的 blueprint 是否应能被后续升级为 Pack preset？

## 结论

`starworkInit` 的核心不是“多一个命令参数”，而是：

```text
帮用户把还没想清楚的工作台需求，整理成一张可执行施工单。
```

它让 StarWork 初始化从：

```text
选一个模板
```

升级为：

```text
Agent 帮用户设计工作台，CLI 负责稳定落地。
```
