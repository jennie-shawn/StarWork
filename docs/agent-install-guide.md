# StarWork Agent 安装执行指南

本文件面向正在帮助用户安装 StarWork 的 AI Agent。

你的任务是帮助用户完成 StarWork CLI 和 StarWork Skills 的安装、更新与基础验证。不要默认创建工作区；只有用户明确表示需要初始化或测试工作区时，才进入 `starworkInit` 流程。

## 执行目标

1. 检查用户环境是否可以安装 StarWork。
2. 安装或更新 StarWork CLI：`@jennie-shawn/starwork`。
3. 安装或更新 StarWork Skills。
4. 验证 CLI 和 Skills 是否可用。
5. 询问用户是否需要继续创建或测试 StarWork 工作区。

## 安全边界

- 不要覆盖用户已有项目文件。
- 不要在真实项目目录里做试验。
- 不要默认创建 `/tmp` 测试工作区。
- 不要默认执行 `starwork init`。
- 如果发现已有 `starwork` 命令，先判断来源，再决定是否升级。
- 如果用户需要创建工作区，必须转入 `starworkInit` skill 的采访流程。

## Step 1：检查环境

先运行：

```bash
node --version
npm --version
```

如果 Node.js 或 npm 不可用，停止安装，并告诉用户需要先安装 Node.js。

## Step 2：检查现有 CLI

运行：

```bash
which starwork
starwork --version
starwork --help
```

如果 `starwork` 不存在，可以继续安装。

如果 `starwork` 已存在，继续检查它是否来自 npm 包 `@jennie-shawn/starwork`：

```bash
npm ls -g --depth=0 | grep starwork
```

如果它不是 `@jennie-shawn/starwork`，先向用户说明冲突来源，不要直接覆盖。

## Step 3：安装或更新 CLI

安装或更新：

```bash
npm install -g @jennie-shawn/starwork@latest
```

验证：

```bash
starwork --version
starwork --help
npx @jennie-shawn/starwork@latest --version
```

## Step 4：安装或更新 Skills

给 Codex 安装 StarWork Skills：

```bash
npx skills add jennie-shawn/StarWork -g -a codex -y
```

如果用户使用的不是 Codex，把 `-a codex` 换成对应 Agent 名称。不要逐个安装单个 Skill。

验证：

```bash
npx skills add jennie-shawn/StarWork -l
npx skills ls -g -a codex --json
```

第一条命令用于查看仓库里会被安装的 Skills，应该只显示这 3 个系统级 Skills：

- `starworkInit`
- `starworkDoctor`
- `starworkMultiagent`

第二条命令用于查看本机已安装的全局 Skills，确认上面 3 个已经出现在 Codex 的全局列表里。

确认不应该把 Kit 随附 Skills 安装到全局，例如 `starworkSpawn`、`starworkAudit` 和 `neat-freak`。它们应由 `starwork init` 按工作区类型写入具体工作台。

## Step 5：询问是否继续初始化

安装和验证完成后，先向用户汇报结果，然后询问：

```text
StarWork CLI 和 Skills 已安装完成。你是否需要我继续帮你创建或测试一个 StarWork 工作区？
```

如果用户回答“不需要”，停止。

如果用户回答“需要”，进入 `starworkInit` skill 流程，由 `starworkInit` 采访用户并决定：

- 创建项目工作台，还是项目中心。
- 使用中文还是英文。
- 使用哪个目标路径。
- 是否只是 dry-run 预览。
- 如果需要定制目录，先生成 init blueprint，再运行 `starwork init --blueprint --dry-run`，确认后执行 `--yes` 并运行 `starwork doctor`。

不要绕过 `starworkInit` 直接硬编码执行 `starwork init`。

## 完成汇报

安装阶段完成后，向用户汇报：

- StarWork CLI 版本。
- `starwork --help` 是否可用。
- Skills 安装结果。
- 是否发现旧版本或命令冲突。
- 是否已经询问用户继续初始化工作区。

如果有失败，贴出关键错误信息和建议处理方式。

## 常见情况

### 已经存在 `starwork` 命令

如果安装时报：

```text
EEXIST: file already exists ... starwork
```

说明机器上已经有一个 `starwork` 命令。先检查：

```bash
which starwork
ls -l "$(which starwork)"
npm ls -g --depth=0 | grep starwork
```

确认后再决定是否卸载旧版本或覆盖安装。

### 只想临时测试 CLI

如果用户不想全局安装 CLI，可以运行：

```bash
npx @jennie-shawn/starwork@latest --help
```

### 更新 StarWork Skills

重新运行：

```bash
npx skills add jennie-shawn/StarWork -g -a codex -y
```
