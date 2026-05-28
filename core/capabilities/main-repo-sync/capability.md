# Capability: main-repo-sync v0.1

`main-repo-sync` 描述项目中心与中心管理项目工作台之间的同步模型。

它不只是共享身份或共享教训，而是一整套协同模型：

- 项目中心是规则源、可复用知识源、项目注册表、skill 来源和消息路由层。
- 中心管理的项目工作台是具体执行工作区。
- 初始化时复制稳定快照。
- 部分资源以只读链接方式挂载。
- 同步元数据优先记录在 `.starwork/sync.json`，legacy 工作台可继续使用 `.core-sync.json`。
- 项目发现依赖项目中心的 registry。
- 可复用更新通过 inbox / review 流程回写。

`.starwork/` 的分层边界见：`product/core/starwork-runtime-layer-spec.md`。

## 核心模型

一句话：

> 项目中心负责共享、可复用、可审计的公共机制；每个项目工作台负责自己的项目事实和执行过程。

这意味着项目中心可以发现、初始化、同步和联络项目工作台，但项目中心不会变成这些项目的进度数据库。

## 项目中心职责

项目中心维护跨项目可复用资源：

- `identity/`
- `lessons/`
- `knowledge/` 或语言 profile 映射后的知识入口
- 共享 skills
- 项目注册表
- 跨项目消息路由
- 可复用内容回写审核队列
- 内部协议快照和同步机制状态

项目中心不应该存放项目特定的执行内容。

其中 `identity/`、`lessons/`、`knowledge/`、`skills/` 是项目中心共享资产，不进入 `.starwork/`。项目注册表、跨项目消息路由、回写审核队列、同步状态和内部协议快照如果仅服务 StarWork 项目中心机制，优先放入 `.starwork/`。

## 中心管理项目工作台职责

中心管理的项目工作台负责具体项目执行：

- 项目状态
- 当前工作
- 过程材料
- 项目正式事实源
- 项目专属决策和产出

项目工作台可以包含来自项目中心的快照或链接，但这些资源默认仍然是共享参考层。

## 中心管理项目的必需层

一个由项目中心管理的项目工作台通常包含这些固定层：

- `AGENTS.md`
- `CLAUDE.md`
- `README.md`
- `.starwork/workspace.json`
- `.starwork/skills.json`
- `.starwork/sync.json`
- 一个可见的主库同步说明，例如 `_系统/主库同步/README.md` 或 `_system/hub-sync/README.md`
- 主库身份快照，例如 `_系统/身份/`
- 主库教训快照，例如 `_系统/教训/`
- `.starwork/internal/`
- `.obsidian/`
- `知识/` 或 `knowledge/` 作为只读链接
- `_系统/上下文/当前项目.md` 或 `_system/context/current-project.md`，作为项目状态事实源
- `_系统/任务/` 或 `_system/tasks/`
- `.starwork/handoff/`

legacy 工作台中的 `.core-sync.json` 和 `.internal/` 仍可被 CLI / doctor 读取，但新生成结构应优先使用 `.starwork/sync.json` 和 `.starwork/internal/`。

中文中心管理项目当前使用 `_系统/上下文/当前项目.md`，中文本地单项目使用 `_系统/上下文/项目状态.md`。两者都是同一个 Core 角色在不同 preset 下的映射，不能同时独立维护。

## 同步语义

| 资源 | 在项目工作台中的形态 | 默认同步语义 |
|---|---|---|
| `identity/` | 复制快照 | 初始化自主库；后续更新需要手动确认。 |
| `lessons/` | 复制快照 | 初始化自主库；项目特定教训先留在本地，确认可复用后再回写。 |
| `.starwork/internal/` | 复制指定协议文件 | 只同步稳定协议，例如回写协议和合并策略；legacy 路径为 `.internal/`。 |
| `.obsidian/` | 复制配置 | 提供默认 Obsidian 本地行为。 |
| `knowledge/` | 只读软链接 | 主库仍然是事实源。 |
| `.starwork/sync.json` | 本地元数据 | 记录来源路径、版本、同步时间、挂载资源和 skills；legacy 路径为 `.core-sync.json`。 |
| `.starwork/handoff/` | 本地跨项目收发队列 | 记录消息信封、队列和投递状态，不承载项目业务材料正文。 |
| shared skills | 软链接 | 不要把共享 skills 复制成项目内独立分叉。 |

## Registry 边界

项目中心的项目 registry 存放项目发现与同步元数据。推荐机制路径为：

```text
projects/registry.json
```

legacy 或用户可读目录可以继续提供说明或摘要，但机器事实源应避免散落成多份。

registry 字段包括：

- 项目 ID
- 名称
- 路径
- 状态
- 创建日期
- last_sync 时间
- Core 版本
- 同步模式
- 共享资源

它不能存放项目进度正文。

项目进度留在项目工作台内，通常位于：

- `_系统/上下文/当前项目.md`
- `_system/context/current-project.md`
- 或 profile 声明的 Core v0.1 项目状态角色文件

## 状态读取顺序

工具和 adapters 应按以下顺序读取项目状态：

1. 工作区规则或 preset 声明的状态文件
2. `_系统/上下文/当前项目.md`
3. `_system/context/current-project.md`
4. `_系统/上下文/项目状态.md`
5. `_system/context/project-status.md`

如果多个文件同时存在，工作区规则必须明确唯一事实源。其他文件应作为别名、指针或生成副本，而不是第二份独立维护的状态文件。

## 回写边界

项目工作台中出现的可复用建议，应通过项目中心审核流程回写。推荐机制路径为：

```text
.incoming/
```

跨项目 handoff 用于项目之间的请求、依赖、通知和交接。它不能替代项目中心的可复用知识审核队列。

| 机制 | 用途 | 是否改变项目中心正式内容 |
|---|---|---:|
| `.incoming/` | 项目工作台向项目中心提交候选身份、教训、报告或知识更新。 | 只有项目中心审核后才会改变。 |
| `.starwork/handoff/` | 一个项目向另一个项目发送请求、同步、依赖或回复。 | 不会。 |

候选内容一旦被审核通过，应进入项目中心共享资产目录，例如 `identity/`、`lessons/`、`knowledge/` 或 `skills/`。`.incoming/` 不应成为长期内容库。

## 生命周期

| 状态 | 含义 | 项目中心行为 |
|---|---|---|
| `active` | 项目正在推进。 | 纳入正常项目发现和状态读取。 |
| `paused` | 项目有意暂停，但未来可能恢复。 | 保留 registry 记录和项目事实，不把沉默视为异常。 |
| `archived` | 项目作为历史参考。 | 保留 registry 记录和项目目录；实时汇总时默认跳过。 |
