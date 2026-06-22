# Mainflow Experience

Mainflow 归档 StarWork 主流程体验设计，包括主入口 `starwork`、初始化 `starworkInit`、诊断 `starworkDoctor`，以及 `init` / `doctor` / `upgrade` / `adapt` 等核心 CLI 在真实用户路径中的协同。

本功能档案关注用户从“想开始使用 StarWork”到“项目已安全接入、AI 工具能读到规则、可以继续开启多 AI 协作”的主路径。模块产品 Agent 可先在自己的 lane workspace 产出草案；正式 SPEC 由 `product-lead` 审核后晋升到本目录。

## 当前重点

- `starworkInit` / `starworkDoctor` 主 Skill 已瘦身为短入口 + references，降低 Codex 分段读取和规则漏读风险。
- MultiAgent-only 用户从多 AI 协作入口回流 Init / Doctor 时的友好起步体验。
- 检查、预览、写入、整合和复查的用户可见状态分层。
- Init / Doctor 对已有项目、已有 AI 规则文件和待整合草稿的安全解释。

## Specs

- [v0.2 Init / Doctor Skill 瘦身与 References 分层](specs/v0.2-init-doctor-skill-decomposition.md)
- [v0.1 Init / Doctor 面向 MultiAgent-only 用户的友好起步](specs/v0.1-init-doctor-multiagent-onboarding.md)
