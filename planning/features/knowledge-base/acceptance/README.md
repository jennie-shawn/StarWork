# Knowledge Base Acceptance

验收以 `../specs/v0.1.md` 的 phase 验收标准为准。本页只保留总体验收摘要。

1. 新建普通项目时，不默认出现知识库目录。
2. 已有 StarWork 项目可以通过 `starwork knowledge init` 开启知识库。
3. 开启知识库能力后，生成标准结构，并安装项目内 `starworkKnowledgeProject`。
4. `schema.md` 能明确指导 Agent 如何维护知识库。
5. `pages/` 和 `synthesis/` 区分清楚。
6. `doctor` 不把缺少知识库当成结构错误。
7. 旧 `知识/knowledge` 不被自动迁移、删除或改名。
8. Skill 一期不出现“提交到项目中心”的默认动作。
9. `starwork knowledge status --json` 只暴露事实，不输出下一步建议。
10. `starworkKnowledge` 作为全局入口 Skill，`starworkKnowledgeProject` 作为项目内业务 Skill，二者安装范围不能混淆。
