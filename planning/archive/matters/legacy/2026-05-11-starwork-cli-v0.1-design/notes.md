# 过程笔记

## CLI 总体定位

CLI 是 Core 的产品化入口，不是新的 Agent，也不是 Runtime。

Core 定义什么是对的；CLI 负责把 Core 稳定创建出来、检查出来、适配出来。

## v0.1 命令边界

v0.1 暂定只研究四个命令：

```bash
starwork init
starwork doctor
starwork adapt
starwork pack install content-creator
```

## 关于 `starwork init` 的初步方向

用户明确希望 `init` 的交互更加友好。

阶段判断：

- `starwork init` 默认应是引导式，而不是要求用户理解 preset、profile、capability。
- 参数式仍应保留给熟练用户，例如 `starwork init --preset zh-local-starter`。
- 普通用户选择的应是“我要怎么工作”，CLI 内部再映射到 preset。

建议的人话选项：

```text
你准备怎么使用 StarWork？

1. 一个轻量项目：放资料、出草稿、确认成果
2. 一个长期项目：需要事项追踪、跨会话接力
3. 一套多项目工作系统：建立主库，用来统一管理身份、教训、知识、skills 和多个项目
```

内部映射：

```text
轻量项目 -> zh-local-starter
长期项目 -> zh-local-matter
多项目工作系统 -> hub kit / main-repo kit（名称待定）
```

修正判断：

- `starwork init` 的多项目入口不应直接创建“卫星项目”。
- 对普通用户来说，更自然的需求是“我要建立一套庞大的多项目管理系统”，也就是先建立主库或中枢。
- 卫星项目创建是后续动作，需要读取主库、注册项目、同步身份/教训/knowledge/skills，并可能搭配主库已有 skill，因此不宜混在最基础的 `init` 引导里。
- 后续需要单独设计一个命令或命令组来处理卫星项目创建，暂名可讨论：`starwork project create`、`starwork satellite create`、`starwork link`、`starwork attach` 等。

进一步修正：

- Pack 安装不应和 `init` 完全拆开。
- 对普通用户来说，第一次初始化时就应该能选择“我要做什么场景”，例如自媒体内容创作者。
- 因此 `starwork init` 应内置 Pack 选择环节：先选工作区形态，再选是否安装场景 Pack。
- 例外：多项目管理中枢 / 主库型工作台不安装业务 Pack。它是管理多个项目的中枢，不是某个具体业务场景的工作台。

进一步收敛后的 `init` 用户流程：

```text
1. 选择工作区类型
   - 轻量单项目
   - 长期单项目
   - 多项目管理中枢

2. 选择 Pack
   - 通用工作 Pack（默认 Pack）
   - 自媒体内容创作者 Pack

3. 预览将创建和安装的内容

4. 执行初始化
```

这里的关键变化是：不存在“无 Pack”的最终工作台。用户即使选择最基础的通用工作区，本质上也是安装 `default` / `general` Pack。Kit 只负责通用 AI 工作区底座；Pack 负责场景层，通用场景也是一种场景。

多项目管理中枢型工作区暂不安装业务 Pack，但仍可拥有自己的中枢 Pack 或默认管理 Pack，用来定义项目注册、共享身份、共享教训、知识库和 skills 的管理方式。

## `init` 需要优先建立的安全感

`init` 的第一原则是不静默覆盖用户内容。

建议写入规则：

- 文件不存在：创建
- 文件存在且为空或明显是旧模板：询问是否更新
- 文件存在且用户写过：不覆盖，生成 `.new` 或提示手动合并
- 默认不删除任何东西

## 待继续推敲

- `init` 在空目录和已有目录中的不同流程。
- 是否默认询问项目名称。
- 是否默认询问正式事实源位置。
- 是否在 `init` 中顺手执行 `adapt`。
- 多项目系统入口如何命名：主库、中枢、Hub、工作系统、项目网络，哪个词普通用户更容易懂。
- 卫星项目创建应由哪个命令负责，以及如何搭配主库 skill 完成注册、同步和联络单机制。
- Pack 选择应作为 `init` 的第二步；需要继续命名通用默认 Pack，以及多项目管理中枢是否有独立的管理 Pack。
- `init` 预览页面应该展示哪些将创建的文件。

## 关于 `starwork doctor`

用户确认 M1 Core v0.1 可以封版后，M2 CLI v0.1 正式进入 `doctor`。

初步判断：

- `doctor` 是工作台体检命令，不是修复器。
- 第一版应先检查 `.starwork/workspace.json`、Core 必需角色、Kit 文件、正式事实源、业务工作区和已安装 Pack 的落地结果。
- `doctor` 应成为 `init` 之后、`adapt` 和 `pack install` 之前的关键桥梁。
- v0.1 不提供默认自动修复，避免在用户工作区里做过多隐式写入。

正式规格见 `product/cli/doctor-spec.md`。

## Kit 结构盘点结论

- 中文本地单项目使用 `_系统/上下文/项目状态.md` 和 `_系统/任务/当前工作.md`。
- 中文卫星项目使用 `_系统/上下文/当前项目.md` 和 `_系统/任务/当前工作.md`，用于兼容当前主库多项目汇总机制。
- 中文事项型 Kit 使用 `_系统/上下文/决策.md` 和 `事项/注册表.md`。
- Hub 中枢的 `identity/`、`lessons/` 不放入 `_系统/`，因为它们是主库重点维护的共享项目。
- Hub 中枢的 `projects/` 中文化为 `项目/`，其中跨项目联络为 `项目/联络/`；`skills/` 和 `.incoming/` 保持英文。
- 原 `zh-shared-*` 命名改为 `zh-satellite-*`，避免把“共享资源”误解成该 Kit 的主定位。

## Pack 多语言结构结论

- `pack.json` 不再直接写中文路径，而是只保留语言无关的业务角色、业务流、规则插槽、模板 ID 和 seed ID。
- `languages/zh.json`、`languages/en.json` 负责把业务角色落到具体语言路径，例如 `ideas` 在中文下是 `选题池/`，英文下是 `ideas/`。
- `rules/`、`templates/`、`seed/` 按语言分层，避免中文 Pack 和英文 Pack 变成两套互相漂移的结构。
- CLI init 当前会根据语言读取 Pack 的 `languages/<language>.json`，中文主流程保持可用，英文 Pack 层已可 dry-run 验证。
