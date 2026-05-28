# `starwork init` SPEC

## 状态

- 版本：v0.1 draft
- 所属模块：StarWork CLI
- 命令：`starwork init`
- 目标：把 Core Kit 和场景 Pack 组装成一个可直接使用的 StarWork 工作台

## 一句话定义

`starwork init` 是 StarWork 的初始化入口。

它不要求用户理解 preset、profile、capability、Kit、Pack 等内部概念，而是通过友好提问，把用户想要的工作方式翻译成可落地的工作台结构。

## 设计原则

1. 用户选择工作方式，不选择内部技术名。
2. 初始化结果必须是可工作的最终工作台，不是半套协议文件。
3. Kit 负责通用 AI 工作区结构，Pack 负责场景定制结构。
4. 通用场景也是一个 Pack，不存在“无 Pack”的最终工作台。
5. 初始化可以创建和补充文件，但不能静默覆盖用户已有内容。
6. 项目中心是 `init` 的一种工作区类型；从项目中心创建项目工作台不属于本命令。

## 术语边界

### Kit

Kit 是 AI 工作区的通用模板。

它决定：

- Agent 入口文件在哪里
- 项目状态在哪里
- 当前工作索引在哪里
- 是否使用 Project 标准结构
- 是否启用本地身份和教训
- 是否是项目中心

Kit 不决定具体业务场景。

### Pack

Pack 是场景定制模板。

它决定：

- 工作台用于什么场景
- 场景目录有哪些
- 场景模板有哪些
- 业务工作默认在哪里推进
- 正式成果默认在哪里沉淀
- Agent 在该场景下应遵守哪些额外规则

Pack 可以覆盖 Kit 预留出来的场景配置，但不能破坏 Core 的基础角色。

### 最终工作台

最终工作台由 Kit + Pack 组装而成。

```text
Core 协议
  ↓
Kit：通用工作区模板
  ↓
Pack：场景定制模板
  ↓
用户真正使用的 StarWork 工作台
```

## 用户流程

默认运行：

```bash
starwork init
```

进入引导式流程。

### Step 0：识别当前目录

CLI 先检查当前目录状态：

- 是否为空目录
- 是否已有普通项目文件
- 是否已有 StarWork 标记文件
- 是否位于另一个 StarWork 工作区内部
- 是否存在高风险冲突文件，例如 `AGENTS.md`、`README.md`、`_系统/`

如果检测到已经初始化过 StarWork，应提示用户：

```text
当前目录看起来已经是 StarWork 工作台。
你可以运行 starwork doctor 检查状态，或使用后续升级命令更新结构。
```

v0.1 不在 `init` 中处理升级。

### Step 1：选择工作区类型

提问：

```text
你要建立哪种工作区？

1. 项目工作台（推荐）
   适合一个具体项目的持续执行；可独立使用，也可后续接入项目中心。

2. 项目中心
   适合你有多个项目，希望统一管理身份、教训、知识、skills 和项目登记。
```

内部映射：

| 用户选择 | Kit / Preset | 说明 |
|---|---|---|
| 项目工作台 | `project` | 默认推荐入口。 |
| 项目中心 | `hub` | 建立项目中心，不创建具体项目工作台。 |

注意：Core 中的 `project` 是项目工作台基础模板；是否由项目中心管理，通过 `project_center` 连接信息表达。

### Step 2：选择语言

CLI 应在交互模式下明确询问语言：

```text
第 2 步：工作台使用哪种语言？

1. 中文（推荐）
   目录、规则和 Pack 内容使用中文。

2. English
   Pack 内容使用英文；当前 Core Kit 仍以中文结构为主。
```

参数模式可通过 `--language zh|en` 指定。非交互和 `--yes` 默认使用 `zh`。

### Step 3：选择 Pack

v0.1 交互模式下不主动展示未定稿的场景 Pack。

```text
第 3 步：v0.1 单项目先使用通用工作 Pack（general）。
内容创作者等场景 Pack 还在定稿中，暂不在交互流程里主动推荐。
```

单项目默认使用：

| 工作区类型 | Pack | 说明 |
|---|---|---|
| 项目工作台 | `general` | 默认 Pack。不是“无 Pack”。 |

高级参数仍可显式传入兼容 Pack：

```bash
starwork init --type project --pack content-creator
```

如果用户选择项目中心，不展示业务 Pack 列表，也不询问场景 Pack。

项目中心应使用自己的管理 Pack：

| 工作区类型 | Pack | 说明 |
|---|---|---|
| 项目中心 | `hub-management` | 定义项目注册、共享身份、共享教训、知识库、skills 和跨项目联络。 |

### Step 4：确认基本信息

CLI 询问或自动推断：

- 工作台名称：默认使用当前目录名。
- 正式成果位置：默认由 Kit + Pack 合并后决定。
- 是否继续预览：默认是。

正式成果位置的优先级：

```text
用户显式参数 > Pack 默认值 > Kit 默认值
```

当前工作索引文件仍由 Kit / Core 决定，例如：

```text
_系统/任务/当前工作.md
```

但业务工作实际推进位置可以由 Pack 覆盖，例如自媒体 Pack 可以把单篇内容推进到内容事项或内容生产目录。

### Step 4：确认目标路径

写入前必须展示最终落点，而不只是展示内部参数。

预览至少包含：

```text
目标目录：/absolute/path/to/my-workspace
是否新建目录：是/否
工作台名称：my-workspace
```

如果用户通过 skill 引导初始化，AI 可以建议文件夹名，但必须说明可修改，并在执行 `--yes` 前让用户确认最终绝对路径。

### Step 5：预览计划

在写入前展示计划：

```text
将创建 StarWork 工作台：

目标目录：/Users/example/my-workspace
是否新建目录：是
工作区类型：项目工作台
Kit：project
Pack：general
工作台名称：my-workspace

将创建：
- AGENTS.md
- _系统/上下文/当前项目.md
- _系统/任务/当前工作.md
- 参考资料/
- 输出/草稿/
- 输出/确认成果/

不会覆盖：
- README.md 已存在，将保留

将生成：
- README.starwork.new
```

用户确认后才执行。

### Step 6：执行初始化

执行顺序：

1. 解析 Kit。
2. 解析 Pack 的 `pack.json`。
3. 根据 Kit / profile 语言读取 `languages/<language>.json`。
4. 合并 Pack 的业务角色、语言路径、模板、规则和默认配置。
5. 生成写入计划。
6. 根据冲突策略写入文件。
7. 写入 CLI 内部状态。
8. 输出下一步建议。

完成提示示例：

```text
StarWork 工作台已创建。

下一步建议：
1. 运行 starwork doctor 检查工作区。
2. 打开 AGENTS.md，确认 Agent 入口规则。
3. 如果你使用 Codex / Claude Code / Cursor，可运行 starwork adapt 生成适配文件。
```

## 写入规则

### 默认策略

| 情况 | 行为 |
|---|---|
| 文件不存在 | 创建 |
| 目录不存在 | 创建 |
| 文件存在且为空 | 询问后写入 |
| 文件存在且看起来是 StarWork 旧模板 | 询问后更新 |
| 文件存在且有用户内容 | 不覆盖，生成 `.starwork-new` 或 `.new` |
| 目录存在 | 合并新增内容 |
| 用户未确认 | 不写入 |

v0.1 默认不删除任何文件。

### 冲突输出

当文件冲突时，优先生成旁路文件：

```text
README.starwork-new.md
AGENTS.starwork-new.md
```

具体命名后续实现时统一，但必须满足：

- 不覆盖原文件
- 文件名可读
- 用户能看懂它是 StarWork 建议的新版本

## Pack 覆盖规则

Pack 可以覆盖：

- 正式成果默认路径
- 业务工作默认路径
- 场景目录
- 场景模板
- 场景规则
- 推荐下一步动作

Pack 不应覆盖：

- Core 入口角色
- Kit 的项目状态索引角色
- Kit 的当前工作索引角色
- 用户已有内容
- 已存在的事项真实记录
- 已确认的决策记录

也就是说：

```text
Pack 可以改变业务流向，但不能移除工作区仪表盘。
```

## CLI 内部状态

初始化后，CLI 应写入一个机器可读状态文件，用于后续 `doctor`、`adapt`、Pack 安装和升级。

建议位置：

```text
.starwork/workspace.json
```

示例：

```json
{
  "schema": "starwork.workspace.v0.1",
  "core": "0.1",
  "workspace_type": "single-light",
  "kit": "project",
  "packs": [
    "general"
  ],
  "language": "zh",
  "formal_source": "由 pack 或用户选择决定",
  "created_by": "starwork init",
  "created_at": "2026-05-11"
}
```

该文件是 CLI 状态，不是项目事实源。用户不应通过手改它来表达项目进度。

## 参数模式

引导式是默认模式；参数模式用于熟练用户和自动化。

建议参数：

```bash
starwork init
starwork init --type single-light --pack general
starwork init --type project --pack content-creator
starwork init --type hub
starwork init --name "我的内容工作台"
starwork init --formal-source outputs/final
starwork init --target ./my-workspace
starwork init --target ./custom-workspace --blueprint ./init-blueprint.json --dry-run
starwork init --dry-run
starwork init --yes
starwork init --language en
```

参数说明：

| 参数 | 说明 |
|---|---|
| `--type` | 工作区类型：`single-light`、`project`、`hub`。 |
| `--pack` | Pack ID；单项目交互默认 `general`，高级参数可传入兼容 Pack。 |
| `--language` | 工作台语言：`zh` 或 `en`；交互模式会询问，非交互默认 `zh`。 |
| `--name` | 工作台名称。 |
| `--blueprint` | 读取 `starworkInit` 生成的初始化定制单；支持覆盖正式成果/当前工作路径、额外目录、规则注入、seed 和跳过明确不要的默认目录。 |
| `--formal-source` | 覆盖默认正式成果位置。 |
| `--target` | 指定初始化目标目录；默认是当前目录。 |
| `--dry-run` | 只预览，不写入。 |
| `--yes` | 接受默认值并执行；仍不得覆盖用户已有内容。 |

v0.1 暂不建议直接暴露 `--preset` 给普通用户。可以保留内部或高级参数，但帮助文案应优先展示 `--type` 和 `--pack`。

## 与其他命令的关系

### `starwork doctor`

`init` 结束后建议运行 `doctor`。

`doctor` 应读取 `.starwork/workspace.json`，并检查：

- Core 必需角色是否存在
- Kit 文件是否完整
- Pack 文件是否完整
- 是否存在冲突旁路文件
- 是否存在需要用户合并的内容

### `starwork adapt`

`init` 不默认运行 `adapt`。

原因：

- 不同 Agent 的适配文件不同。
- 用户可能只想先生成工作台。
- v0.1 应保持初始化路径简单。

`init` 完成后提示用户运行 `starwork adapt`。

### `starwork pack install`

`pack install` 仍然保留，但不是普通用户第一次使用的主路径。

使用场景：

- 已有 StarWork 工作台后补装 Pack。
- 高级用户明确知道要安装哪个 Pack。
- 自动化脚本单独安装 Pack。

## 暂不处理

v0.1 `init` 不处理：

- 从项目中心创建项目工作台
- 账号系统
- 云端登录
- 付费授权
- Pack 市场
- 自动升级旧工作区
- 删除或重排用户已有内容
- 复杂多语言 Pack 混装
- 多个业务 Pack 同时安装后的冲突解决

## v0.1 实现状态

当前 M2 CLI v0.1 最小闭环已补齐：

1. `general` 默认 Pack 的声明。
2. `content-creator` Pack 的声明文件。
3. 项目中心 Kit / Preset，避免把项目中心误映射到项目工作台 Kit。
4. `hub-management` Pack。
5. `.starwork/workspace.json` 最小状态文件。
6. 写入计划、dry-run 预览和冲突旁路文件策略。
7. `doctor` 对 `.starwork/workspace.json`、Kit 和 Pack 的检查。
8. `adapt` 对 Codex、Claude Code、Cursor、Trae 的轻量适配。
9. `pack install` 对已有健康工作台的补装 Pack 能力。

后续仍需要补齐：

1. 正式 JSON Schema 文件。
2. 更细的模板 slot 机制。
3. Pack 升级、卸载和迁移机制。

## v0.1 验收标准

`starwork init` v0.1 可验收，至少满足：

- 普通用户无需理解 Kit / Pack / preset，也能完成初始化。
- 用户能在写入前看懂将创建什么。
- 初始化不会静默覆盖已有内容。
- 项目工作台、项目中心两种入口边界清楚；默认推荐项目工作台。
- 通用工作和自媒体内容创作都通过 Pack 表达。
- 项目中心不安装业务 Pack。
- 初始化结果可被 `starwork doctor` 检查。
- 后续可以通过 `starwork pack install` 补装 Pack。
