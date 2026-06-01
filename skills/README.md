# StarWork Skills

这里存放会通过 `npx skills add jennie-shawn/StarWork` 安装到 Agent 全局环境的 StarWork 系统级 skill。

Kit 自带 skill 不放在这里，避免被全局安装命令误识别；它们存放在 `product/kit-skills/`，由 `starwork init` 按工作区类型写入具体工作台。

能力开启后才需要的项目内业务 skill 也不放在这里。例如知识库能力的 `starworkKnowledgeProject` 存放在 `product/core/capabilities/knowledge/skills/`，由 `starwork knowledge init` 写入当前项目。

Skill 的职责不是替代 CLI，而是帮助 Agent 更可靠地理解用户意图、生成配置、组织规则和调用 StarWork 工具。

Skill 的安装、项目中心管理、Pack 推荐和项目分发规则见 `product/core/skill-management-spec.md`。一句话边界：Skill 负责判断和生成方案，CLI 负责执行和校验。

## 路由规则

- 与 Core 协议相关的事实源放在 `product/core/`。
- 与 CLI 命令相关的规格和实现放在 `product/cli/`。
- 与 Pack 场景相关的正式包放在 `product/packs/`。
- 系统级 Agent 工作流 skill 放在 `product/skills/`。
- Kit 自带 skill 放在 `product/kit-skills/`。
- Capability 自带的项目内业务 skill 放在 `product/core/capabilities/<capability>/skills/`。

## 当前 Skills

- `starworkInit/`：帮助 Agent 设计 `starwork init` 初始化方案和 init blueprint。详细 SPEC 见 `starworkInit-spec.md`。
- `starworkDoctor/`：帮助 Agent 基于 `starwork doctor --json` 的探测结果，对当前工作区或历史模板做理性诊断；用户明确要求升级时，继续确认目录语义并生成 `starwork upgrade --blueprint` 升级施工图。详细 SPEC 见 `starworkDoctor-spec.md`。
- `starworkMultiagent/`：帮助 Agent 把“常用智能体 / 当前会话职责 / 多 Agent 分工 / 共享输出 / 跨会话指令 / Codex lane thread 编排”翻译成安全的 `starwork multiagent` 命令组合。详细 SPEC 见 `starworkMultiagent-spec.md` 和 `product/planning/features/multiagent/specs/v0.2-codex-orchestration.md`。
- `starworkKnowledge/`：帮助 Agent 通过 `starwork knowledge` 开启、检查和维护项目本地知识库；负责判断哪些内容值得长期沉淀，区分 `pages/` 和 `synthesis/`，不默认提交项目中心。

`starworkAudit` 是项目中心工作台模板自带 skill，源码在 `product/kit-skills/starworkAudit/`；规格仍保留在 `starworkAudit-spec.md`。
`starworkKnowledgeProject` 是知识库能力的项目内业务 skill，源码在 `product/core/capabilities/knowledge/skills/starworkKnowledgeProject/`；它不参与全局安装。
