# StarWork 项目规则与 Agent 记忆机制研究结论

## 状态

- 日期：2026-05-26
- 性质：研究结论草案
- 来源：项目现有 Core / CLI 设计、`CLAUDE.md` 写法教训、Claude Code 配置资料、Codex `AGENTS.md` 记忆技巧文章
- 用途：为后续 StarWork Core 规则机制、CLI 检查能力、Pack 规则注入和 Agent 适配设计提供依据

## 一句话结论

StarWork 的项目规则不应该被理解为“写一个更长的 `AGENTS.md` 或 `CLAUDE.md`”，而应该被设计成一套分层的上下文与规则系统：

> 薄入口、强路由、结构化状态、局部规则、可检查边界、持续记忆。

## 核心判断

### 1. `AGENTS.md` / `CLAUDE.md` 是入口规则，不是项目百科

入口文件应该告诉 Agent：

- 进入项目后先读什么
- 当前项目的基本边界是什么
- 哪些目录能写，哪些目录默认只读
- 什么动作必须先确认
- 任务完成前如何验证

入口文件不应该承载：

- 完整项目历史
- 长篇产品背景
- 所有架构文档
- 普通会议流水
- 详细事项过程
- 可被其他文件稳定承载的完整规范

更准确的类比是：

> `AGENTS.md` 是导航牌和行为契约，不是仓库本身。

### 2. 规则需要分层，不能混写

Codex 的 `AGENTS.md` 遵循就近原则：

```text
子目录 AGENTS.md > 项目根 AGENTS.md > 全局 AGENTS.md
```

因此 StarWork 规则应分为：

| 层级 | 应该写什么 |
|---|---|
| 全局 AGENTS / Memories | 个人偏好、通用安全边界、跨项目工作习惯 |
| 项目根 AGENTS.md | 项目入口、项目特定路由、写入边界、确认门槛 |
| 子目录 AGENTS.md | 局部职责、局部禁区、目录内工作方式 |
| `.starwork/workspace.json` | CLI 可检查、可执行的结构化事实 |
| `lessons/` / knowledge | 可复用经验、长期知识、背景材料 |
| `matters/` | 事项推进过程、讨论、草稿、判断 |
| lane worklog | 多 Agent 职责位的当前上下文和接力记录 |

关键原则：

> 高频、稳定、必须每次加载的规则进入口文件；复杂、低频、可按需读取的内容拆出去。

### 3. 入口文件要短，但不能空

知识库里有两个方向：

- 有些个人 vault 教程主张把身份、结构、风格、任务都写进 `CLAUDE.md`
- StarWork 更适合“薄入口 + 路由引用”的模式

原因是 StarWork 面向跨项目、跨 Agent、可升级、可检查的产品协议。入口文件过厚会带来：

- 上下文浪费
- 规则互相覆盖
- 更新困难
- CLI 难以检查
- Agent 容易抓错重点

推荐目标：

```text
AGENTS.md / CLAUDE.md 控制在可快速读完的长度。
复杂说明通过链接或明确路径引用。
```

### 4. `.starwork/workspace.json` 应承载机器事实

凡是 CLI 需要生成、检查、升级、迁移、适配的事实，都不应该只藏在 Markdown 叙述里。

适合进入结构化 state 的内容包括：

- workspace type
- kit
- language
- formal source
- business work area
- installed packs
- installed skills
- upgrade mappings
- customization / blueprint metadata
- capability flags

Markdown 负责让人和 Agent 理解规则；JSON state 负责让 CLI 稳定执行和检查。

### 5. Pack 和 Blueprint 规则应作为“规则槽”注入

Pack 不应该整段替换项目规则，而应该向 `AGENTS.md` 注入可识别的规则区块。

例如：

```text
Core 基础规则
Pack 场景规则
Blueprint 定制规则
Adapter 入口规则
```

每类规则都应有稳定 marker，方便：

- 避免重复注入
- doctor 检查是否存在
- update / upgrade 未来安全迁移
- 人类知道这段规则来自哪里

### 6. `lessons` 和 Memories 不是项目规则的替代品

Codex Memories 适合保存：

- 用户长期偏好
- 跨项目习惯
- 高频纠错后的个人模式

但它不适合承载：

- 项目正式结构
- 正式事实源位置
- Pack 安装状态
- CLI 执行依据
- 团队共享规则

原因是 Memories 不够可审计、不可随项目迁移、也不适合 CLI 检查。

StarWork 应把它视为个人记忆层，而不是项目协议层。

## StarWork 推荐规则模型

```text
全局个人记忆
  ↓
全局 AGENTS.md
  ↓
项目根 AGENTS.md
  ↓
子目录 AGENTS.md
  ↓
.starwork/workspace.json
  ↓
matters / lanes / product / lessons / knowledge
```

其中：

- `AGENTS.md` 负责“怎么进入和怎么行动”
- `.starwork/workspace.json` 负责“这个工作台是什么”
- `product/` 负责“正式事实源”
- `matters/` 负责“过程”
- `lanes/` 负责“多 Agent 职责接力”
- `lessons/` 负责“可复用经验”
- `knowledge/` 负责“可检索背景知识”

## 对 CLI 的启发

StarWork CLI 不应只生成目录，也应管理规则健康。

后续 `doctor` 可以逐步检查：

- 是否存在入口规则
- 入口规则是否声明了正式事实源
- workspace state 与 Markdown 规则是否一致
- Pack 规则是否已注入
- Blueprint 规则是否已注入
- matter / product 边界是否存在明显混淆
- 子目录规则是否存在局部覆盖风险

未来 `update` 可以处理：

- Core 规则模板升级
- Pack 规则区块升级
- Adapter 入口刷新
- workspace state schema 迁移

## 暂定写作原则

1. 一个事实只维护在一个地方。
2. 入口文件只写高频规则和路由。
3. 背景材料、架构解释、事项过程必须拆出去。
4. CLI 要检查的内容必须结构化。
5. 局部规则可以覆盖全局规则，但必须边界清楚。
6. Agent 重复犯错后，再把教训沉淀为规则。
7. 规则应该来自真实摩擦，而不是一次性预设大全。
8. 成熟规则进入 Core / Pack / Kit；过程判断留在 matter。
9. `AGENTS.md` 负责让 Agent 不迷路，不负责替代整个工作系统。

## 后续建议

下一步适合把这份草案继续推进为正式 Core 规格，例如：

```text
product/core/project-rules-mechanism-spec.md
```

正式晋升前，需要继续确认：

- StarWork 是否要定义标准的子目录 `AGENTS.md` 生成策略。
- `.starwork/workspace.json` 是否需要新增 `rules` / `capabilities` 字段。
- `doctor` 第一阶段应检查哪些规则健康项。
- Pack / Blueprint 规则区块 marker 是否需要统一 schema。
