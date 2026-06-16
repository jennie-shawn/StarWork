# ISSUE-024：MultiAgent 缺少 Workflow Builder / Runner MVP 与 next 同源安装保护

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | skill / cli / docs / release / workflow |
| 优先级 | P1 |
| 状态 | closed |
| 来源 | 用户反馈 / product-multiagent 规划 |
| 发现日期 | 2026-06-16 |
| 关联 GitHub Issue | 无 |
| 关联 SPEC | `product/planning/features/multiagent/specs/v0.11-workflow-builder-runner-mvp.md` |
| 关联验收 | `_系统/协作/lanes/product-lead/workspace/2026-06-16-multiagent-next-workflow-acceptance.md` |
| 负责人 | product-lead lane |

## 现象

- 用户可见表现：用户想让多个 AI 按固定流程协作，例如 SPEC 完成后通知 development、development 完成后回到 product review，但当前只能靠人工记忆和单次跨 lane 消息。
- 期望表现：用户可以先设计 workflow，预览和保存 workflow definition；确认后再启动 Runner，由 Runner 生成当前节点 packet 并投递或人工交接。
- 实际表现：当前 MultiAgent 只有 lane、binding、cross-lane message 和 request record，没有正式 Workflow Builder / Runner MVP，也没有针对 next workflow 的 CLI / Skill 同源安装保护。

## 证据

用户反馈与产品讨论：

```text
其实我现在能想到的应该是一个Agent之间的工作机制的协同定义。
比如说我会定义好产品输出完Spec就自动通知给开发Agent，开发Agent实现完后就自动通知产品Agent进行验收。
```

已接受的产品讨论：

```text
product/planning/features/multiagent/discussions/2026-06-15-lane-workflow-mvp.md
product/planning/features/multiagent/discussions/2026-06-15-workflow-packet-runtime.md
```

研发前确认：

```text
_系统/协作/lanes/product-lead/workspace/2026-06-16-multiagent-workflow-next-preflight.md
```

product-multiagent 草案：

```text
_系统/协作/lanes/product-multiagent/workspace/drafts/2026-06-16-v0.11-workflow-builder-runner-mvp-spec.md
```

## 影响范围

- 影响的功能：`starworkMultiagent`、MultiAgent cross-lane message、request record、workflow definition / packet、A 测安装文档、next 版本发布。
- 影响的用户：希望用 StarWork 管理多 Agent 协作循环、产品开发闭环、跨 lane 自动通知的内测用户。
- 是否影响发布 / 升级 / A 测：影响。workflow 是已发布 MultiAgent 上的大功能变更，应先进入 `@next`，不能直接进入 `latest`。
- 是否有绕行方式：可以继续手工发送跨 lane 消息，但流程容易依赖 Agent 记忆，且 message 可能过长。

## 初步判断

该问题应作为 MultiAgent v0.11 独立开发项跟踪，不复用 ISSUE-022。ISSUE-022 只覆盖升级 / 迁移兼容；v0.11 关注 workflow Builder / Runner、packet runtime、next 发布保护和 CLI / Skill 同源安装风险。

## 分流结果

- 是否转 SPEC：是，已转入 MultiAgent v0.11 Workflow Builder / Runner MVP SPEC。
- 是否转 GitHub：暂不转，先在本地产品问题单跟踪。
- 是否转开发 lane：是，已由 product-lead 通知 development。
- 是否需要用户补信息：暂不需要。

## 下一步

已关闭：development lane 已按 `REQ-20260616-development-multiagent-next-workflow` 完成实现并通过 product-lead 复验。实现顺序：

1. Phase 0：先完成 v0.10 升级 / 迁移兼容前置验收。
2. Phase 1：实现 Workflow Builder：意图区分、采访、预览、保存草案；不投递、不写 `.starwork` workflow state、不写 `product/`。
3. Phase 2：实现 Workflow Runner：读取已确认 definition，生成 instance 和 compact + reference packet，按 v0.8 标准线程工具投递或人工交接。
4. Phase 3：补 next 发布保护：A 测文档使用 `@next`，CLI / Skill channel 错配至少有检查、警告或明确内测限制。

## 验收方式

- 验收条件 1：Builder / Runner 意图区分正确，设计语义不得启动真实投递，含混语义必须追问。
- 验收条件 2：Builder 确认保存后只写 lane workspace draft，不写 `product/`，不写 `.starwork` workflow state，不调用投递或 request record。
- 验收条件 3：Workflow Definition 预览表包含 lane、触发条件、输入、产出、return contract、gate / stop，并有清晰确认句。
- 验收条件 4：Runner 默认生成 compact + reference packet，不复制完整 Workflow Definition，长度预算符合 SPEC。
- 验收条件 5：投递成功只代表消息送达和 request 已记录，不得宣称目标任务完成。
- 验收条件 6：v0.8 禁止项扫描无正常路径回归。
- 验收条件 7：当前会话 ID 校验不回归，目标 lane 是当前会话时默认阻断自我交接。
- 验收条件 8：A 测文档使用 `@next`，普通用户文档不得用 `latest` 试 workflow，CLI / Skill 错配有检查、警告或明确内测限制。
- 关闭标准：已满足。v0.10 前置验收通过，v0.11 Builder / Runner / next 发布保护实现并通过自动化测试、文本扫描和 product-lead 补充 smoke。完整 `starwork skills install` 未实现，按 v0.11 最小保护策略接受，后续作为 release hygiene 风险继续观察。
