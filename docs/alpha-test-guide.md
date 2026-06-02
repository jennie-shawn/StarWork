# StarWork A 测安装指南

## 发布口径

- GitHub organization：`jennie-shawn`
- GitHub repository：`jennie-shawn/StarWork`
- npm package：`@jennie-shawn/starwork`
- CLI command：`starwork`
- A 测 tag：`latest`
- 当前 `latest`：`0.1.0-alpha.17`

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

预期版本应为 `0.1.0-alpha.17` 或更新版本。

## A 测用户安装系统 Skills

安装 StarWork 系统 skills：

```bash
npx skills add jennie-shawn/StarWork -g -a codex -y
```

说明：这是一条短命令，只安装 StarWork 系统级 Skills。`starworkSpawn`、`starworkAudit` 和 `neat-freak` 不应被全局安装；前两个会在 `starwork init --type hub` 时进入项目中心，`neat-freak` 会在单项目初始化时进入项目。

安装前可先查看仓库会安装哪些 Skills：

```bash
npx skills add jennie-shawn/StarWork -l
```

预期只看到：

- `starworkInit`
- `starworkDoctor`
- `starworkMultiagent`
- `starworkKnowledge`

不应看到 `starworkKnowledgeProject`。它是项目开启知识库后才写入当前项目的业务 Skill，不是全局系统 Skill。

安装后验证：

```bash
npx skills ls -g -a codex --json
```

说明：历史模板诊断和升级方案生成统一由 `starworkDoctor` 负责；`starwork upgrade` CLI 只执行已经确认过的升级方案。

说明：类似项目中心的旧工作区接入也走 `starworkDoctor -> starwork upgrade` 链路；默认保留 `projects/`、`knowledge/`、`skills/` 等原目录名，不创建重复标准目录。

## 最小测试流程

交互式测试时，`starwork init` 会先询问工作台类型和语言；默认推荐项目工作台。项目中心会自动使用项目中心管理结构，项目工作台会默认使用通用工作能力。

### 1. 创建普通项目工作台

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

### 4. 可选：验证 Codex 多会话协作

这一步只适合正在使用 Codex，并且希望测试多个 Codex 会话协作的用户。

先初始化项目内的职责位：

```bash
starwork multiagent init \
  --lanes product-planning,development \
  --target ~/Desktop/starwork-alpha-project \
  --yes
```

为 development 职责位创建 Codex 会话并发送启动消息：

```bash
starwork multiagent launch development \
  --target ~/Desktop/starwork-alpha-project \
  --json \
  --yes
```

向 development 职责位发送一条跨会话指令：

```bash
starwork multiagent instruct development \
  --from product-planning \
  --message "请读取当前项目入口，并用一句话汇报你看到的工作台状态。" \
  --target ~/Desktop/starwork-alpha-project \
  --json \
  --yes
```

读取目标职责位最近状态：

```bash
starwork multiagent read development \
  --turns 3 \
  --target ~/Desktop/starwork-alpha-project \
  --json
```

预期：`launch` 和简单 `instruct` 应返回 `completed`。如果返回 `started_unverified`，说明 CLI 没观察到目标会话完成，应继续用 `read` 复核，不要把它当作已完成交付。

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
- `starwork multiagent launch/instruct/read` 在 Codex 中是否能完成多会话读取和指令交付；如果未完成，`started_unverified` 是否容易理解。
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
