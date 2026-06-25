# MultiAgent

StarWork MultiAgent 是同一项目内多个 AI 会话的职责分工、边界管理、交接记录和跨会话协作能力。

它的核心不是“自动启动一群 Agent”，而是让多个会话可以被人和 Agent 稳定管理：

- 谁负责什么。
- 哪个会话接手哪个职责位。
- 哪些文件可以主动修改。
- 过程材料放在哪里。
- 需要其他 lane 读取的输出如何登记。
- 一个 lane 如何向另一个 lane 发送结构化指令。

## 当前状态

MultiAgent 已从 Codex 单宿主编排升级为 runtime host routing，并进入 workflow next 内测口径。当前最新已验收版本是 v0.13：在 v0.10 升级兼容、v0.11 Workflow Builder / Runner MVP 和 v0.12 投递保证基础上，将 `starworkMultiagent` 从长主 Skill 拆为短主入口和按场景加载的 references，降低漏读、token 浪费和 stable / next 漂移风险；跨 lane / Agent / session 步骤仍必须真实投递或明确 manual handoff，不能用当前回复说明替代。

当前最新已验收版本是 v0.14：补 Workflow Run State、Step Router、Self-Delivery Guard 和 workflow run progression，解决 workflow runner 可能把下一步错误投递给当前 Agent 自己的问题。v0.14 的核心边界是：下一步目标 lane 只能来自 Workflow Definition + Workflow Run State + 当前 completion event，不能由当前会话上下文猜测；自投递风险必须结构化阻断，不得记录为 delivered。v0.14 二次复验已通过，`testing -> product-lead -> development` 两跳 smoke 已跑通。

当前最新已验收版本是 v0.15：实验性的 `StarWork MultiAgent Workflow Next` Codex Plugin Adapter。它只负责 Codex 侧安装、发现、显式触发和 bundled Skill + references packaging；不替代 CLI、Core、`.starwork`、workflow run state，也不承诺自带 Codex thread tools。MVP 使用唯一入口 `$starworkMultiagentNext`，避免和用户已安装的 `starworkMultiagent` 同名冲突。v0.15 复验已通过，local plugin marketplace / install smoke 已跑通。

- Codex：保留已验证的多会话 `launch/read/instruct` 主链路。
- Cursor：通过 Host Adapter v0.2 支持 `agent-transcripts/<uuid>/<uuid>.jsonl` 只读摘要和 `cursor agent status` 安全探测；不做跨 IDE 会话自动投递。
- Trae：收敛为人工宿主，不读取 `database.db`、`state.vscdb` 或其他私有会话存储。
- 非 StarWork MultiAgent 引导转入 `starworkInit`。
- `launch` 默认会话名为 `<职责名> Agent`。
- `instruct` 在无法自动送达时返回 `manual_handoff_required`，并输出完整可复制的 `STARWORK:MULTIAGENT_MESSAGE`，不得使用“已通知 / 已发送成功”话术。
- 已有非空项目接入 MultiAgent 时，AI 入口文档先进入 `.starwork/drafts/` 和 `pending_merge`，由 `starworkInit` 整合最终 `AGENTS.md` / 宿主入口后再继续团队创建。
- v0.8 要求：Codex App 中 `instruct` / `launch` / `read` / 标题 / 置顶 / 归档等宿主动作不再通过 CLI 或 CLI message template helper 中转。

## 文档

- [v0.2 Codex 多会话编排 SPEC](specs/v0.2-codex-orchestration.md)
- [v0.4 runtime host routing SPEC](specs/v0.4-runtime-host-routing.md)
- [v0.5 AI 入口文档由 Skill 生成与整合 SPEC](specs/v0.5-skill-owned-agent-docs.md)
- [v0.7 Codex Skill 直调标准工具 SPEC](specs/v0.7-codex-standard-session-tools.md)
- [v0.8 Skill / CLI 最小边界 SPEC](specs/v0.8-skill-cli-minimal-boundary.md)
- [v0.9 友好引导体验 SPEC](specs/v0.9-friendly-onboarding.md)
- [v0.10 升级 / 迁移兼容 SPEC](specs/v0.10-upgrade-migration-compatibility.md)
- [v0.11 Workflow Builder / Runner MVP SPEC](specs/v0.11-workflow-builder-runner-mvp.md)
- [v0.12 Workflow 投递保证 SPEC](specs/v0.12-workflow-delivery-guarantee.md)
- [v0.13 starworkMultiagent Skill 瘦身 / 分层 SPEC](specs/v0.13-starworkMultiagent-skill-decomposition.md)
- [v0.14 Workflow Run State / Self-Delivery Guard SPEC](specs/v0.14-workflow-run-state-self-delivery-guard.md)
- [v0.15 Codex Plugin Adapter MVP SPEC](specs/v0.15-codex-plugin-adapter-mvp.md)
- [Lane Workflow / Handoff Rules MVP 讨论](discussions/2026-06-15-lane-workflow-mvp.md)
- [Workflow Packet Runtime 设计讨论](discussions/2026-06-15-workflow-packet-runtime.md)
- [v0.2 验收报告](acceptance/2026-06-01-v0.2-acceptance-report.md)
- [Cursor / Trae / Claude Code 兼容性与适配计划](references/host-compatibility-and-adaptation.md)
- [CLI 设计](cli.md)
- [Skill 设计](skill.md)
