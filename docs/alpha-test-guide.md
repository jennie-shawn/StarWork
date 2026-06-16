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

### Mainflow v0.1：MultiAgent-only 用户回流 Init / Doctor

当用户从“想创建多个 AI 分工”进入，但当前项目还没准备好时，A 测重点看 Init / Doctor 是否解释清楚这不是打断流程，而是在多个 AI 接手前补齐项目入口、当前任务和写入边界。

预期体验：

- `starworkInit` 第一屏说明：为了开启多 AI 协作，先确认项目是什么、当前正在推进什么、哪些内容能整理或修改，确认前不会改业务内容。
- `starworkInit` 默认只问最小必要问题：目标目录、新建或已有、语言、主要 AI 工具；不主动展开知识库、场景 Pack、Capability、复杂目录定制或多个宿主适配。
- 已有项目 dry-run 前说明会保留业务代码和现有资料，不直接覆盖已有 AI 规则文件，先生成待整合草稿。
- pending merge 时说明“工作台骨架已写入，但 AI 入口还没有最终生效”，不能说多 AI 协作已经完全可用。
- `starworkDoctor` 首屏有“多 AI 协作准备度 / 这次是否会改文件 / 下一步建议”，并明确这次只是检查，不会改项目文件。
- Doctor 缺失项要翻译成用户影响，例如另一个 AI 是否能看懂项目目标、知道当前任务、分清草稿和确认版、理解写入边界。

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

### 4. 可选：验证 MultiAgent 职责位与 Codex 标准会话工具

这一步适合希望测试多个 Agent 职责位、独立会话创建和跨会话交付的用户。Codex App 正常路径由 `starworkMultiagent` Skill 直接调用标准线程工具；CLI 只记录项目内事实源。

#### v0.9 友好引导体验

在 Codex App 中先对 `starworkMultiagent` 说：

```text
请帮我创建一个 AI 团队。先不要写入，只帮我看看这个项目适合怎么分工。
```

预期：

- 第一屏不出现内部词，例如 `lane`、`write_scope`、`binding`、`thread`、`CLI`、`doctor`、`multiagent init`、`multiagent add`。
- 第一屏用“AI 岗位”解释流程，并说明每个岗位“负责什么 / 可以整理或修改哪些内容 / 怎么交接”。
- 第一屏说明会先检查、再设计、先预览、确认后再正式创建。
- 如果信息不够，优先问项目目标、希望哪些事情交给不同 AI 分开做、哪些文件或内容不希望 AI 主动修改。
- 创建或调整岗位前，应显示“AI 岗位 / 负责什么 / 可以整理或修改的范围 / 交接方式”的表格，并出现“如果这个方案没问题，我再创建这些协作记录。”
- 写入前应说明“下面是预览，还不会真正写入”；写入后应说明“这次只写入了协作记录，没有改你的业务内容”。
- 自动线程工具不可用时，应解释为当前 AI 工具能力差异，输出完整可复制交接消息，并明确还没有自动送达。

先初始化项目内的职责位：

```bash
starwork multiagent init \
  --lanes product-planning,development \
  --target ~/Desktop/starwork-alpha-project \
  --yes
```

为 product-planning 和 development 职责位创建独立 Codex 会话时，请在 Codex App 中让 `starworkMultiagent` 继续执行“创建 Agent 团队”。预期流程是：

- Skill 组装 Launch Message。
- Skill 调用 `create_thread` 创建目标会话。
- Skill 调用 `set_thread_title`，标题格式为 `<职责名> Agent`。
- 如用户要求置顶，Skill 调用 `set_thread_pinned`。
- 创建成功后，Skill 用 `starwork multiagent bind` 记录 `codex:<thread-id>`。

检查：

```bash
starwork multiagent status \
  --target ~/Desktop/starwork-alpha-project \
  --json
```

只有 lane 绑定了真实 `codex:<thread-id>`，才表示该 Agent 已创建并绑定可工作的独立会话。

向 development 职责位发送一条跨会话指令：

在 Codex App 中让 `starworkMultiagent` 执行“让 development lane 读取当前项目入口，并用一句话汇报工作台状态”。预期流程是：Skill 读取 `multiagent status --target ~/Desktop/starwork-alpha-project --json`，自己组装 `STARWORK:MULTIAGENT_MESSAGE`，调用 `send_message_to_thread`，再用 `starwork multiagent request record` 写入 `delivered_via_codex_thread_tool`。

读取目标职责位当前可观察状态：

在 Codex App 中让 `starworkMultiagent` 执行“看看 development lane 做到哪了”。预期流程是：Skill 读取 `multiagent status --target ~/Desktop/starwork-alpha-project --json`，再调用 `read_thread` 或 `list_threads` 观察 Codex 会话。

预期：标准工具成功时，StarWork request 记录为 `delivered_via_codex_thread_tool`。如果标准工具不可见或调用失败，Skill 应输出 `manual_handoff_required` 和完整可复制消息，并明确尚未自动送达。

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

starwork multiagent handoff development \
  --from product-planning \
  --message "请读取当前项目入口，并用一句话汇报你看到的工作台状态。" \
  --target ~/Desktop/starwork-alpha-project \
  --json
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
```

预期：绑定为 `trae:<id>` 时，`read/status/continue` 均返回人工操作或 unsupported 语义；StarWork 不读取 Trae `database.db`、`state.vscdb` 或其他私有会话存储。

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
- `starworkMultiagent` 是否能把“登记当前会话为常用智能体”正确转换成 `starwork multiagent init/add/bind` 建议，并由标准线程工具处理 Codex 宿主动作。
- Codex App 中创建 Agent 团队时，是否由 Skill 调用 `create_thread`、`set_thread_title`、`set_thread_pinned`，再用 `starwork multiagent bind` 记录真实 thread。
- Codex App 中跨会话投递时，是否由 Skill 调用 `send_message_to_thread`，再用 `starwork multiagent request record` 写入 `delivered_via_codex_thread_tool`；`manual_handoff_required` / `needs_adapt` / `unbound` 是否容易理解。
- `starwork adapt --capabilities` 是否能帮助 Agent 判断不同宿主能力，而不是把内部字段甩给用户。
- `starwork doctor --host <host>` 是否能区分“工作台结构问题”和“宿主入口 / Skill 目录问题”。
- Cursor / Trae 在写入 `.cursor/skills/` / `.trae/skills/` 后是否需要重启、刷新窗口或重新打开项目。
- 返回 `manual_handoff_required` 时，用户是否能理解“已生成交付消息，不等于已自动送达”。
- v0.9 友好引导体验是否能让新用户理解“AI 岗位 / 先预览 / 确认后创建”，而不是被内部命令和字段吓退。
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
