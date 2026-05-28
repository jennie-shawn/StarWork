# Capabilities

Capabilities 是 Core 的可选能力，可以通过 presets 组合。

它们不能重新定义 baseline 角色的含义。

## v0.1 包含

- `starter-outputs`：`references/` + `outputs/`
- `decisions`：高影响决策记录
- `local-identity`：项目本地身份
- `local-lessons`：项目本地教训
- `main-repo-sync`：项目中心与项目工作台的同步模型
- `skill-mount`：通过软链接挂载共享 skills
- `agent-lanes`：多 Agent 会话按职责位分工协作

`.starwork/` 机制运行层边界见：[StarWork Runtime Layer SPEC](../starwork-runtime-layer-spec.md)。Capabilities 可以使用 `.starwork/` 存放机制状态，但不能把项目业务内容、过程材料或正式成果迁入 `.starwork/`。
