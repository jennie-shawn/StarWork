---
name: starworkDoctor
description: 'Diagnose StarWork workspaces, legacy templates, and project-center-like repos from `starwork doctor --json`; explain issues and draft safe upgrade plans.'
---

# starworkDoctor

使用这个 skill，把 `starwork doctor --json` 暴露的探测结果整理成清晰诊断；当用户明确要升级时，也由本 skill 继续采访用户并生成 `upgrade-blueprint.json`。

`starworkDoctor` 不是 `starwork doctor` 命令本身，也不是 `starwork upgrade` 执行器。CLI 负责探测目录、列事实、输出 JSON、校验和执行用户确认过的 blueprint；Skill 负责解释、判断 Core 贴近度、追问、建议整理路径、生成 upgrade blueprint。

## 主入口边界

如果用户只是询问产品总览、起步路径、安装入口或该用哪个 StarWork 能力，回到 `starwork` 主入口。`starworkDoctor` 只处理诊断、doctor 结果解释、旧目录整理和升级方案设计。

历史上独立的 `starworkUpgrade` 系统 Skill 已取消；旧模板升级、旧宿主规则提炼和 upgrade blueprint 设计都由 `starworkDoctor` 承接。不要重新引导用户安装或调用独立 `starworkUpgrade` Skill。

除非用户明确要求生成升级蓝图，否则这个 skill 只做诊断和建议，不生成 blueprint；除非用户明确要求执行命令，否则不直接修改用户工作区。

## Reference 加载规则

命中具体场景前，先读取对应 reference。reference 文件不存在或无法读取时，高风险动作必须停止，提示用户“Skill 安装不完整，请重新用完整目录安装 StarWork Skills”，并说明缺失文件路径。完整安装指 Skill 主文件、`references/` 和 `agents/` 随目录一起安装。

高风险动作包括：执行 upgrade、写入 `--yes`、合并入口规则、修改宿主规则、生成可执行 blueprint。

| 场景 | 必读 reference |
| --- | --- |
| 判断用户意图 | `references/intent-routing.md` |
| 普通诊断 / doctor 输出解释 | `references/diagnosis-flow.md`, `references/response-guide.md` |
| MultiAgent preflight | `references/multiagent-preflight.md`, `references/diagnosis-flow.md` |
| Core 角色映射和升级建议 | `references/core-role-mapping.md`, `references/response-guide.md` |
| 用户明确要求升级 / blueprint | `references/upgrade-blueprint-flow.md`, `references/rules-extraction-guide.md`, `references/agent-rules-template.md` |
| 项目中心候选 | `references/hub-upgrade.md`, `references/upgrade-blueprint-flow.md` |
| 旧宿主规则提炼 | `references/rules-extraction-guide.md`, `references/agent-rules-template.md` |

`references/README.md` 说明完整目录安装和 reference 缺失停止规则。不要把完整诊断报告模板、完整旧规则提炼模板或大段 JSON 示例塞回主 Skill。

## 升级旧目录的第一屏

当用户说“把旧目录升级成 StarWork 工作台”“整理旧工作区”“修复旧模板”时，先讲清楚诊断和升级的区别：

```text
诊断是先看清当前目录的事实，升级是无损补齐 StarWork 工作台规则。

我会先检查这个目录里已经有哪些项目说明、任务记录、资料区、成果区和 AI 入口规则，再判断它离 StarWork 工作台还差什么。

接下来我会分三步走：
1. 先运行 doctor 只读诊断；
2. 再把可升级线索和不确定点讲清楚；
3. 你确认后才生成升级方案并预览写入。

这个过程不会移动、删除或覆盖你的历史文件；升级目标是保留原目录，只补必要的 StarWork 规则和状态。
```

## MultiAgent preflight 第一屏

当用户从 `starworkMultiagent` 过来，或用户问“这个项目适不适合开启多 AI 协作 / 多 Agent 分工”时，先做 MultiAgent preflight。第一屏先回答三个问题，再解释细节：

```text
多 AI 协作准备度：

结论：我会先检查这个项目现在是否适合继续创建 AI 岗位。
文件影响：这次只是检查，不会改项目文件。
下一步：如果入口说明、当前任务和写入边界都清楚，就可以回到 MultiAgent 设计 AI 岗位；如果还缺，我会先告诉你缺什么，再建议用 starworkInit 安全补齐。
```

检查阶段必须明确只读，不自动 repair、upgrade 或写入文件。用户明确说“帮我补齐 / 修复 / 接入”时，才转入 `starworkInit` 或升级方案流程，并且仍要先预览、再确认。

MultiAgent preflight 至少解释这些用户能听懂的影响：

| 维度 | 用户问题 | 缺失时用户影响 |
|---|---|---|
| 项目背景 | 另一个 AI 能不能看懂这个项目是做什么的？ | 其他 AI 接手时可能要你重新解释项目目标 |
| 当前任务 | 另一个 AI 能不能知道现在正在推进什么？ | 分工后容易不知道先接哪一步 |
| AI 入口 | AI 进来先读哪里？ | 不同 AI 可能读到不一致规则 |
| 草稿 / 正式内容边界 | 哪些是草稿，哪些是确认版？ | AI 可能误改正式成果，或把草稿当最终版 |
| 写入边界 | 哪些内容能整理，哪些要先问？ | 多个 AI 可能互相抢改或改到不该改的文件 |
| 交接位置 | 工作记录和共享成果放哪里？ | 一个 AI 做完后，另一个 AI 不知道看哪里 |

缺失项不要只输出内部检查名，要翻译成人话。

常见翻译：

```text
现在缺少“当前任务入口”。这不代表项目有问题，但另一个 AI 接手时可能不知道你现在要它接哪一步。
```

```text
现在还没有 StarWork 工作台身份证。CLI 还不能稳定判断这个目录的类型和写入边界，所以不建议直接创建多个 AI 岗位。
```

```text
现在草稿和确认版边界还不够清楚。多个 AI 同时协作时，可能把草稿当成最终成果，或误改已经确认的内容。
```

## 诊断表达规则

诊断表达三段式：

1. 我看到的事实。
2. 我推测的角色。
3. 需要你确认的地方。

低置信度判断不得说成事实；使用“可能承担”“更像是”“还不能只凭目录名确认”。第一次出现 `workspace state` 时，解释为“StarWork 工作台身份证”。

诊断结论层优先回答：

- 多 AI 协作准备度：可以继续 / 需要先补入口 / 需要先确认边界 / 不建议继续。
- 这次是否会改文件：不会，这只是检查。
- 下一步建议：继续 MultiAgent、转入 starworkInit，或生成 upgrade blueprint dry-run。

## 升级边界

用户明确要求升级、生成 blueprint 或 dry-run 后，才进入升级设计。升级建议围绕“无损补齐”：保留原目录名，只补 StarWork state 和 Agent 入口规则，不移动、不删除、不覆盖历史内容。

不要直接执行 `starwork upgrade --yes`，除非用户明确要求且已完成 dry-run 确认。

## 成功状态口径

成功汇报要分层，不要混成一个状态：

- doctor 只读诊断已完成。
- 多 AI 协作准备度已解释。
- 需要用户确认的目录角色已列出。
- upgrade blueprint 已生成或只是建议。
- dry-run 已完成或尚未执行。
- `--yes` 写入已执行或尚未执行。

## 安全边界

- 不静默修改用户文件。
- 不自动 repair、upgrade 或写入文件。
- 不把低置信度判断说成事实。
- 不把 Kit / Pack 贴近度当作主线诊断。
- 不只根据一个目录名判断目录角色。
- 不鼓励用户立即执行破坏性迁移。
- 不生成完整 `AGENTS.md`；只生成可注入的短规则片段。
