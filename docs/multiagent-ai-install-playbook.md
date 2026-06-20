# StarWork MultiAgent AI 安装执行说明

本文件只给 AI 助手读取，用来帮助用户安装 StarWork MultiAgent。

请用非常友好的方式和用户沟通。用户不需要理解命令、目录、运行环境这些细节；你负责检查、解释、执行和汇报。除非用户主动追问，不要把内部术语一股脑抛给用户。

## 你的目标

帮用户完成三件事：

1. 确认这台电脑能运行 StarWork。
2. 安装 StarWork MultiAgent 需要的命令工具。
3. 给用户当前使用的 AI 软件安装 MultiAgent 相关能力。

安装完成后，不要自动初始化项目，不要创建测试工作台，不要改动用户项目文件。

## 先对用户这样说

开始前，先用类似下面的话说明你要做什么：

```text
我会先帮你检查电脑上是否具备运行 StarWork 的基础环境，然后安装 MultiAgent 需要的工具和 AI 能力。

安装阶段不会改你的项目文件，也不会创建新的工作台。
如果需要安装电脑上的基础软件，或者要做会影响全局环境的操作，我会先告诉你并等你确认。
```

## 第一步：确认用户正在用哪个 AI 软件

不同 AI 软件的能力目录不同，不要手动猜目录，也不要直接复制文件到你以为正确的位置。优先使用 `skills` 安装工具，让它把能力安装到对应的软件目录。

先判断当前环境：

- 如果你明确知道当前是 Codex，默认使用 `codex`。
- 如果你明确知道当前是 Claude Code、Cursor、Trae 或其他工具，先向用户确认工具名称。
- 如果你无法判断，就问用户一句：

```text
你现在希望把 MultiAgent 安装到哪个 AI 工具里？比如 Codex、Claude Code、Cursor 或 Trae。
```

如果用户不知道，就建议先按 Codex 路径安装；后续换工具时再补装对应工具。

不要直接暴露“宿主软件”“Skill 目录”“agent 参数”这些词。可以说“安装到你正在使用的 AI 工具里”。

## 第二步：检查基础环境

运行：

```bash
node --version
npm --version
```

如果两个命令都有版本号，告诉用户：

```text
你的电脑已经具备运行 StarWork 的基础环境，我继续安装 MultiAgent。
```

如果其中一个命令不可用，停止安装。不要擅自安装系统软件。对用户说：

```text
这台电脑还缺少运行 StarWork 需要的基础环境：Node.js。

你需要先安装 Node.js LTS 版本。安装好以后重新打开终端，我再继续帮你安装 MultiAgent。
```

可以给用户温和建议：

- macOS：从 https://nodejs.org 下载 LTS 安装包；如果用户已经熟悉 Homebrew，也可以用 `brew install node`。
- Windows：从 https://nodejs.org 下载 LTS 安装包；如果用户已经熟悉 winget，也可以用 `winget install OpenJS.NodeJS.LTS`。
- Linux：使用系统包管理器或 Node.js 官方 LTS 安装方式。

不要替用户直接安装 Node.js，除非用户明确授权。

## 第三步：安装 StarWork 命令工具

先说明：

```text
接下来我会安装 StarWork 的命令工具。这个工具负责在项目里创建和检查 MultiAgent 需要的协作记录。
```

运行：

```bash
npm install -g @jennie-shawn/starwork@latest
```

验证：

```bash
starwork --version
starwork multiagent --help
```

如果全局安装失败，但用户不想处理全局安装问题，可以先验证临时运行方式：

```bash
npx @jennie-shawn/starwork@latest --version
npx @jennie-shawn/starwork@latest multiagent --help
```

友好解释：

```text
全局安装是为了以后可以直接输入 starwork。
如果这一步因为电脑权限失败，我们也可以先用临时运行方式继续验证，不会影响你的项目文件。
```

## 第四步：查看可安装能力

运行：

```bash
npx skills add https://github.com/jennie-shawn/StarWork/tree/main/skills -l --full-depth
```

确认列表里能看到：

- `starwork`
- `starworkInit`
- `starworkDoctor`
- `starworkMultiagent`

如果还看到 `starworkKnowledge`，这是正常的；但本次默认不安装知识库能力。

## 第五步：安装最小能力组合

默认安装四项：

- `starwork`：让 AI 知道 StarWork 是什么，并能把用户请求引导到正确能力。
- `starworkInit`：当用户当前项目还没准备好时，安全引导接入。
- `starworkDoctor`：检查当前项目是否已经适合开启 MultiAgent，帮助 AI 在写入前先做安全判断。
- `starworkMultiagent`：本次要发布的 MultiAgent 核心能力。

如果当前目标 AI 工具是 Codex，运行：

```bash
npx skills add https://github.com/jennie-shawn/StarWork/tree/main/skills --skill starwork -g -a codex -y
npx skills add https://github.com/jennie-shawn/StarWork/tree/main/skills --skill starworkInit -g -a codex -y
npx skills add https://github.com/jennie-shawn/StarWork/tree/main/skills --skill starworkDoctor -g -a codex -y
npx skills add https://github.com/jennie-shawn/StarWork/tree/main/skills --skill starworkMultiagent -g -a codex -y
```

如果目标不是 Codex：

1. 不要手动猜目录。
2. 先确认 `skills` 工具支持的目标名称。
3. 把命令里的 `codex` 换成用户确认的目标 AI 工具名称。
4. 如果无法确认，停止并告诉用户需要确认安装目标。

不要默认安装：

- `starworkKnowledge`
- `starworkSpawn`
- `starworkAudit`
- `neat-freak`
- `starworkKnowledgeProject`

如果选择性安装失败，再运行：

```bash
npx skills add https://github.com/jennie-shawn/StarWork/tree/main/skills -l --full-depth
```

确认名称是否写错。如果当前 `skills` 工具不支持单独安装，才向用户解释 fallback：

```text
当前安装工具可能不支持只安装单个能力。可以退一步安装 StarWork 的全局基础能力包，它会多安装知识库入口，但不会初始化项目，也不会改动你的项目文件。你要继续吗？
```

用户确认后再运行：

```bash
npx skills add https://github.com/jennie-shawn/StarWork/tree/main/skills --full-depth -g -a codex -y
```

## 第六步：验证安装

验证命令工具：

```bash
starwork --version
starwork multiagent --help
```

验证 AI 能力：

```bash
npx skills ls -g -a codex --json
```

确认至少能看到：

- `starwork`
- `starworkInit`
- `starworkDoctor`
- `starworkMultiagent`

如果安装目标不是 Codex，把 `codex` 替换成实际目标名称。

如果安装成功但当前 AI 会话仍然不认识 MultiAgent，告诉用户：

```text
安装已经完成了。有些 AI 工具需要新开一个会话才会重新读取新能力。
请你新开一个 AI 会话，然后把我接下来给你的提示词发过去。
```

## 完成后的汇报方式

用简短、安心的方式汇报：

```text
StarWork MultiAgent 已安装完成。

我已经确认：
1. StarWork 命令可以运行。
2. MultiAgent 需要的 AI 能力已经安装到你的 AI 工具里。
3. 安装阶段没有初始化项目，也没有改动你的项目文件。

下一步你可以新开一个 AI 会话，让它帮你检查当前项目是否适合开启多 Agent 分工。
```

然后给用户下一步提示词：

```text
请使用 StarWork MultiAgent 帮我看看当前项目是否适合开启多 AI 分工。

请先只做检查和方案设计，不要直接写入。
如果当前目录还没有准备好，请先引导我完成安全接入。
如果已经准备好，请帮我设计 3 到 5 个适合这个项目的 AI 岗位，并说明每个岗位负责什么、可以整理哪些文件、需要如何交接。
所有写入动作都请先预览，等我确认后再执行。
```

## 常见问题处理

### `node` 或 `npm` 不存在

说明电脑还没安装 Node.js。停止安装，指导用户先安装 Node.js LTS。

### `npm install -g` 权限失败

不要让用户盲目使用危险命令。先建议使用 Node.js 官方安装包重新安装，或使用临时运行方式 `npx @jennie-shawn/starwork@latest --version` 验证。

### `starwork` 命令找不到

可能是全局命令目录没有进入系统路径。先试：

```bash
npx @jennie-shawn/starwork@latest --version
```

如果临时运行可用，说明包本身可用，只是全局命令路径需要用户电脑环境修复。

### AI 安装后仍不认识 MultiAgent

请用户新开 AI 会话。很多工具只在新会话启动时读取新安装的能力。

### 用户问“会不会改我的项目”

回答：

```text
安装阶段不会改项目文件。真正给项目开启 MultiAgent 前，我会先检查并展示准备写入的内容，等你确认后才执行。
```

## 禁止事项

- 不要在安装阶段运行 `starwork init --yes`。
- 不要在安装阶段运行 `starwork multiagent init --yes`。
- 不要创建测试项目。
- 不要修改用户项目文件。
- 不要静默安装 Node.js。
- 不要手动猜测并写入某个 AI 工具的能力目录。
- 不要向用户展示大量内部命令输出；只汇报关键结果和下一步。
