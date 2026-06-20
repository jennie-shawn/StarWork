# StarWork Agent 安装指南

本文件面向正在帮助用户安装 StarWork 的 AI Agent。

你的任务只有一个：把 StarWork CLI、`starwork` 主入口和 StarWork 专家 Skills 安装好，并确认它们可用。不要在安装阶段创建工作区，不要替用户初始化项目，也不要做额外测试目录。

## 你需要完成什么

1. 确认用户机器可以运行 Node.js 和 npm。
2. 安装或更新 StarWork CLI。
3. 安装或更新 StarWork 系统 Skills。
4. 验证 CLI 和 Skills 已经可用。
5. 向用户汇报安装结果。

## 不要做什么

- 不要默认执行 `starwork init`。
- 不要默认创建测试工作区。
- 不要改动用户项目文件。
- 不要逐个安装单个 Skill。
- 不要把项目中心或项目内附带的 Skills 当成全局 Skills 安装。

安装任务到这里结束。后续创建或接入项目不属于本指南。

## Step 1：检查基础环境

运行：

```bash
node --version
npm --version
```

如果 Node.js 或 npm 不可用，停止安装，并告诉用户需要先安装 Node.js。

## Step 2：安装或更新 CLI

运行：

```bash
npm install -g @jennie-shawn/starwork@latest
```

验证：

```bash
starwork --version
starwork --help
```

如果用户不想全局安装 CLI，可以只验证临时运行方式：

```bash
npx @jennie-shawn/starwork@latest --version
npx @jennie-shawn/starwork@latest --help
```

## Step 3：安装或更新 Skills

给 Codex 安装 StarWork stable 系统 Skills：

```bash
npx skills add https://github.com/jennie-shawn/StarWork/tree/main/skills --full-depth -g -a codex -y
```

如果用户使用的不是 Codex，把 `-a codex` 换成对应 Agent 名称。

请保留 `--full-depth`：`starworkMultiagent` 需要随主 `SKILL.md` 一起安装 `references/` 目录。缺少 references 时，它会停止创建团队、跨会话投递、绑定等高风险动作，并提示安装不完整。

这条命令安装普通 stable / latest Skill 目录。Workflow next 内测用户需要另按内测说明安装 `skills-next/`，不要把无目录说明的 GitHub 仓库命令当作 workflow next 来源。

验证本机已安装的全局 Skills：

```bash
npx skills ls -g -a codex --json
```

确认能看到 StarWork 主入口和专家 Skills：

- `starwork`
- `starworkInit`
- `starworkDoctor`
- `starworkKnowledge`
- `starworkMultiagent`

## 完成后怎么汇报

安装完成后，用用户容易理解的话简短汇报：

```text
StarWork 已经装好了。

我已经确认两件事：
1. StarWork 命令可以正常运行。
2. 当前 AI 工具已经安装好 StarWork 主入口和专家 Skills。

现在你可以直接说“帮我用 StarWork”，AI 会从主入口判断下一步。
```

如果安装失败，不要把完整报错直接甩给用户。先用一句话说明卡在哪里，再给一个明确的下一步建议：

```text
这次还没有安装成功，卡在 Node.js / npm 环境检查。

你需要先安装 Node.js，然后我再继续帮你安装 StarWork。
```

只在用户需要排查时，再补充关键错误信息。不要自动改动用户项目。

## 常见问题

### 已经存在 `starwork` 命令

如果安装时报：

```text
EEXIST: file already exists ... starwork
```

先检查现有命令来源：

```bash
which starwork
ls -l "$(which starwork)"
npm ls -g --depth=0 | grep starwork
```

确认后再向用户说明是否需要卸载旧版本或重新安装。

### 只需要更新 Skills

重新运行：

```bash
npx skills add https://github.com/jennie-shawn/StarWork/tree/main/skills --full-depth -g -a codex -y
```
