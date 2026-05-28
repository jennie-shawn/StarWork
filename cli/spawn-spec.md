# `starwork spawn` SPEC

## 状态

- 版本：v0.1 draft
- 所属模块：StarWork CLI
- 命令：`starwork spawn`
- 实现状态：v0.1 第一版已实现
- 相关对象：`hub`、`project`、`project_center`、`main-repo-sync`、`skill-mount`
- 目标：从项目中心创建并注册一个项目工作台

## 一句话定义

`starwork spawn` 是从项目中心创建一个被中心管理的新项目工作台的命令。

它不是 `init --type hub`，也不是普通单项目初始化。它做的是：在已经存在的项目中心里，创建一个新的执行型项目工作区，并把它登记回项目中心。

```text
项目中心
  ↓
spawn
  ↓
项目工作台
```

## 为什么不能放进 `init`

`init` 的职责是创建当前目录的工作台：

- 单事务项目
- 项目工作台
- 项目中心

但 `spawn` 涉及两个工作区：

1. 项目中心：负责项目注册、共享身份、共享教训、knowledge、skills 和联络机制。
2. 项目工作台：负责具体项目执行、项目状态、当前工作、过程材料、产物和事实源。

因此它必须是独立命令，否则 `init` 会变成“创建自己 + 修改另一个工作区”的混合动作，用户也很难理解。

## 用户故事

用户已经有一个项目中心：

```bash
starwork init --type hub --target ~/my-hub --yes
```

现在想从这个项目中心创建一个新项目工作台：

```bash
starwork spawn \
  --hub ~/my-hub \
  --name "内容产品官网" \
  --target ~/projects/content-site \
  --mode project \
  --yes
```

命令完成后：

- `~/projects/content-site` 成为一个 StarWork 项目工作台。
- 项目中心的项目注册表中新增该项目记录。
- 项目工作台的 `.core-sync.json` 记录来源项目中心、同步资源和创建时间。
- 项目工作台包含来自项目中心的身份、教训、内部协议、知识和 skills 入口。
- 后续 Agent 可以在项目工作台内独立工作，项目进度不写回项目中心 registry。

## 命令形式

```bash
starwork spawn --hub <hub-path> --name <project-name> --target <path>
starwork spawn --hub ~/my-hub --name "新项目" --target ~/projects/new-project --mode starter --language zh
starwork spawn --hub ~/my-hub --name "English Project" --target ~/projects/en-project --mode starter --language en
starwork spawn --hub ~/my-hub --name "多阶段项目" --target ~/projects/multi-stage-project --mode project --language zh
starwork spawn --hub ~/my-hub --target ~/projects/custom-project --blueprint ./blueprint.json --dry-run
starwork spawn --hub ~/my-hub --target ~/projects/custom-project --blueprint ./blueprint.json --yes
starwork spawn --hub ~/my-hub --name "新项目" --target ~/projects/new-project --dry-run
starwork spawn --hub ~/my-hub --name "新项目" --target ~/projects/new-project --yes
```

## 参数

| 参数 | 说明 |
|---|---|
| `--hub <path>` | 项目中心路径。参数名保留 `--hub` 以兼容旧脚本。 |
| `--blueprint <path>` | 可选工作台定制单。启用后可由 blueprint 提供项目名、模式、项目 ID、路径、目录、规则和 seed。 |
| `--name <name>` | 项目工作台名称。 |
| `--target <path>` | 项目工作台创建位置。 |
| `--mode <project>` | 项目工作台模式。默认 `project`；`starter` 是兼容旧参数。 |
| `--language <zh|en>` | 项目工作台语言。默认继承项目中心；也可由 blueprint 指定。 |
| `--id <project-id>` | 可选项目 ID；未提供时由名称生成。 |
| `--status <active|paused>` | 初始状态。默认 `active`。 |
| `--dry-run` | 只预览，不写入。 |
| `--yes` | 非交互确认执行。 |
| `--help` | 显示帮助。 |

## Kit 选择

| `--mode` | Kit | 定位 |
|---|---|---|
| `starter` | `project` | 兼容旧参数，等同于 `project`。 |
| `project` | `project` | 项目工作台标准结构。 |

v0.1 默认 `project`。`satellite-starter` 不再是正式 Kit；中心管理关系由 `project` Kit 加 `project_center` 连接信息表达。

## 执行流程

### Step 1：定位并检查项目中心

CLI 读取 `--hub`：

- 必须存在 `.starwork/workspace.json`。
- `workspace_type` 必须是 `hub`。
- `kit` 必须是 `hub`。
- 项目中心中必须存在语言映射后的项目注册表：中文默认 `项目/registry.json`，英文默认 `projects/registry.json`。
- 项目中心中必须存在语言映射后的共享资源入口：中文默认 `身份/`、`教训/`、`知识/`、`技能/`，英文默认 `identity/`、`lessons/`、`knowledge/`、`skills/`，以及隐藏机制目录 `.incoming/`。

如果项目中心未通过检查，中止创建。

### Step 2：检查目标目录

CLI 检查 `--target`：

- 不存在：可以创建。
- 存在但为空：可以写入。
- 已是 StarWork 工作台：中止，提示运行 `doctor`。
- 存在用户内容：需要预览冲突；v0.1 建议中止或只允许空目录，避免误伤。

v0.1 推荐保守策略：

> `spawn` 只允许写入不存在或空目录。

### Step 3：选择项目工作台 Kit

CLI 始终使用 `project` Kit。`starter` 仅作为兼容别名映射到 `project`。

### Step 4：写入项目工作台元数据

生成 `.starwork/workspace.json`：

```json
{
  "schema": "starwork.workspace.v0.1",
  "core": "0.1",
  "workspace_type": "project",
  "kit": "project",
  "packs": [],
  "language": "zh",
  "paths": {
    "formal_source": "输出/确认成果/",
    "business_work_area": "事项/"
  },
  "project_center": {
    "path": "/Users/example/my-hub",
    "project_id": "content-site"
  },
  "hub": {
    "path": "/Users/example/my-hub",
    "project_id": "content-site"
  },
  "created_by": "starwork spawn"
}
```

`project_center` 是新字段；`hub` 作为兼容镜像继续写入和读取。

### Step 5：写入 `.core-sync.json`

`.core-sync.json` 记录项目中心与项目工作台的同步关系。

建议结构：

```json
{
  "schema": "starwork.core_sync.v0.1",
  "hub_path": "/Users/example/my-hub",
  "project_id": "content-site",
  "project_name": "内容产品官网",
  "core": "0.1",
  "mode": "project",
  "created_at": "2026-05-18T00:00:00.000Z",
  "last_sync_at": "2026-05-18T00:00:00.000Z",
  "resources": {
    "identity": {
      "source": "identity/",
      "target": "_系统/身份/",
      "mode": "snapshot"
    },
    "lessons": {
      "source": "lessons/",
      "target": "_系统/教训/",
      "mode": "snapshot"
    },
    "knowledge": {
      "source": "knowledge/",
      "target": "知识/",
      "mode": "readonly-link"
    },
    "skills": {
      "source": "skills/",
      "target": [".agents/skills/", ".claude/skills/"],
      "mode": "symlink"
    }
  }
}
```

### Step 6：同步共享资源

资源语义沿用 `main-repo-sync` capability。

| 资源 | 项目工作台落地 | v0.1 行为 |
|---|---|---|
| `identity/` | `_系统/身份/` | 从项目中心复制快照。 |
| `lessons/` | `_系统/教训/` | 从项目中心复制快照。 |
| `.internal/` | `.internal/` | 从项目中心复制稳定协议。 |
| `.obsidian/` | `.obsidian/` | 从项目中心复制默认配置。 |
| `knowledge/` | `知识/` 或 `knowledge/` | 优先软链接；失败则复制 README 并提示。 |
| `skills/` | `.agents/skills/`、`.claude/skills/` | 创建软链接。 |

默认边界：

- 复制快照的内容可以作为项目参考，但不能自动回写项目中心。
- 软链接资源仍由项目中心拥有，项目工作台不能直接修改。
- 可复用更新应走 `.incoming/` 或跨项目联络机制。

### Step 7：写入项目状态入口

中心管理的项目工作台使用：

```text
_系统/上下文/当前项目.md
```

该文件应包含：

- 项目名称
- 项目定位
- 项目中心路径
- 项目 ID
- 当前阶段
- 正式事实源位置
- 当前工作入口
- 主库同步说明

不能把项目中心的项目注册表当成项目进度正文。

### Step 8：注册到项目中心

更新项目中心语言映射后的项目注册表：

```text
zh: 项目/registry.json
en: projects/registry.json
```

建议新增记录：

```json
{
  "id": "content-site",
  "name": "内容产品官网",
  "path": "/Users/example/projects/content-site",
  "status": "active",
  "core": "0.1",
  "kit": "project",
  "mode": "project",
  "created_at": "2026-05-18T00:00:00.000Z",
  "last_sync_at": "2026-05-18T00:00:00.000Z",
  "sync": {
    "identity": "snapshot",
    "lessons": "snapshot",
    "knowledge": "readonly-link",
    "skills": "symlink"
  }
}
```

Registry 只记录发现、路径、状态和同步元数据，不记录项目进度正文。

### Step 9：生成跨项目联络入口

项目工作台包含：

```text
.starwork/handoff/
  inbox/
  outbox/
```

v0.1 可以只创建目录和 README。

后续可以扩展为：

- 创建一封 “项目已创建” handoff 给项目中心
- 写入项目中心 `projects/coordination/`
- 支持 queued / delivered / acknowledged / closed 生命周期

### Step 10：执行 `doctor`

创建完成后，CLI 应自动或建议运行：

```bash
starwork doctor --target <project-path>
```

当前实现会在创建完成后提示用户运行 `doctor` 检查新项目工作台。

## 写入安全

`spawn` 会同时写项目中心和项目工作台，因此安全策略要比 `init` 更严格：

| 场景 | v0.1 行为 |
|---|---|
| 项目中心不健康 | 中止。 |
| 目标目录不存在 | 创建。 |
| 目标目录为空 | 写入。 |
| 目标目录有用户内容 | 默认中止。 |
| 项目中心登记表已有同 ID | 中止，提示更换 ID 或确认复用。 |
| 项目中心登记表已有同 path | 中止，提示已注册。 |
| 共享资源软链接失败 | v0.1 中止并报告错误；后续再补可解释的降级策略。 |
| 任一关键写入失败 | 中止，并提示已写入内容。后续可设计 rollback。 |

v0.1 不做自动 rollback，但要尽量按顺序降低风险：

1. 先验证项目中心和目标目录。
2. 先生成完整写入计划。
3. 用户确认后写项目工作台。
4. 项目工作台写入成功后再更新项目中心 registry。

## 与现有命令的关系

### 与 `init`

- `init --type hub` 创建项目中心。
- `spawn` 从项目中心创建项目工作台。

两者不能混成一个命令。

### 与 `doctor`

- 创建前检查项目中心。
- 创建后检查项目工作台。
- `doctor` 需要识别中心管理的项目工作台。

### 与 `adapt`

项目工作台 Kit 当前已经包含 `CLAUDE.md`，但 `adapt` 仍可用于重新生成 / 补充其他 Agent 入口。

建议流程：

```bash
starwork spawn ...
starwork doctor --target <project>
starwork adapt all --target <project> --yes
```

### 与 `pack install`

`spawn` 时先不装业务 Pack，只创建通用执行工作区。

后续用户可以：

```bash
starwork pack install content-creator --target <satellite> --yes
```

后续如果支持 `--pack`，它应复用 `pack install` 的逻辑，而不是在 `spawn` 中重写一套 Pack 安装器。

### 与 `spawn --blueprint`

`spawn --blueprint` 已在 v0.1 第一版落地，用于把一次性项目定制交给 CLI 执行。

当前支持：

- 覆盖 `paths.formal_source` 和 `paths.business_work_area`。
- 创建 `folders` 声明的定制目录。
- 把 `agent_rules` 指向的 Markdown 注入 `AGENTS.md`。
- 复制 `seed` 文件。
- 在 `.starwork/workspace.json` 中记录 `customization`。
- 在项目中心 registry 中标记 `customized: true`。

当前不支持 `renames`、`removals` 和自动安装 Pack。

## v0.1 不做什么

- 不创建项目中心；项目中心必须已经存在。
- 不自动发现所有项目中心。
- 不处理远程仓库、GitHub、云同步。
- 不做复杂权限系统。
- 不做跨机器同步。
- 不做自动 rollback。
- 不把项目进度写入项目中心 registry。
- 不让项目工作台直接改项目中心的共享事实源。
- 不处理 Pack 卸载、升级或迁移。
- 不在 `spawn --blueprint` 中处理 `renames`、`removals` 或脚本执行。

## 最小实现范围

第一版实现范围：

1. 支持 `starwork spawn` 命令。
2. 支持 `--hub`、`--name`、`--target`、`--mode`、`--id`、`--blueprint`、`--dry-run`、`--yes`。
3. 检查项目中心是否为健康 `hub` 工作台。
4. 只允许写入不存在或空目标目录。
5. 复制 `project` Kit；`starter` 只作为兼容别名映射为 `project`。
6. 写入项目工作台 `.starwork/workspace.json`，包含 `project_center` 与兼容 `hub` 字段。
7. 写入 `.core-sync.json`。
8. 复制 identity / lessons / .internal / .obsidian 快照。
9. 创建 knowledge 和 skills 链接；失败时中止并报告错误。
10. 更新项目中心的项目注册表。
11. 补充 `doctor` 对中心管理项目工作台的识别。
12. 增加测试：创建项目工作台、兼容 starter 参数、registry 重复 ID 拒绝、非项目中心拒绝。

## 验收标准

`starwork spawn` 可验收，至少满足：

- 能从项目中心创建 `project` 项目工作台。
- 兼容 `--mode starter`，但实际按 `project` 处理。
- 创建后项目工作台通过 `starwork doctor`。
- 项目中心项目注册表出现项目记录。
- `.core-sync.json` 记录项目中心路径、项目 ID、同步资源。
- 已存在同 ID 时拒绝创建。
- 目标目录已有用户内容时默认拒绝写入。
- 不支持从普通项目工作台创建中心管理项目。

## 后续问题

1. 是否兼容 `knowledge/` 英文路径链接。
2. skills 软链接是否默认挂载全部 skills，还是只挂载指定列表。
3. 创建项目时是否允许直接安装业务 Pack。
4. 是否需要在项目中心 `projects/coordination/` 自动生成项目创建 handoff。
5. 软链接失败时是否提供复制降级策略。
