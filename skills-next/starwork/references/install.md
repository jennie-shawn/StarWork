# StarWork 安装引导

本文件供 `starwork` 主 Skill 在“安装 StarWork / 让 AI 会用 StarWork”场景引用。

## 安装目标

安装阶段只完成三件事：

1. 确认 Node.js 和 npm 可用。
2. 安装或更新 StarWork CLI。
3. 安装或更新 StarWork 主入口和 L1 专家 Skills。

不要在安装阶段初始化工作台、创建测试目录或改动用户项目文件。

## 命令

检查环境：

```bash
node --version
npm --version
```

安装 next CLI：

```bash
npm install -g @jennie-shawn/starwork@next
starwork --version
starwork --help
```

安装 Skills：

```bash
npx skills add https://github.com/jennie-shawn/StarWork/tree/main/product/skills-next --full-depth -g -a codex -y
```

验证：

```bash
npx skills ls -g -a codex --json
```

应能看到这些全局系统 Skills：

- `starwork`
- `starworkInit`
- `starworkDoctor`
- `starworkKnowledge`
- `starworkMultiagent`

项目中心 Kit、项目工作台 Kit 和 Capability 会在对应工作台或能力开启后写入自己的 Skill，不属于这里的全局清单。

## 汇报话术

```text
StarWork 已经装好了。

我已经确认两件事：
1. StarWork 命令可以正常运行。
2. 当前 AI 工具已经安装好 StarWork 主入口和专家 Skills。

现在你可以直接对我说“帮我用 StarWork”，我会从主入口判断下一步。
```
