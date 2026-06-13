# ISSUE-021：starworkMultiagent 首次使用引导过于工程化

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | skill / product / docs / onboarding |
| 优先级 | P1 |
| 状态 | closed |
| 来源 | 运营 Agent 优化建议 |
| 发现日期 | 2026-06-13 |
| 关联 GitHub Issue | 暂无 |
| 关联 SPEC | `product/planning/features/multiagent/specs/v0.9-friendly-onboarding.md` |
| 关联文档 | `product/docs/multiagent-skill-friendly-onboarding-requirements.md` |
| 负责人 | development lane |

## 现象

`starworkMultiagent` 的能力边界已经较完整，但真实用户第一次使用时仍会看到较多内部表达：

- 第一屏容易出现 `lane`、`write_scope`、`binding`、`thread`、`CLI` 等内部词。
- 流程说明偏“我要调用什么工具”，不是“这一步帮你避免什么风险”。
- 用户还没准备好项目时，切到 `starworkInit` 像流程跳转，而不是安全接入。
- 自动会话工具不可用时，`manual_handoff_required` 容易被感知为失败。
- 成功汇报没有稳定区分“岗位已创建”“会话已绑定”“消息已送达”“目标任务已完成”。

## 影响范围

- 影响的功能：`starworkMultiagent` Skill、MultiAgent 用户指南、A 测指南、Skill 注册表文案。
- 影响的用户：第一次开启 StarWork 多 AI 协作的 C 端用户和非工程用户。
- 是否影响发布 / 升级 / A 测：影响 A 测转化和理解成本。用户可能因为内部词过多而不敢确认写入，或误以为消息送达等于任务完成。
- 是否有绕行方式：熟悉 StarWork 的内部用户可以理解，但不适合作为对外默认体验。

## 需求来源摘要

运营 Agent 输出 `product/docs/multiagent-skill-friendly-onboarding-requirements.md`，建议将 `starworkMultiagent` 改成耐心的协作顾问：

- 用“AI 岗位 / 当前 AI 会话 / 可以整理或修改的范围 / 交接消息”等用户语言替代内部词。
- 第一屏先讲清“我会先检查、再设计、再预览、确认后执行”。
- 创建岗位前用表格预览岗位、职责、范围和交接方式。
- 写入前说明“先预览，不真正写入”；写入后说明“只写入协作记录，没有改业务内容”。
- 降级时解释为“当前工具能力不同，我帮你准备可复制交接消息”，而不是报内部错误。
- 成功汇报严格区分创建、绑定、送达和完成。

## 分流结果

- 是否转 SPEC：已转入 `product/planning/features/multiagent/specs/v0.9-friendly-onboarding.md`。
- 是否转 GitHub：暂不需要，先作为本地产品 issue 跟进。
- 是否转开发 lane：需要。
- 是否需要用户补信息：暂不需要，运营建议文档已足够。

## 下一步

已关闭。development lane 已按 v0.9 SPEC 完成改写，product-planning 复验通过：

1. 重写第一屏和用户语言。
2. 增加自然追问、岗位方案预览、写入安全承诺和完成状态口径。
3. 保留 v0.8 的标准线程工具调用边界，不回退到 CLI 旧路径。
4. 更新用户文档、A 测指南和 Skill 注册表。
5. 增加 Skill 文本扫描测试，覆盖 v0.9 友好引导和 v0.8 禁止项。

## 处理记录

- 2026-06-13 development：完成 `starworkMultiagent` 友好引导体验改版；第一屏改为“AI 岗位”用户语言，新增自然追问、岗位方案表格预览、写入前后安全承诺、降级说明和状态口径；同步 `starworkMultiagent-spec.md`、MultiAgent skill 规划、用户指南、A 测指南和 CLI/Skill 注册表；补充 Skill 文本扫描测试，保留 v0.8 禁止项扫描。
- 2026-06-13 product-planning：复验通过并关闭 ISSUE-021。确认第一屏无内部词，创建团队追问为自然问题，岗位方案预览、写入前后安全承诺、非 StarWork 安全接入、自动工具不可用降级、成功状态分层均已覆盖；v0.8 禁止项扫描在 `product/skills/starworkMultiagent/SKILL.md` 无命中。验证通过：`node --check product/cli/src/cli.js`、`node --check product/cli/test/init.test.js`、`git -C product diff --check`、目标回归测试 113/113、`npm test` 113/113。

## 验收方式

- 第一屏不出现内部词，包含“AI 岗位 / 负责什么 / 可以整理或修改哪些内容 / 交接 / 先预览 / 确认后”。
- 创建团队时先问项目目标、分工需求和不希望主动修改的内容，不索要内部字段。
- 写入前有岗位表格预览和明确确认句。
- 非 StarWork 目录自然转入安全接入，不抛内部错误。
- 自动工具不可用时输出人工交接解释和完整可复制消息，不说已通知。
- 成功汇报区分岗位已创建、会话已绑定、消息已送达和任务已完成。
- v0.8 禁止项扫描继续通过。
- 开发回报 `node --check`、`git diff --check`、目标测试和 `npm test` 结果。
