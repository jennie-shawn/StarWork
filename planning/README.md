# Product Planning

这里是 StarWork 的产品规划事实源。

它承接过去 `matters/` 中有长期价值的产品判断、功能 SPEC、讨论沉淀、参考资料和验收材料，但不再按“事项”归档，而是按产品功能归档。

## 路由

- 功能规划、版本 SPEC、讨论沉淀、参考资料、验收材料进入 `features/<feature>/`。
- 反馈、bug、A 测问题、验收阻塞和需要跟踪的问题闭环进入 `issues/`。
- 跨功能产品决策进入 `decisions/`。
- 路线图和里程碑事实源进入 `roadmap/`。
- 新想法、用户反馈转化的需求、待判断问题和候选需求先进入 `inbox/` 需求池，后续再分流到功能档案、路线图或归档。
- 旧事项和废弃材料进入 `archive/`。

## 边界

- 实现代码不放这里，仍进入 `product/core/`、`product/cli/`、`product/skills/`、`product/kit-skills/`、`product/packs/` 等实现目录。
- 面向用户或 Agent 的正式阅读文档仍进入 `product/docs/`。
- `product/planning/` 解释“为什么这样做、功能如何演变、如何验收”。
- `issues/index.md` 只做轻量看板；每个问题的完整事实、证据、处理记录和验收方式写入独立 `ISSUE-XXX.md`。完整方案仍进入对应功能 SPEC 或开发计划。

## 当前试点

- `features/knowledge-base/`：知识库能力。
- `features/project-structure/`：当前项目结构重整。
- `issues/`：StarWork 本地 issue 反馈与跟踪机制。
