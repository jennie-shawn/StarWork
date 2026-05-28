# `starwork doctor` SPEC

## 状态

- 版本：v0.1 draft
- 所属模块：StarWork CLI
- 命令：`starwork doctor`
- 前置状态：Core v0.1 已封版，`starwork init` 第一版已落地
- 实现状态：v0.1 最小实现已落地；历史模板升级诊断、目录 inventory 和 signals 已进入 alpha
- 目标：检查一个 StarWork 工作台是否健康，并把结构事实、风险和候选信号暴露出来；对历史模板用户只输出可供 AI 判断的诊断信号，不直接生成行动建议

## 一句话定义

`starwork doctor` 是 StarWork 工作台的体检命令。

它不负责创建工作台，不负责升级工作台，也不默认修复文件。它只做一件事：把 Core、Kit、Pack 和 Agent 适配文件之间的不一致检查出来，用人能看懂的方式报告。

从 alpha.4 起，`doctor` 还承担一个轻量探测入口职责：当目录不是标准 StarWork 工作台，但看起来像用户正在使用的历史模板时，它不会只说“不是工作台”，而是输出历史模板识别结果、目录 inventory 和 semantic signals，交给 `starworkDoctor` 做后续判断。

## 为什么先做 doctor

Core v0.1 已封版后，项目进入 M2：CLI v0.1 最小闭环。

`init` 已经能生成工作台，但还缺一个检查器来回答：

- 这个工作台是不是一个合法的 StarWork 工作台？
- Core 必需文件有没有缺？
- Kit 结构有没有被用户或 Agent 改坏？
- Pack 是否真的安装完整？
- 正式事实源、当前工作、草稿、参考资料的边界是否清楚？
- 后续 `adapt` 和 `pack install` 可以不可以安全执行？

所以 `doctor` 是 `init` 之后、`adapt` 和 `pack install` 之前的关键桥梁。

```text
init 负责生成
  ↓
doctor 负责检查
  ↓
adapt 负责适配 Agent
  ↓
pack install 负责扩展场景
```

## 设计原则

1. 只检查，不静默修复。
2. 先检查结构，再检查内容边界。
3. 优先使用 `.starwork/workspace.json`，但允许给出“疑似 StarWork 工作区”的提示。
4. 输出必须让普通用户看懂，不只给机器可读结果。
5. 检查项必须基于 Core、Kit、Pack 的正式定义，不能靠硬编码中文路径。
6. v0.1 先做确定性检查，少做主观内容判断。
7. 检查结果要能成为后续 `adapt` 和 `pack install` 的前置依据。

## 命令形式

默认用法：

```bash
starwork doctor
```

指定目录：

```bash
starwork doctor --target ./my-workspace
```

机器可读输出：

```bash
starwork doctor --json
```

严格模式：

```bash
starwork doctor --strict
```

详细模式：

```bash
starwork doctor --verbose
```

## 参数

| 参数 | 说明 |
|---|---|
| `--target <path>` | 指定要检查的目录，默认当前目录。 |
| `--json` | 输出机器可读 JSON。 |
| `--strict` | 将部分 warning 视为失败，适合测试和发布前检查。 |
| `--verbose` | 显示通过项、检查来源和路径解析细节。 |
| `--inventory-depth <number\|all>` | 控制目录结构探测深度，默认用于保护过大的工作区。 |
| `--inventory-limit <number>` | 控制最多输出多少个目录和文件条目。 |
| `--help` | 显示帮助。 |

v0.1 暂不提供 `--fix`。修复动作后续可以单独设计为 `starwork doctor --fix` 或 `starwork repair`，但第一版不要混入。

## 检查对象

`doctor` 检查的是一个“最终工作台”，也就是 `init` 生成的 Kit + Pack 结果。

它至少需要读取：

- `.starwork/workspace.json`
- `AGENTS.md`
- Core 角色对应的项目状态文件
- Core 角色对应的当前工作文件
- workspace state 中声明的正式事实源
- workspace state 中声明的业务工作区
- 已安装 Pack 的目录、规则、模板和 seed 落地结果

如果工作区没有 `.starwork/workspace.json`，但存在 `AGENTS.md`、`_系统/`、`_system/`、`事项/`、`matters/` 等明显 StarWork 痕迹，`doctor` 应报告为“疑似 StarWork 工作台，但缺少 workspace state”。

## 检查分级

`doctor` 使用四级结果：

| 级别 | 含义 | 是否影响退出码 |
|---|---|---|
| `pass` | 检查通过。 | 否 |
| `info` | 提供上下文信息。 | 否 |
| `warn` | 有风险，但工作台仍可继续使用。 | 默认不影响；`--strict` 下影响 |
| `fail` | 缺少关键结构或存在破坏性问题。 | 是 |

## 退出码

| 退出码 | 含义 |
|---|---|
| `0` | 没有 fail；非 strict 模式下 warning 不导致失败。 |
| `1` | 存在 fail；或 strict 模式下存在 warn。 |
| `2` | 命令参数错误、无法读取目录、JSON 解析失败等 CLI 执行错误。 |

## 检查流程

### Step 1：定位工作区

从 `--target` 或当前目录开始向上查找：

```text
.starwork/workspace.json
```

结果：

- 找到：使用该目录作为工作区根目录。
- 未找到但当前目录有 StarWork 或历史模板痕迹：报告缺少 workspace state，同时输出历史模板候选信号。
- 未找到且无 StarWork 痕迹：报告不是 StarWork 工作台。

v0.1 判断标准：

| 情况 | 结果 |
|---|---|
| 找到 `.starwork/workspace.json` | 继续检查。 |
| 未找到 state，但有 `AGENTS.md` 和 `_系统/` / `_system/` | `fail`：缺少 workspace state，并输出候选信号。 |
| 未找到 state，但有 `references/outputs` 或 `参考资料/输出` | `fail`：识别为历史模板升级候选。 |
| 完全没有 StarWork 痕迹 | `fail`：不是 StarWork 工作台。 |

### Step 1.5：历史模板升级诊断

历史模板诊断只读文件结构，不移动、不复制、不写入任何文件。

识别信号：

| 信号 | 示例 |
|---|---|
| Agent 入口规则 | `AGENTS.md`、`CLAUDE.md`、`.cursorrules` |
| 系统目录 | `_系统/`、`_system/` |
| 事项目录 | `事项/`、`matters/` |
| 参考资料目录 | `参考资料/`、`资料/`、`素材/`、`references/`、`reference/` |
| 输出目录 | `输出/`、`成果/`、`outputs/`、`output/` |
| 身份和教训 | `identity/`、`lessons/`、`_系统/身份/`、`_system/identity/` |

推断规则：

| 推断项 | 规则 |
|---|---|
| `language` | 中文路径多则 `zh`，英文路径多则 `en`，不确定时默认为 `zh`。 |
| `workspace_type` | Hub 信号充分时推断为 `hub`；其他历史项目候选统一推断为 `project`。`事项/` 或 `matters/` 只作为历史内容信号。 |
输出内容：

- `upgrade.candidate: true`
- `upgrade.source: legacy-template`
- `upgrade.inferred.language`
- `upgrade.inferred.workspace_type`
- `upgrade.inferred.reasons`
- 检测到的参考资料目录和输出目录

注意：`doctor --json` 不输出 `next_steps`，也不输出 Pack 建议，避免影响 `starworkDoctor` 基于上下文做独立判断。正式升级仍由 `starworkDoctor` 生成 blueprint，再交给 `starwork upgrade --blueprint` 执行。

### Step 2：读取 workspace state

读取 `.starwork/workspace.json`。

必须检查：

- `schema` 是否为 `starwork.workspace.v0.1`
- `core` 是否兼容 `0.1`
- `workspace_type` 是否为 `single-light`、`project` 或 `hub`
- `kit` 是否存在
- `language` 是否存在
- `packs` 是否是数组
- `paths.formal_source` 是否存在
- `paths.business_work_area` 是否存在

示例：

```json
{
  "schema": "starwork.workspace.v0.1",
  "core": "0.1",
  "workspace_type": "project",
  "kit": "project",
  "packs": [
    {
      "id": "content-creator",
      "version": "0.1.0",
      "installed_at": "2026-05-15T00:00:00.000Z"
    }
  ],
  "language": "zh",
  "paths": {
    "formal_source": "发布记录/",
    "business_work_area": "草稿与脚本/"
  },
  "created_by": "starwork init"
}
```

### Step 3：解析期望结构

`doctor` 不能只凭中文路径硬编码检查。

它应根据 workspace state 解析：

```text
workspace.kit
  ↓
Core kit / preset / profile
  ↓
Core required roles
  ↓
installed packs
  ↓
Pack language config
  ↓
expected paths, seed, templates
```

v0.1 可以先用现有 Kit 目录作为事实依据：

- 检查 workspace state 中声明的 `kit` 是否存在于 `product/core/kits/<kit>/`
- 遍历 Kit 文件，检查目标工作台中对应文件是否存在
- 读取 Pack 的 `languages/<language>.json`，检查 Pack 目录、seed 和 templates 是否存在

后续版本再把 preset / profile / capability 的解析做得更严格。

### Step 4：Core baseline 检查

Core v0.1 必需角色：

| 角色 | 检查方式 |
|---|---|
| `agent.entry_rules` | 入口规则文件存在，当前 v0.1 通常为 `AGENTS.md`。 |
| `system.context.project_status` | 项目状态文件存在；中文本地项目通常为 `_系统/上下文/项目状态.md`，卫星项目可为 `_系统/上下文/当前项目.md`。 |
| `system.tasks.current_work` | 当前工作文件存在。 |

检查项：

- 入口规则存在。
- 项目状态存在。
- 当前工作存在。
- 入口规则或项目状态中能找到正式事实源提示。
- workspace state 中声明的正式事实源路径存在。
- workspace state 中声明的业务工作区路径存在。

### Step 5：Kit 完整性检查

根据 `workspace.kit` 对应的 Kit 目录，检查：

- Kit 中的文件是否都存在于目标工作台。
- Kit 中应存在的目录是否存在。
- 关键文件是否被旁路文件替代，例如只有 `AGENTS.starwork-new.md` 而没有 `AGENTS.md`。
- 工作区类型和 Kit 是否匹配。

工作区类型与 Kit 的 v0.1 匹配表：

| `workspace_type` | 允许 Kit |
|---|---|
| `single-light` | `local-starter` |
| `project` | `project` |
| `hub` | `hub` |

卫星项目 Kit 目前不是 `init` 的普通入口，但 `doctor` 应能识别：

| Kit | 说明 |
|---|---|
| `satellite-starter` | 接入主库的轻量卫星项目。 |
| `project` | 接入主库的项目卫星项目。 |

### Step 6：Capability 检查

v0.1 先检查确定性 capability。

| capability | 检查项 |
|---|---|
| `starter-outputs` | 参考资料目录、草稿目录、确认成果目录存在。 |
| `decisions` | 决策文件存在时检查位置；不强制所有工作区都有。 |
| `local-identity` | 本地身份目录存在。 |
| `local-lessons` | 本地教训目录存在。 |
| `main-repo-sync` | `.core-sync.json` 存在；只读快照边界清晰。 |
| `skill-mount` | skills 入口存在；缺失时给 warning。 |

由于当前 `.starwork/workspace.json` 尚未记录 capability 列表，v0.1 可以通过 Kit 名称推断 capability。

后续可以把 capability 列表写入 workspace state，让 `doctor` 检查更稳定。

### Step 7：Pack 检查

对每个已安装 Pack：

- Pack 源声明存在。
- Pack `compatible_core` 与 workspace core 兼容。
- Pack 支持当前 `workspace_type`。
- Pack 对应语言配置存在。
- `languages/<language>.json` 中声明的 `paths` 都存在。
- `seed` 中声明的目标文件都存在。
- `templates` 已复制到 `.starwork/packs/<pack-id>/templates/`。
- `paths.formal_source` 与 Pack `overrides.formal_source` 一致，除非用户显式覆盖。
- `paths.business_work_area` 与 Pack `overrides.business_work_area` 一致，除非用户显式覆盖。

对 `content-creator` Pack，v0.1 应至少检查：

- 账号定位 / account-profile
- 选题池 / ideas
- 素材库 / materials
- 草稿与脚本 / drafts-and-scripts
- 发布记录 / published
- 数据复盘 / analytics-review
- content brief、publish record、weekly review 模板

对新版 `hub` 工作台，v0.1 应至少检查：

- 项目注册表：中文默认 `项目/registry.json`，英文默认 `projects/registry.json`
- 项目协作路由：中文默认 `项目/协作/`，英文默认 `projects/coordination/`
- `.incoming/`
- 共享身份：中文默认 `身份/`，英文默认 `identity/`
- 共享教训：中文默认 `教训/`，英文默认 `lessons/`
- 共享知识：中文默认 `知识/`，英文默认 `knowledge/`
- 托管 Skill 注册表：中文默认 `技能/registry.json`，英文默认 `skills/registry.json`
- 草稿和实验区：中文默认 `工作区/`，英文默认 `workspace/`
- `.starwork/handoff/`

Hub 不再检查单项目式的项目状态和当前工作入口。

对 `hub-management` Pack，v0.1 应至少检查：

- 项目 / projects
- 项目联络 / coordination
- `.incoming/`
- identity
- lessons
- knowledge / 知识
- skills

### Step 8：内容边界检查

v0.1 不做复杂语义判断，但可以做轻量启发式 warning。

建议 warning：

- 当前工作文件过长，可能混入了大量历史记录。
- 项目状态文件过长，可能混入任务级流水。
- `decisions` 文件出现大量会议纪要式条目。
- 正式事实源路径指向草稿目录。
- 业务工作区路径指向只读参考资料目录。
- 参考资料目录中出现明显生成成果文件名，例如 `final`、`发布稿`、`确认版`。
- 历史过程目录被 workspace state 声明为正式事实源。

这些检查只能给 warning，不应作为 fail。

## 输出格式

### 默认人类可读输出

示例：

```text
StarWork Doctor

Workspace: /path/to/workspace
Core: 0.1
Type: project
Kit: project
Packs: content-creator@0.1.0

Summary:
  pass: 18
  warn: 2
  fail: 0

Checks:
  [pass] workspace.state.exists
         .starwork/workspace.json exists

  [pass] core.entry_rules.exists
         AGENTS.md exists

  [pass] core.project_status.exists
         _系统/上下文/项目状态.md exists

  [warn] content.current_work.too_long
         _系统/任务/当前工作.md is long; consider moving history to matters.

  [warn] pack.formal_source.overridden
         workspace formal source differs from Pack default: 发布记录/ -> 输出/确认成果/

Result:
  Workspace is usable, with warnings.
```

### JSON 输出

`--json` 输出建议结构：

```json
{
  "schema": "starwork.doctor.result.v0.1",
  "ok": true,
  "strict_ok": false,
  "workspace_root": "/path/to/workspace",
  "workspace": {
    "core": "0.1",
    "workspace_type": "project",
    "kit": "project",
    "language": "zh",
    "packs": ["content-creator"]
  },
  "upgrade": null,
  "summary": {
    "pass": 18,
    "info": 1,
    "warn": 2,
    "fail": 0
  },
  "checks": [
    {
      "id": "core.entry_rules.exists",
      "level": "pass",
      "message": "AGENTS.md exists",
      "path": "AGENTS.md"
    }
  ]
}
```

历史模板升级候选的 JSON 示例：

```json
{
  "schema": "starwork.doctor.result.v0.1",
  "ok": false,
  "strict_ok": false,
  "workspace_root": null,
  "workspace": null,
  "upgrade": {
    "candidate": true,
    "source": "legacy-template",
    "confidence": "high",
    "inferred": {
      "language": "zh",
      "workspace_type": "project",
      "references": ["参考资料"],
      "outputs": ["输出"],
      "reasons": {
        "language": ["_系统 是中文工作区信号"],
        "workspace_type": ["事项 表示存在事项或多线推进推进结构"],
        "references": ["参考资料 命中参考资料候选信号"],
        "outputs": ["输出 命中成果或输出候选信号"]
      }
    }
  },
  "signals": {
    "project_status_files": ["_系统/上下文/项目状态.md"],
    "current_work_files": ["_系统/任务/当前工作.md"],
    "readonly_candidate_dirs": ["参考资料"],
    "writable_candidate_dirs": ["事项", "输出"]
  }
}
```

## 检查 ID 命名

检查 ID 应稳定，方便测试、文档和后续自动化使用。

建议命名空间：

```text
workspace.*
core.*
kit.*
capability.*
pack.*
content.*
adapter.*
legacy.*
```

示例：

- `workspace.state.exists`
- `workspace.state.schema`
- `core.entry_rules.exists`
- `core.project_status.exists`
- `core.current_work.exists`
- `core.formal_source.exists`
- `kit.files.complete`
- `capability.事项.registry_exists`
- `pack.source.exists`
- `pack.paths.exist`
- `pack.templates.installed`
- `content.current_work.too_long`
- `legacy.template.detected`
- `legacy.references.detected`
- `legacy.outputs.detected`

## 与其他命令的关系

### 与 `init`

`init` 完成后应建议用户运行 `doctor`。

`doctor` 应能检查 `init` 生成的 `.starwork/workspace.json` 和实际文件结构是否一致。

### 与 `adapt`

`adapt` 运行前可以调用或建议运行 `doctor`。

如果 `doctor` 发现 Core 必需角色缺失，`adapt` 不应继续生成 Agent 适配文件。

### 与 `pack install`

`pack install` 前后都可以运行 `doctor`：

- 安装前：确认工作区是健康 Core 工作台。
- 安装后：确认 Pack 路径、规则、模板和 seed 都落地。

## v0.1 不做什么

`starwork doctor` v0.1 不处理：

- 自动修复。
- 自动升级 Core 或 Kit。
- 自动安装缺失 Pack。
- 自动合并 `.starwork-new` 文件。
- 判断用户内容质量。
- 读取远程主库状态。
- 检查账号、授权、云服务或消息平台。
- 执行 Pack 脚本。

## 最小实现范围

第一版实现可以只覆盖：

1. 定位 `.starwork/workspace.json`。
2. 校验 workspace state 基本字段。
3. 根据 `kit` 检查 Kit 文件是否存在。
4. 检查 Core 必需角色文件存在。
5. 检查正式事实源和业务工作区存在。
6. 根据已安装 Pack 检查路径、seed 和 templates。
7. 输出人类可读报告。
8. 支持 `--json`。
9. 设置正确退出码。

暂缓到第二步：

- 内容边界启发式 warning。
- `--strict`。
- `--verbose`。
- Adapter 检查。
- 更完整的 capability 解析。

## 验收标准

`starwork doctor` v0.1 可验收，至少满足：

- 对 `starwork init --type single-light --pack general` 生成的工作台返回成功。
- 对 `starwork init --type project --pack content-creator` 生成的工作台返回成功。
- 对 `starwork init --type hub` 生成的工作台返回成功。
- 删除 `AGENTS.md` 后返回 fail。
- 删除正式事实源目录后返回 fail。
- 删除 Pack seed 文件后返回 fail。
- 非 StarWork 目录返回 fail，并提示先运行 `starwork init`。
- 对存在 `references/outputs` 的英文历史模板返回 fail，但输出 `upgrade` 候选信号，不输出 `next_steps` 或 Pack 建议。
- 对存在 `参考资料/输出/事项` 的中文历史模板返回 fail，但推断为 `project` + `zh`。
- `--json` 输出稳定结构。
- 没有 fail 时退出码为 `0`，有 fail 时退出码为 `1`。

## 后续问题

后续实现前需要继续确认：

1. `.starwork/workspace.json` 是否应补充 `capabilities` 字段。
2. `doctor` 是否应该在默认输出里展示所有 pass，还是只展示 summary + warn/fail。
3. `strict` 模式是否进入 v0.1 第一版实现。
4. Adapter 检查是放在 `doctor` 里，还是等 `adapt` 命令成熟后再纳入。
