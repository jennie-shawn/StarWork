---
name: starworkInit
description: 'Plan friendly StarWork init flows: choose project or hub, zh/en language, customization needs, and how to run and verify `starwork init`.'
---

# starworkInit

使用这个 skill，把用户“我想建一个工作台”的模糊需求，整理成 StarWork 初始化方案。

`starworkInit` 不是 `starwork init` 命令本身。它负责在命令执行前帮用户判断并带用户完成执行：

- 应该建项目工作台，还是项目中心
- 使用中文工作台，还是英文工作台
- 是否需要定制目录和 Agent 规则
- 最终应该如何 dry-run、确认执行和检查

除非用户还在讨论阶段，否则不要停在蓝图或建议。用户明确说“创建、初始化、生成、改造成工作台”时，必须继续运行 CLI：先 `starwork init --dry-run`，得到用户确认后再 `starwork init --yes`，最后 `starwork doctor` 验证。

执行 `--yes` 前，必须先让用户确认最终绝对路径。AI 可以建议文件夹名，但必须说明可修改；不要把建议文件夹名当成用户已经同意的路径。

## 参考

需要完整字段、边界和待确认问题时，如果当前环境中能访问，可以读取：

```text
../starworkInit-spec.md
```

这个 SPEC 是开发仓库里的维护文档，某些全局 skill 安装方式可能只安装 `starworkInit/` 目录而不包含该兄弟文件。找不到时不要向用户汇报“本机路径下没找到 spec”，也不要停止；按本 `SKILL.md` 的流程继续完成初始化采访、dry-run、执行和 doctor 验证。不要把内部参考文件是否存在当成用户问题。

## 决策流程

按分支判断，不要一次问完所有问题。

```text
Step 1 判断工作台类型
  ├─ hub：继续判断语言，然后直接给项目中心初始化建议
  └─ project：继续判断语言和是否需要定制目录

Step 2 判断语言
  ├─ 中文：language=zh
  └─ English：language=en

Step 3 确认目标路径和文件夹名
  ├─ 用户已指定：复述绝对路径并等待确认
  └─ 用户未指定：建议一个可编辑文件夹名，再等待确认

Step 4 判断是否需要定制工作台
  ├─ 不需要：输出标准初始化建议
  └─ 需要：进入友好采访

Step 5 采访正式成果放哪里
Step 6 采访日常工作在哪里发生
Step 7 采访额外固定区域和 Agent 规则
```

## Step 1：判断工作台类型

先问：

```text
你是想管理一个具体项目，还是建立一个能管理多个项目的项目中心？
```

判断：

- 一个具体项目、一个阶段目标、一次成果交付：`project`
- 管理多个项目、统一身份/教训/知识/skills：`hub`

默认优先建议 `project`。只有用户明确要建立项目中心时，才推荐 `hub`。不要再询问 matter、长期/短期、多线事项这类已封存分类。

### 项目中心分支

如果判断为 `hub`，不要继续问“选哪个 Pack”。仍然要问语言。

直接输出项目中心初始化建议：

- 工作区类型：`hub`
- 基础结构：项目中心
- 语言：使用 Step 2 的选择
- 场景能力：不让用户选择；项目中心使用项目中心管理结构
- 后续确认：项目中心名称、项目注册区域、是否预置 `skills/` 和 `.incoming/`

## Step 2：判断语言

工作台类型判断后，必须问语言：

```text
这个工作台你想用中文结构，还是英文结构？
```

判断：

- 用户主要用中文工作：`language=zh`
- 用户主要用英文协作或英文目录：`language=en`
- 用户不确定：默认 `zh`

不要跳过这一步。语言会影响目录名称、模板文字和 Agent 规则表达方式。

## Step 3：确认目标路径和文件夹名

在讨论定制目录前，先确认工作台最终写入哪里。

如果用户没有给出路径，先根据项目名建议一个可编辑文件夹名：

```text
我建议文件夹名用 `product-launch-plan`，完整路径是：
`/Users/example/work/product-launch-plan`

你可以直接用这个，也可以改成你更喜欢的名字。确认路径后我再执行 dry-run。
```

要求：

- 最终建议必须写出绝对路径。
- 文件夹名要可读、路径安全、不要带内部术语。
- 文件夹名建议要稳定：同一个项目名在同一语言下应得到同一个建议，不要每次换一种叫法。
- 中文项目可用简短拼音或用户给出的英文名；英文项目用小写单词和连字符，例如 `product-launch-plan`。
- 如果用户改了文件夹名，后续 dry-run 和正式执行都必须使用用户确认后的路径，而不是 AI 最初建议的路径。
- 目标目录如果已存在且非空，必须提示风险，不直接执行 `--yes`。
- 用户没有确认最终路径时，只能讨论方案或执行 dry-run，不能正式写入。

文件夹名建议示例：

| 项目名 | 建议文件夹名 |
| --- | --- |
| 产品发布计划 | `product-launch-plan` |
| 2026 客户交付资料整理 | `2026-client-delivery` |
| Research Notes | `research-notes` |

## Step 4：判断是否需要定制目录

仅当 Step 1 是 Project 时才问：

```text
这个项目是否需要自定义资料区、推进区、成果区或 Agent 规则？
```

判断：

- 不需要、不确定：使用标准 Project 工作台。
- 明确需要固定目录或规则：进入定制采访。
- 用户改口说要管理多个项目：回到 Step 1，改为 `hub`。

## Pack 选择规则

v0.1 不采访用户选择场景 Pack。

原因：

- 目前只把 `general` 作为稳定的默认 Pack。
- 内容创作者 Pack 还未完成产品定稿，不应在 init skill 中主动推荐。
- 其他业务场景 Pack 还不存在，不应询问用户“其他场景”。

默认规则：

- 单项目工作台：`pack=general`
- 项目中心：不让用户选择 Pack；使用项目中心管理结构
- 用户主动提到某个业务场景时，只把它记录为定制需求，不把它映射成 Pack
- 不把一次性目录偏好误判成新 Pack

说明给用户时要说清楚：项目工作台基础结构只负责项目入口和系统层；`参考资料/`、`输出/草稿/`、`输出/确认成果/` 是默认 General Pack 加上的通用工作目录。

## 项目知识库

默认初始化采访里不要主动询问知识库。

原因：

- 知识库是可选能力，不是项目工作台的基础骨架。
- 大多数新项目先把参考资料、草稿和成果区跑顺即可。
- 用户之后随时可以运行 `starwork knowledge init` 开启。

只有用户主动说“想让 AI 长期整理项目知识”“要项目知识库”“初始化时一起开知识库”时，才在初始化命令中增加 `--knowledge`。

如果用户不确定，用这句话解释即可：

```text
知识库是让 AI 长期整理稳定知识的地方，不是放原始资料的文件夹。可以先不开启，之后需要时再运行 starwork knowledge init。
```

项目中心不使用项目知识库；项目中心共享知识库后续单独设计。

## Step 5：判断是否定制

在问正式成果、当前工作区、额外目录之前，先问：

```text
你想先用标准结构，还是希望我帮你按自己的工作习惯稍微改一下目录和规则？
```

判断：

- 标准结构就行：输出标准项目结构初始化建议
- 想改一下：进入 Step 5-7
- 不确定：给 2-3 个例子帮用户判断

解释时可以说：

```text
标准结构像直接入住酒店；定制结构像把书桌、收纳盒和常用文件夹按你的习惯摆好。
如果你还没形成稳定习惯，先用标准结构更省心。
```

## Step 6-8：友好采访

采访要像聊天，不要像配置表。

### 正式成果

问：

```text
等这个工作台用一段时间后，你最希望未来的自己回来翻到什么？
是最终交付物、发布记录、客户确认版，还是项目清单？
```

常见映射：

- 最终成果、交付物、确认版本：`输出/确认成果/`
- 已发布内容、发布记录：`发布记录/`
- 项目清单、项目注册：项目中心使用语言对应的项目注册目录；中文通常是 `项目/`，英文通常是 `projects/`。单项目不单独创建项目注册目录

如果用户答不上来，默认用 `输出/确认成果/`。

### 日常工作区

问：

```text
你平时会在哪里“干活”？
比如写草稿、放参考资料、记录推进过程、整理待办和阶段判断。
```

常见映射：

- 轻量资料整理：`参考资料/`
- 内容草稿推进：`输出/草稿/` 或用户明确指定的草稿目录
- 会议、客户沟通、素材等固定资料：按需新增清晰目录

默认：

- `project`：`输出/草稿/`

### 额外目录和规则

问：

```text
有没有一些东西你每次都想单独放，不想和别的文件混在一起？
比如会议纪要、客户沟通、版本记录、素材库、复盘。
```

只新增未来确实会反复使用的目录。避免含义重叠、只为好看、或与通用结构已有目录重复的目录。

至少考虑两类规则：

- `rules/file-boundaries.md`：不同信息放哪里
- `rules/workflow.md`：Agent 如何推进工作

规则要具体、可执行，避免泛泛的效率建议。

## 输出方式

用户还在讨论时，输出初始化建议：

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

...
```

这些内容只放在对话回复里，不写入最终工作台的 `AGENTS.md`、`current-project.md` 或 `.starwork/rules/`。

用户要求生成定制单时，创建：

```text
<workspace>-init/
├── init-blueprint.json
├── rules/
│   ├── file-boundaries.md
│   └── workflow.md
└── seed/
    └── ...
```

不要创建空的可选目录或文件。

创建定制单后不能把它当成最终结果。必须继续执行：

```bash
starwork init --target <workspace-path> --blueprint <init-blueprint.json> --dry-run
```

把 dry-run 里的绝对目标路径、文件夹名、正式成果目录和日常工作目录复述给用户确认。如果 dry-run 符合用户预期，再执行：

```bash
starwork init --target <workspace-path> --blueprint <init-blueprint.json> --yes
starwork doctor --target <workspace-path>
```

如果用户只是想用标准结构，不需要生成 init blueprint，直接执行普通初始化：

```bash
starwork init --type project --pack general --language <zh|en> --target <workspace-path> --dry-run
starwork init --type project --pack general --language <zh|en> --target <workspace-path> --yes
starwork doctor --target <workspace-path>
```

## Init Blueprint 最小示例

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
  ]
}
```

## 执行命令

当前 CLI 支持 `init --blueprint`。用户要求落地时，不要只输出命令，要实际运行 dry-run / yes / doctor：

```bash
starwork init --target <workspace-path> --blueprint <init-blueprint.json> --dry-run
starwork init --target <workspace-path> --blueprint <init-blueprint.json> --yes
starwork doctor --target <workspace-path>
```

## 约束

- 不用 init 从项目中心创建项目；已有项目中心下创建项目工作台应转向 `starworkSpawn`。
- 不建议用户修改 `product/core/kits/`。
- 不让 blueprint 决定真实 target 路径，目标路径必须来自命令参数或用户明确指定。
- 生成 `AGENTS.md` 时，只描述最终保留的目录；不要引用已经被 `removals` 删除或被用户改名的默认目录。
- 不采访场景 Pack；v0.1 单项目默认 `general`。
- 不把一次性偏好做成 Pack。
- 不覆盖用户已有文件。
- 不把 `init-blueprint.json`、`rules/` 当成最终工作台；它们只是 CLI 执行输入。
- 一次只问一个问题；用户说不清时，用默认值推进并复述判断。

## 项目事实源纯度

`_系统/上下文/当前项目.md` 或 `_system/context/current-project.md` 只记录用户项目事实：

- 项目目标
- 当前阶段
- 近期重点
- 主要事实源
- 风险
- 下一步业务动作

不要把这些内容写入项目事实源：

- StarWork 初始化完成情况
- blueprint 文件路径
- dry-run 结果
- 没有使用的目录列表
- npm、skills、doctor 的安装或检查过程
- AI 自己为什么这样选择的解释

如果用户没有提供明确项目事实，current-project 保持 `TBD` / `待填写`。

## AGENTS 和规则文件边界

`AGENTS.md` 是长期入口规则，不是初始化报告。

AGENTS 默认只写这些长期章节：

- Read First / 开始前先读
- Read When Relevant / 相关时再读
- File Boundaries / 文件边界
- Workflow / 工作方式
- Confirmation Required / 需要确认

不要在 `AGENTS.md` 或 `.starwork/rules/*.md` 中写入：

- `Folders Not Used`
- `Initialized as`
- `StarWork project workspace`
- blueprint path
- dry-run result
- doctor result
- npm install result
- spec 文件缺失或本机路径缺失

如果需要防止 AI 创建旧默认目录，写成正向边界规则，例如“代码放 `src/`，产品文档放 `docs/`，不要另建含义重复的顶层工作目录”，不要写成长篇执行解释。
