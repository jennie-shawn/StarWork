# StarWork 主入口路由

本文件是 `starwork` 主 Skill 的路由参考。主 Skill 只判断方向，不复制专家 Skill 的完整流程。

## 层级

| 层级 | 位置 | 作用 |
|---|---|---|
| L0 主入口 | `product/skills/starwork/` | 产品解释、安装引导、模糊意图路由 |
| L1 系统专家 | `product/skills/starworkInit/` 等 | 明确能力的专家流程 |
| L2 Kit 自带 | `product/kit-skills/` | 跟项目中心或项目工作台形态绑定 |
| L3 Capability 项目内 | `product/core/capabilities/*/skills/` | 能力开启后写入具体项目 |

## 路由矩阵

| 用户意图 | 主入口动作 | 专家或项目内能力 |
|---|---|---|
| StarWork 是什么、能做什么、怎么开始 | 解释产品并问下一步 | `starwork` |
| 安装 StarWork、让 AI 会用 StarWork | 引导安装 CLI 和全局系统 Skills | `starwork` |
| 创建工作台、接入当前项目、初始化项目 | 路由到初始化流程 | `starworkInit` |
| 诊断旧目录、doctor 结果怎么看、旧模板升级 | 路由到诊断和升级方案流程 | `starworkDoctor` |
| 开启知识库、维护项目知识库、长期知识沉淀 | 路由到知识库流程 | `starworkKnowledge` |
| 多 Agent、Agent Lanes、lane、跨会话消息、开发 Agent | 直接使用多 Agent 专家流程 | `starworkMultiagent` |
| 从项目中心创建项目 | 当前在项目中心时使用项目创建流程 | `starworkSpawn` |
| 巡检项目中心、修复登记项目 | 当前在项目中心时使用巡检流程 | `starworkAudit` |
| 收尾、整理、阶段结束 | 当前项目有整理 Skill 时优先使用 | `neat-freak` |

## 模糊意图处理

如果用户只说“帮我用 StarWork”“这个项目怎么接入”“我该用哪个能力”，先给第一屏产品解释，再问一个选择题。

如果用户已经明确说出能力，不要拦在主入口：

- “开启知识库”直接进入 `starworkKnowledge`。
- “创建多个 Agent / 让开发 Agent 开始做”直接进入 `starworkMultiagent`。
- “诊断这个旧目录”直接进入 `starworkDoctor`。
- “初始化当前项目”直接进入 `starworkInit`。

## 冲突处理

- 用户请求普通资料整理或阶段收尾时，不要默认进入知识库；优先判断是否是 `neat-freak` 场景。
- 用户在普通项目里说“从项目中心创建项目”时，先说明这需要项目中心工作台；不要在普通项目里伪造项目中心能力。
- 用户在非 StarWork 目录里请求多 Agent、知识库或项目中心能力时，先回到 `starworkInit` 接入工作台。
- 当前宿主不支持自动切换 Skill 时，主入口可以按专家 Skill 的公开规则继续执行高层确认，但复杂细节仍以专家 Skill 为事实源。
