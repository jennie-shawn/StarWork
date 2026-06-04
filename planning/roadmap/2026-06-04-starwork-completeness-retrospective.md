# StarWork 完整度复盘：MultiAgent / Host Adapter v0.2 后

## 结论

截至 2026-06-04，StarWork 已经从“目录模板 + CLI 原型”进入“可 A 测的 AI 工作系统底座”阶段。

当前最强的部分不是某个单点命令，而是四件事已经连起来：

- Core 定义工作台协议和文件边界。
- CLI 能生成、检查、升级、适配、安装能力和维护多 Agent 协作状态。
- Skills 能把用户模糊意图转成 CLI 可执行流程。
- MultiAgent + Host Adapter 已能清楚地区分自动能力、只读观察和人工交付。

但 StarWork 还没有进入“可稳定对外推广”的阶段。当前缺口集中在发布一致性、真实 A 测证据、场景 Pack、示例 Demo 和长期维护体验上。

推荐下一步主线：

```text
先做 M2.12 发布与 A 测稳定化
  -> 再做 M2.13 示例 / Demo 工作台
  -> 再进入 M3 Content Creator Pack MVP
```

不建议现在继续加深 Cursor / Trae 自动化，也不建议立刻扩张新 Pack。Host Adapter v0.2 已经给出足够清晰的边界：Cursor 只读，Trae 人工，Codex / Claude Code 能力按运行时判断。

## 当前完整度

以下评分不是代码完成百分比，而是从“用户能否稳定使用并理解”角度判断。

| 模块 | 完整度 | 当前判断 |
| --- | ---: | --- |
| Core / 工作台协议 | 85% | v0.1 地基清楚，Project Kit / Hub Kit / General Pack 边界已收敛。后续主要是维护，不应继续扩 Core。 |
| CLI 基础命令 | 80% | `init`、`doctor`、`spawn`、`upgrade`、`pack install`、`knowledge`、`audit`、`repair`、`multiagent` 都能跑。主要缺 `update`、发布一致性和命令拆分治理。 |
| Skills 体系 | 75% | 系统 Skill、Kit Skill、项目 Skill 分层明确；`starworkInit` / `Doctor` / `Multiagent` / `Knowledge` 已有。缺真实用户长流程验证和版本同步机制。 |
| MultiAgent | 75% | lane、binding、shared request、host routing、manual handoff 已形成闭环。缺可视化状态、跨会话工具不稳定时的用户引导继续打磨。 |
| Host Adapter | 70% | Codex / Claude Code / Cursor / Trae profile 和 doctor 检查已成型；Cursor / Trae 边界已收敛。缺更多真实宿主 A 测样本和正式安全说明。 |
| Knowledge Capability | 65% | 可选能力定位清楚，CLI / Skill 已落地。缺真实资料吸收、沉淀、复用的端到端案例。 |
| Hub / Spawn / Audit / Repair | 70% | 多项目中心链路已能跑，适合 A 测。缺真实多项目样本、常见修复案例和用户文档中的“为什么这么做”。 |
| Packs | 35% | General / Hub Management 能支撑底座，但真正场景 Pack 还没形成。Content Creator Pack 仍是下一阶段。 |
| Docs / Release | 60% | `product/docs/` 与 roadmap 已收束到 `0.1.0-alpha.19` 口径，但 `product/README.md` 仍写 `alpha.18`；缺发布检查清单。 |
| Operations / 外部表达 | 35% | 已创建 operations lane，但发布节奏、release note、A 测招募和用户反馈闭环还没系统化。 |

整体判断：

- 作为内部 A 测产品：完整度约 75%。
- 作为外部公开 alpha：完整度约 60%。
- 作为可规模化推广产品：完整度约 40%。

## 已经形成的产品优势

### 1. StarWork 的产品边界清楚了

StarWork 不再是旧 Runtime spike，也不是一个文件夹模板。当前定位更稳：

```text
借力底层 Agent，提供长期工作台协议、CLI、Skills、Packs 和跨 Agent 协作系统。
```

这点很重要，因为它避免 StarWork 去追底层模型 / runtime，把壁垒放在工作系统和场景流程上。

### 2. CLI 已经是产品入口，不只是脚本

`starwork --help`、`doctor --json`、`init --adapter`、`multiagent status --host` 这些能力已经开始体现产品感。尤其是 2026-06-04 的 `manual_handoff_required` 修复，让 CLI 开始对“没自动送达”这类边界诚实。

### 3. MultiAgent 和 Adapter 的边界成熟了一层

过去最大风险是“把不能自动做的事说成自动做了”。v0.4 / Host Adapter v0.2 后，边界清楚很多：

- 标准后台投递不可用时，不伪装送达。
- Cursor 只读 transcript，不写私有状态。
- Trae 直接人工，不再做低价值私有存储观察。
- Skill 解释 CLI 状态，不维护宿主能力百科。

这是 StarWork 可信度的核心。

### 4. 本地 issue 机制已经有效

`ISSUE-001` 到 `ISSUE-013` 证明了一个好现象：真实反馈、复验失败、再次修复、关闭都能在本地闭环。StarWork 本身已经在用自己的工作系统推进自己。

## 当前主要缺口

### P0：发布与版本一致性

这是现在最应该先处理的缺口。

事实：

- `product/package.json` 是 `0.1.0-alpha.19`。
- `node cli/bin/starwork.js --version` 输出 `0.1.0-alpha.19`。
- `product/README.md` 仍写 npm `latest` 为 `0.1.0-alpha.18`。
- 2026-06-04 的文档整理已将 `product/docs/alpha-test-guide.md`、`product/docs/roadmap.md` 收束到 `0.1.0-alpha.19`。

这会直接影响 A 测用户和 Agent 判断。StarWork 的文档很多，版本漂移会让 Agent 走旧路径。

需要新增一个发布检查清单：

- package version
- README version
- A 测指南 version
- roadmap current stage
- npm latest 验证
- `npx @jennie-shawn/starwork@latest --version`
- global skills 更新验证
- issue / release note 同步

### P0：A 测主流程需要重新收窄

现在功能已经很多，如果 A 测用户被要求测所有东西，会失焦。

建议把 A 测主流程收窄为 5 条：

1. 安装与更新：CLI + Skills。
2. 新建项目：`init -> doctor`。
3. 项目中心：`hub init -> spawn -> audit -> repair`。
4. 知识库：`knowledge init/status` + `starworkKnowledge`。
5. MultiAgent / Adapter：Codex 主链路 + Cursor 只读 + Trae 人工。

其他能力先作为可选探索，不要写成主线。

### P1：缺少 Demo / Golden Workspace

当前 StarWork 有很多文档，但缺一个“看完就懂”的样板。

建议做两个 golden workspace：

- `examples/project-general-zh/`：普通项目工作台，展示 references、outputs、knowledge、multiagent。
- `examples/hub-with-two-projects-zh/`：项目中心管理两个项目，展示 spawn / audit / repair。

Demo 比文档更能稳定 Agent 行为。后续 Content Creator Pack 也需要基于 Demo 验证。

### P1：Packs 还没有真正进入产品价值层

General Pack 和 Hub Management Pack 是底座，不是场景解决方案。

StarWork 真正可商业化的部分仍然在 Packs。当前 Content Creator Pack 还没启动 MVP，这是合理的，但不能无限延后。

Content Creator Pack MVP 不应先追求复杂，应只做一个闭环：

```text
选题输入 -> 选题池 -> 大纲 -> 草稿 -> 发布记录 -> 复盘
```

配套一个 Skill 和一个示例项目即可。

### P1：CLI 维护性风险开始出现

`product/cli/src/cli.js` 已经承载太多命令、宿主路由、doctor、knowledge、multiagent 和 adapter 逻辑。

短期可以继续跑，但继续加功能会增加回归成本。建议在进入 M3 前做一次保守拆分计划：

- 不重写 CLI。
- 不改变命令行为。
- 先抽 test helpers / host adapter helpers / multiagent helpers。
- 保持 96/96 测试作为护城河。

### P1：真实宿主 A 测证据不足

Cursor / Trae 的产品边界已经定了，但仍缺更多真实宿主记录：

- Cursor transcript 路径在不同项目、不同 Cursor 版本是否稳定。
- Cursor `cursor agent status` 文案在不同登录状态下是否稳定。
- Claude Code transcript 路径和 `CLAUDE_CODE_SESSION_ID` 在真实用户机器上是否稳定。
- Trae 手工路径用户是否理解，是否会觉得 StarWork “没适配”。

这些不需要马上变成功能，但需要 A 测记录。

### P2：缺 `starwork update`

目前 `upgrade` 是旧工作区接入，`repair` 是按 blueprint 修复。真正的“已经是 StarWork 的工作台，随版本升级”还没有命令。

这会在 alpha 继续迭代时变成实际问题：

- 旧工作台缺新 Skill。
- 旧 `.starwork/` state 缺新字段。
- 旧规则入口缺新的 adapter 说明。

`starwork update` 应作为 M2 后段或 M3 前置设计，不要等 v0.1 正式发布后再补。

## 接下来怎么走

### 路线选择

有三条可能路线：

| 路线 | 做法 | 风险 | 判断 |
| --- | --- | --- | --- |
| A. 继续深挖 MultiAgent / Adapter | 继续做 Cursor / Claude / Trae 自动化 | 容易被宿主私有能力牵着走，偏离 StarWork 核心 | 不推荐 |
| B. 发布与 A 测稳定化 | 修版本漂移、发布清单、Demo、A 测主流程 | 短期看起来不够“新功能” | 推荐 |
| C. 直接进入 Content Creator Pack | 开始场景化 Pack | 底座和 A 测主线还没完全稳，容易把问题带进 Pack | 等 B 完成后再做 |

推荐路线：B，然后 C。

## 建议里程碑

### M2.12：Release Hygiene / A 测稳定化

目标：让 `0.1.0-alpha.19` 或下一个 alpha 的用户入口完全一致。

建议任务：

1. 同步 README、A 测指南、roadmap、CLI README 中的版本与当前能力口径。
2. 新增 `product/planning/roadmap/release-checklist.md` 或正式 release checklist。
3. 验证 `npm latest`、`npx @jennie-shawn/starwork@latest --version`、全局安装、skills 安装。
4. 把 A 测指南压缩成 5 条主流程，其他作为可选。
5. 让 operations lane 输出一版发布说明和 A 测招募话术。

验收：

- 任意 Agent 读取 README / A 测指南 / roadmap，不会得到不同版本和不同阶段判断。
- 用户能按一条路径完成 CLI + Skills 安装验证。

### M2.13：Golden Demo Workspaces

目标：让 StarWork 不只“能解释”，还“能展示”。

建议任务：

1. 创建普通项目工作台 Demo。
2. 创建项目中心 + 两个项目 Demo。
3. 每个 Demo 包含 expected doctor / audit 输出说明。
4. 给 `starworkInit` / `starworkDoctor` / `starworkMultiagent` 增加 Demo 读取建议。

验收：

- 新用户能通过 Demo 看懂项目工作台、项目中心、知识库和 multiagent 的关系。
- Agent 可以用 Demo 对照真实项目，减少误判。

### M2.14：A 测反馈台账与真实样本

目标：把真实使用反馈变成产品决策，而不是散落在聊天里。

建议任务：

1. 建立 A 测记录模板：环境、宿主、命令、预期、实际、是否进入 issue。
2. 真实跑 3 类样本：新项目、旧模板、项目中心。
3. 真实跑 3 个宿主：Codex、Cursor、Claude Code；Trae 只验证人工路径理解度。
4. 每个失败都进 `product/planning/issues/`。

验收：

- 至少 5 条真实 A 测记录。
- 至少 2 个非开发者视角反馈。

### M3：Content Creator Pack MVP

目标：做第一个真正带业务价值的 Pack。

启动条件：

- M2.12 文档和发布口径稳定。
- M2.13 至少一个 Demo 可读。
- GFM 新一期课程内容边界明确。

MVP 闭环：

```text
选题输入 -> 选题池 -> 大纲 -> 草稿 -> 发布记录 -> 复盘
```

不要一开始做复杂运营系统、账号授权、平台 API 或数据自动抓取。

## 需要立刻处理的具体问题

1. 根 README 版本漂移：`product/README.md` 仍写 `alpha.18`，需要由有写入边界的 lane 更新到 `alpha.19`。
2. `product/` 是 git 仓库，根目录不是；Agent 容易在根目录误判 git 状态，需要在协作规则或 worklog 中提醒。
3. A 测指南过长，主线和可选项混在一起。
4. product README 的当前版本落后于 package。
5. 缺 release checklist。
6. 缺 golden demo workspace。

## 复盘判断

StarWork 现在的核心问题不是“还缺一个大功能”，而是“已经有足够多功能，需要把用户入口、版本、Demo 和 A 测主线收束起来”。

下一步如果继续加功能，会让产品看起来更强，但用户更难上手。相反，如果先做 M2.12 / M2.13，StarWork 会从“开发者觉得能跑”变成“A 测用户真的能按路径跑完”。

所以当前最优动作是：

```text
冻结 Host Adapter 自动化扩张
同步 alpha.19 发布口径
制作发布检查清单
收窄 A 测主流程
补 Golden Demo
再启动 Content Creator Pack MVP
```
