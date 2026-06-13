# StarWork MultiAgent 安装说明

本说明用于单独安装 StarWork MultiAgent 能力。

这里的目标不是安装 StarWork 全套场景能力，而是让用户的 AI 工具能使用 `starworkMultiagent` Skill，并具备运行 MultiAgent 所需的 StarWork CLI 和最小配套 Skill。

截至 2026-06-13，npm `latest` 已验证为 `@jennie-shawn/starwork@0.1.0-alpha.21`。实际安装时优先使用 `@latest`，避免文档中的版本号过期。

## 安装后用户能做什么

安装完成后，用户可以让 AI 帮自己：

- 在一个 StarWork 工作台里创建 Agent Lanes。
- 给不同 AI 会话分配职责位，例如 `research`、`writing`、`review`、`development`。
- 记录每个 Agent 的职责、可写范围、工作记录和共享输出。
- 在支持的宿主中创建、命名、读取或投递 Codex 多会话任务。
- 在不支持自动投递的宿主中生成可复制的人工 handoff 消息。

一句话：MultiAgent 不是自动调度黑盒，而是给多个 AI 会话建立职责、边界、记录和交接。

## 最小安装清单

必须安装：

- StarWork CLI：提供 `starwork multiagent`、`starwork doctor`、`starwork init` 等命令。
- `starworkMultiagent` Skill：多 Agent / Agent Lanes 的主 Skill。
- `starworkDoctor` Skill：安装后先帮助 AI 判断当前项目是否适合接入或开启 MultiAgent，避免在错误目录里直接写入。

建议一起安装：

- `starwork` Skill：StarWork 主入口，用户说不清楚该用哪个能力时负责路由。
- `starworkInit` Skill：当用户当前目录还不是 StarWork 工作台时，负责安全初始化或接入。

本指南不默认安装：

- `starworkKnowledge`：知识库能力，不属于 MultiAgent 最小安装范围。
- `starworkSpawn`、`starworkAudit`、`neat-freak`：这些是 Kit 自带 Skill，不作为全局系统 Skill 安装。
- `starworkKnowledgeProject`：项目开启知识库能力后才写入当前项目，不参与全局安装。

## 给普通用户的安装步骤

### 1. 检查 Node.js 和 npm

StarWork CLI 通过 npm 分发。先运行：

```bash
node --version
npm --version
```

如果两个命令都能输出版本号，继续下一步。

如果提示找不到 `node` 或 `npm`，需要先安装 Node.js LTS：

- macOS：可从 https://nodejs.org 下载 LTS 安装包；如果已经有 Homebrew，也可以运行 `brew install node`。
- Windows：可从 https://nodejs.org 下载 LTS 安装包；如果已经有 winget，也可以运行 `winget install OpenJS.NodeJS.LTS`。
- Linux：优先使用系统包管理器或 Node.js 官方 LTS 安装方式。安装完成后重新打开终端，再检查 `node --version` 和 `npm --version`。

### 2. 安装 StarWork CLI

推荐全局安装：

```bash
npm install -g @jennie-shawn/starwork@latest
starwork --version
starwork multiagent --help
```

如果用户不想全局安装，也可以只用 `npx` 临时运行：

```bash
npx @jennie-shawn/starwork@latest --version
npx @jennie-shawn/starwork@latest multiagent --help
```

### 3. 查看可安装的 StarWork Skills

先查看仓库里有哪些系统 Skill：

```bash
npx skills add jennie-shawn/StarWork -l
```

预期能看到：

- `starwork`
- `starworkInit`
- `starworkDoctor`
- `starworkKnowledge`
- `starworkMultiagent`

### 4. 安装 MultiAgent 最小 Skill 组合

当前默认面向 Codex：

```bash
npx skills add jennie-shawn/StarWork --skill starwork -g -a codex -y
npx skills add jennie-shawn/StarWork --skill starworkInit -g -a codex -y
npx skills add jennie-shawn/StarWork --skill starworkDoctor -g -a codex -y
npx skills add jennie-shawn/StarWork --skill starworkMultiagent -g -a codex -y
```

如果用户使用的不是 Codex，需要把 `-a codex` 替换成 `skills` 工具支持的目标 Agent 名称。无法确认目标名称时，先不要猜；让用户确认正在使用的 AI 工具，或改用默认 Codex 安装路径。

### 5. 验证安装

验证 CLI：

```bash
starwork --version
starwork multiagent --help
```

验证 Skill：

```bash
npx skills ls -g -a codex --json
```

在输出里确认至少能看到：

- `starwork`
- `starworkInit`
- `starworkDoctor`
- `starworkMultiagent`

有些 AI 工具需要重启会话后才会重新加载全局 Skill。安装成功但 AI 仍然“不知道” `starworkMultiagent` 时，先新开一个 AI 会话再试。

## 复制给 AI 的安装提示词

用户可以把下面整段发给自己的 AI：

```text
请帮我安装 StarWork MultiAgent 能力。

目标只限于安装 MultiAgent 所需组件，不要初始化项目，不要创建测试工作台，不要改动我的项目文件。

请按下面顺序执行：

1. 检查本机是否有 Node.js 和 npm：
   - node --version
   - npm --version

2. 如果没有 Node.js 或 npm，请停止安装，告诉我需要先安装 Node.js LTS。
   - macOS 可建议从 https://nodejs.org 下载 LTS，或在已有 Homebrew 时用 brew install node。
   - Windows 可建议从 https://nodejs.org 下载 LTS，或在已有 winget 时用 winget install OpenJS.NodeJS.LTS。
   - 不要擅自安装系统级软件，除非我明确确认。

3. 安装或更新 StarWork CLI：
   - npm install -g @jennie-shawn/starwork@latest
   - starwork --version
   - starwork multiagent --help

4. 查看 StarWork 仓库可安装的 Skills：
   - npx skills add jennie-shawn/StarWork -l

5. 只安装 MultiAgent 所需的最小 Skill 组合，默认面向 Codex：
   - npx skills add jennie-shawn/StarWork --skill starwork -g -a codex -y
   - npx skills add jennie-shawn/StarWork --skill starworkInit -g -a codex -y
   - npx skills add jennie-shawn/StarWork --skill starworkDoctor -g -a codex -y
   - npx skills add jennie-shawn/StarWork --skill starworkMultiagent -g -a codex -y

6. 不要默认安装 starworkKnowledge。
   不要默认安装 starworkSpawn、starworkAudit、neat-freak 或 starworkKnowledgeProject。

7. 验证安装结果：
   - npx skills ls -g -a codex --json
   - 确认输出里至少有 starwork、starworkInit、starworkDoctor、starworkMultiagent。

8. 完成后只汇报：
   - Node.js / npm 是否可用。
   - StarWork CLI 版本。
   - MultiAgent 所需 Skill 是否已安装。
   - 是否需要我重启 AI 会话来加载新 Skill。

如果任何命令失败，请先用一句话说明失败点，再给我下一步建议。不要自动初始化 StarWork 工作台。
```

## 给 AI 的安装边界

AI 在执行这份安装说明时，必须遵守：

- 安装阶段只安装 CLI 和 Skill。
- 不运行 `starwork init --yes`。
- 不运行 `starwork multiagent init --yes`。
- 不创建测试目录。
- 不改动用户项目文件。
- 写入前需要用户确认，尤其是安装 Node.js、全局 npm 包或修改系统 PATH。

可以运行的只读或低风险验证命令：

```bash
node --version
npm --version
npm view @jennie-shawn/starwork version
starwork --version
starwork --help
starwork multiagent --help
npx @jennie-shawn/starwork@latest --version
npx @jennie-shawn/starwork@latest multiagent --help
npx skills add jennie-shawn/StarWork -l
npx skills ls -g -a codex --json
```

安装命令需要用户确认或已明确授权：

```bash
npm install -g @jennie-shawn/starwork@latest
npx skills add jennie-shawn/StarWork --skill starwork -g -a codex -y
npx skills add jennie-shawn/StarWork --skill starworkInit -g -a codex -y
npx skills add jennie-shawn/StarWork --skill starworkDoctor -g -a codex -y
npx skills add jennie-shawn/StarWork --skill starworkMultiagent -g -a codex -y
```

## 如果选择性安装失败

如果 `npx skills add ... --skill <name>` 失败，先检查：

```bash
npx skills add jennie-shawn/StarWork -l
```

确认 Skill 名称是否存在。

如果 `skills` 工具暂时不支持选择性安装，退而求其次可以安装 StarWork 全局系统 Skills：

```bash
npx skills add jennie-shawn/StarWork -g -a codex -y
```

这个命令会安装：

- `starwork`
- `starworkInit`
- `starworkDoctor`
- `starworkKnowledge`
- `starworkMultiagent`

这不是本指南的最小路径，但不会初始化项目，也不会写入用户项目文件。执行前需要向用户说明：它会多安装 `starworkKnowledge` 这个全局系统 Skill。

## 需要询问 development Agent 的情况

如果安装者在以下问题上无法从当前公开 README、npm 或 `skills add -l` 得到确认，可以询问 StarWork development Agent：

- 当前 `skills add` 是否仍支持 `--skill <name>` 单独安装。
- 非 Codex 宿主的 `-a` 参数应该填写什么。
- 当前 MultiAgent 最小安装清单是否发生变化。
- 当前 npm `latest` 是否已经发布但文档还没同步。

可复制的询问模板：

```text
请确认 StarWork MultiAgent 当前最小安装口径：

1. npm 包名是否仍为 @jennie-shawn/starwork，CLI 命令是否仍为 starwork？
2. `npx skills add jennie-shawn/StarWork --skill starworkMultiagent -g -a codex -y` 是否仍是单独安装 MultiAgent Skill 的正确命令？
3. MultiAgent 最小安装是否仍建议包含 starwork、starworkInit、starworkMultiagent？
4. starworkDoctor 是否仍是 MultiAgent 最小安装的必装项？
5. starworkKnowledge 是否仍不属于 MultiAgent 最小安装范围？
```

## 安装完成后的下一步

安装完成后，用户可以新开一个 AI 会话，然后说：

```text
请使用 starworkMultiagent 帮我检查当前项目是否适合开启 MultiAgent。

先只做检查和方案设计：
- 不要直接写入。
- 如果当前目录不是 StarWork 工作台，请先切到 starworkInit 流程。
- 如果是 StarWork 工作台，请帮我设计 3 到 5 个 lane，包括职责和可写范围。
- 所有写入命令都先 dry-run，等我确认后再执行。
```

这一步才进入项目接入或 MultiAgent 配置，不属于安装阶段。
