# 需求池注册表

| id | title | source | category | status | owner | target | updated |
|---|---|---|---|---|---|---|---|
| 2026-06-01-personal-task-board | 个人任务管理看板 | 用户想法 | ideas | inbox | product-planning | - | 2026-06-01 |
| 2026-06-01-agent-lane-dashboard | Agent Lane 集中管理与任务分发看板 | 用户想法 | ideas | inbox | product-planning | - | 2026-06-01 |
| 2026-06-10-ai-consultant-review | 外部 AI 顾问评审报告：定位、Core 设计、执行回路、商业化与迭代节奏 | 外部顾问评审 | feedback | inbox | product-planning | - | 2026-06-10 |
| 2026-06-10-ai-consultant-structure-and-strategy | 外部 AI 顾问深度建议：工作台结构、记忆分层与宿主生存战略 | 外部顾问评审 | feedback | inbox | product-planning | - | 2026-06-10 |

## 字段说明

| 字段 | 说明 |
|---|---|
| `id` | 条目文件名，不含 `.md`。 |
| `title` | 需求或想法标题。 |
| `source` | 来源，例如用户想法、A 测反馈、产品判断、技术债、竞品启发。 |
| `category` | `ideas`、`feedback`、`questions`、`candidates` 或 `archived`。 |
| `status` | `inbox`、`triaging`、`candidate`、`accepted`、`merged`、`rejected`、`archived`。 |
| `owner` | 当前负责判断的人或 lane。 |
| `target` | 如果已经迁移，填写目标 feature、SPEC 或决策路径。 |
| `updated` | 最后更新时间，使用 `YYYY-MM-DD`。 |
