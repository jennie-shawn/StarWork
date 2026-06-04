# StarWork CLI

这里存放 StarWork CLI 源码、命令设计和命令级文档。

## v0.1 边界

v0.1 只覆盖最小可用安装和适配能力：

- `starwork init`
- `starwork spawn`
- `starwork doctor`
- `starwork knowledge`
- `starwork upgrade`
- `starwork adapt`
- `starwork pack install`
- `starwork multiagent`
- `starwork audit`
- `starwork repair`

第一阶段重点：

- 能从空文件夹初始化 StarWork 工作台
- 能从项目中心创建被管理的新项目工作台
- 能检查工作区结构是否完整
- 能生成或更新当前 Agent 所需适配文件
- 能为同一项目建立多 Agent 职责位、绑定会话并登记跨 lane 共享输出
- 能安装兼容 Pack，并在 A 测阶段优先验证通用工作与项目中心管理流程
- 安装和更新时不覆盖用户已有内容

当前 M2 CLI v0.1 最小闭环已落地：

- `starwork init` 第一版：可以初始化项目工作台和项目中心；`single-light` / `project` 作为兼容别名映射为 `project`；项目中心自动使用 `hub-management` Pack，项目工作台 v0.1 默认使用 `general` Pack，不主动推荐未定稿场景 Pack。
- `starwork spawn` 第一版：可以从健康项目中心创建项目工作台，支持 `--language zh|en`、`--blueprint` 定制目录、路径、规则和 seed，并回写项目中心项目注册表；`starter` / `project` mode 作为兼容别名映射为 `project`。
- `starwork doctor` 第一版：可以检查 workspace state、Core 必需角色、Kit 文件、正式事实源、业务工作区和 Pack 落地结果，并支持 `--json` 输出；alpha.4 开始可识别历史模板候选；alpha.5 开始输出目录 `inventory` 与语义 `signals`；alpha.9 开始补齐类似项目中心的旧主库识别，供 `starworkDoctor` skill 判断。
- `starwork knowledge` 第一版：可以为项目工作台开启本地知识库，支持 `init`、`status --json`、`check` 和 `apply --blueprint`；成功开启后把项目内业务 Skill `starworkKnowledgeProject` 安装到当前项目；默认不创建知识库，不迁移或删除旧 `知识/knowledge`。
- `starwork upgrade` 第一版：可以读取 `starworkDoctor` skill 生成的升级蓝图，把历史模板、非标准目录或类似项目中心的旧主库安全升级为 StarWork 工作台；alpha.9 支持 `hub + preserve-names + pack:null`，旧主库接入时不会创建重复标准目录；v0.1 只支持 `--blueprint`，不自动判断升级方案。
- `starwork adapt` Host Adapter v0.1：可以读取 Codex、Claude Code、Cursor、Trae 的宿主能力 profile；`--capabilities` 只输出能力不写文件；正式适配会写入 `.starwork/adapters.json`，并保留 `.starwork/workspace.json.adapters` 摘要。
- `starwork pack install` 第一版：可以在健康工作台上补装 Pack，并更新路径、规则、模板和 workspace state。
- `starwork multiagent` v0.2+Host Adapter：在原有 Agent Lanes 基础上增加宿主分支；Codex 支持自动读取和 launch；Claude Code 支持 `CLAUDE_CODE_SESSION_ID` 绑定、`claude --resume` 继续命令和 transcript 摘要；Cursor 只支持 `agent-transcripts/<uuid>/<uuid>.jsonl` 的只读摘要，用于 `read/status --host`；Trae 不做会话读取或自动化，默认返回人工交付消息或 unsupported。
- `starwork audit` 第一版：可以从项目中心读取语言映射后的项目注册表，批量巡检中心管理的项目工作台，并复用 `doctor` 聚合健康事实。
- `starwork repair` 第一版：可以执行 `starworkAudit` 生成的保守 repair blueprint，支持补目录、补缺失文件、重写 sync、更新 registry 和更新 workspace state。
- Skill 管理与分发第一版：工作台模板可以自带 Skill，项目中心可以托管用户常用 Skill；`init` 写入 `.starwork/skills.json`，`spawn` 按项目中心 registry 选择性分发 Skill，`doctor` 暴露 Skill manifest / registry / mount 事实。

后续规划：

- Pack 自带 Skill 与 upgrade blueprint actions：按 [`StarWork Skill 管理与分发机制 SPEC`](../core/skill-management-spec.md) 继续扩展。
- `starwork update`：面向已经是 StarWork 的工作台，处理未来 Core / Kit / Pack 版本迁移；与 `upgrade` 分开设计。

CLI 不在 v0.1 阶段处理账号、授权、消息平台 gateway 或复杂商业系统。

## 命令规格

- [`starwork init` SPEC](./init-spec.md)
- [`starwork doctor` SPEC](./doctor-spec.md)
- [`Knowledge Base Capability SPEC`](../planning/features/knowledge-base/specs/v0.1.md)
- [`starwork adapt` SPEC](./adapt-spec.md)
- [`Host Adapter v0.1 Implementation SPEC`](../planning/features/host-adapters/specs/v0.1-implementation.md)
- [`starwork pack install` SPEC](./pack-install-spec.md)
- [`starwork spawn` SPEC](./spawn-spec.md)
- [`starwork spawn --blueprint` SPEC](./spawn-blueprint-spec.md)
- [`starwork upgrade` SPEC](./upgrade-spec.md)
- [`starwork audit` SPEC](./audit-spec.md)
- [`starwork repair` SPEC](./repair-spec.md)
- [`starwork multiagent` SPEC](../core/agent-lanes-spec.md)
- [`Agent Lanes 宿主会话命名增强 SPEC`](../core/agent-lanes-session-naming-spec.md)
- [`MultiAgent v0.2 Codex 多会话编排 SPEC`](../planning/features/multiagent/specs/v0.2-codex-orchestration.md)

## 本地运行

```bash
node cli/bin/starwork.js --version
node cli/bin/starwork.js --help
node cli/bin/starwork.js init --type project --pack general --dry-run
node cli/bin/starwork.js spawn --hub ./my-hub --name "新项目" --target ./new-project --language zh --dry-run
node cli/bin/starwork.js spawn --hub ./my-hub --target ./new-project --blueprint ./blueprint.json --dry-run
node cli/bin/starwork.js audit --hub ./my-hub --json
node cli/bin/starwork.js repair --blueprint ./repair-blueprint.json --dry-run
node cli/bin/starwork.js upgrade --target ./old-workspace --blueprint ./upgrade-blueprint.json --dry-run
node cli/bin/starwork.js doctor --target ./my-workspace
node cli/bin/starwork.js init --type project --language zh --target ./cursor-workspace --adapter cursor --yes
node cli/bin/starwork.js knowledge init --target ./my-workspace --dry-run
node cli/bin/starwork.js multiagent init --lanes research,writing,review --target ./my-workspace --yes
node cli/bin/starwork.js multiagent bind research --session codex:manual-research-1 --session-name "Research Agent" --target ./my-workspace --yes
node cli/bin/starwork.js multiagent status --host --target ./my-workspace --json
node cli/bin/starwork.js multiagent instruct development --from product-planning --message "请根据 SPEC 开始实现。" --target ./my-workspace --dry-run
node cli/bin/starwork.js multiagent handoff development --from product-planning --message "请手动处理这条指令。" --target ./my-workspace --dry-run
node cli/bin/starwork.js multiagent continue research --target ./my-workspace --json
node cli/bin/starwork.js adapt all --capabilities --json
node cli/bin/starwork.js adapt cursor --check --target ./my-workspace --json
node cli/bin/starwork.js adapt claude --target ./my-workspace --yes
node cli/bin/starwork.js doctor --target ./my-workspace --host all --json
node cli/bin/starwork.js pack install content-creator --target ./my-workspace --yes
```
