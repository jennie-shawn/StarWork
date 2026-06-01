# 需求池

这里是 StarWork 产品需求池。

所有尚未进入正式功能档案、路线图或 SPEC 的产品想法，都先从这里进入。

它不是长期归档区，也不是随手笔记堆。它负责把“一个想法”变成可判断、可分流、可追踪的产品需求。

## 目录结构

```text
inbox/
├── README.md
├── registry.md
├── templates/
│   └── request.md
├── ideas/
├── feedback/
├── questions/
├── candidates/
└── archived/
```

## 分类

| 位置 | 放什么 |
|---|---|
| `ideas/` | 原始产品想法，还没有判断价值和归属。 |
| `feedback/` | 来自 A 测、用户试用、外部观察的需求线索。 |
| `questions/` | 还没想清楚的问题、分歧和待判断点。 |
| `candidates/` | 已初步判断值得进入路线图或功能档案的候选需求。 |
| `archived/` | 已合并、放弃、完成或失效的需求池条目。 |

## 条目状态

| 状态 | 含义 |
|---|---|
| `inbox` | 刚记录，尚未整理。 |
| `triaging` | 正在判断价值、范围或归属。 |
| `candidate` | 初步值得做，但还没进入正式功能档案。 |
| `accepted` | 已决定进入功能档案、roadmap 或 SPEC。 |
| `merged` | 已合并到另一个需求或已有功能。 |
| `rejected` | 决定不做。 |
| `archived` | 已归档，不再活跃跟踪。 |

## 路由规则

```text
新想法
  -> ideas/

用户反馈转来的需求
  -> feedback/

还没想清楚的问题
  -> questions/

初步值得做的候选
  -> candidates/

已决定开发或规划
  -> product/planning/features/<feature>/

跨功能重大判断
  -> product/planning/decisions/

不做、合并、完成或失效
  -> archived/
```

## 使用规则

1. 每个需求池条目都应该在 `registry.md` 有一行。
2. 条目文件名建议使用日期和短标题，例如 `2026-06-01-knowledge-demand-pool.md`。
3. 原始描述要保留，不要一开始就改写成漂亮 SPEC。
4. 如果需求已经进入正式功能档案，在 registry 里写清目标路径。
5. 不要把实现代码、正式 SPEC 或长期决策留在需求池里。

## 新条目模板

复制 `templates/request.md` 到对应分类目录，然后填写。
