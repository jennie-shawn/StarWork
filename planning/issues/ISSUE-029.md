# ISSUE-029：Knowledge Skill 缺少资料分类和写入前确认的小白流程

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | skill / knowledge / onboarding / product |
| 优先级 | P1 |
| 状态 | closed |
| 来源 | 用户反馈 / Skill UX 审计 / product-mainflow 草案 |
| 发现日期 | 2026-06-22 |
| 关联 GitHub Issue | 无 |
| 关联 SPEC | `product/planning/features/knowledge-base/specs/v0.2-friendly-flow.md` |
| 关联验收 | `_系统/协作/lanes/product-lead/workspace/2026-06-22-skill-ux-v02-acceptance.md` |
| 负责人 | development lane |

## 现象

- 用户可见表现：用户说“帮我记住”“建知识库”或贴一堆资料时，当前知识库 Skill 缺少自然的分类、预览和确认流程。
- 期望表现：Agent 先判断哪些内容适合长期保存，哪些只是临时资料、草稿、来源或待确认事实；写入前给预览表并等确认。
- 实际表现：`starworkKnowledge` 已有边界说明，但流程不够小白；`starworkKnowledgeProject` 过短、英文、偏内部规则。

## 证据

```text
product-mainflow 草案：
_系统/协作/lanes/product-mainflow/workspace/drafts/2026-06-22-knowledge-v0.2-friendly-flow.md

审计结论：
Knowledge v0.1 方向正确，但缺少 incoming material classification 和项目内知识助手友好化。
```

## 影响范围

- 影响的功能：`starworkKnowledge`、`starworkKnowledgeProject`。
- 影响的用户：想给项目建立长期记忆、整理资料、维护项目知识库的小白用户。
- 是否影响发布 / 升级 / A 测：影响知识库能力可理解性和误写风险。
- 是否有绕行方式：用户手动说明哪些内容长期有效，但不符合小白体验。

## 初步判断

Knowledge v0.2 应只做 Skill 体验层优化，不改 CLI、不改知识库目录结构。核心是“先分类、再预览、再确认写入”。

## 分流结果

- 是否转 SPEC：是，见 Knowledge Base v0.2 SPEC。
- 是否转 GitHub：暂不转。
- 是否转开发 lane：是。
- 是否需要用户补信息：不需要。

## 下一步

已完成并通过 product-lead 复验。

## 验收方式

- `starworkKnowledge` 和 `starworkKnowledgeProject` 均有长期知识、临时资料、草稿、参考来源、待确认事实分类。
- 写入前必须有预览表：知识条目、来源、为什么值得长期保存、建议放入位置、是否需要用户确认。
- 用户确认前不得写入正式知识文件。
- 不批量搬运原始资料，不把草稿当长期知识，不把未确认事实写成确定结论。
- 关闭标准：development 回传通过，product-lead 复验通过。已满足，关闭。
