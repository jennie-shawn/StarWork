# StarWork Two-Kit Architecture SPEC

## 状态

- 版本：v0.1 draft
- 所属模块：StarWork Core / CLI / Skills
- 主题：封存 事项 Kit，收敛为两类 Kit
- 实现状态：已被 M2.8 命名优化更新；`satellite-starter` 已降级到 `core/legacy/`，不再作为正式 Kit
- 相关对象：`init`、`spawn`、`doctor`、`upgrade`、`audit`、`starworkInit`、`starworkSpawn`、`starworkDoctor`

## 背景

历史上 Core 里同时存在过这些结构或讨论方向：

- `local-starter`
- `satellite-starter`
- `project`
- `hub`
- matter / 事项型工作台

这个模型的初衷是把“是否接入项目中心”和“是否使用项目工作台标准结构”都提前固化为 Kit 类型。但实际推进后出现了两个问题：

1. 事项型工作台的真实使用场景还没有被验证清楚。
2. 事项机制作为 Kit 类型，会让 CLI、Doctor、Spawn、Upgrade、Skill、Pack 支持矩阵成倍复杂。

因此本 SPEC 建议：**暂时封存 事项 Kit，把 StarWork Kit 收敛为两类：Project Kit 和 项目中心 Kit。**

## 一句话决策

StarWork v0.1 只保留两种正式 Kit：

```text
project kit = 具体项目工作台
hub kit     = 项目中心工作台
```

事项机制不再是 Kit 类型，而是未来的可选能力，形态更接近 Agent Lanes：在一个已存在的 Project Kit 上增加“多事项 / 多推进线 / 多阶段交接”的协作层。

## 核心判断

### 为什么 事项机制 不适合作为 Kit

事项能力 目前承担了太多不稳定含义：

- 项目工作台
- 长期项目
- 事项推进
- 决策记录
- 跨会话接力
- 内容生产过程
- 项目过程材料

这些含义并不总是同时出现。用户可能只需要长期项目，但不需要 `事项/`；也可能需要多 Agent 分工，但不需要 事项索引；也可能只想在一个项目里保留几个推进线，而不希望初始化时被迫选择“项目工作台”。

如果把 事项机制 固化为 Kit，用户一开始就必须回答一个很难的问题：

> 这个项目到底是不是 事项 型？

这会让 `init` 变重，也会让 `spawn` 变重。

### 为什么 事项机制 更像 Capability

事项机制 更适合被理解为：

> Project Kit 上的可选协作能力。

它和 Agent Lanes 类似：

- 不应该决定整个工作台的基础目录结构。
- 不应该成为用户初始化时的主分叉。
- 应该由用户或 Agent 在需要时启用。
- 应该配套 Skill 或 CLI 子命令维护生命周期。

未来可能的命令形态：

```bash
starwork 事项 enable
starwork 事项 create
starwork 事项 pause
starwork 事项 archive
```

但在 v0.1 里先不实现。

## 目标模型

### Kit 类型

| Kit | 定位 | 使用场景 |
|---|---|---|
| `project` | 具体项目工作台 | 单项目用户；项目中心创建的中心管理项目工作台；普通项目执行层。 |
| `hub` | 项目中心工作台 | 管理多个项目、共享身份、教训、知识、skills、registry 和联络路由。 |

### Workspace Type

正式工作区类型收敛为：

| workspace_type | 说明 |
|---|---|
| `project` | 具体项目工作台。可以独立使用，也可以由项目中心管理。 |
| `hub` | 项目中心。 |

是否是中心管理项目工作台不再由 Kit 名称表达，而由 workspace state 表达：

```json
{
  "workspace_type": "project",
  "kit": "project",
  "project_center": {
    "path": "/Users/example/my-hub",
    "project_id": "content-site"
  },
  "hub": {
    "path": "/Users/example/my-hub",
    "project_id": "content-site"
  }
}
```

如果没有 `project_center` 或兼容字段 `hub`，就是独立项目工作台。

### Capability 状态

事项机制 作为封存能力：

```json
{
  "capabilities": {
    "事项": {
      "enabled": false,
      "status": "frozen"
    }
  }
}
```

v0.1 不默认生成：

- `事项/`
- `matters/`
- `_系统/上下文/决策.md`
- `_system/context/decisions.md`
- `事项/注册表.md`
- `matters/registry.md`

Doctor 可识别旧项目中的这些路径，但不把它们作为新版标准必需结构。

## 目标 Project Kit 结构

> M2.11 更新：Project Kit 只定义基础工作台骨架，不直接拥有 `参考资料/`、`输出/`、`references/`、`outputs/`、`知识/`、`knowledge/`、`知识库/` 或 `knowledge-base/`。普通初始化仍默认安装 General Pack，因此最终工作台会出现参考资料和输出目录；知识库需要通过 Knowledge Capability 另行开启。

### 中文 Project Kit

```text
.
├── AGENTS.md
├── README.md
├── CLAUDE.md
├── .starwork/
│   ├── workspace.json
│   ├── skills.json
│   └── handoff/
│       ├── inbox/
│       ├── outbox/
│       ├── sent/
│       ├── archived/
│       └── state.json
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
```

### 英文 Project Kit

```text
.
├── AGENTS.md
├── README.md
├── CLAUDE.md
├── .starwork/
│   ├── workspace.json
│   ├── skills.json
│   └── handoff/
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
```

### 独立 Project 与 中心管理项目工作台 的区别

两者以同一个 Project Kit 为基础，但 中心管理项目工作台 由 `spawn` 额外叠加 项目中心同步层。

区别只在状态和同步说明：

| 项目形态 | `.starwork/workspace.json` | `.core-sync.json` | identity / lessons / knowledge |
|---|---|---|---|
| 独立项目工作台 | 没有 `project_center` / `hub` 字段 | 不默认存在 | 本地维护 |
| 中心管理的项目工作台 | 有 `project_center.path` 和 `project_center.project_id`，兼容保留 `hub` 镜像 | 作为 legacy mirror 存在 | 来自项目中心的快照或链接 |

也就是说：

```text
Project Kit + project_center 连接 = 中心管理项目工作台
Project Kit without project_center = standalone project
```

中心管理项目叠加层 至少包含：

```text
_系统/主库同步/README.md 或 _system/main-repo-sync/README.md
.starwork/sync.json
.core-sync.json
.starwork/internal/    # 如项目中心提供内部协议快照
```

## 目标 项目中心 Kit 结构

项目中心 Kit 的机制目录保持英文；用户可见目录按语言生成。中文项目中心使用中文可见目录，英文 Project Center 使用英文可见目录。

中文项目中心：

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

英文 Project Center：

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

项目中心不是项目执行层，不生成项目状态和当前工作入口。

## 事项机制下线口径

### 下线旧入口，不做兼容分支

本次不是说项目里永远不能存在事项目录，而是：

> v0.1 不把事项机制当作正式 Kit 分叉，也不继续提供旧事项类型的 CLI 兼容入口。

Doctor 仍应识别：

- `事项/`
- `matters/`
- `事项/注册表.md`
- `matters/registry.md`
- `_系统/上下文/决策.md`
- `_system/context/decisions.md`

Doctor 可以把这些目录暴露为历史内容信号，供 AI 判断用户原有工作方式：

```text
检测到历史事项目录信号
```

而不是：

```text
这是事项类型 Kit
```

### 事项机制 后续可能形态

未来事项机制可以作为 Project 上的可选能力重新设计：

```text
project kit
  + agent-lanes
  + issue-tracking capability
```

可能包含：

- 独立推进线
- 多推进线索引
- 生命周期管理
- 推进线级交接
- 推进线级复盘

但必须满足两个条件才重新打开：

1. 有明确用户场景。
2. 有配套 Skill / CLI 管理生命周期。

## CLI 调整方案

### `init`

当前：

```bash
starwork init --type single-light
starwork init --type project
starwork init --type hub
```

目标：

```bash
starwork init --type project
starwork init --type hub
```

兼容策略：

| 旧参数 | 新处理 |
|---|---|
| `single-light` | 兼容别名，映射为 `project`。 |
| 旧事项类型 | 不兼容，直接报不支持。 |

交互式 init 不再询问“是否需要事项机制”。

推荐流程：

1. 选择工作台类型：项目工作台 / 项目中心。
2. 选择语言：中文 / 英文。
3. 选择 Pack：默认通用 Pack。
4. 是否需要定制工作台结构。

### `spawn`

当前：

```bash
starwork spawn --mode starter
starwork spawn --mode project
```

目标：

```bash
starwork spawn --mode project
```

或直接省略：

```bash
starwork spawn --hub ~/my-hub --name "New Project" --target ~/projects/new-project
```

兼容策略：

| 旧参数 | 新处理 |
|---|---|
| `starter` | 兼容别名，映射为 `project`。 |
| 旧事项模式 | 不兼容，直接报不支持。 |

Spawn 生成的 中心管理项目工作台 本质是：

```text
Project Kit + project_center 连接
```

workspace state：

```json
{
  "workspace_type": "project",
  "kit": "project",
  "project_center": {
    "path": "/Users/example/my-hub",
    "project_id": "new-project"
  },
  "hub": {
    "path": "/Users/example/my-hub",
    "project_id": "new-project"
  },
  "paths": {
    "formal_source": "输出/确认成果/",
    "business_work_area": "_系统/任务/当前工作.md"
  }
}
```

### `doctor`

Doctor 目标：

- 新标准只认可 `project` 和 `hub`。
- 旧 `single-light`、`satellite-starter` 作为 legacy workspace type 兼容。
- 对旧 事项 路径输出 legacy signal。
- 不再要求 事项索引 或 decisions 文件。

检查项调整：

| 旧检查 | 新处理 |
|---|---|
| 旧事项 capability 必需文件 | 移入历史内容信号检查，不作为标准健康条件。 |
| `decisions` 文件位置 | 不强制。出现时检查是否在合理位置。 |
| `project` kit completeness | 映射到 Project Kit + legacy 事项 signal。 |

### `upgrade`

Upgrade blueprint 目标类型收敛：

```json
{
  "base": {
    "workspace_type": "project",
    "kit": "project"
  }
}
```

兼容旧 blueprint：

| 旧值 | 新处理 |
|---|---|
| `single-light` + `local-starter` | 映射为 `project` + `project`。 |
| `satellite-starter` | 映射为 `project` + project_center 连接。 |

### `audit`

`audit` SPEC 需要同步改名：

- 不再以 `satellite-starter` / `project` 为正式类型。
- 中心管理项目工作台是 `workspace_type: project` 且存在 `project_center` 连接；`hub` 字段只作为兼容镜像。
- 旧 `satellite-*` 作为 legacy 兼容。

### `repair`

Repair 可用于把旧 StarWork 工作台从：

```text
single-light / satellite-starter
```

修复为：

```text
project
```

但 v0.1 不自动删除旧 `事项/`，只调整 state、规则和检查口径。

## Skill 调整方案

### `starworkInit`

删除主线中的 事项 判断。

新主线：

```text
你要建的是一个具体项目，还是项目中心？
```

不再问：

```text
这个项目是否需要事项机制？
```

如用户主动提到多个事项，可以回答：

```text
v0.1 先用 Project Kit。事项机制暂时作为未来能力封存，不作为初始化分叉。
```

### `starworkSpawn`

不再判断 project。

新主线：

```text
从 项目中心创建一个 中心管理的项目工作台。
```

如果用户要定制推进结构，用 spawn blueprint 的目录定制能力解决，而不是切换到 事项 Kit。

### `starworkDoctor`

历史模板诊断中可以识别 事项 信号，但不能把最终建议落成 `project`。

新表达：

```text
这个目录有事项机制痕迹，但新版 StarWork 会先把它接入为 project，并把事项结构作为 legacy capability 保留。
```

### `starworkAudit`

把 中心管理项目工作台 判断改为：

```text
workspace_type = project + project_center
```

旧 `project` 只作为 legacy 类型输出。

## Pack 调整方案

Pack 不应再声明支持 `project`。

目标：

```json
{
  "supports_workspace_types": ["project"]
}
```

项目中心 Pack：

```json
{
  "supports_workspace_types": ["hub"]
}
```

如果某个 Pack 未来需要事项能力，应声明 capability requirement：

```json
{
  "requires_capabilities": ["事项"]
}
```

但 v0.1 不启用。

## 文件迁移计划

### 新增 / 保留

```text
product/core/kits/project/
product/core/presets/project.yaml
```

保留：

```text
product/core/kits/hub/
product/core/presets/hub.yaml
```

### 封存 / 删除正式入口

移动到 legacy 或 deprecated：

```text
product/core/kits/project/
product/core/presets/project.yaml
```

`local-starter` 已移出 Core 正式材料。`satellite-starter` 已降级到 `core/legacy/`，不再作为正式 Kit；在现有 CLI 主路径中，中心管理项目工作台由 `project` 加 `project_center` 连接生成。

```text
product/core/kits/project/
product/core/presets/project.yaml
```

## 实施阶段

### Phase 1：冻结决策和文档口径

- 新增本 SPEC。
- 更新 Core README：v0.1 正式 Kit 只有 `project` 和 `hub`。
- 更新 Kit Structure Reference：移除正式 `project`、`project` 章节，加入 legacy note。
- 更新 Init / Spawn / Doctor / Upgrade / Audit / Repair SPEC。
- 更新 Skill SPEC。

### Phase 2：实现 Project Kit

- 从 `local-starter` 和 `satellite-starter` 合并生成 `project` Kit。
- `project` Kit 默认不包含 `事项/` 和决策文件。
- `project` Kit 默认服务独立项目。
- 中心管理项目工作台 在 Project Kit 基础上由 `spawn` 叠加 项目中心同步说明、`.starwork/sync.json`、legacy `.core-sync.json` 和 `hub` state。

### Phase 3：CLI 兼容改造

- `init --type project` 成为正式入口。
- `init --type single-light` 映射为 `project`。
- 旧事项类型不再接受。
- `spawn` 默认生成 中心管理的项目工作台。
- `spawn --mode starter` 保留兼容并映射为 project。
- 旧事项模式不再接受。
- `doctor` 认可新 state，同时兼容旧 state。
- `upgrade` 新 blueprint 输出 project。

### Phase 4：测试迁移

新增测试：

1. `init --type project` 生成 Project Kit。
2. `init --type single-light` 兼容并生成 Project Kit。
3. 旧事项类型报不支持。
4. `spawn` 默认生成 `workspace_type: project` 且含 project_center 连接。
5. 旧事项模式报不支持。
6. `doctor` 对新 Project 通过。
7. `doctor` 对历史事项目录只输出内容信号，不输出兼容类型。
8. `upgrade` 生成 / 接受 project blueprint。
9. `audit` 把 `workspace_type: project + hub` 识别为 中心管理项目工作台。

### Phase 5：发布说明

对用户解释：

```text
StarWork 不再要求你在初始化时判断“是不是项目工作台”。
现在只有两类工作台：
1. 项目工作台：具体项目。
2. 项目中心：管理多个项目和共享资源。

事项机制暂时封存为未来能力。已有事项目录不会被删除，也不会被自动迁移。
```

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| 已有用户使用 `project` | 保留 CLI 兼容别名和 doctor legacy signal。 |
| 旧测试大量依赖 `project` | 分阶段迁移测试，先兼容，后删除。 |
| 文档中 事项 口径过多 | 先改正式入口文档，再清理历史说明。 |
| 用户确实需要事项机制 | 保留 capability 文档，但标注 frozen / experimental。 |
| Pack 仍声明 `project` | 改为 `project`，未来通过 `requires_capabilities` 表达。 |

## 非目标

本次不做：

- 删除用户已有 `事项/`。
- 迁移已有 事项 内容。
- 实现 `starwork 事项` 命令。
- 实现 事项机制 Agent Lane。
- 自动把所有旧项目 state 改成 `project`。
- 移除 doctor 对旧 事项 结构的识别。

## 验收标准

完成后应满足：

1. 正式 Kit 列表只有 `project` 和 `hub`。
2. `init` 正式只推荐项目工作台 / 项目中心。
3. `spawn` 正式只生成 中心管理的项目工作台。
4. 事项机制 不再作为用户初始化和 spawn 的主分叉。
5. `doctor` 仍能识别旧 事项 项目，但将其标为 legacy / frozen capability。
6. 旧 `project` 和 `project` 不会在 A 测用户侧造成硬失败。
7. 文档能用一句话解释：Project 是项目，项目中心是项目中心，事项机制 暂时封存为未来能力。
