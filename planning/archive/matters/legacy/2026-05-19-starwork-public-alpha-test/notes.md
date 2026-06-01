# Notes

## 当前安装口径

CLI：

```bash
npm install -g @jennie-shawn/starwork
starwork --help
```

不全局安装：

```bash
npx @jennie-shawn/starwork --help
```

Skills：

```bash
npx skills add jennie-shawn/starwork --skill starworkInit -g -a codex -y
npx skills add jennie-shawn/starwork --skill starworkDoctor -g -a codex -y
npx skills add jennie-shawn/starwork --skill starworkMultiagent -g -a codex -y
```

## 已知事实

- 当前 npm `latest` 已发布到 `@jennie-shawn/starwork@0.1.0-alpha.9`，版本包含 `starworkDoctor` 人话诊断、Hub-like 主库识别，以及旧主库通过 `hub + preserve-names + pack:null` 无损接入的升级路径；`starwork upgrade` 继续作为 blueprint 执行器。
- 系统 Skill 当前为 `starworkInit`、`starworkDoctor`、`starworkMultiagent`；`starworkDoctor` 同时承担历史模板诊断和升级蓝图生成；`starworkSpawn` 是 Hub Kit 自带 Skill，`neat-freak` 是单项目 Kit 自带 Skill。
- 用户本机 `/opt/homebrew/bin/starwork` 曾存在旧的本地开发 link；2026-05-22 已切换为 npm 全局包安装，`starwork --version` 输出 `0.1.0-alpha.9`。

## A 测观察点

- 用户能否理解 CLI 与 Skill 是两步安装。
- `starworkInit` 是否能正确先判断工作区类型，再询问语言、事项模式和定制需求。
- 当前 A 测不应引导用户选择未定稿的场景 Pack。

## 2026-05-25 无 CLI 学员 zip 分发研究

问题：如果学员暂时不用 npm / npx / StarWork CLI，是否可以基于已有 Kit 打一个 zip release 包分发？

结论：

- 可以做，但 zip 不能直接打 `product/core/kits/<kit>` 裸目录。
- 应打包 CLI 组装后的最终工作台，也就是 `Kit + Pack + .starwork/workspace.json + .starwork/skills.json + Kit 自带 Skill + Pack 规则注入`。
- 已用本地 CLI 验证两个 zip 样本：
  - `project + general + zh`：解压后 `starwork doctor` 通过，zip 约 18 KB。
  - `hub + hub-management + zh`：解压后 `starwork doctor` 通过，zip 约 19 KB。
- zip 作为“无 CLI 入门包”适合降低 A 测摩擦，但不能替代 CLI：它只能分发一个静态起点，不能完成后续 `doctor`、`spawn`、`upgrade`、`pack install`、`multiagent` 等演进动作。

建议分发包：

1. 先只发 `starwork-project-zh-general.zip`，面向绝大多数没 CLI 的学员。
2. 另发 `starwork-hub-zh.zip` 作为进阶包，只给明确需要多项目中枢的用户。
3. 暂不分发 matter 相关 Kit；当前产品事实源已有 Two-Kit 收敛草案，matter 应作为 legacy / future capability，不作为 A 测入口。

需要补齐：

- 给 zip 内增加一个用户可见 `开始使用.md` 或强化 README，说明“解压、改名、放资料、把 AGENTS.md 发给 Agent”。
- 清理 Hub Kit 文档口径：部分 README / AGENTS 仍提到 `.starwork/projects/registry.json`，但当前实际模板和 CLI 使用 `projects/registry.json`。
- 做一个 release 生成脚本或 npm script，调用本地 CLI 生成临时工作台后再 zip，避免人工漏掉隐藏目录和 `.starwork` 状态文件。

## 2026-05-25 Codex 子 Agent 功能研究

来源：

- OpenAI Developers: https://developers.openai.com/codex/subagents
- OpenAI Developers concepts: https://developers.openai.com/codex/concepts/subagents
- 本机 Codex CLI：`codex-cli 0.128.0`

核心事实：

- Codex 当前版本已默认启用 subagent workflows。
- Codex 只会在用户明确要求“spawn / delegate / parallel agents / one agent per point”等情况下创建子 Agent。
- 典型用途是把代码探索、测试、日志分析、审阅、摘要等噪声较大的并行工作放到子线程，主线程只接收归纳结果。
- 每个子 Agent 有自己的上下文、模型与工具调用成本，所以 token 和时间成本会高于单 Agent。
- Codex 内置 `default`、`worker`、`explorer` 三类 agent；也支持在 `~/.codex/agents/` 或项目 `.codex/agents/` 下用 TOML 定义自定义 agent。
- 子 Agent 继承父会话 sandbox / approval 策略；自定义 agent 可设置只读 sandbox、模型、reasoning effort、MCP server 和 developer instructions。
- 官方示例强调 read-heavy / review-heavy 的并行场景；并提醒 write-heavy 并行工作更容易产生冲突和协调成本。

对 StarWork 的判断：

- Codex 子 Agent 是 Agent runtime 的临时并行执行能力；StarWork Agent Lanes 是工作区协议层的长期职责位和协作事实源。二者不是替代关系。
- StarWork 不应尝试重新实现子 Agent 调度，也不应把 Codex 子 Agent 当成 Core 必需能力；Core 仍应保持跨 Agent runtime。
- StarWork 应把子 Agent 视为 Codex adapter 的增强入口：当用户明确要求 Codex 并行研究、审阅或批量检查时，StarWork 可以给出更稳的分工提示、写入边界和结果落点。
- `agent-lanes` 需要补一个“runtime delegation”边界说明：lane 是长期职责，subagent 是某个 session 内的临时 delegate。临时 delegate 不一定登记为 lane，除非它需要长期接手职责或跨会话延续。
- `starworkMultiagent` 后续可增加 Codex 专用提示模板：要求父 Agent 按 lane/write_scope 拆分子 Agent，只读子 Agent 默认不写文件，写入型子 Agent 必须拥有不重叠路径并回报变更清单。
- 值得新增 `.codex/agents/` 适配支持，但应放在 adapter/pack 可选层：例如 `starwork adapt codex --subagents` 或某个 Pack 自带 `reviewer`、`researcher`、`docs_researcher` TOML 模板。

建议优先级：

1. 短期：更新 `starworkMultiagent` 文档口径，把 Codex 子 Agent 定义为 lane 内的临时 delegation，不写入 Matter registry。
2. 中期：在 `product/adapters/codex/` 增加 Codex subagents adapter 说明和 `.codex/agents/*.toml` 模板。
3. 后期：考虑 `starwork multiagent suggest-subagents` 或 Pack 级“并行审阅/批量巡检”模板，但不要进入 v0.1 Core 必需项。
