# StarWork Skill 管理与分发机制 SPEC

## 状态

- 版本：v0.1 draft
- 所属模块：StarWork Core / CLI / Skills
- 相关能力：`skill-mount`、`main-repo-sync`、Pack 安装、Hub + Satellite
- 相关 CLI：`init`、`spawn`、`doctor`、`upgrade`、`pack install`、`adapt`
- 目标：定义 StarWork 如何管理 Agent Skill 的来源、安装位置、分发关系、项目挂载和健康检查。

## 一句话定义

StarWork 的 Skill 机制不是一个简单的安装动作，而是一套 Agent 能力分发协议。

它回答五个问题：

1. 这个 Skill 从哪里来？
2. 它应该放在哪里？
3. 谁拥有它，谁只能使用它？
4. 初始化、生成卫星项目、升级旧项目时要不要带上它？
5. 后续如何检查、同步和更新？

## 背景

当前 StarWork 已经有几类不同性质的 Skill：

- `starworkInit`、`starworkDoctor`：帮助 Agent 理解并调用 StarWork CLI；其中 `starworkDoctor` 同时承担历史模板诊断和升级蓝图设计。
- `starworkSpawn`：Hub Kit 自带的管理 Skill，帮助 Hub 生成卫星项目定制单。
- `neat-freak`：可作为单项目 Kit 自带的整理 Skill，帮助项目收尾、清理和归档。
- 未来内容创作者 Pack、课程 Pack、客户交付 Pack 可能会附带自己的场景 Skill。
- Hub 还可以托管用户自己添加的常用 Skill，并在创建卫星项目时按需分发。

如果只用一个笼统的“安装 Skill”概念，会出现混乱：

- 系统 Skill 不应该被复制到每个项目。
- Kit 自带 Skill 和 Pack 自带 Skill 容易被误认为都是 Hub Skill 库里的内容。
- Hub 托管 Skill 不应该无差别挂载给所有卫星项目。
- Kit / Pack 自带 Skill 也不能静默覆盖用户已有 Skill。
- 旧项目升级时，需要由 AI 判断哪些 Skill 适合补入，而不是 CLI 硬编码猜测。

因此 v0.1 需要先冻结管理模型，再逐步改 CLI。

## 核心原则

1. Skill 分发必须可解释：用户能知道某个 Skill 为什么在这里。
2. Skill 所有权必须清楚：Kit 自带、Pack 自带、Hub 托管和项目本地 Skill 要分开记录。
3. CLI 只做确定性动作：选择、判断、定制方案由 Skill + 用户确认完成。
4. Hub 不默认把全部托管 Skill 分发给全部项目。
5. Kit / Pack 可以声明自带或推荐 Skill，但不能强制静默安装非必需 Skill。
6. `doctor --json` 只暴露事实，不输出建议，避免影响 AI 判断。
7. 全局安装、Kit 自带、Pack 自带、Hub 挂载、项目本地复制要分开记录。

## Skill 分类

v0.2 在系统 Skill 中增加 L0 主入口 Skill。主入口负责产品解释、安装引导和模糊意图路由；专家 Skill 继续保留直接触发能力。

| 类型 | 示例 | 主要位置 | 作用 | 是否默认进项目 |
|---|---|---|---|---|
| L0 主入口 Skill | `starwork` | 用户全局 Agent Skill 环境 | 解释 StarWork、引导安装、判断下一步能力 | 否 |
| L1 系统专家 Skill | `starworkInit`、`starworkDoctor`、`starworkKnowledge`、`starworkMultiagent` | 用户全局 Agent Skill 环境 | 让 Agent 会操作明确 StarWork 能力 | 否 |
| Kit 自带 Skill | `starworkSpawn`、`starworkAudit`、`neat-freak` | 产品源码 `kit-skills/`，工作台内写入 `skills/` 或 `.agents/skills/` | 配合某种工作区形态使用 | 按 Kit 默认规则进入 |
| Pack 自带 Skill | 内容创作者审稿、发布检查等 | Pack 的 `skills/` 声明或随 Pack 写入 | 配合某个场景 Pack 使用 | 用户确认后进入 |
| Hub 托管 Skill | 用户收藏的写作、复盘、会议、整理 Skill | Hub `skills/` | 用户跨项目复用的能力库 | 按规则或用户选择分发 |
| L3 Capability 项目内 Skill | `starworkKnowledgeProject` | Capability 源码和项目 `.agents/skills/` | 能力开启后维护当前项目 | 是，本项目拥有 |
| 项目本地 Skill | 某项目专用工作流 | Satellite 或单项目 `.agents/skills/` | 只服务当前项目 | 是，本项目拥有 |

## 存放位置

### 1. 全局 Agent Skill 环境

用于安装 StarWork 系统 Skill。

典型安装方式：

```bash
npx skills add ...
```

StarWork 只把它视为“Agent 已学会 StarWork 操作方式”，不把这些 Skill 复制进工作区。

系统 Skill 的源码位于产品仓库 `skills/`。该目录会被 `npx skills add jennie-shawn/StarWork` 扫描，因此只能放全局系统级 Skill，不能放 Kit 自带 Skill。

v0.2 全局系统 Skill 清单：

- `starwork`：L0 主入口。
- `starworkInit`：初始化和接入专家。
- `starworkDoctor`：诊断和升级方案专家。
- `starworkKnowledge`：项目知识库专家。
- `starworkMultiagent`：多 Agent 和跨会话专家。

`starworkSpawn`、`starworkAudit`、`neat-freak` 和 `starworkKnowledgeProject` 不在全局清单中。

### 2. Kit 自带 Skill 声明

Kit 可以声明某种工作区形态天然应该具备哪些 Skill。

Kit 自带 Skill 的源码位于产品仓库 `kit-skills/`，避免被全局 `skills add` 命令误装。CLI 初始化工作台时，再把它们复制或挂载到目标工作台内。

例如：

- `hub` Kit 可以自带 `starworkSpawn`，因为 Hub 需要创建和管理卫星项目。
- `hub` Kit 可以自带 `starworkAudit`，因为 Hub 需要巡检和修复旗下卫星项目。
- 单项目 Kit 可以自带或推荐 `neat-freak`，因为单项目需要阶段性清理、收尾和归档。
- `project` Kit 可以自带事项协作相关 Skill。

工作台内可以保留声明文件：

```text
skills/
  README.md
  manifest.json
  starworkSpawn/
```

或在 Kit 元数据中声明：

```json
{
  "skills": {
    "bundled": [
      {
        "id": "starworkSpawn",
        "scope": "hub",
        "distribution": "copy",
        "reason": "Hub Kit 需要生成卫星项目定制单。"
      }
    ],
    "recommended": []
  }
}
```

Kit 自带 Skill 是工作区形态的一部分，不属于 Hub Skill 库，也不属于全局系统 Skill。Hub 只是安装 Hub Kit 后拥有了这些能力。

### 3. Hub 托管 Skill 库

Hub 使用固定目录：

```text
skills/
  registry.json
  user-custom-skill/
  imported-common-skill/
```

`skills/registry.json` 是 Hub 托管 Skill 注册表。

Hub registry 负责记录：

- Hub 额外托管了哪些 Skill。
- 每个 Skill 的来源、版本和所有权。
- 适用场景和标签。
- 是否默认推荐给新卫星项目。
- 分发方式是 symlink、copy 还是 manual。

它不应该把 Kit 自带 Skill 全部混进来。比如 `starworkSpawn` 的来源是 Hub Kit 自带能力，不是用户收藏进 Hub 的常用 Skill。

### 4. Satellite / 单项目 Skill 挂载区

项目内使用 Agent 约定路径：

```text
.agents/skills/
.claude/skills/
.starwork/skills.json
```

其中：

- `.agents/skills/`：通用 Agent Skill 挂载入口。
- `.claude/skills/`：Claude Code Skill 挂载入口。
- `.starwork/skills.json`：本项目实际可用 Skill 清单。

Satellite 从 Hub 托管 Skill 库分发 Skill 时，默认使用逐个 Skill 软链接：

```text
.agents/skills/meeting-summary -> /path/to/hub/skills/meeting-summary
.claude/skills/meeting-summary -> /path/to/hub/skills/meeting-summary
```

不推荐再把整个 Hub `skills/` 目录整体挂载到项目里，因为那会让项目获得过多无关能力，也无法解释每个 Skill 为什么出现。

### 5. Pack 自带 Skill 声明

Pack 可以在 `pack.json` 中声明推荐 Skill。

建议结构：

```json
{
  "skills": {
    "recommended": [
      {
        "id": "content-draft-review",
        "reason": "用于审阅内容草稿和发布前检查",
        "default": false,
        "distribution": "copy",
        "source": "skills/content-draft-review"
      }
    ],
    "required": []
  }
}
```

v0.1 不建议引入真正的 required Skill。除非没有该 Skill，Pack 就无法工作，否则都应作为 recommended。

## Hub `skills/registry.json`

Hub registry 只记录 Hub 额外托管和准备分发的 Skill。

它不记录“这个 Hub Kit 自己为什么有 `starworkSpawn`”这类 Kit 自带能力；那应该由 Kit manifest 或 workspace state 记录。

### 最小示例

```json
{
  "schema": "starwork.skill_registry.v0.1",
  "owner": "hub",
  "updated_at": "2026-05-20T00:00:00.000Z",
  "skills": [
    {
      "id": "meeting-summary",
      "name": "Meeting Summary",
      "type": "hub-managed",
      "source": {
        "kind": "external",
        "path": "/Users/example/.skillshub/meeting-summary"
      },
      "version": null,
      "ownership": "hub-owned",
      "distribution": {
        "mode": "symlink",
        "default_for_spawn": false
      },
      "tags": ["meeting", "summary", "project-sync"],
      "description": "用户收藏到 Hub 的会议纪要能力，可按项目需要分发。"
    }
  ]
}
```

### 字段说明

| 字段 | 必填 | 说明 |
|---|---:|---|
| `schema` | 是 | 固定为 `starwork.skill_registry.v0.1`。 |
| `owner` | 是 | v0.1 主要为 `hub`。 |
| `updated_at` | 是 | 注册表最后更新时间。 |
| `skills[].id` | 是 | Skill 稳定 ID。 |
| `skills[].type` | 是 | `hub-managed`、`common`、`business`、`project-template`。 |
| `skills[].source.kind` | 是 | `external`、`local`、`generated`、`pack`、`kit`。 |
| `skills[].ownership` | 是 | `hub-owned`、`project-owned`、`pack-owned`、`kit-owned`。 |
| `skills[].distribution.mode` | 是 | `symlink`、`copy`、`manual`。 |
| `skills[].distribution.default_for_spawn` | 否 | 创建卫星项目时是否默认推荐。 |
| `skills[].tags` | 否 | 用于 spawn / upgrade 时按场景筛选。 |

## 项目 `.starwork/skills.json`

### 最小示例

```json
{
  "schema": "starwork.project_skills.v0.1",
  "updated_at": "2026-05-20T00:00:00.000Z",
  "skills": [
    {
      "id": "neat-freak",
      "type": "kit-bundled",
      "source": {
        "kind": "kit",
        "kit": "project",
        "manifest_id": "neat-freak"
      },
      "mounts": [
        {
          "agent": "codex",
          "path": ".agents/skills/neat-freak",
          "mode": "copy"
        },
        {
          "agent": "claude",
          "path": ".claude/skills/neat-freak",
          "mode": "copy"
        }
      ],
      "reason": "单项目 Kit 自带：用于阶段性清理、收尾和归档。",
      "installed_by": "starwork init",
      "installed_at": "2026-05-20T00:00:00.000Z"
    }
  ]
}
```

项目清单回答的是：

> 当前项目到底有哪些 Skill 可用，它们为什么在这里。

它不替代 Hub registry。

## 分发模式

| 模式 | 适用对象 | 行为 |
|---|---|---|
| `global-reference` | 系统 Skill | 只提示用户全局安装，不写入项目。 |
| `kit-bundled` | Kit 自带 Skill | 随 Kit 写入工作区，并记录为 Kit 来源。 |
| `pack-bundled` | Pack 自带 Skill | 随 Pack 安装写入项目，并记录为 Pack 来源。 |
| `symlink` | Hub 托管 Skill | Satellite 中逐个创建软链接。 |
| `copy` | Pack 自带 Skill、项目专用 Skill、Kit 自带 Skill | 复制到项目本地，项目拥有副本或可解释来源。 |
| `manual` | 外部或未标准化 Skill | 只记录建议，由用户或 Agent 手动处理。 |

默认推荐：

- Kit 到项目：优先 `copy` 或随 Kit 模板写入。
- Pack 到项目：优先 `copy`。
- Hub 托管 Skill 到 Satellite：优先 `symlink`。
- 系统 Skill：优先 `global-reference`。

## CLI 配合修改

### `starwork init`

`init` 需要新增 Skill 初始化阶段。

#### 创建 Hub 时

执行流程应调整为：

1. 创建 Hub Kit。
2. 安装 `hub-management` Pack。
3. 按 Hub Kit 自带 Skill 声明写入 `starworkSpawn`。
4. 写入 `.starwork/skills.json`，记录 `starworkSpawn` 来源于 Hub Kit。
5. 初始化 Hub 托管 Skill 注册表 `skills/registry.json`。
6. 询问用户是否额外导入 Hub 托管 Skill，例如会议纪要、写作、复盘等常用能力。

Hub 创建完成后，至少应存在：

```text
skills/
  README.md
  registry.json
.starwork/
  skills.json
```

`starworkSpawn` 应作为 Hub Kit 自带 Skill 进入 Hub，不再作为“用户收藏到 Hub Skill 库”的内容解释。

#### 创建单项目时

执行流程应调整为：

1. 选择工作区类型。
2. 选择语言。
3. 选择 Pack。
4. 按单项目 Kit 自带 Skill 声明写入默认能力，例如 `neat-freak`。
5. 询问是否需要放入 Pack 推荐 Skill 或额外 Hub 托管 Skill。
6. 写入 `.starwork/skills.json`。
7. 按用户确认挂载或复制 Skill。

v0.1 可以先只支持：

- `--no-skills`：跳过 Skill 安装。
- `--skills <id,id>`：显式安装指定 Skill。

交互模式下，应把 Pack 自带 Skill 步骤放在 Pack 之后，因为 Pack 会影响推荐 Skill；Kit 自带 Skill 则由工作区类型决定。

### `starwork spawn`

`spawn` 是 Skill 分发机制的核心命令，需要调整最大。

当前逻辑是把 Hub `skills/` 整体软链接到 Satellite：

```text
.agents/skills -> hub/skills
.claude/skills -> hub/skills
```

后续应改为：

1. 读取 Satellite Kit 自带 Skill 声明。
2. 读取 Hub `skills/registry.json`，仅作为额外托管 Skill 候选。
3. 根据 blueprint / Pack / 用户选择确定本项目 Skill 列表。
3. 创建 `.agents/skills/` 和 `.claude/skills/` 目录。
4. 对每个被选择的 Skill 单独创建链接或复制。
5. 写入 Satellite `.starwork/skills.json`。
6. 在 `.starwork/sync.json` 中记录被挂载的 Skill 清单。legacy 工作台可继续读取 `.core-sync.json`。

`spawn blueprint` 需要新增字段：

```json
{
  "skills": [
    {
      "id": "neat-freak",
      "source": "kit",
      "distribution": "copy",
      "reason": "长期项目，需要阶段性清理和归档。"
    }
  ]
}
```

如果 blueprint 没有声明 `skills`，CLI 应先使用 Satellite Kit 的默认 Skill，再把 Hub registry 中 `default_for_spawn=true` 的 Skill 作为额外候选，并在 dry-run 中展示来源。

### `starwork doctor`

`doctor` 需要增加 Skill 事实探测，但不能给建议。

新增检查：

- Kit 自带 Skill 是否已写入项目 skill manifest。
- Hub 是否存在 `skills/registry.json`。
- Hub registry schema 是否正确。
- registry 中声明的托管 Skill 路径是否存在。
- Satellite 是否存在 `.starwork/skills.json`。
- `.starwork/skills.json` 中的挂载路径是否存在。
- 软链接是否指向 Hub 中对应 Skill。
- `.starwork/sync.json` 中的 skills 记录是否和项目 skill manifest 一致；legacy `.core-sync.json` 可作为兼容读取来源。

JSON 输出建议新增：

```json
{
  "skills": {
    "registry": {
      "exists": true,
      "path": "skills/registry.json",
      "count": 3
    },
    "project_manifest": {
      "exists": true,
      "path": ".starwork/skills.json",
      "count": 2
    },
    "mounts": [
      {
        "id": "meeting-summary",
        "path": ".agents/skills/meeting-summary",
        "mode": "symlink",
        "status": "ok"
      }
    ]
  }
}
```

注意：这里仍然只输出事实，不输出“你应该安装某 Skill”。

### `starwork upgrade`

`upgrade` 需要支持由 `starworkDoctor` 生成的 Skill 安装动作。

`upgrade blueprint` 可新增 actions：

```json
{
  "type": "write_project_skills_manifest"
}
```

```json
{
  "type": "mount_skill",
  "id": "meeting-summary",
  "from": "/Users/example/my-hub/skills/meeting-summary",
  "targets": [".agents/skills/meeting-summary", ".claude/skills/meeting-summary"],
  "mode": "symlink",
  "reason": "用户确认该旧项目需要 Hub 托管的会议纪要能力。"
}
```

```json
{
  "type": "copy_skill",
  "id": "content-draft-review",
  "from": "skills/content-draft-review",
  "to": ".agents/skills/content-draft-review",
  "reason": "来自内容创作者 Pack 的项目本地业务 Skill。"
}
```

CLI 仍不判断该不该安装某个 Skill，只执行已确认 blueprint。

### `starwork pack install`

Pack 安装需要读取 Pack 的 `skills` 声明。

执行逻辑：

1. 读取 `pack.json`。
2. 如果 Pack 声明 recommended Skill，展示给用户。
3. 用户确认后复制或挂载对应 Skill。
4. 更新 `.starwork/skills.json`。
5. 更新 `.starwork/workspace.json` 的 Pack 记录。

v0.1 可以先只实现“声明和 dry-run 展示”，实际安装放到后续版本。

### `starwork adapt`

`adapt` 不决定安装哪些 Skill，但需要确保目标 Agent 的 Skill 入口可用。

例如：

- Codex：`.agents/skills/`
- Claude Code：`.claude/skills/`

如果项目已经有 `.starwork/skills.json`，`adapt` 可以检查对应 agent 的 mount 是否缺失，并在 dry-run 中展示会补哪些入口。

### 未来候选：`starwork skill`

当 Skill 机制稳定后，可以新增独立命令：

```bash
starwork skill list --target ./workspace
starwork skill add meeting-summary --target ./workspace --from-hub ./hub
starwork skill remove meeting-summary --target ./workspace
starwork skill sync --target ./workspace
```

v0.1 不必立即实现。当前更重要的是让 `init`、`spawn`、`doctor`、`upgrade`、`pack install` 的数据结构先统一。

## Skill 与 Pack 的边界

Pack 是场景结构和规则包。

Skill 是 Agent 工作流能力。

Pack 可以声明推荐 Skill，但不应该把所有业务逻辑都塞进 Skill。判断方式：

| 问题 | 应放 Kit | 应放 Pack | 应放 Skill |
|---|---:|---:|---:|
| 工作区形态默认自带能力 | 是 | 否 | 可由 Skill 实现 |
| 目录结构、模板、路径默认值 | 基础骨架 | 场景覆盖 | 否 |
| Agent 需要如何采访用户 | 否 | 否 | 是 |
| Agent 如何生成 blueprint | 否 | 否 | 是 |
| 场景规则和边界 | 通用边界 | 场景边界 | 可辅助 |
| 自动检查、审稿、归档、复盘流程 | 否 | 可声明 | 是 |

## Skill 与 CLI 的边界

Skill 负责判断和生成方案。

CLI 负责执行和校验。

| 阶段 | Skill | CLI |
|---|---|---|
| 理解用户需求 | 是 | 否 |
| 判断当前目录语义 | 是，基于 doctor 事实 | 否 |
| 生成 blueprint | 是 | 否 |
| 校验 schema | 可辅助 | 是 |
| 写入文件 / 创建软链接 | 否 | 是 |
| dry-run 展示 | 否 | 是 |
| 维护 manifest | 否 | 是 |

## 安全规则

1. 不允许 Skill 分发路径逃出目标工作区，除非是明确的 symlink source。
2. 不允许覆盖已有本地 Skill，除非用户显式确认。
3. 不允许 Satellite 修改 Hub 软链接指向的 Skill。
4. 不允许 Pack 静默安装外部 Skill。
5. 不允许 `doctor` 输出建议性 next step。
6. 所有分发动作必须写入 `.starwork/skills.json`。
7. 所有 Kit 自带 Skill 必须能追溯到 Kit manifest。
8. 所有 Pack 自带 Skill 必须能追溯到 Pack 声明。
9. 所有 Hub 托管 Skill 到 Satellite 的分发必须能追溯到 Hub registry。

## 最小落地顺序

建议分四步落地：

1. 冻结文档和 schema：本 SPEC、`skill-mount` capability、CLI SPEC 更新。
2. 改 Kit：为 Hub Kit、单项目 Kit 增加自带 Skill 声明。
3. 改 `init --type hub`：写入 Hub Kit 自带 `starworkSpawn`，同时创建 Hub 托管 Skill registry。
4. 改 `spawn`：从整体挂载 Hub `skills/` 改为“Kit 自带 Skill + Hub 托管 Skill 候选”的逐个分发。
5. 改 `doctor`：输出 Kit Skill、Pack Skill、Hub 托管 Skill、项目 manifest 和 mount 的事实检查。

之后再扩展：

6. `upgrade` 支持 Skill actions。
7. `pack install` 支持 Pack bundled / recommended Skill。
8. 新增 `starwork skill` 子命令。

## 待确认问题

1. Kit 自带 Skill 的声明文件长期放在 Kit 内 `skills/manifest.json`，还是继续由 CLI 内置映射和 workspace state 表达？
2. `starworkSpawn` 是否随 Hub Kit 直接复制进 Hub `skills/`，还是以 npm 包中的 `kit-skills/` Skill 源为只读引用？
3. `neat-freak` 作为单项目 Kit 自带 Skill 时，是默认写入所有单项目 Kit，还是只写入 事项 型长期项目 Kit？
4. Hub registry 是否允许登记全局 Skill 的引用路径，还是必须先复制进 Hub？
5. Pack 自带 Skill 初期是否随 npm 包发布，还是允许用户从 GitHub / 本地路径导入？
6. `.agents/skills/` 是否作为所有 Agent 的通用入口长期保留？
7. `npx skills add` 的目标目录和 StarWork 项目内 Skill 目录之间是否需要一个桥接命令？
