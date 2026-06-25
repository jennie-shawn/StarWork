# ISSUE-032：Product Lead 可越过模块产品 Agent 直接写正式需求并派发开发

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | workflow / product / skill |
| 优先级 | P0 |
| 状态 | new |
| 来源 | 用户反馈 / 真实项目 |
| 发现日期 | 2026-06-22 |
| 关联 GitHub Issue | 无 |
| 关联 SPEC | 待 product-multiagent 设计 |
| 关联验收 | 无 |
| 负责人 | product-multiagent |

## 现象

- 用户可见表现：product-lead 在收到“去下需求”后，直接写入正式 `product/planning/**` SPEC / ISSUE，并通知 development。
- 期望表现：product-lead 负责方向判断、验收、晋升和派发；具体模块需求应先由对应模块产品 Agent 在 lane workspace 输出草案。没有合适 owner 时，应先说明 owner 缺口，不应自行代写模块正式 SPEC。
- 实际表现：product-lead 曾越过 product-multiagent，直接创建 v0.15 正式 SPEC / issue 并派发 development，后由用户指出边界错误并撤回。

## 证据

```text
用户反馈：
“你的工作边界不够清晰，你不应该自己写需求文档，你应该把任务派给下面的产品负责agent去写，如果没有合适的专门负责的产品agent，你应该提出来”
```

## 影响范围

- 影响的功能：产品模块分工、SPEC 晋升、development 派发、workflow gate。
- 影响的用户：所有依赖 StarWork 多产品 Agent 分工的用户。
- 是否影响发布 / 升级 / A 测：影响 StarWork 作为多 Agent 组织系统的可信度。
- 是否有绕行方式：用户手动指出越界，但不可依赖。

## 初步判断

需要把 Product Lead / Module Product Owner 的产物晋升与开发派发 Gate 写成硬规则，而不是仅靠 worklog 或口头约定。

## 分流结果

- 是否转 SPEC：是，建议由 product-multiagent 设计组织治理 gate。
- 是否转 GitHub：待定。
- 是否转开发 lane：待 SPEC 明确后转。
- 是否需要用户补信息：不需要。

## 下一步

由 product-multiagent 设计“Product Lead / Module Product Owner 晋升与开发派发 Gate”，明确哪些产物必须先在模块 lane workspace 出现、product-lead 如何验收、何时能晋升 `product/planning/**`、何时能通知 development。

## 验收方式

- 验收条件 1：Skill 或 workflow 规则禁止 product-lead 直接替模块 owner 写正式模块 SPEC。
- 验收条件 2：development 派发前必须存在模块草案路径、product-lead 验收记录和正式晋升记录。
- 关闭标准：真实复演“用户要求下需求”时，product-lead 会先派给模块产品 Agent 或报告 owner 缺口。

