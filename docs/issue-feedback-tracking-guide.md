# Issue 反馈与跟踪机制搭建指南

这份文档把 StarWork 当前使用的 issue 反馈、跟踪和闭环机制整理成一个可复制模板，方便用户把自己的 AI 项目也改造成“能接住反馈、能追踪处理、能验收关闭”的工作台。

适用场景：

- 用户反馈、A 测反馈、bug、体验问题、发布阻塞需要被持续跟踪。
- 多个 AI / Agent 会接力处理同一个项目，不能只靠聊天记录记忆。
- 项目已经有正式功能文档或规划文档，需要区分“问题事实”和“解决方案”。

不适用场景：

- 一次性小任务，不需要长期跟踪。
- 纯功能设计稿或路线图，应该放到对应功能文档，而不是塞进 issue。
- 已经进入代码仓库 issue 系统的问题，可以和本地 issue 保留互链，但不要重复维护两套完整正文。

## 核心原则

### 1. index 只做轻量看板

`issues/index.md` 只回答一个问题：现在有哪些问题，分别是什么状态，下一步找谁。

它不写完整背景、不写长讨论、不写处理记录。每个 issue 在 index 里只占一行，方便 Agent 开工前快速扫一遍。

### 2. 每个问题一个详情文件

完整事实进入独立文件，例如：

```text
product/planning/issues/
├── index.md
├── template.md
├── ISSUE-001.md
├── ISSUE-002.md
└── ISSUE-003.md
```

详情文件负责保存：

- 现象
- 证据
- 影响范围
- 初步判断
- 分流结果
- 下一步
- 验收方式
- 处理记录

### 3. Issue 记录问题事实，不替代方案文档

Issue 的职责是把问题闭环，不是把完整方案写成大论文。

如果问题需要变成正式设计，应在 issue 的“分流结果”里链接到：

- 功能 SPEC
- GitHub Issue
- 开发 lane
- 验收报告
- 发布说明

### 4. 关闭靠验收，不靠感觉

Issue 只有在验收条件通过后才关闭。

关闭前至少要回答：

- 用户可见问题是否消失？
- 是否有测试、命令、截图或人工复验支撑？
- 是否把处理结果回填到了详情文件？
- index 的状态和下一步是否同步更新？

### 5. GitHub Issue 做公开协作入口，本地 issue 做工作台事实源

如果项目同时使用 GitHub Issue，本地 `ISSUE-XXX.md` 仍然是 AI 接力、验收和项目内事实沉淀的主入口。

GitHub Issue 适合承载：

- 对外公开的用户反馈和讨论。
- 需要开发者协作、代码提交或 PR 关联的问题。
- 需要被 GitHub 里程碑、label、assignee 管理的问题。

本地 issue 适合承载：

- AI 需要读取的完整上下文、证据和判断。
- 与 SPEC、验收、开发 lane、发布记录的内部互链。
- 处理过程、复验记录和关闭依据。

## 推荐目录

如果项目有 `product/planning/`，推荐放在：

```text
product/planning/issues/
```

如果是普通用户项目，可以简化为：

```text
issues/
├── index.md
├── template.md
└── ISSUE-001.md
```

关键不是路径名字，而是要固定一个入口，并让 AI 明确知道：开工、验收、发布前先读 `issues/index.md`。

## index.md 模板

```markdown
# Issue 跟踪

用途：维护本项目的反馈、问题、体验缺口和验收阻塞。

这个文件只做轻量看板和入口，不承载完整 issue 正文。AI 开工、验收或发布前，先读本文件；只有需要处理某个 issue 时，再打开对应详情文件。

## 当前 Issues

| ID | 标题 | 类型 | 优先级 | 状态 | 负责人 | 来源 | 详情 | 下一步 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ISSUE-001 | 示例问题标题 | bug / docs | P1 | new | 待分配 | 用户反馈 | [ISSUE-001.md](ISSUE-001.md) | 补充复现步骤并判断是否转开发。 |

## 使用规则

- `index.md` 只保留一行摘要、状态、负责人、详情链接和下一步。
- 完整事实、证据、处理记录和验收方式写入 `ISSUE-XXX.md`。
- 新 issue 先复制 `template.md` 到 `ISSUE-XXX.md`，再在上方表格新增一行。
- 已关闭 issue 不在 index 展开历史，只保留详情链接。
- 已转 SPEC、GitHub Issue 或开发任务的问题，在详情文件中保留互链。
```

## template.md 模板

````markdown
# ISSUE-XXX：标题

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | bug / docs / product / workflow / release / test |
| 优先级 | P0 / P1 / P2 / P3 |
| 状态 | new |
| 来源 | 用户反馈 / A 测 / 验收 / 真实项目 / 自动测试 / 开发验证 |
| 发现日期 | YYYY-MM-DD |
| 关联 GitHub Issue | 无 |
| 关联 SPEC | 无 |
| 关联验收 | 无 |
| 负责人 | 待分配 |

## 现象

- 用户可见表现：
- 期望表现：
- 实际表现：

## 证据

可以填写命令、日志、截图、文件路径、复现步骤、验收报告或用户原话。

```text
待补充
```

## 影响范围

- 影响的功能：
- 影响的用户：
- 是否影响发布 / 升级 / A 测：
- 是否有绕行方式：

## 初步判断

只记录当前判断，不在这里展开完整方案。

## 分流结果

- 是否转 SPEC：
- 是否转 GitHub：
- 是否转开发任务：
- 是否需要用户补信息：

## 下一步

写清谁来做、做什么、做到什么程度。

## 验收方式

- 验收条件 1：
- 验收条件 2：
- 关闭标准：

## 处理记录

### YYYY-MM-DD 处理人

- 做了什么：
- 如何验证：
- 结果：
````

## 字段定义

### 类型

类型用来帮助分流，不需要设计得太复杂。用户项目可以先用下面几类：

| 类型 | 说明 |
| --- | --- |
| `bug` | 功能不符合预期或出现错误 |
| `docs` | 文档缺失、过时或表达不清 |
| `product` | 产品体验、概念、交互或范围问题 |
| `workflow` | AI 协作、交接、流程或工作台机制问题 |
| `release` | 发布、安装、升级、版本验证问题 |
| `test` | 测试缺口、验收失败或复现样例 |

### 优先级

| 优先级 | 使用标准 |
| --- | --- |
| `P0` | 阻断主链路、造成数据丢失、覆盖用户内容、发布必须立刻停止 |
| `P1` | 影响核心体验或 A 测可信度，需要优先处理 |
| `P2` | 明显体验问题或局部功能缺口，可以排入近期修复 |
| `P3` | 低风险优化、文案润色、非关键补充 |

### 状态

状态保持少而明确：

| 状态 | 含义 |
| --- | --- |
| `new` | 已登记，尚未分析或分配 |
| `triaged` | 已判断影响和分流方向 |
| `ready-for-development` | 方案或验收标准足够清楚，可以开发 |
| `in-progress` | 正在处理 |
| `failed-review` | 实现或处理结果复验未通过 |
| `blocked` | 缺少信息、权限、依赖或外部状态 |
| `closed` | 已验收关闭 |

## GitHub Issue 关联机制

### 什么时候需要关联 GitHub

不是所有本地 issue 都要转 GitHub。满足下面任一条件时，建议创建或关联 GitHub Issue：

- 反馈来自 GitHub，或者用户希望在 GitHub 上跟踪。
- 问题需要开发者协作、PR、commit 或 release note 承接。
- 问题影响公开版本、安装体验、A 测用户或外部使用者。
- 需要用 GitHub label、milestone、assignee 管理优先级和归属。

不建议转 GitHub 的情况：

- 只涉及项目内部规划判断。
- 只是 AI 工作台内部整理、分流或验收记录。
- 问题还缺少基本事实，暂时无法公开描述。

### 本地到 GitHub 的写法

本地 issue 详情页在“基本信息”里保留 GitHub 链接：

```markdown
| 关联 GitHub Issue | <https://github.com/<owner>/<repo>/issues/7> |
```

如果暂时没有 GitHub Issue，写：

```markdown
| 关联 GitHub Issue | 无 |
```

在“分流结果”里写清状态：

```markdown
- 是否转 GitHub：已转 GitHub Issue #7。
```

或者：

```markdown
- 是否转 GitHub：暂不转，先补充复现步骤。
```

index 的“来源”字段也可以写成：

```text
GitHub Issue #7
```

如果来源不是 GitHub，但后来转入 GitHub，可以在详情页记录，不必把 index 的“来源”改成 GitHub；index 的来源优先表达最初反馈从哪里来。

### GitHub 到本地的写法

GitHub Issue 正文或评论里应放一个简短反链，说明本地跟踪文件：

```text
本地跟踪：product/planning/issues/ISSUE-019.md
```

如果仓库使用 StarWork 或类似工作台，也可以补一句：

```text
完整证据、分流和验收记录在本地 issue 文件中维护；GitHub Issue 用于公开讨论和开发协作。
```

GitHub 里不需要复制本地 issue 的全部处理记录。公开描述保留问题、复现、期望结果和当前处理状态即可。

### 状态同步规则

本地 issue 和 GitHub Issue 可以状态不同，但不能互相矛盾。

推荐同步方式：

| 场景 | 本地 issue | GitHub Issue |
| --- | --- | --- |
| 刚收到 GitHub 反馈 | 新建本地 issue，来源写 `GitHub Issue #N` | 保持 open |
| 已完成分流 | 更新“分流结果”和“下一步” | 评论说明已进入本地跟踪或开发排期 |
| 开发中 | 状态改为 `in-progress` | 需要时更新 assignee / label / milestone |
| 复验未过 | 状态改为 `failed-review`，写清阻塞项 | 评论说明未通过原因 |
| 本地验收通过 | 状态改为 `closed`，写处理记录 | 评论验证结果后关闭 GitHub Issue |

关闭顺序建议：先完成本地验收记录，再关闭 GitHub Issue。这样 GitHub 上最后一条评论可以指向明确的验证结论。

### PR 和提交关联

如果问题由 PR 或提交修复，在本地 issue 的“处理记录”里写：

```markdown
- 关联 PR：<https://github.com/<owner>/<repo>/pull/12>
- 关联提交：`abc1234`
- 验证命令：`npm test`
```

GitHub Issue 中也应评论：

```text
已在 PR #12 处理。本地验收记录：product/planning/issues/ISSUE-019.md
```

如果使用 GitHub 的自动关闭语法，例如 `Fixes #7`，仍要先确认本地 issue 已写明验收方式。不要只因为 PR merge 就把本地 issue 关掉。

## 新 issue 登记流程

1. 判断是否真的需要 issue。

   如果只是一个马上能改完的小错，可以直接修复并在工作记录里说明；如果需要跨会话跟踪、用户复验、开发排期或发布判断，就登记 issue。

2. 分配编号。

   查看 `index.md` 里最大编号，新问题使用下一个编号，例如 `ISSUE-020`。

3. 复制模板。

   从 `template.md` 复制为 `ISSUE-020.md`，把标题、基本信息、现象和证据先补齐。

4. 更新 index。

   在 `当前 Issues` 表格上方新增一行，填入摘要、优先级、状态、负责人、来源、详情链接和下一步。

5. 明确下一步。

   下一步必须是可执行动作，例如“补充复现命令”“转开发 lane 修复”“写 SPEC 收敛方案”“等待用户提供截图”。

6. 判断是否关联 GitHub。

   如果问题来自 GitHub，或需要公开协作，在详情页填写“关联 GitHub Issue”，并在 GitHub Issue 中补本地反链。

## 处理流程

### Triage

AI 接到反馈后，先判断：

- 这是事实问题，还是新需求？
- 是否影响核心链路？
- 是否已经有重复 issue？
- 是否需要用户补证据？
- 是否要转 SPEC、开发任务或 GitHub Issue？

Triage 后要更新详情文件的“初步判断”和“分流结果”，并同步 index 的状态和下一步。

### Development

开发处理时，issue 文件不替代代码任务。issue 只保留问题事实和验收方式。

如果需要详细方案，写到功能 SPEC 或开发计划，然后在 issue 里链接过去。

### Review

复验时，把实际检查过的命令、测试、截图或人工验证写入“处理记录”。

如果没通过，不要关闭，状态改成 `failed-review`，并写清阻塞项和修复要求。

### Close

关闭时：

- 详情文件状态改为 `closed`。
- 处理记录写清最终验证结果。
- index 状态改为 `closed`。
- index 下一步改为“已关闭：一句话说明关闭依据”。

## AI 操作提示词

可以把下面这段加入项目的 `AGENTS.md` 或发给用户的 AI：

```text
当收到用户反馈、bug、体验问题、验收阻塞或发布问题时，优先检查 issues/index.md。

规则：
1. index.md 只做轻量看板，不写完整正文。
2. 新问题复制 issues/template.md 为 ISSUE-XXX.md，并在 index.md 增加一行。
3. 详情文件必须包含现象、证据、影响范围、初步判断、分流结果、下一步和验收方式。
4. Issue 只记录问题事实和闭环状态，不替代 SPEC、开发计划或路线图。
5. 已转 SPEC、GitHub Issue、PR 或开发任务的问题，要在详情文件中保留互链。
6. 关闭 issue 前必须写明验证方式，并同步 index.md。
7. 如果本地 issue 关联了 GitHub Issue，关闭前先回填本地验收记录，再到 GitHub 评论验证结果并关闭。
8. 开工、验收或发布前先读 issues/index.md，避免遗漏已知阻塞。
```

## 常见错误

- 把所有历史讨论都写进 `index.md`，导致看板失去扫描价值。
- 只有标题，没有证据，后续 Agent 无法判断真假和影响范围。
- 把解决方案写得很长，但没有写用户可见问题和关闭标准。
- 实现后忘记回填处理记录，导致问题看似关闭但不可审计。
- 同一个问题同时维护本地 issue、GitHub Issue 和 SPEC，却没有互链。
- GitHub Issue 已关闭，但本地 issue 没有写验收记录，后续 AI 不知道关闭依据。
- 本地 issue 已关闭，但 GitHub Issue 仍保持 open，公开状态和工作台状态不一致。
- 已关闭 issue 在 index 里展开大段历史，干扰新问题扫描。

## 最小可用版本

如果用户项目刚开始，不需要一次搭完整机制。最小版本只需要三个文件：

```text
issues/
├── index.md
├── template.md
└── ISSUE-001.md
```

第一轮只坚持三件事：

1. 所有反馈先进入 index。
2. 每个问题有独立详情页。
3. 关闭前必须写验收方式。

机制跑起来后，再逐步增加状态、优先级、GitHub Issue 互链和处理记录。
