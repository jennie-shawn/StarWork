# StarWork A 测安装指南

## 发布口径

- GitHub organization：`jennie-shawn`
- GitHub repository：`jennie-shawn/StarWork`
- npm package：`@jennie-shawn/starwork`
- CLI command：`starwork`
- A 测 tag：`latest`
- 当前 `latest`：`0.1.0-alpha.20`

## A 测用户安装 CLI

全局安装：

```bash
npm install -g @jennie-shawn/starwork
starwork --version
starwork --help
```

不全局安装：

```bash
npx @jennie-shawn/starwork --version
npx @jennie-shawn/starwork --help
```

预期版本应为 `0.1.0-alpha.20` 或更新版本。

## A 测用户安装系统 Skills

安装 StarWork 系统 skills：

```bash
npx skills add jennie-shawn/StarWork -g -a codex -y
```

说明：这是一条短命令，只安装 StarWork 全局系统 Skills：L0 主入口 + L1 专家 Skills。`starworkSpawn`、`starworkAudit`、`neat-freak` 和 `starworkKnowledgeProject` 不应被全局安装；前三个是 Kit 自带 Skill，会随对应工作台写入，`starworkKnowledgeProject` 会在项目开启知识库能力后写入当前项目。

安装前可先查看仓库会安装哪些 Skills：

```bash
npx skills add jennie-shawn/StarWork -l
```

预期只看到：

- `starwork`
- `starworkInit`
- `starworkDoctor`
- `starworkKnowledge`
- `starworkMultiagent`

不应看到 `starworkSpawn`、`starworkAudit`、`neat-freak` 或 `starworkKnowledgeProject`。它们分别属于 L2 Kit 自带 Skill 或 L3 Capability 项目内 Skill，不是全局系统 Skill。

安装后验证：

```bash
npx skills ls -g -a codex --json
```

说明：历史模板诊断和升级方案生成统一由 `starworkDoctor` 负责；`starwork upgrade` CLI 只执行已经确认过的升级方案。

说明：类似项目中心的旧工作区接入也走 `starworkDoctor -> starwork upgrade` 链路；默认保留 `projects/`、`knowledge/`、`skills/` 等原目录名，不创建重复标准目录。

## 第一次使用 StarWork

StarWork 是给 AI 协作准备的项目工作台。它会把项目说明、当前任务、协作规则、交接记录和健康检查入口整理到固定位置，让 Codex、Claude Code、Cursor 这类 AI 工具进入项目时不用从零猜上下文。

第一次初始化时，建议按这个顺序走：

1. 先确认是接入已有项目，还是新建空工作台试用。
2. 再确认目标路径、语言和推荐结构。
3. 先用 `--dry-run` 预览 StarWork 准备写入哪些协作文件。
4. 用户确认后再用 `--yes` 写入，并运行 `starwork doctor` 检查。

默认安全边界：

- 不默认改业务代码。
- 不直接覆盖已有非空 AI 规则文件。
- 不在用户确认前正式写入。
- 不要求第一次就开启知识库、多 Agent 或所有 AI 工具适配。

三种推荐路径：

| 场景 | 推荐 |
| --- | --- |
| 只是试用 | 新建空项目工作台，使用推荐结构，先预览。 |
| 已有真实项目 | 接入已有项目，保留现有文件，已有 AI 规则先生成待整合草稿。 |
| 已有成熟工作流 | 先接入已有项目并预览，再按需要定制结构。 |

## 最小测试流程

交互式测试时，`starwork init` 会先询问工作台类型和语言；默认推荐项目工作台。项目中心会自动使用项目中心管理结构，项目工作台会默认使用通用工作能力。

### 1. 创建普通项目工作台

先预览：

```bash
starwork init \
  --type project \
  --pack general \
  --language zh \
  --name "StarWork A Test" \
  --target ~/Desktop/starwork-a-test \
  --dry-run
```

确认预览后再写入：

```bash
starwork init \
  --type project \
  --pack general \
  --language zh \
  --name "StarWork A Test" \
  --target ~/Desktop/starwork-a-test \
  --yes
```

检查：

```bash
starwork doctor --target ~/Desktop/starwork-a-test
```

### 2. 创建项目中心

先预览：

```bash
starwork init \
  --type hub \
  --language zh \
  --name "StarWork Project Center A Test" \
  --target ~/Desktop/starwork-hub-a-test \
  --dry-run
```

确认预览后再写入：

```bash
starwork init \
  --type hub \
  --language zh \
  --name "StarWork Project Center A Test" \
  --target ~/Desktop/starwork-hub-a-test \
  --yes
```

检查：

```bash
starwork doctor --target ~/Desktop/starwork-hub-a-test
```

### 3. 从项目中心创建项目工作台

先预览：

```bash
starwork spawn \
  --hub ~/Desktop/starwork-hub-a-test \
  --name "Alpha Project" \
  --target ~/Desktop/starwork-alpha-project \
  --mode project \
  --language zh \
  --dry-run
```

确认预览后再写入：

```bash
starwork spawn \
  --hub ~/Desktop/starwork-hub-a-test \
  --name "Alpha Project" \
  --target ~/Desktop/starwork-alpha-project \
  --mode project \
  --language zh \
  --yes
```

检查：

```bash
starwork doctor --target ~/Desktop/starwork-alpha-project
```

### 4. 可选：验证 MultiAgent 会话创建与跨会话交付

这一步适合希望测试多个 Agent 职责位、独立会话创建和跨会话交付降级的用户。

先初始化项目内的职责位：

```bash
starwork multiagent init \
  --lanes product-planning,development \
  --target ~/Desktop/starwork-alpha-project \
  --yes
```

为 product-planning 和 development 职责位批量创建独立会话并发送启动消息：

```bash
starwork multiagent launch \
  --lanes product-planning,development \
  --target ~/Desktop/starwork-alpha-project \
  --json \
  --yes
```

检查 JSON 中每个 lane 的 `binding_status`。只有 `bound` 表示该 Agent 已创建并绑定可工作的独立会话；`rename_status` 为 `warning` 时，说明宿主会话自动命名失败，需要按返回信息处理。

向 development 职责位发送一条跨会话指令：

```bash
starwork multiagent instruct development \
  --from product-planning \
  --message "请读取当前项目入口，并用一句话汇报你看到的工作台状态。" \
  --target ~/Desktop/starwork-alpha-project \
  --json \
  --yes
```

当前 CLI 只有在运行时发现宿主标准后台投递能力时才会返回 `delivered`。如果返回 `manual_handoff_required`，表示已生成可复制交付消息，需要用户手动发给目标会话；这不是失败。

读取目标职责位当前可观察状态：

```bash
starwork multiagent read development \
  --turns 3 \
  --target ~/Desktop/starwork-alpha-project \
  --json
```

预期：`launch` 成功时返回 `completed`；`instruct` 会根据 CLI 运行时宿主路由返回 `delivered`、`manual_handoff_required`、`needs_adapt`、`unbound` 等状态。`delivered` 只表示消息已投递，不表示目标任务完成；`manual_handoff_required` 表示需要手动复制交付消息。

### 5. 可选：验证 Host Adapter

这一步用于测试 Codex、Claude Code、Cursor、Trae 的宿主差异。Adapter 是增强层，不是 Core 必需层；用户不选宿主时，普通工作台仍然可用。

查看宿主能力，不写文件：

```bash
starwork adapt all --capabilities --json
starwork adapt cursor --check --target ~/Desktop/starwork-alpha-project --json
```

初始化时直接适配 Cursor：

```bash
starwork init \
  --type project \
  --language zh \
  --target ~/Desktop/starwork-cursor-a-test \
  --adapter cursor \
  --yes

starwork doctor \
  --target ~/Desktop/starwork-cursor-a-test \
  --host cursor
```

测试 Trae 人工交付降级：

```bash
starwork multiagent init \
  --lanes product-planning,development \
  --target ~/Desktop/starwork-alpha-project \
  --yes

starwork adapt trae \
  --target ~/Desktop/starwork-alpha-project \
  --yes

starwork multiagent bind development \
  --session trae:manual-dev-session \
  --target ~/Desktop/starwork-alpha-project \
  --yes

starwork multiagent instruct development \
  --from product-planning \
  --message "请读取当前项目入口，并用一句话汇报你看到的工作台状态。" \
  --target ~/Desktop/starwork-alpha-project \
  --json \
  --yes
```

预期：Trae 目标应返回 `manual_handoff_required`，表示已经生成可复制交付消息，但没有自动送达。

测试 Cursor 只读 transcript 摘要：

```bash
starwork multiagent bind development \
  --session cursor:<cursor-session-uuid> \
  --target ~/Desktop/starwork-cursor-a-test \
  --yes

starwork multiagent read development \
  --target ~/Desktop/starwork-cursor-a-test \
  --json

starwork multiagent status \
  --host \
  --target ~/Desktop/starwork-cursor-a-test \
  --json
```

预期：Cursor 目标只读取 `~/.cursor/projects/<project-key>/agent-transcripts/<uuid>/<uuid>.jsonl` 并输出受控摘要，例如 `transcript_observed`、`not_found`、`malformed_partial`；不会输出完整 JSONL、不会写 Cursor transcript，也不会把 `cursor agent --resume` 当作自动跨会话发送。

测试 Trae 只保留人工操作宿主：

```bash
starwork multiagent read development \
  --target ~/Desktop/starwork-alpha-project \
  --json

starwork multiagent status \
  --host \
  --target ~/Desktop/starwork-alpha-project \
  --json

starwork multiagent continue development \
  --target ~/Desktop/starwork-alpha-project \
  --json

starwork multiagent launch development \
  --host trae \
  --target ~/Desktop/starwork-alpha-project \
  --json \
  --yes
```

预期：绑定为 `trae:<id>` 或显式 `--host trae` 时，`read/status/continue/launch` 均返回人工操作或 unsupported 语义；StarWork 不读取 Trae `database.db`、`state.vscdb` 或其他私有会话存储。

测试 Claude Code 继续命令：

```bash
CLAUDE_CODE_SESSION_ID=your-session-id \
starwork multiagent bind development \
  --agent claude-code \
  --target ~/Desktop/starwork-alpha-project \
  --yes

starwork multiagent continue development \
  --target ~/Desktop/starwork-alpha-project
```

预期：输出 `claude --resume your-session-id`。如果要测试 transcript 摘要，可额外传 `--transcript <jsonl-or-dir>`；StarWork 只读摘要，不写 Claude 私有 transcript。

Cursor / Trae 写入 Skill 目录后，宿主 UI 是否立即发现需要继续实测。如果看不到 Skill，先记录是否需要重启窗口、重新打开项目或触发一次新聊天。

## 反馈重点

请 A 测用户重点反馈：

- CLI 是否能顺利安装和运行。
- `init` 创建的工作台结构是否容易理解。
- `doctor` 的检查结果是否能指导修复问题。
- `spawn` 从项目中心创建项目工作台的过程是否清楚。
- `doctor` / `starworkDoctor` 对历史模板或类似项目中心的旧工作区的说明是否能看懂。
- 历史模板升级后生成的 `AGENTS.md` 是否简洁、清楚，是否保留了用户原有规则里的有效内容。
- 系统 skills 是否能被 Codex 识别和调用：`starworkInit`、`starworkDoctor`、`starworkMultiagent`、`starworkKnowledge`。
- `starworkMultiagent` 是否能把“登记当前会话为常用智能体”正确转换成 `starwork multiagent init/add/bind` 建议。
- `starwork multiagent bind --session-name` 是否能正确同步 Codex 宿主会话名；失败时是否能看懂 warning。
- `starwork multiagent launch/instruct/read` 是否能清楚区分会话创建、宿主观察、标准投递和人工交付；`manual_handoff_required` / `needs_adapt` / `unbound` 是否容易理解。
- `starwork adapt --capabilities` 是否能帮助 Agent 判断不同宿主能力，而不是把内部字段甩给用户。
- `starwork doctor --host <host>` 是否能区分“工作台结构问题”和“宿主入口 / Skill 目录问题”。
- Cursor / Trae 在写入 `.cursor/skills/` / `.trae/skills/` 后是否需要重启、刷新窗口或重新打开项目。
- 返回 `manual_handoff_required` 时，用户是否能理解“已生成交付消息，不等于已自动送达”。
- 项目中心自带的 `starworkSpawn`、`starworkAudit` 与项目工作台自带的 `neat-freak` 是否能在对应工作台内被发现。

## 发布前检查

发布前在产品仓库根目录运行：

```bash
npm test
npm pack --dry-run
```

确认 npm 包里至少包含：

- `cli/`
- `core/`
- `packs/`
- `schemas/`
- `skills/starworkInit/`
- `skills/starworkDoctor/`
- `skills/starworkMultiagent/`
- `skills/starworkKnowledge/`
- `kit-skills/starworkSpawn/`
- `kit-skills/starworkAudit/`
- `kit-skills/neat-freak/`
