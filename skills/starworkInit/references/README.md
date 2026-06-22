# starworkInit References

这些 reference 是 `starworkInit` 的场景流程库。主 `SKILL.md` 只保留触发范围、硬安全规则、reference 加载表和成功状态口径。

## 缺失停止规则

如果命中的 reference 文件不存在或无法读取，高风险动作必须停止。高风险动作包括：

- 执行 `starwork init --yes`。
- 合并 `AGENTS.md`、`README.md`、`CLAUDE.md` 或宿主入口规则。
- 修改宿主规则。
- 生成可执行 blueprint。
- 写入定制规则文件。

停止时告诉用户：Skill 安装不完整，请重新用完整目录安装 StarWork Skills，并列出缺失 reference 路径。

## Reference 地图

- `intent-routing.md`：判断是否属于初始化、接入、项目中心或应回到主入口。
- `friendly-onboarding.md`：普通第一屏和 MultiAgent-only 回流第一屏。
- `initialization-flow.md`：标准 project / hub 初始化流程、路径、语言、dry-run / yes / doctor。
- `custom-blueprint.md`：定制目录、规则、init blueprint 和最小 JSON 示例。
- `existing-project-agent-docs.md`：已有非空项目、`--agent-docs draft`、pending merge。
- `host-adapter-flow.md`：Codex、Claude Code、Cursor、Trae 入口适配。
- `knowledge-and-pack-boundaries.md`：知识库与 Pack 的用户解释和默认边界。
- `output-and-safety-rules.md`：输出口径、事实源纯度、AGENTS 和规则文件边界。
