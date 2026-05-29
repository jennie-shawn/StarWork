# StarWork

StarWork 是一套面向 AI 的工作台协议和工具集，用来帮助用户把长期工作、跨会话协作、多项目管理和 AI 工作流组织清楚。

它包含四个核心部分：

- **Core**：定义工作台应该长什么样，包括目录结构、角色边界、状态文件和健康检查规则。
- **CLI**：提供 `init`、`doctor`、`knowledge`、`spawn`、`upgrade`、`adapt`、`pack install`、`multiagent` 等命令，用来创建、检查、升级、协作和扩展工作台。
- **Packs**：场景模板包。当前 A 测阶段默认使用通用工作能力。
- **Skills**：给 Codex 等 AI 工具使用的工作流说明，让 AI 能更可靠地帮用户设计和生成 StarWork 工作台。

当前版本处于 A 测阶段，适合测试安装流程、基础命令、工作台结构和 AI skill 使用体验。

## 安装 CLI

全局安装：

```bash
npm install -g @jennie-shawn/starwork
starwork --version
starwork --help
```

不全局安装，直接运行：

```bash
npx @jennie-shawn/starwork --version
npx @jennie-shawn/starwork --help
```

## 安装 Skills

StarWork skills 分两类管理：

- 系统 Skill 通过 GitHub 仓库和 `skills` CLI 安装到 AI 工具的全局环境。
- 工作台自带 Skill 跟着工作台走，例如项目中心自带 `starworkSpawn`，项目工作台自带 `neat-freak`。

给 Codex 安装全部 StarWork 系统级 Skills：

```bash
npx skills add jennie-shawn/StarWork -g -a codex -y
```

上面这条命令只安装 StarWork 系统级 Skills。当前默认面向 Codex；如果你使用其他 AI 工具，把 `-a codex` 换成对应名称。

当前系统级 Skills：

- `starworkInit`：帮助 AI 判断是创建项目工作台还是项目中心，选择语言；用户确认创建时，会带着 `starwork init` dry-run、执行并用 `doctor` 验证。
- `starworkDoctor`：帮助 AI 基于 `starwork doctor --json` 解释目录问题、识别旧模板或类似项目中心的旧工作区；用户明确要求升级时，生成可预览、可确认的升级方案。
- `starworkMultiagent`：帮助 AI 把“登记当前会话为常用智能体”“管理多 AI 分工”“登记共享输出”等请求转换成 `starwork multiagent` 命令组合。
- `starworkKnowledge`：帮助 AI 开启和维护项目本地知识库；创建结构时先调用 `starwork knowledge`，整理内容时区分主题页和综合判断。

Kit 随附 Skills 不走全局安装命令，它们跟着具体工作台走：

- `starworkSpawn`：项目中心自带 Skill，帮助已有项目中心设计 `starwork spawn --blueprint` 工作台定制单。
- `starworkAudit`：项目中心自带 Skill，帮助项目中心解读 `starwork audit --json`，判断它管理的项目工作台健康状况，并生成保守的 `starwork repair --blueprint` 修复蓝图。
- `neat-freak`：项目工作台自带 Skill，帮助项目收尾、整理和归档。

## 让 Agent 帮你安装

如果你希望让 AI 帮你完成安装，可以把下面这段提示词发给 Codex、Claude Code 或其他能操作终端的 AI：

```text
请帮我安装并验证 StarWork。

请先阅读 StarWork 的 Agent 安装指南，再按文档执行：
https://raw.githubusercontent.com/jennie-shawn/StarWork/main/docs/agent-install-guide.md

请先只完成 CLI 和 Skills 的安装验证，不要默认创建工作区。安装完成后，先询问我是否需要继续创建或测试 StarWork 工作区；如果需要，再进入 starworkInit 流程。
```

更完整的 Agent 操作流程见 [Agent 安装指南](docs/agent-install-guide.md)。

## 快速开始

创建一个项目工作台：

```bash
starwork init \
  --type project \
  --pack general \
  --language zh \
  --name "StarWork A Test" \
  --target ~/Desktop/starwork-a-test \
  --yes
```

检查工作台：

```bash
starwork doctor --target ~/Desktop/starwork-a-test
```

可选：给项目开启知识库：

```bash
starwork knowledge init --target ~/Desktop/starwork-a-test --dry-run
starwork knowledge init --target ~/Desktop/starwork-a-test --yes
starwork knowledge status --target ~/Desktop/starwork-a-test --json
```

创建一个项目中心：

```bash
starwork init \
  --type hub \
  --language zh \
  --name "StarWork Project Center A Test" \
  --target ~/Desktop/starwork-hub-a-test \
  --yes
```

从项目中心创建一个项目工作台：

```bash
starwork spawn \
  --hub ~/Desktop/starwork-hub-a-test \
  --name "Alpha Project" \
  --target ~/Desktop/starwork-alpha-project \
  --language zh \
  --yes
```

检查生成的项目：

```bash
starwork doctor --target ~/Desktop/starwork-alpha-project
```

从项目中心巡检项目：

```bash
starwork audit --hub ~/Desktop/starwork-hub-a-test
```

## CLI 能力

```text
starwork init
starwork doctor
starwork knowledge
starwork spawn
starwork upgrade
starwork adapt
starwork pack install
starwork multiagent
```

当前能力：

- `init`：创建项目工作台或项目中心；交互默认推荐项目工作台。
- `doctor`：检查工作台是否完整、关键文件是否还在；也会为旧模板和类似项目中心的旧工作区列出目录线索，交给 `starworkDoctor` 判断。
- `knowledge`：开启、检查和按确认方案整理项目本地知识库；默认不会移动旧 `知识/` 或 `knowledge/`。
- `spawn`：从已有项目中心创建并登记项目工作台，支持中文或英文目录镜像。
- `upgrade`：按 `starworkDoctor` skill 生成的升级蓝图，把历史模板或类似项目中心的旧工作区安全接入 StarWork 工作台。
- `adapt`：生成 Claude Code、Cursor 等 AI 工具的适配文件。
- `pack install`：向兼容工作台安装支持的场景能力。
- `multiagent`：为同一项目建立自定义 AI 职责位、绑定会话，并登记跨 lane 共享输出。

## 仓库结构

```text
.
├── core/       # StarWork Core 协议、Kit、Profile、Preset
├── cli/        # CLI 实现和命令规格
├── packs/      # 场景 Pack
├── skills/     # 系统级 AI skills
├── kit-skills/ # Kit 自带 AI skills
├── schemas/    # 结构化 schema
├── adapters/   # AI 工具适配规则
├── examples/   # 示例
└── docs/       # 产品文档和 A 测指南
```

## A 测反馈重点

请优先反馈：

- CLI 是否能顺利安装和运行。
- `init` 创建的工作台结构是否容易理解。
- `doctor` 的检查结果是否能指导修复问题。
- 项目中心创建和管理项目工作台的流程是否自然。
- 系统 Skill 是否能被 AI 正确识别和调用。
- 项目中心自带的 `starworkSpawn`、项目工作台自带的 `neat-freak` 是否能在对应工作台内被正确发现。

更完整的测试脚本见 [A 测安装指南](docs/alpha-test-guide.md)。

## 开发

运行测试：

```bash
npm test
```

预览 npm 包内容：

```bash
npm pack --dry-run
```
