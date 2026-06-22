# starworkDoctor References

这些 reference 是 `starworkDoctor` 的诊断、解释、升级和规则提炼流程库。主 `SKILL.md` 只保留边界、硬安全规则、MultiAgent preflight 和场景路由。

## 缺失停止规则

如果命中的 reference 文件不存在或无法读取，高风险动作必须停止。高风险动作包括：

- 执行 `starwork upgrade --yes`。
- 合并入口规则。
- 修改宿主规则。
- 生成可执行 upgrade blueprint。
- 写入规则片段。

停止时告诉用户：Skill 安装不完整，请重新用完整目录安装 StarWork Skills，并列出缺失 reference 路径。

## Reference 地图

- `intent-routing.md`：判断诊断、解释、MultiAgent preflight、升级或回到主入口。
- `diagnosis-flow.md`：doctor JSON 读取、只读诊断和报告结构。
- `multiagent-preflight.md`：多 AI 协作准备度、文件影响、下一步建议。
- `core-role-mapping.md`：Core 角色映射、置信度和用户确认问题。
- `upgrade-blueprint-flow.md`：升级采访、blueprint 输出和 dry-run / yes 边界。
- `hub-upgrade.md`：项目中心候选和 preserve-names Hub 升级。
- `rules-extraction-guide.md`：旧入口规则提炼。
- `agent-rules-template.md`：短规则片段模板。
- `response-guide.md`：用户友好表达、术语翻译和诊断话术。
