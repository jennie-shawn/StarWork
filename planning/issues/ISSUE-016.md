# ISSUE-016：新手初始化体验缺少术语解释、选择背景和设计意图

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | product / skill / cli / docs |
| 优先级 | P1 |
| 状态 | closed |
| 来源 | GitHub Issue #4 / 新用户反馈 |
| 发现日期 | 2026-06-06 |
| 关联 GitHub Issue | <https://github.com/jennie-shawn/StarWork/issues/4> |
| 关联 SPEC | `product/planning/features/project-structure/specs/v0.2-init-onboarding-language.md` |
| 关联验收 | 无 |
| 负责人 | product-planning lane |

## 现象

- 用户可见表现：第一次使用 StarWork 时，初始化和引导体验痛苦；流程默认用户已经理解 StarWork 的工作方式、目录设计和专用术语。
- 期望表现：初始化流程应先帮助新用户建立最小心智模型，再让用户做关键选择。关键术语和选择后果需要用用户语言解释。
- 实际表现：初始化过程中直接出现 `dry-run`、入口文件、覆盖入口文件、已有项目接入、标准结构 / 标准文件等概念；用户不知道这些词是什么意思，也不知道选择会带来什么后果。

## 证据

GitHub Issue：

```text
https://github.com/jennie-shawn/StarWork/issues/4
```

GitHub issue 中的用户反馈摘要：

```text
我第一次使用 StarWork 时，整体初始化和引导体验比较痛苦。问题不只是某一个文案看不懂，而是整个交互过程默认用户已经理解 StarWork 的工作方式、目录设计和一些专用术语。
```

用户指出的典型术语：

```text
dry-run
覆盖入口文件
已有项目接入
标准结构 / 标准文件
当前已有文件 / 现有文件
```

用户指出的典型困惑：

```text
什么是 dry-run？
什么是入口文件？
覆盖入口文件会发生什么？
“已有项目接入”和新建工作台有什么区别？
我应该放心确认，还是应该换路径？
```

## 影响范围

- 影响的功能：`starwork init`、`starworkInit`、初始化 onboarding、已有项目接入、A 测安装 / 使用文档。
- 影响的用户：第一次使用 StarWork 的新用户，尤其是不熟悉 CLI / Agent 工作区术语的用户。
- 是否影响发布 / 升级 / A 测：影响 A 测主链路。初始化是用户第一次接触 StarWork 的核心入口，认知负担过高会直接影响转化和信任。
- 是否有绕行方式：熟悉 StarWork 的用户或开发者可以继续使用现有流程；新用户需要人工解释，不适合作为正式体验。

## 初步判断

- 当前初始化流程偏“配置流程”，而不是“新手引导”。
- CLI / Skill / Docs 没有在关键选择前解释 StarWork 标准结构的设计意图、适用场景和选择后果。
- `dry-run`、入口文件、覆盖、已有项目接入等术语应被替换为用户语言，或在首次出现时提供即时解释。
- 该问题需要 product-planning lane 先收敛 onboarding 语言和交互原则，再交 development lane 落地到 CLI / Skill / Docs。

## 分流结果

- 是否转 SPEC：已转入 `product/planning/features/project-structure/specs/v0.2-init-onboarding-language.md`。
- 是否转 GitHub：已有关联 GitHub Issue #4。
- 是否转开发 lane：后续需要。先由 product-planning lane 定义文案和交互口径。
- 是否需要用户补信息：暂不需要，GitHub issue 已包含足够的痛点和期望体验。

## 下一步

product-planning lane 已升级初始化 onboarding 口径：

```text
product/planning/features/project-structure/specs/v0.2-init-onboarding-language.md
```

development lane 后续落地：

1. 更新 `starworkInit` 的采访和解释话术。
2. 更新 `starwork init` CLI 的提示、dry-run 输出和确认文案。
3. 更新 A 测指南 / 安装指南中面向新用户的解释。

## 产品修复方案

修复重点不是简单替换几个词，而是调整初始化顺序：

1. 先解释 StarWork 工作台是什么，再问用户选择。
2. 每个关键选择都说明“适合谁 / 会发生什么 / 推荐给谁”。
3. `dry-run` 对用户表达为“预览，不写入”。
4. `入口文件` 对用户表达为“AI 读项目规则的说明文件”。
5. 已有项目接入时，默认生成“待整合草稿”，不直接覆盖已有 AI 入口文件。
6. CLI help、dry-run 输出、starworkInit 采访和 A 测文档使用同一套术语。

## 验收方式

- 验收条件 1：第一次使用 StarWork 的用户，不需要理解 `dry-run`、入口文件、覆盖等术语，也能判断下一步是否安全。
- 验收条件 2：初始化过程中每个关键选择都有“适合谁 / 会发生什么 / 推荐给谁”的说明。
- 验收条件 3：标准结构不只是作为选项出现，而是解释其设计思路和价值。
- 验收条件 4：对已有目录操作时，明确说明哪些步骤只是预览，哪些步骤会真实写入文件。
- 关闭标准：product-planning lane 完成口径设计，development lane 落地并通过新手初始化体验复验，同时在 GitHub Issue #4 回填处理结果。

## 处理记录

### 2026-06-08 product-planning 规划升级

已将 `product/planning/features/project-structure/specs/v0.2-init-onboarding-language.md` 从术语替换清单升级为“新手初始化体验 SPEC”。

核心产品判断：

- `ISSUE-016` 不是单纯文案问题，而是初始化一开始就进入配置流程，用户还没理解 StarWork 是什么、能做什么、为什么要初始化。
- 新手第一步需要先建立产品认知：StarWork 是 AI 协作项目工作台，能整理项目说明、当前任务、协作规则、交接记录和健康检查入口。
- 初始化体验应从“产品认知”开始，再告诉用户接下来要做什么，最后才进入选择、预览和写入。
- 安全感仍是关键边界：先预览、不写入；已有项目默认生成待整合草稿，不覆盖原文件。

SPEC 已补充：

- `starworkInit` 第一屏必须回答：StarWork 是什么、能做什么、这次初始化接下来会做什么。
- 新手产品认知模型：项目说明、当前任务、协作规则、交接记录、健康检查。
- 推荐体验流程：讲产品、讲接下来步骤、判断场景、确认服务对象、确认语言/路径/结构、预览、写入和检查。
- CLI help / dry-run 承接同一套口径。
- A 测文档按“产品介绍 -> 能力说明 -> 初始化流程 -> 安全边界 -> 推荐路径”组织。
- 新增 Init-family Skill 统一体验标准：`starworkKnowledge`、`starworkMultiagent`、`starworkDoctor` upgrade flow、`starworkSpawn` 都需要同步采用“先讲能力是什么 / 能做什么 / 接下来几步 / 安全边界”的第一屏结构。
- 已为每个 Init-family Skill 单独写清楚触发场景、第一屏话术、用户引导流程、预览复述格式、完成反馈、必须避免事项和开发验收点，避免 development lane 只做泛化文案替换。
- 分 phase 开发任务和可检查验收标准。

本 issue 状态改为 `ready-for-development`，下一步可转 development lane 落地。

### 2026-06-08 product-planning 首批实现复验未通过

development lane 回传 Project Structure v0.2 / ISSUE-016 首批实现后，product-planning 已复验。结论：暂不关闭，状态改为 `failed-review`。

已通过项：

- `starwork init --help` 已补 StarWork 工作台说明、预览不写入、确认写入和待整合草稿解释。
- `init --dry-run` 已显示“这是预览，不会写入文件”，并出现“会创建 / 会更新 / 不会改动 / 需要你确认”四组。
- 已有项目 dry-run 已说明保留现有文件、生成待整合草稿、不直接覆盖已有 AI 规则文件。
- `init --dry-run --json` 已新增 `user_summary`，包含 `product_purpose`、`mode`、`target_kind`、`will_create`、`will_update`、`will_not_touch`、`needs_confirmation`。
- `starworkInit`、`starworkKnowledge`、`starworkMultiagent`、`starworkDoctor` 已补 Init-family 第一屏。
- README 快速开始已改为先 `--dry-run` 预览，再 `--yes` 写入。

阻塞项：

1. `starworkSpawn` 未纳入本轮实现。
   - SPEC 第一批明确包括 `product/kit-skills/starworkSpawn/SKILL.md`。
   - 当前 `starworkSpawn` 仍从 “Spawn Blueprint 是一个小型配置包” 开始，未先讲“从项目中心创建项目工作台是什么 / 能做什么 / 接下来几步 / 安全边界”。
   - 测试也未覆盖 `starworkSpawn` 的 Init-family 第一屏。

2. `init --dry-run` 非 JSON 分组没有完整展示所有将写入文件。
   - 现实现只把 `mode=create` 放入“会创建”，只把 `overwrite-empty` 放入“会更新”。
   - 手工 smoke 中 `.starwork/rules/pack.general.overview.md`、`.starwork/rules/pack.general.workflow.md`、`.starwork/rules/manifest.json`、`.starwork/rules/index.md` 实际会写入，但未出现在非 JSON 的“会创建 / 会更新”列表中。
   - 对小白用户来说，这违背“预览告诉用户接下来会发生什么”的核心目标。

3. `user_summary.will_update` 可能把实际新建文件表达成更新。
   - 同一手工 smoke 中，上述 `.starwork/rules/*` 在目标目录不存在时仍进入 `will_update`。
   - `user_summary` 是给 Skill 复述用的用户友好摘要，不能让 Skill 告诉用户“会更新”实际不存在的文件。

复验命令：

```bash
node --check product/cli/src/cli.js
node --check product/cli/test/init.test.js
git -C product diff --check
node --test product/cli/test/init.test.js --test-name-pattern 'init-family skills|init help|dry-run does not write files|existing project draft safety|json dry-run includes user summary|creates a single-light workspace'
npm test
```

结果：

- `node --check` 通过。
- `git -C product diff --check` 通过。
- 目标回归测试命令实际运行 103/103，通过。
- `npm test` 103/103，通过。
- 手工 smoke 验证了现有 dry-run / JSON 输出，但发现上述分组问题。

修复要求：

- 按 v0.2 SPEC 第 11 节补 `starworkSpawn` 第一屏、流程和对应测试。
- 修正 init dry-run 分组：所有确认后会写入的文件必须出现在“会创建”或“会更新”里；不存在的目标文件不能只因为 action mode 是 `overwrite` 就被归为“会更新”。
- 修正 `user_summary`：`will_create` / `will_update` 要反映用户视角下的真实创建/更新，而不是内部 action mode。
- 补测试覆盖：`starworkSpawn` Init-family 第一屏；dry-run 和 `user_summary` 对 `.starwork/rules/*` 这类 planned overwrite action 的用户分组。

### 2026-06-08 product-planning 二次复验通过

development lane 已修复首轮阻塞项。产品复验结论：通过，关闭本 issue。

确认点：

- `starworkSpawn` 已补 Init-family 第一屏：先讲“从项目中心创建项目工作台”是什么、项目中心与项目工作台关系、接下来三步和安全边界，再进入 Blueprint 说明。
- `init --dry-run` 的“会创建 / 会更新”已按目标文件真实存在性归类；`.starwork/rules/pack.general.overview.md`、`.starwork/rules/manifest.json`、`.starwork/rules/index.md` 等 rule 文件在空目标目录 dry-run 中进入“会创建”。
- `init --dry-run --json` 的 `user_summary.will_create` / `user_summary.will_update` 使用同一套用户视角归类；目标不存在时进入 `will_create`，目标已存在时进入 `will_update`。
- `starworkInit`、`starworkKnowledge`、`starworkMultiagent`、`starworkDoctor`、`starworkSpawn` 均已覆盖 Init-family 第一屏要求。

复验命令：

```bash
node --check product/cli/src/cli.js
node --check product/cli/test/init.test.js
git -C product diff --check
node --test product/cli/test/init.test.js --test-name-pattern "init-family skills|rule slot writes|planned overwrites"
npm test
```

结果：

- `node --check` 通过。
- `git -C product diff --check` 通过。
- 目标回归测试命令实际运行 105/105，通过。
- `npm test` 105/105，通过。
- 手工 smoke 确认 `.starwork/rules/*` 在空目标目录进入“会创建”，已有文件进入 `user_summary.will_update`。
