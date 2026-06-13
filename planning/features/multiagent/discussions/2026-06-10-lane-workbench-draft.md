# Lane Workbench / Agent Workbench 讨论草稿

日期：2026-06-10

状态：讨论草稿，尚未进入正式 SPEC。

## 背景

今天讨论 Agent workspace 和项目 workspace 的关系时，形成了一个新判断：

当前 StarWork 已经为每个 lane 准备了 `workspace/`，但这个目录更像“空桌面”。AI 默认不会主动使用它，因为它没有告诉 Agent：

- 什么内容应该先放在 workspace。
- 每次任务应如何形成过程材料。
- 草稿、证据、测试结果、验收记录和正式输出之间如何流转。
- 该 lane 作为一个“岗位”有什么专属工作方式。
- 什么状态下可以把内容晋升到项目正式目录。

因此，仅有一个空 `workspace/` 不足以改变 Agent 的工作习惯。Agent 仍会倾向于直接把产物写进项目正式结构。

## 初步判断

Agent workspace 不应只是一个可选草稿目录，而应该成为随 lane 自动生成的岗位工作台。

一句话：

```text
lane workspace 应从“过程存放目录”升级为“岗位工作台机制”。
```

更完整的关系：

```text
lane = 稳定职责位
session = 当前接手该职责位的 Agent 会话
lane workspace = 该职责位的岗位工作台机制
project workspace / product = 项目事实源和正式成果区
.starwork = StarWork 机制运行层，只存绑定、manifest、cache、adapter state 等
```

## 与项目正式目录的关系

项目正式目录负责保存事实和成果。

Lane workspace 负责保存过程、证据和中间判断。

两者关系不是“二选一”，而是：

```text
任务进入 lane
  ↓
lane workspace 中形成计划、草稿、证据、复验材料
  ↓
通过 gate / review / CEO 判断
  ↓
晋升到项目正式目录
  ↓
lane workspace 保留过程记录和可追溯证据
```

项目正式目录示例：

- `product/planning/features/<feature>/`
- `product/planning/issues/`
- `product/docs/`
- `product/core/`
- `product/cli/`
- `product/skills/`
- `product/packs/`

Lane workspace 不替代这些事实源。

## 基础结构草案

每个 lane 创建时，除 `worklog.md` 外，默认生成一个基础 workbench：

```text
_系统/协作/lanes/<lane-id>/
  worklog.md
  workspace/
    README.md
    active/
    drafts/
    notes/
    evidence/
    handoff/
```

字段含义：

| 路径 | 作用 |
|---|---|
| `workspace/README.md` | 说明该岗位如何使用 workspace，哪些内容先放这里，哪些内容可以晋升 |
| `workspace/active/` | 当前任务的过程目录 |
| `workspace/drafts/` | 未确认草稿、未验收方案 |
| `workspace/notes/` | 调研笔记、中间判断、比较分析 |
| `workspace/evidence/` | 截图、测试结果、用户反馈证据、验收记录 |
| `workspace/handoff/` | 给同岗位后续会话的交接材料 |

## 岗位差异化结构

基础结构不应一刀切。不同 lane 可以有不同 workbench profile。

### CEO / Product Planning

用于方向判断、派单、验收和复盘。

```text
workspace/
  agenda/
  delegations/
  review-queue/
  decisions-drafts/
  retrospectives/
```

说明：

- `agenda/`：准备讨论的问题和决策议程。
- `delegations/`：向其他 lane 分发任务的草稿和记录。
- `review-queue/`：等待验收或复验的输出。
- `decisions-drafts/`：尚未晋升到正式 decisions 的决策草稿。
- `retrospectives/`：Agent 失误复盘、机制调整建议。

### Development

用于实现、测试和修复记录。

```text
workspace/
  active/
  patch-plans/
  implementation-notes/
  test-results/
  review-replies/
```

说明：

- `patch-plans/`：动手前的实现计划。
- `implementation-notes/`：实现中的关键判断。
- `test-results/`：测试命令、结果、失败复现。
- `review-replies/`：对验收反馈和 code review 的回应。

### Feedback / Issues

用于收集真实反馈、归因和登记 issue。

```text
workspace/
  incoming-feedback/
  evidence/
  triage-notes/
  issue-drafts/
```

说明：

- `incoming-feedback/`：原始反馈整理。
- `evidence/`：截图、日志、用户原话。
- `triage-notes/`：影响范围、优先级和归因判断。
- `issue-drafts/`：进入 `product/planning/issues/` 前的 issue 草稿。

### Research

用于预研、资料比较和结论沉淀。

```text
workspace/
  sources/
  notes/
  comparisons/
  synthesis/
```

说明：

- `sources/`：原始资料索引。
- `notes/`：阅读笔记。
- `comparisons/`：方案比较。
- `synthesis/`：可共享的初步结论。

### Visual

用于视觉探索、资产和原型。

```text
workspace/
  references/
  concepts/
  assets/
  prototypes/
```

说明：

- `references/`：视觉参考。
- `concepts/`：概念稿。
- `assets/`：图片、图标、素材。
- `prototypes/`：可演示原型。

## 可能的工作流规则

### 1. 任务开始

Agent 接到任务后，默认先在：

```text
workspace/active/<date-or-request-id>-<short-slug>/
```

建立任务过程目录。

该目录可以包含：

```text
brief.md
plan.md
notes.md
evidence.md
result.md
handoff.md
```

不是每个任务都必须全量创建，但复杂任务应至少有 `brief.md` 或 `plan.md`。

### 2. 正式写入前

如果任务会修改项目正式目录，Agent 应能说明：

- 将修改哪些正式文件。
- 依据是什么。
- 是否已有 evidence 或 test result。
- 是否需要 CEO / review gate。

### 3. 晋升规则

只有满足以下条件时，workspace 中的内容才应晋升到正式目录：

- 用户确认。
- CEO / product-planning gate 通过。
- review lane 验收通过。
- 或当前任务的写入范围和验收标准已经明确授权。

晋升后，以正式目录为准。

workspace 保留过程记录，不再作为唯一事实源。

### 4. 跨 lane 可见

如果某个 workspace 输出需要其他 lane 读取，应登记到：

```text
_系统/协作/shared.md
```

不应要求其他 Agent 在所有 lane workspace 中搜索。

## CLI / Skill 可能改动

### CLI 方向

可能需要扩展：

```bash
starwork multiagent add <lane> --workbench <profile>
starwork multiagent workbench init <lane>
starwork multiagent workbench status <lane>
```

也可以先不加新命令，而是让 `multiagent add` 在创建 lane 时自动生成基础 workbench。

后续可考虑：

```bash
starwork multiagent promote <path> --to <formal-path>
```

但是否需要 `promote` 命令尚未确定。当前也可以先用 Skill 规则和人工 gate 实现。

### Skill 方向

`starworkMultiagent` 应更新：

- 创建 lane 时说明 lane workspace 是岗位工作台，不是空目录。
- launch message 应要求 Agent 先阅读 `workspace/README.md`。
- instruction message 可提示 Agent 复杂任务先在 `workspace/active/` 形成过程材料。
- 状态读取时，不只看 thread，还看 worklog、workspace active 项和 shared outputs。

L0 `starwork` 主入口可在用户问“多个 AI 怎么协作”时，解释 Lane Workbench 是 StarWork 区别于多开聊天窗口的关键机制。

## 设计边界

不建议立即做成重型任务系统。

暂时不做：

- 通用看板系统。
- 自动排期。
- 文件锁。
- 强制每次操作都必须走 promote 命令。
- 复杂 JSON task manifest。

应该先做轻：

- 创建 lane 时有岗位 scaffold。
- 每个 workspace 有明确 README。
- Agent launch / instruct 消息会提醒使用 workspace。
- 重要输出通过 shared.md 索引。
- 通过 worklog 和 evidence 支持复盘。

## 待讨论问题

1. 这个能力应作为 `multiagent v0.8`，还是独立成 `agent-workbench v0.1`？
2. Core 是否只定义基础 workbench，具体岗位结构由 Pack 或项目自定义？
3. 默认 profile 应有哪些：`ceo`、`development`、`research`、`feedback`、`visual`、`operations`？
4. 用户自定义 lane 时，是否由 Skill 采访后生成专属 workbench scaffold？
5. `workspace/active/` 是否需要 active / done / archived 三态？
6. 是否需要 `promote` 命令，还是先用人工 gate 和 shared.md？
7. 如何避免 lane workspace 变成新的垃圾堆？
8. 旧项目已有 lane workspace 时，如何升级到新结构？
9. workbench 结构应该进入 Core、MultiAgent capability，还是 Pack？
10. 外部用户第一次接触多 Agent 时，是否应该先看到 Lane Workbench 的概念？

## 初步产品原则

可以作为后续 SPEC 候选原则：

1. Agent workspace 是岗位工作台，不是项目事实源。
2. 每个 lane 创建时，应生成该岗位完成工作所需的最小机制。
3. 正式事实源仍在项目目录，例如 `product/`、`docs/`、`issues/`、`knowledge/`。
4. workspace 用于计划、草稿、证据、复盘和交接。
5. 跨 lane 可见内容必须登记到 shared context。
6. 复杂任务应先在 workspace 留下过程材料，再晋升到正式目录。
7. Workbench 机制应辅助 Agent 工作，而不是变成新的形式主义负担。

## 候选 SPEC 路径

如果继续作为 MultiAgent 增强：

```text
product/planning/features/multiagent/specs/v0.8-lane-workbench.md
```

如果升级为独立能力：

```text
product/planning/features/agent-workbench/specs/v0.1.md
```

当前 CEO 倾向后者，但还需要继续讨论。

