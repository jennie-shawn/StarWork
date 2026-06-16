# `starworkDoctor` Skill SPEC

## 状态

- 版本：v0.1 draft
- 所属模块：StarWork Skills
- Skill 名称：`starworkDoctor`
- 相关命令：`starwork doctor`、`starwork upgrade`
- 实现状态：已实现第一版；本版合并原独立升级 skill 的升级蓝图设计能力
- 目标：帮助 Agent 基于 `doctor` 暴露的探测信息，判断当前目录和 StarWork Core 工作逻辑的贴近程度；对普通旧模板和 Hub-like 主库分别给出清晰诊断，并在用户要求升级时生成可 dry-run、可执行的 `upgrade blueprint`

## 一句话定义

`starworkDoctor` 是 StarWork 工作区诊断与升级蓝图设计 skill。

它不是 `doctor` 命令本身，也不是 `upgrade` 执行器，而是 CLI 探测之后的 AI 分析层：

```text
starwork doctor --json
  ↓
目录结构、关键文件、signals、checks
  ↓
starworkDoctor skill 理解 Core 逻辑
  ↓
诊断报告 / 整理建议
  ↓ 用户明确要求升级
upgrade-blueprint.json / rules / dry-run 命令
  ↓
starwork upgrade --blueprint
```

## 核心修正

本 skill 的主线任务不是判断“当前目录像哪个 Kit / Pack”。

主线任务是：

> 判断当前目录和 StarWork Core 的工作逻辑有多贴近，以及应该如何整理成一个可升级、可维护、可被 Agent 接手的工作台。

原独立升级 skill 不再作为系统 Skill 维护。它不能脱离 `starworkDoctor` 诊断独立使用，因此升级蓝图设计能力合并进 `starworkDoctor`：

- 诊断阶段：默认只解释现状、风险和整理建议。
- 升级阶段：用户明确要求升级时，继续采访并生成 blueprint。

Kit / Pack 只是落地执行时的候选参数，不是诊断主轴。v0.1 单项目升级默认 `general` Pack；Hub-like 主库升级默认 `hub + preserve-names + pack:null`，不创建重复标准目录。

## 产品边界

| 层 | 负责 | 不负责 |
|---|---|---|
| `doctor` CLI | 探测目录、列事实、输出 JSON、暴露信号和不确定性 | 做复杂语义判断、输出 next steps |
| `starworkDoctor` skill | 解释、判断 Core 贴近度、追问、建议整理路径、生成 upgrade blueprint | 静默改文件、替用户做不可逆迁移 |
| `starwork upgrade` CLI | 校验和执行用户确认过的 blueprint | 自行判断业务语义 |

## 对 `doctor` 输出的要求

`doctor --json` 只输出事实和信号，不输出行动建议。

应包含：

```json
{
  "schema": "starwork.doctor.result.v0.1",
  "target": "/path/to/workspace",
  "workspace_root": null,
  "workspace": null,
  "inventory": {
    "directories": [
      { "path": "资料库", "depth": 1, "children_count": 8 },
      { "path": "成稿", "depth": 1, "children_count": 3 }
    ],
    "files": [
      { "path": "README.md", "size": 2048 },
      { "path": "AGENTS.md", "size": 512 }
    ]
  },
  "signals": {
    "agent_entry": ["AGENTS.md"],
    "agent_rule_files": ["AGENTS.md"],
    "system_dirs": ["_系统"],
    "matter_dirs": ["事项"],
    "possible_reference_dirs": ["资料库", "素材"],
    "possible_output_dirs": ["成稿", "交付物"],
    "possible_draft_dirs": ["草稿"],
    "possible_current_work_dirs": ["推进"],
    "project_status_files": ["_系统/上下文/当前项目.md"],
    "current_work_files": ["_系统/任务/当前工作.md"],
    "decision_files": ["_系统/上下文/decisions.md"],
    "identity_dirs": ["identity"],
    "lessons_dirs": ["lessons"],
    "hub_project_dirs": ["projects"],
    "hub_coordination_dirs": ["projects/coordination"],
    "hub_incoming_dirs": [".incoming"],
    "hub_knowledge_dirs": ["knowledge"],
    "project_registry_files": ["projects/registry.json"],
    "hub_candidate_paths": ["projects", "projects/registry.json", "projects/coordination", ".incoming", "identity", "lessons", "knowledge", "skills"],
    "readonly_candidate_dirs": ["资料库", "identity", "lessons"],
    "writable_candidate_dirs": ["草稿", "推进", "事项"]
  },
  "upgrade": {
    "candidate": true,
    "source": "legacy-template",
    "confidence": "medium",
    "inferred": {
      "language": "zh",
      "workspace_type": "project",
      "references": ["资料库"],
      "outputs": ["成稿"],
      "reasons": {
        "language": ["_系统 是中文工作区信号"],
        "workspace_type": ["事项 表示存在事项或多线推进推进结构"],
        "references": ["资料库 命中参考资料候选信号"],
        "outputs": ["成稿 命中成果或输出候选信号"]
      }
    }
  },
  "checks": []
}
```

`upgrade` 中不应包含 `next_steps`，避免影响 Agent 基于 skill 做判断。

## 话术原则

`starworkDoctor` 的产品气质是“温和诊断师”，不是严格 linter。

诊断结论的第一屏必须先说人话：

1. 能不能接入 StarWork。
2. 会不会移动、改名或覆盖旧目录。
3. 下一步是确认语义、生成 dry-run blueprint，还是不建议升级。

必须使用三段式表达：

1. `我看到的事实`：来自 CLI、目录和关键文件。
2. `我推测的角色`：AI 基于事实做的 Core 角色映射。
3. `需要你确认的地方`：影响升级蓝图的语义判断。

推荐表达：

```text
我先把它当作“历史工作区候选”来看。当前它还不是标准 StarWork 工作台，但目录里已经有资料、成果或推进痕迹，适合先走无损诊断路线。
```

```text
“成稿/”很可能是正式成果区，但我还不能只凭目录名确认。需要你确认：这里是否只放已经认可的最终版本？
```

```text
现在缺少一个稳定的“当前工作入口”。这不代表目录有问题，只是新 Agent 进来时会比较难判断下一步该接哪里。
```

禁止把低置信度判断说成事实，避免使用“坏了”“不合格”“必须迁移”等压迫性表达。

第一次出现 `workspace state` 时，必须解释为“StarWork 工作台身份证”。`Core fit` 和 `upgrade readiness` 必须分开表达。需要用户回答的问题最多 3 个，只问会影响 blueprint 的语义。

## Skill 输入

用户可能这样触发：

- “帮我看看这个旧模板怎么升级 StarWork”
- “这个文件夹能不能用 StarWork doctor 检查一下”
- “doctor 输出我看不懂，你帮我解释一下”
- “这个目录和 StarWork Core 的逻辑接近吗”
- “我应该怎么整理这个工作区”
- “帮我生成 upgrade blueprint”
- “我想保留现在的目录名，但让它符合 StarWork”
- “这个项目适不适合开启多 AI 协作”
- “MultiAgent 让我先检查项目入口和边界”

skill 启动后应优先运行：

```bash
starwork doctor --target <path> --json --inventory-depth all
```

如果用户没有指定路径，先确认目标目录。

## MultiAgent preflight

当用户从 MultiAgent 入口进入，`starworkDoctor` 先作为多 AI 协作前的只读检查层，而不是升级执行层。

首屏必须先回答：

```text
多 AI 协作准备度：

结论：现在是否适合继续创建 AI 岗位。
文件影响：这次只是检查，不会改项目文件。
下一步：可以继续设计岗位 / 需要先补入口说明 / 需要先确认写入边界。
```

检查维度至少覆盖：

| 维度 | 用户问题 | 缺失时用户影响 |
|---|---|---|
| 项目背景 | 另一个 AI 能不能看懂这个项目是做什么的？ | 其他 AI 接手时可能要你重新解释项目目标 |
| 当前任务 | 另一个 AI 能不能知道现在正在推进什么？ | 分工后容易不知道先接哪一步 |
| AI 入口 | AI 进来先读哪里？ | 不同 AI 可能读到不一致规则 |
| 草稿 / 正式内容边界 | 哪些是草稿，哪些是确认版？ | AI 可能误改正式成果，或把草稿当最终版 |
| 写入边界 | 哪些内容能整理，哪些要先问？ | 多个 AI 可能互相抢改或改到不该改的文件 |
| 交接位置 | 工作记录和共享成果放哪里？ | 一个 AI 做完后，另一个 AI 不知道看哪里 |

MultiAgent preflight 默认不生成 upgrade blueprint，不执行 repair，也不写文件。用户明确要求补齐、修复或接入时，再转 `starworkInit` 或升级方案流程，并且仍要先 dry-run 预览、再等用户确认。

缺失项必须翻译成用户影响：

```text
现在缺少“当前任务入口”。这不代表项目有问题，但另一个 AI 接手时可能不知道你现在要它接哪一步。
```

```text
现在草稿和确认版边界还不够清楚。多个 AI 同时协作时，可能把草稿当成最终成果，或误改已经确认的内容。
```

## Skill 工作流程

### Step 1：读取 doctor 探测结果

读取 JSON 后先判断：

- 是否已有标准 StarWork workspace
- 是否缺少 workspace state
- 是否有 inventory
- 是否有 signals
- fail 是结构缺失，还是非 StarWork 目录

把 doctor 输出当作事实和信号，不当作最终结论。

### Step 2：读取少量关键文件

在不扩大上下文的前提下，读取最能解释项目性质的文件：

- `README.md`
- `AGENTS.md`
- `CLAUDE.md`
- `_系统/上下文/项目状态.md`
- `_系统/上下文/当前项目.md`
- `_系统/任务/当前工作.md`
- `matters/registry.md`
- `事项/注册表.md`

如果文件不存在，只记录缺失。

### Step 3：建立 Core 角色映射

基于目录名称、父子关系、README 和少量关键文件，推断目录和 Core 角色的候选映射。

Core 角色包括：

- Agent 入口规则
- 项目状态
- 当前工作
- 参考资料 / 原始资料
- 草稿 / 临时产物
- 正式成果 / 事实源
- 事项推进
- 决策记录
- 身份偏好
- 经验教训
- Hub-like 主库：项目登记、项目注册表、跨项目联络、回写待审、共享身份、共享教训、共享知识、共享 skills

输出时使用“候选 + 置信度 + 理由 + 是否需要用户确认”。

### Step 4：判断 Core 逻辑贴近程度

诊断矩阵必须覆盖：

| 维度 | 判断问题 |
|---|---|
| 入口规则 | Agent 进来先读什么？ |
| 项目状态 | 项目现在是什么状态？ |
| 当前工作 | 下一步正在推进什么？ |
| 信息边界 | 资料、草稿、正式成果是否分开？ |
| 长期记忆 | 身份、教训、决策是否有稳定位置？ |
| 事项机制 | 项目工作台是否有过程记录和交接结构？ |
| 写入风险 | 哪些目录应只读，哪些目录允许 Agent 写？ |

每项状态使用：

- 清楚
- 部分清楚
- 缺失
- 不确定

整体贴近度使用：

- 高
- 中
- 低
- 不确定

不要伪造精确分数。

升级准备度单独判断：

- `ready`：关键目录语义已确认，可以生成 blueprint。
- `needs-confirmation`：目录逻辑贴近，但还需要确认正式事实源、当前工作或 Hub 映射。
- `not-recommended`：目标已经是健康 StarWork 工作台，或不适合升级。

### Step 5：形成整理和升级建议

建议应围绕 Core 逻辑补齐：

- 哪些现有目录应保留原名
- 哪些目录应映射为 Core 角色
- 哪些 Core 必需文件需要补齐
- 是否需要事项机制
- 是否是 Hub-like 主库；如果是，是否应使用 `hub + preserve-names + pack:null`
- 是否需要先保持旧模板，只补 state 和入口规则
- 是否适合进入 `starwork upgrade --blueprint --dry-run`

如果用户只是要诊断，到这里停止，不生成 blueprint。

### Step 6：用户要求升级时确认关键语义

只有用户明确说“帮我升级”“生成 blueprint”“走 dry-run”“整理成 StarWork 工作台”时，才进入升级设计。

必须确认：

1. 哪个目录是正式成果 / 确认事实源？
2. 哪个目录是当前工作 / 日常推进区？
3. 哪些目录是只读参考资料？
4. 是否需要事项机制？
5. 希望保留旧目录名，还是逐步标准化？

Hub-like 主库必须优先确认：

1. 哪个目录是项目总登记区？
2. 哪个目录是跨项目协调入口？
3. 哪个目录是回写待审区？

一次最多问 3 个问题。

友好问法：

```text
未来你希望 Agent 把哪里当成“不能乱改的正式成果”？
```

```text
你平时真正干活的地方在哪里？比如推进事项、写草稿、放待办、记录阶段判断。
```

```text
这些旧目录你想继续保留原名，还是希望我帮你慢慢整理成 StarWork 的标准中文结构？
```

### Step 7：选择升级策略

默认选择：

```text
preserve-names
```

也就是保留用户已有目录名，通过 `.starwork/workspace.json` 和 Agent 规则建立 StarWork Core 映射。

除非用户明确要求，不要建议移动历史内容。

默认 base：

| 诊断类型 | base |
|---|---|
| 单事务旧模板 | `single-light + local-starter + general` |
| 多线推进旧模板 | `project + project + general` |
| Hub-like 主库 | `hub + hub + pack:null` |

### Step 8：生成升级蓝图目录

推荐输出：

```text
<workspace>-upgrade/
├── upgrade-blueprint.json
├── rules/
│   ├── core-boundaries.md
│   ├── file-boundaries.md
│   └── upgrade-notes.md
└── seed/
    └── ...
```

`rules/core-boundaries.md` 应说明：

- 哪些目录是正式成果
- 哪些目录是当前工作区
- 哪些目录是参考资料
- 哪些目录保留历史命名
- Agent 不能覆盖或移动哪些历史内容

### Step 9：生成 `upgrade-blueprint.json`

蓝图必须符合：

```json
{
  "schema": "starwork.upgrade_blueprint.v0.1",
  "target": ".",
  "generated_by": "starworkDoctor",
  "source": {
    "doctor_schema": "starwork.doctor.result.v0.1",
    "diagnosis": "legacy-template",
    "core_fit": "medium"
  },
  "base": {
    "workspace_type": "project",
    "kit": "project",
    "language": "zh",
    "pack": "general"
  },
  "strategy": "preserve-names",
  "paths": {
    "formal_source": "成稿/",
    "business_work_area": "事项/"
  },
  "core_role_mapping": [
    {
      "role": "references",
      "path": "资料库/",
      "confidence": "high",
      "reason": "用户确认资料库是参考资料区"
    }
  ],
  "actions": [
    { "type": "ensure_dir", "path": ".starwork/" },
    { "type": "write_workspace_state" },
    { "type": "copy_kit_missing_files" },
    {
      "type": "inject_agent_rules",
      "target": "AGENTS.md",
      "from": "rules/core-boundaries.md",
      "slot": "upgrade.core_boundaries"
    }
  ],
  "preserve": [
    "资料库/",
    "成稿/",
    "事项/"
  ],
  "verification": {
    "run_doctor_after": true,
    "expected_workspace_type": "project"
  }
}
```

## 输出格式

诊断模式：

```text
## 诊断结论

## 我看到的事实

## 我推测的角色

## Core 逻辑贴近程度

## 缺失和风险

## 整理升级建议

## 需要你确认的问题
```

升级设计模式：

```text
## 升级判断

## 用户已确认的目录语义

## 升级策略

## 生成的 blueprint 文件

## dry-run 命令

## 执行前请再次确认
```

dry-run 命令：

```bash
starwork upgrade --target <workspace> --blueprint <workspace>-upgrade/upgrade-blueprint.json --dry-run
```

用户确认后：

```bash
starwork upgrade --target <workspace> --blueprint <workspace>-upgrade/upgrade-blueprint.json --yes
starwork doctor --target <workspace>
```

## 机器可读建议

如果需要给 CLI 或后续流程使用，可以附加：

```json
{
  "schema": "starwork.doctor_skill.recommendation.v0.1",
  "target": "/path/to/workspace",
  "diagnosis": "legacy-template",
  "core_fit": "medium",
  "upgrade_readiness": "needs-confirmation",
  "core_role_mapping_candidates": {
    "formal_source": [
      {
        "path": "成稿/",
        "confidence": "high",
        "reason": "目录名表示最终稿",
        "needs_user_confirmation": true
      }
    ],
    "references": [
      {
        "path": "资料库/",
        "confidence": "high",
        "reason": "目录名表示资料沉淀",
        "needs_user_confirmation": true
      }
    ],
    "business_work_area": [
      {
        "path": "事项/",
        "confidence": "high",
        "reason": "已有事项结构",
        "needs_user_confirmation": true
      }
    ]
  },
  "blocking_risks": [
    "缺少 workspace state，CLI 无法把目录识别为标准 StarWork 工作台。"
  ],
  "confirmation_questions": [
    "成稿/ 是否就是你确认后的正式成果？",
    "资料库/ 是否默认只读？"
  ]
}
```

## 话术验收样例

以下样例是 `starworkDoctor` 的 golden examples。后续改写 skill 时，输出可以更自然，但必须保留“事实 / 推断 / 待确认”的边界和温和诊断语气。

### 样例一：标准 StarWork 工作台

输入特征：

- `doctor --json` 中 `workspace` 存在。
- `checks.fail = 0`。
- `AGENTS.md`、项目状态、当前工作、正式事实源和业务工作区都存在。

期望输出：

```text
## 诊断结论

这个目录已经是一个健康的 StarWork 工作台。当前不需要走 upgrade；如果你只是想继续扩展能力，应优先考虑 `adapt`、`pack install` 或后续版本的 `update`，而不是历史模板升级。

## 我看到的事实

- CLI 已识别到 `.starwork/workspace.json`。
- `doctor` 没有发现阻塞项。
- Agent 入口、项目状态、当前工作和 workspace state 声明的事实源都存在。

## 我推测的角色

- `AGENTS.md`：Agent 入口规则，置信度高。
- workspace state 中的 `paths.formal_source`：正式事实源，置信度高。
- workspace state 中的 `paths.business_work_area`：日常工作区，置信度高。

## Core 逻辑贴近程度

整体贴近度：高。

诊断矩阵：
- 入口规则：清楚。
- 项目状态：清楚。
- 当前工作：清楚。
- 信息边界：清楚。
- 长期记忆：按当前 Kit 配置判断为清楚或部分清楚。
- 事项机制：按 workspace type 判断；如果是 single-light，不需要额外补事项机制。
- 写入风险：基本可控。

## 整理升级建议

不建议使用 `starwork upgrade`。这个命令只面向还不是 StarWork 的历史目录。
```

验收点：

- 不说“需要升级”。
- 不要求用户生成 blueprint。
- 不把 `single-light` 说成“缺少事项机制”的问题。

### 样例二：轻量旧模板

输入特征：

- 没有 `.starwork/workspace.json`。
- 存在 `AGENTS.md`、`references/`、`outputs/final/`、`outputs/drafts/`。
- 没有 `事项/` 或 `matters/`。

期望输出：

```text
## 诊断结论

我先把它当作“历史工作区候选”来看。当前它还不是标准 StarWork 工作台，但已经有 Agent 入口、参考资料和输出分区，适合走无损补齐路线。

## 我看到的事实

- `doctor` 没有找到 `.starwork/workspace.json`。
- 目录里有 `AGENTS.md`，说明已有 Agent 入口规则。
- `references/` 命中参考资料候选信号。
- `outputs/final/` 和 `outputs/drafts/` 命中成果 / 草稿候选信号。
- 未看到事项或多线推进推进目录。

## 我推测的角色

- `references/`：可能是参考资料区，置信度高，但仍建议确认是否默认只读。
- `outputs/final/`：可能是正式成果区，置信度中到高，需要确认这里是否只放最终确认版本。
- `outputs/drafts/`：可能是草稿区，置信度高。

## Core 逻辑贴近程度

整体贴近度：中。

诊断矩阵：
- 入口规则：部分清楚。
- 项目状态：缺失。
- 当前工作：缺失。
- 信息边界：部分清楚。
- 长期记忆：缺失或不确定。
- 事项机制：不需要直接补；当前更像单事务工作区。
- 写入风险：部分可控，正式成果区需要用户确认。

## 整理升级建议

建议先保留原目录名，不移动历史内容。可以通过 `starworkDoctor` 生成 `upgrade-blueprint.json`，让 `starwork upgrade --blueprint --dry-run` 只补 `.starwork/workspace.json`、缺失的 Core 入口文件和必要的 Agent 边界说明。

## 需要你确认的问题

- `outputs/final/` 是否就是不能被 Agent 随意改写的正式成果区？
- `references/` 是否默认只读？
- 你希望日常推进继续放在 `outputs/drafts/`，还是另设一个当前工作入口？
```

验收点：

- 使用“可能是”“需要确认”，不把目录名推断说成事实。
- 建议 `single-light + local-starter`，但不直接声称用户必须迁移。
- 强调无损补齐。

### 样例三：多线推进旧模板

输入特征：

- 没有 `.starwork/workspace.json`。
- 存在 `_系统/`、`事项/`、`资料库/`、`成稿/`、`推进/`。
- 中文路径占主导。

期望输出：

```text
## 诊断结论

这个目录还不是标准 StarWork 工作台，但它已经有系统目录、事项推进、资料区和成果区信号。它和 StarWork 的多线推进工作逻辑比较接近，适合按“保留旧目录名”的方式做无损升级。

## 我看到的事实

- `doctor` 没有找到 `.starwork/workspace.json`。
- `_系统/` 命中系统目录信号。
- `事项/` 命中多线推进推进信号。
- `资料库/` 命中参考资料候选信号。
- `成稿/` 命中成果候选信号。
- `推进/` 命中当前工作候选信号。

## 我推测的角色

- `事项/`：可能是多线推进过程记录区，置信度高。
- `资料库/`：可能是参考资料区，置信度高，需要确认是否默认只读。
- `成稿/`：可能是正式成果区，置信度中到高，需要确认是否只放确认后的版本。
- `推进/`：可能是当前工作区，也可能只是临时任务区，置信度中，需要确认。

## Core 逻辑贴近程度

整体贴近度：中到高。

诊断矩阵：
- 入口规则：看是否存在 `AGENTS.md`；不存在则缺失。
- 项目状态：部分清楚或缺失，取决于 `_系统/` 内是否有状态文件。
- 当前工作：部分清楚，`推进/` 是候选但需确认。
- 信息边界：部分清楚。
- 长期记忆：部分清楚。
- 事项机制：清楚。
- 写入风险：需要明确 `成稿/` 和 `资料库/` 的只读边界。

## 整理升级建议

建议生成 `project + project` 的升级 blueprint，策略使用 `preserve-names`。第一步只补 StarWork state、Core 缺失文件和 Agent 边界说明，不移动 `资料库/`、`成稿/`、`事项/`、`推进/` 的历史内容。

## 需要你确认的问题

- `成稿/` 是否就是正式事实源？
- `推进/` 是否是日常工作区，还是只是一类临时任务？
- `资料库/` 是否默认只读？
- `事项/` 是否要作为多线推进过程记录继续保留？
```

验收点：

- 可以建议 `project + project`，但必须说明来自事项/多阶段信号。
- `推进/` 必须保持不确定，不可直接写入 blueprint 除非用户确认。
- 输出应让用户感到这是“可整理”，不是“目录坏了”。

### 样例四：Hub-like 主库候选

输入特征：

- 没有 `.starwork/workspace.json`。
- 存在 `identity/`、`lessons/`、`knowledge/`、`skills/`、`projects/registry.json`、`projects/coordination/`、`.incoming/`。
- `doctor --json` 的 `upgrade.source` 为 `hub-like-main-repository`，或 `signals.hub_candidate_paths` 命中多个主库信号。

期望输出：

```text
## 诊断结论

结论：这个目录更像“主库 / 多项目中枢”候选，而不是普通单项目旧模板。它可以考虑接入 StarWork，但建议走无损接入：保留 `projects/`、`knowledge/`、`skills/` 等原名，不移动、不改名、不覆盖历史内容。

现在缺的是 StarWork 工作台身份证，也就是 `.starwork/workspace.json`。没有它，CLI 还不能稳定识别这个目录的类型、写入边界和目录映射。

下一步不是直接迁移，而是先确认 3 个 Hub 语义，再生成只预览不写入的 dry-run blueprint。

## 我看到的事实

- `doctor` 没有找到 `.starwork/workspace.json`。
- `projects/registry.json` 像项目总登记。
- `projects/coordination/` 像跨项目协调入口。
- `.incoming/` 像回写待审区。
- `identity/`、`lessons/`、`knowledge/`、`skills/` 都是主库共享资源信号。

## 我推测的角色

- `projects/`：候选角色是项目登记区。依据是存在 `projects/registry.json`；置信度高。需要确认：这里是否仍是主库维护的项目总登记？
- `projects/coordination/`：候选角色是跨项目协调入口。依据是目录名和主库结构；置信度高。需要确认：这里是否继续放跨项目联络和协调记录？
- `.incoming/`：候选角色是回写待审区。依据是目录名和主库流程；置信度中到高。需要确认：这里是否继续接收待审核沉淀？

## Core 逻辑贴近程度

整体贴近度：高。
升级准备度：needs-confirmation。

诊断矩阵：
- 入口规则：清楚或部分清楚，取决于 `AGENTS.md` / `CLAUDE.md`。
- 项目状态：部分清楚，主库有项目登记，但还缺 StarWork 工作台身份证。
- 当前工作：部分清楚，跨项目协调入口存在，但需要确认是否写入 `business_work_area`。
- 信息边界：清楚。
- 长期记忆：清楚。
- 事项机制：不按单项目事项判断，应按 Hub / 主库判断。
- 写入风险：可控，但必须保护共享身份、教训、知识和 skills。

## 整理升级建议

建议生成 `hub + hub + pack:null` 的升级 blueprint，策略使用 `preserve-names`。这表示保留旧目录名，只补 StarWork 工作台身份证和 Agent 边界规则，不安装 `hub-management` Pack，也不创建重复标准目录。

## 需要你确认的问题

- `projects/` 是否就是项目总登记区？
- `projects/coordination/` 是否就是跨项目协调入口？
- `.incoming/` 是否继续作为回写待审区？
```

验收点：

- 不建议 `project + project`。
- 明确说明 `pack:null` 是为了避免创建重复标准目录。
- 首屏必须回答能否接入、是否移动旧目录、下一步做什么。

## 约束

- 不静默修改用户文件。
- 不把低置信度判断说成事实。
- 不把 Kit / Pack 贴近度当作主线诊断。
- 不只根据一个目录名判断目录角色。
- 不鼓励用户立即执行破坏性迁移。
- 不读取大量内容文件，除非用户明确要求深入审计。
- 不把 `doctor` 的 legacy 判断当作最终结论；它只是信号。
- 不直接执行 `starwork upgrade --yes`，除非用户明确要求。
- 不生成包含绝对路径、`..`、`.git/`、`node_modules/` 写入动作的 blueprint。
- 不主动推荐未定稿业务 Pack；v0.1 单项目升级默认 `general`，Hub-like 主库默认 `pack:null`。

## 与 CLI 的关系

后续保持三层：

1. `doctor --json` 持续增强 `inventory`、`signals`、`checks` 和推断理由输出。
2. `starworkDoctor` 基于这些信息输出诊断建议；用户要求升级时生成 blueprint。
3. `starwork upgrade --blueprint` 在用户确认后执行低风险升级动作。
