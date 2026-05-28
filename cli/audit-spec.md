# `starwork audit` SPEC

## 状态

- 版本：v0.1 draft
- 所属模块：StarWork CLI / StarWork Hub
- 命令：`starwork audit`
- 实现状态：待实现
- 相关对象：`hub`、`project`、Hub binding、legacy satellite、`starwork doctor`、`starworkAudit`、`starwork repair`
- 目标：从 Hub 视角批量扫描已登记的 Satellite，暴露结构事实、同步事实和健康风险；不做主观判断，不直接修复

## 一句话定义

`starwork audit` 是 Hub 对旗下 Satellite 的只读巡检命令。

它不替代 `doctor`。`doctor` 检查一个工作台；`audit` 从 Hub 读取项目注册表，再对多个 Satellite 做聚合检查。

```text
项目中心
  ↓ 读取项目注册表（中文默认 项目/registry.json，英文默认 projects/registry.json）
starwork audit
  ↓ 对每个已登记项目工作台复用 doctor
audit-result.json
  ↓
starworkAudit skill 判断和生成 repair blueprint
  ↓
starwork repair --blueprint
```

## 产品边界

| 命令 / Skill | 面向对象 | 负责 | 不负责 |
|---|---|---|---|
| `doctor` | 单个工作台 | 检查一个目录是否健康 | 批量巡检、修复建议 |
| `audit` | Hub 和多个 Satellite | 读取 Hub registry，批量暴露事实 | 判断怎么修、写文件 |
| `starworkAudit` | audit 结果 | 解释、分级、追问、生成修复蓝图 | 直接改文件 |
| `repair` | 已是 StarWork 的工作台 | 按确认过的 repair blueprint 修复 | 自行判断业务语义 |
| `upgrade` | 历史模板 / 非 StarWork 目录 | 按 upgrade blueprint 接入 StarWork | 修复已有 StarWork 工作台 |
| `spawn` | 新 Satellite | 从 Hub 创建并登记项目 | 巡检已有项目 |

一句话：

> `audit` 负责看清楚，`starworkAudit` 负责想清楚，`repair` 负责按确认方案做清楚。

## 为什么不能直接自动修复

Satellite 巡检中会出现大量需要语义判断的问题：

- registry 里的路径失效，是项目移动、删除，还是已经归档？
- Satellite 的 `knowledge/` 或 `知识/` 断链，是应该重建软链接，还是改为本地副本？
- `AGENTS.md` 使用旧规则，是应该覆盖、追加，还是保持项目特例？
- Satellite doctor 失败，是结构真的损坏，还是用户进行了合理定制但 state 没同步？
- 项目长期未更新，是健康沉睡，还是需要归档？

这些问题不应由 CLI 硬编码判断。`audit` 只输出事实和信号，后续由 `starworkAudit` 结合上下文和用户确认生成修复蓝图。

## 命令形式

```bash
starwork audit
starwork audit --hub <hub-path>
starwork audit --hub ~/my-hub --project content-site
starwork audit --hub ~/my-hub --json
starwork audit --hub ~/my-hub --inventory-depth all
```

## 参数

| 参数 | 说明 |
|---|---|
| `--hub <path>` | Hub 工作台路径。未提供时默认当前目录或向上查找当前 Hub。 |
| `--project <project-id>` | 只巡检指定项目。未提供时巡检 registry 中所有项目。 |
| `--json` | 输出机器可读 JSON。 |
| `--strict` | 将部分 warning 汇总为失败，适合发布前巡检。 |
| `--inventory-depth <number\|all>` | 传递给每个 Satellite 的 doctor inventory 探测深度。 |
| `--inventory-limit <number>` | 控制每个 Satellite doctor inventory 输出规模。 |
| `--help` | 显示帮助。 |

v0.1 不支持：

- `--fix`
- 自动修改 registry
- 自动修改 Satellite
- 自动安装或删除 Skill
- 自动归档项目
- 自动合并 `.incoming/`

## 执行流程

### Step 1：定位 Hub

优先级：

1. 使用 `--hub <path>`。
2. 没有 `--hub` 时，从当前目录向上查找 `.starwork/workspace.json`。
3. 读取 state，确认 `workspace_type === "hub"`。

如果目标不是 Hub，直接失败。

### Step 2：Hub 自检

检查 Hub 必需结构：

| 路径 | 说明 |
|---|---|
| `.starwork/workspace.json` | Hub 工作台身份证。 |
| 项目注册表 | 中文默认 `项目/registry.json`，英文默认 `projects/registry.json`。 |
| 项目协作路由 | 中文默认 `项目/协作/`，英文默认 `projects/coordination/`。 |
| `.starwork/handoff/` | Hub 本地收发队列。 |
| `.incoming/` | 回写候选区。 |
| 共享身份 | 中文默认 `身份/`，英文默认 `identity/`。 |
| 共享教训 | 中文默认 `教训/`，英文默认 `lessons/`。 |
| 共享知识 | 中文默认 `知识/`，英文默认 `knowledge/`。 |
| 托管 Skill 注册表 | 中文默认 `技能/registry.json`，英文默认 `skills/registry.json`。 |
| 草稿和实验区 | 中文默认 `工作区/`，英文默认 `workspace/`。 |

Hub 自检可以复用 `doctorCollect(hubPath)`，但 `audit` 还需要读取 registry 和聚合项目结果。

### Step 3：读取项目注册表

读取语言映射后的项目注册表：

```text
zh: 项目/registry.json
en: projects/registry.json
```

检查：

- JSON 是否可解析。
- `projects` 是否是数组。
- `project_id` 是否缺失或重复。
- `name` 是否缺失。
- `path` 是否缺失。
- `status` 是否属于允许值。

建议状态值：

| 状态 | 含义 |
|---|---|
| `active` | 正常推进。 |
| `paused` | 暂停。 |
| `archived` | 已归档。 |
| `unknown` | 旧 registry 或不完整记录。 |

v0.1 对 `archived` 项目默认仍做轻量存在性检查，但不把 doctor warning 计入整体失败；是否深度检查由后续参数扩展。

### Step 4：逐个 Satellite 可达性检查

对每个项目记录检查：

- `path` 是否存在。
- `path` 是否是目录。
- 是否存在 `.starwork/workspace.json`。
- workspace state 是否可解析。
- `workspace_type` 是否为 `project`。
- `kit` 是否为 `project`。
- 是否存在 `hub.path` 与 `hub.project_id`。
- `hub.path` 是否指向当前 Hub。
- `hub.project_id` 是否等于 registry 中的 `project_id`。

兼容期内，`satellite-starter` 只作为旧 Satellite signal 输出。旧事项目录只作为普通历史内容信号，不作为可兼容的工作区类型。

路径不存在或不是目录为 `fail`。

### Step 5：复用 doctor 检查 Satellite

对可达 Satellite 调用现有 `doctorCollect(projectPath)`。

`audit` 不重写单项目检查逻辑，只做聚合：

- `doctor.ok`
- `doctor.summary`
- 关键 fail / warn checks
- workspace type / kit / language / packs
- skills facts

`audit --json` 可以嵌入 doctor 摘要，但不应默认完整嵌入每个项目的大型 inventory，除非用户传入 `--inventory-depth all` 或 `--verbose`。

### Step 6：检查 Hub 绑定和同步关系

读取 Satellite：

```text
.core-sync.json
.starwork/workspace.json
```

检查：

- `.core-sync.json` 是否存在。
- `.core-sync.json` 是否可解析。
- `.core-sync.json` 中记录的 Hub 路径是否指向当前 Hub。
- `.starwork/workspace.json` 中 `hub.project_id` 是否匹配 registry。
- registry 中记录的 path 是否和 Satellite 实际路径一致。
- Satellite 的 language 是否和 Hub 预期或 registry metadata 冲突。

这些问题通常是高风险，但不一定都阻塞。`starworkAudit` 需要根据上下文判断修复方式。

### Step 7：检查共享资源挂载

按 Satellite language 判断路径：

| 资源 | 中文 Satellite | 英文 Satellite | Hub 来源 |
|---|---|---|---|
| knowledge | `知识/` | `knowledge/` | 中文项目中心 `知识/`，英文 Project Center `knowledge/` |
| identity | `_系统/身份/` | `_system/identity/` | 中文项目中心 `身份/`，英文 Project Center `identity/` |
| lessons | `_系统/教训/` | `_system/lessons/` | 中文项目中心 `教训/`，英文 Project Center `lessons/` |
| skills | `.agents/skills/`、`.claude/skills/` | 同左 | 中文项目中心 `技能/`，英文 Project Center `skills/`，或 Kit 自带 Skill |

检查：

- 路径是否存在。
- 如果是软链接，软链接目标是否存在。
- 如果是复制快照，是否有 `.core-sync.json` 或 README 说明来源。
- Hub 托管 Skill 是否仍能从 registry 找到。

### Step 8：检查联络队列

新版本地收发队列：

```text
.starwork/handoff/
```

检查：

- `inbox/`
- `outbox/`
- `sent/`
- `archived/`
- `state.json`

旧路径：

```text
_系统/跨项目/
_system/cross-project/
```

旧路径只作为 legacy signal 输出，不作为新版标准路径。

### Step 9：检查规则版本信号

轻量扫描 `AGENTS.md`：

- 是否提到新版 `.starwork/handoff/`。
- 是否仍把 `_系统/跨项目/` 作为标准路径。
- 是否能找到当前项目状态和当前工作入口。
- 是否明确 Satellite 不把项目进度正文写回 Hub。
- 是否明确项目中心中央路由在语言映射后的协作目录中。

v0.1 只输出信号，不做复杂自然语言判定。

## JSON 输出

### 最小结构

```json
{
  "schema": "starwork.audit.result.v0.1",
  "ok": false,
  "strict_ok": false,
  "hub": {
    "path": "/Users/example/my-hub",
    "ok": true,
    "workspace": {
      "core": "0.1",
      "workspace_type": "hub",
      "kit": "hub",
      "language": "zh"
    },
    "doctor": {
      "ok": true,
      "summary": {
        "pass": 12,
        "info": 2,
        "warn": 0,
        "fail": 0
      }
    }
  },
  "registry": {
    "path": "项目/registry.json",
    "ok": true,
    "projects_total": 2,
    "duplicate_ids": [],
    "missing_paths": []
  },
  "summary": {
    "projects_total": 2,
    "projects_checked": 2,
    "projects_reachable": 2,
    "pass": 1,
    "warn": 1,
    "fail": 0
  },
  "projects": [
    {
      "project_id": "content-site",
      "name": "内容官网",
      "status": "active",
      "path": "/Users/example/projects/content-site",
      "reachable": true,
      "workspace_type": "project",
      "kit": "project",
      "language": "zh",
      "doctor_ok": true,
      "sync_ok": true,
      "checks": [
        {
          "id": "satellite.path.exists",
          "level": "pass",
          "message": "Satellite path exists",
          "trace": "/Users/example/projects/content-site"
        }
      ],
      "legacy_signals": []
    }
  ],
  "checks": []
}
```

### 项目结果字段

| 字段 | 说明 |
|---|---|
| `project_id` | Hub registry 中的项目 ID。 |
| `name` | 项目名称。 |
| `status` | registry 状态。 |
| `path` | registry 记录的 Satellite 路径。 |
| `reachable` | 路径是否存在且可读。 |
| `workspace_type` | Satellite workspace type。 |
| `language` | Satellite language。 |
| `doctor_ok` | 复用 doctor 后的健康结果。 |
| `sync_ok` | Hub 绑定与 `.core-sync.json` 是否一致。 |
| `checks` | 针对该项目的巡检项。 |
| `legacy_signals` | 旧路径或旧规则信号。 |

## 检查等级

| 级别 | 含义 | 是否影响 `ok` |
|---|---|---|
| `pass` | 通过。 | 否 |
| `info` | 补充事实。 | 否 |
| `warn` | 有风险，但需要 AI 判断是否修复。 | 默认不影响；`--strict` 下影响 |
| `fail` | 阻塞问题，Hub 或 Satellite 巡检不可信。 | 是 |

## 输出原则

`audit --json` 不允许输出：

- `next_steps`
- `suggestions`
- `recommended_actions`
- Pack 推荐
- 自动修复建议

这些内容属于 `starworkAudit`。

## 和 `starworkAudit` 的接口

`starworkAudit` 应优先运行：

```bash
starwork audit --hub <hub-path> --json --inventory-depth all
```

然后基于 JSON 做：

- 整体健康解读。
- 项目问题分级。
- 需要用户确认的问题。
- 修复蓝图设计。

## 和 `repair` 的接口

`audit` 不生成 repair blueprint，但它的 JSON 是 repair blueprint 的事实来源。

repair blueprint 应记录：

```json
{
  "source": {
    "audit_schema": "starwork.audit.result.v0.1",
    "hub": "/Users/example/my-hub"
  }
}
```

## 验收测试

第一版至少覆盖：

1. 健康 Hub + 两个健康 Satellite，`audit` 返回 ok。
2. `--project` 只巡检指定项目。
3. registry 中项目路径不存在，项目结果为 fail。
4. Satellite doctor fail，audit 聚合 fail。
5. `.core-sync.json` 指向错误 Hub，audit 输出 sync warning 或 fail。
6. Satellite 缺 `.starwork/handoff/`，audit 输出 warning。
7. 旧 `_系统/跨项目/` 只作为 legacy signal。
8. `audit --json` 不包含 next steps 或建议字段。
