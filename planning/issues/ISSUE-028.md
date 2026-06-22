# ISSUE-028：Init / Doctor 主 Skill 过长，需要短入口 + references 分层

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | skill / docs / onboarding / product |
| 优先级 | P1 |
| 状态 | closed |
| 来源 | 用户反馈 / Skill UX 审计 / product-mainflow 草案 |
| 发现日期 | 2026-06-22 |
| 关联 GitHub Issue | 无 |
| 关联 SPEC | `product/planning/features/mainflow/specs/v0.2-init-doctor-skill-decomposition.md` |
| 关联验收 | `_系统/协作/lanes/product-lead/workspace/2026-06-22-skill-ux-v02-acceptance.md` |
| 负责人 | development lane |

## 现象

- 用户可见表现：`starworkInit` 和 `starworkDoctor` 主 Skill 文件过长，Codex 读取时可能分段，用户看到“skill 文件还没读完，我继续读后半段”。
- 期望表现：主 Skill 是短入口，关键安全规则常驻可读；长流程放入 references 并按场景加载。
- 实际表现：Init / Doctor 主 Skill 仍承载完整流程、命令序列、模板和低频场景，分别约 620 行、490 行。

## 证据

```text
product-mainflow 草案：
_系统/协作/lanes/product-mainflow/workspace/drafts/2026-06-22-mainflow-v0.2-init-doctor-skill-decomposition.md

用户反馈：
当前 Skill 读取会分段，担心主 Skill 过长导致漏读。
```

## 影响范围

- 影响的功能：`starworkInit`、`starworkDoctor`、stable / next Skills。
- 影响的用户：新手初始化、MultiAgent-only 回流用户、诊断 / 升级用户。
- 是否影响发布 / 升级 / A 测：影响 A 测体验和后续 Skill 维护。
- 是否有绕行方式：Agent 手动继续读取后半段，但不稳定。

## 初步判断

参考 `starworkMultiagent` v0.13，把 Init / Doctor 改为短主入口 + references 分层。该任务不改变 CLI 行为，只降低 Skill 读取和维护风险。

## 分流结果

- 是否转 SPEC：是，见 Mainflow v0.2 SPEC。
- 是否转 GitHub：暂不转。
- 是否转开发 lane：是。
- 是否需要用户补信息：不需要。

## 下一步

已完成并通过 product-lead 复验。

## 验收方式

- 四个主 `SKILL.md` 行数满足硬上限。
- stable / next Init / Doctor 均有完整 references 目录。
- 主 Skill 保留硬安全规则、友好第一屏、pending merge 和 MultiAgent preflight 口径。
- 长流程、JSON 示例、报告模板、命令序列不再堆在主 Skill。
- 关闭标准：development 回传通过，product-lead 复验通过。已满足，关闭。
