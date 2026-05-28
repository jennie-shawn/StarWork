# StarWork Kit Structure Reference

## 状态

- 版本：v0.1 draft
- 日期：2026-05-25
- 范围：记录 `product/core/kits/` 下正式 Kit 的目标结构和 `.starwork/` 分层边界

## 正式 Kit

v0.1 只保留两类正式 Kit：

| Kit | 定位 |
|---|---|
| `project` | 项目工作台；可独立使用，也可加入项目中心。 |
| `hub` | 项目中心；维护共享身份、教训、知识、skills、项目注册和联络路由。 |

旧事项分叉不再作为 Kit、Preset 或 CLI 兼容入口保留。历史项目里如果已经有 `事项/` 或 `matters/`，Doctor 只把它暴露为历史内容信号，后续由 AI 判断如何无损整理。

## 分层原则

| 层级 | 放什么 | 不放什么 |
|---|---|---|
| `.starwork/` | StarWork 机制运行状态、manifest、队列、安装记录、缓存和报告。 | 项目业务事实、草稿、正式成果、项目中心共享资产正文。 |
| `_系统/` 或 `_system/` | 项目协作事实，例如项目状态、当前工作、身份、教训、决策和协作索引。中心管理的项目可额外包含项目中心同步说明。 | StarWork 机制缓存、投递队列、安装 manifest。 |
| Pack 业务目录 | 由 Pack 定义的项目输入、草稿、成果或场景流程目录。默认 General Pack 会创建 `参考资料/` / `references/` 与 `输出/` / `outputs/`。 | Core Kit 固定结构、StarWork 机制报告或 CLI 缓存。 |
| `identity/`、`lessons/`、`knowledge/`、`skills/` | 项目中心共享资产或项目本地上下文资产。 | 机制队列和缓存。 |
| `.agents/`、`.claude/`、`.obsidian/` | 外部工具入口和配置。 | StarWork 自有机制事实源。 |

## 通用 `.starwork/`

所有由 StarWork CLI 初始化、生成或升级后的工作台推荐包含：

```text
.starwork/
├── workspace.json
├── skills.json
├── packs/
├── reports/
└── cache/
```

加入项目中心的 Project 额外包含：

```text
.starwork/
├── handoff/
├── sync.json
└── internal/
```

其中：

- `handoff/` 是本地跨项目收发队列。
- `sync.json` 是项目中心同步元数据，替代 legacy `.core-sync.json`。
- `internal/` 是项目中心内部协议快照，替代 legacy `.internal/`。

## `project`

中文目标结构：

```text
.
├── AGENTS.md
├── README.md
├── CLAUDE.md
├── .starwork/
├── .obsidian/
├── .agents/skills/
├── .claude/skills/
├── _系统/
│   ├── 上下文/
│   │   └── 当前项目.md
│   ├── 任务/
│   │   └── 当前工作.md
│   ├── 身份/
│   └── 教训/
└── 知识/
```

英文镜像结构：

```text
.
├── AGENTS.md
├── README.md
├── CLAUDE.md
├── .starwork/
├── .obsidian/
├── .agents/skills/
├── .claude/skills/
├── _system/
│   ├── context/
│   │   └── current-project.md
│   ├── tasks/
│   │   └── current-work.md
│   ├── identity/
│   └── lessons/
└── knowledge/
```

Project 不默认创建事项目录。需要多推进线时，先通过 Pack、Skill 或用户自定义目录表达，不再切 Kit。

Project Kit 也不直接拥有 `参考资料/` / `references/` 或 `输出/` / `outputs/`。普通初始化仍会看到这些目录，是因为默认安装的 General Pack 负责创建它们。

独立 Project 也不默认创建 `_系统/主库同步/`、`_system/main-repo-sync/`、`.core-sync.json` 或 `.internal/`。这些只在项目中心创建项目工作台或升级接入项目中心时由 CLI 叠加。

## `hub`

项目中心 Kit 的机制目录保持英文，用户可见目录按工作台语言生成。源码中的 `core/kits/hub/` 保留一套英文基准路径，CLI 会在中文项目中心生成时映射为中文可见目录。

中文项目中心目标结构：

```text
.
├── AGENTS.md
├── README.md
├── .starwork/
│   ├── workspace.json
│   ├── skills.json
│   └── handoff/
├── .incoming/
├── .internal/
├── 身份/
├── 教训/
├── 知识/
├── 项目/
│   ├── README.md
│   ├── registry.json
│   └── 协作/
├── 技能/
│   ├── README.md
│   └── registry.json
└── 工作区/
    └── README.md
```

英文 Project Center 目标结构：

```text
.
├── AGENTS.md
├── README.md
├── .starwork/
│   ├── workspace.json
│   ├── skills.json
│   └── handoff/
├── .incoming/
├── .internal/
├── identity/
├── lessons/
├── knowledge/
├── projects/
│   ├── README.md
│   ├── registry.json
│   └── coordination/
├── skills/
│   ├── README.md
│   └── registry.json
└── workspace/
    └── README.md
```

项目中心不维护具体项目状态和当前工作入口。项目中心只记录项目在哪里、共享资源在哪里、跨项目联络如何路由。

同一语义只能有一个可见目录：中文项目中心不应同时出现 `知识/` 和 `knowledge/`，英文 Project Center 不应同时出现 `knowledge/` 和 `知识/`。
