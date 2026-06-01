# Knowledge Base Skill

## Skill

`starworkKnowledge`

## 定位

帮助 Agent 引导用户开启项目本地知识库，并维护知识库内容。

`starworkKnowledge` 是全局入口 Skill，可以通过 `npx skills add ...` 单独安装。它让 Agent 学会如何判断、采访和调用 CLI，不表示所有项目都已经开启知识库。

知识库能力开启后，项目内业务 Skill `starworkKnowledgeProject` 再由 CLI 自动安装到当前项目的 `.agents/skills/`，必要时同步到 `.claude/skills/`。

## 一期能力

- 引导创建知识库。
- 吸收资料并更新主题页。
- 回答问题并沉淀长期知识。
- 形成综合判断。
- 检查知识库健康状况。
- 生成知识库整理 blueprint。

## Skill 边界

Skill 负责理解、判断和整理。

创建结构时应优先调用 CLI，不应自己手写一套不一致目录结构。

一期不做项目中心共享知识提交。

## 安装边界

- `starworkKnowledge`：可作为全局入口 Skill 单独安装。
- `starworkKnowledgeProject`：不进入全局安装清单；项目执行 `starwork knowledge init` 后自动装入当前项目。
- Pack 场景扩展 Skill：由 Pack 推荐，用户确认后安装。
