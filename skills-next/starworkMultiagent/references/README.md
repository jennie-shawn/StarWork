# starworkMultiagent references

这些 reference 是 `starworkMultiagent` 的场景化操作说明。主 `SKILL.md` 只保留硬安全规则和加载表；命中具体场景后，先读取对应 reference，再执行动作。

如果本目录不存在或文件无法读取，说明 Skill 安装不完整。不得继续执行创建会话、跨 lane 投递、绑定、晋升输出等高风险动作；先提示用户使用完整目录重新安装 StarWork Skills。

## 文件

- `intent-routing.md`：自然语言意图到 MultiAgent 场景的路由。
- `context-and-compatibility.md`：StarWork 工作台、pending merge、v0.10 兼容迁移前置检查。
- `session-tools.md`：Codex / Claude Code 宿主标准会话工具边界。
- `delivery-guarantee.md`：必须投递、工具发现、manual handoff、request record 顺序。
- `team-onboarding.md`：创建 AI 团队、预览、确认、lane + session 成功标准。
- `message-templates.md`：Skill-owned StarWork 消息模板。
- `lane-workspace-output-promotion.md`：lane workspace、shared output、正式输出晋升。
- `safety-output-rules.md`：写入确认、输出口径和禁止行为。
- `workflow-builder.md`：next Workflow Builder 的采访、预览和草案保存。
- `workflow-runner.md`：next Workflow Runner 的 run state、route、投递和本地执行边界。
- `workflow-run-state.md`：Workflow Run State schema、状态机和 Step Router 事实源规则。
- `workflow-packet-budget.md`：compact + reference packet、full packet 和字符预算。
