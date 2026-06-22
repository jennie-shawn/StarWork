# Knowledge Base

## 定位

知识库能力用于让 Agent 在项目内持续维护长期有用的理解，而不是把原始资料堆进一个文件夹。

一句话：

> 参考资料是输入，输出是成果，知识库是 Agent 持续维护的长期理解层。

## 当前状态

- 状态：v0.2 友好流程已验收通过，v0.1 结构边界保持生效。
- 当前结构 SPEC：`specs/v0.1.md`。
- 当前体验 SPEC：`specs/v0.2-friendly-flow.md`。
- 历史备忘：`discussions/m2.9-knowledge-capability-note.md`。

## 相关实现

- Core：`product/core/capabilities/knowledge/`
- CLI：`starwork knowledge init/status/check/apply`
- 全局入口 Skill：`product/skills/starworkKnowledge/`
- 项目内业务 Skill：`product/core/capabilities/knowledge/skills/starworkKnowledgeProject/`
- Docs：待补正式用户文档。

## 已收口口径

- 中文路径使用 `知识库/`，英文路径使用 `knowledge-base/`。
- 知识库是可选能力，不是 Project Kit 默认目录。
- 已有项目和新项目都以 `starwork knowledge init` 作为开启主入口。
- `starworkKnowledge` 是全局入口 Skill，可单独安装。
- `starworkKnowledgeProject` 是项目内业务 Skill，在项目开启知识库能力后由 CLI 自动装入。
- v0.1 不把知识库问题塞进默认 `init` 采访链路。
- v0.2 要求用户给资料时先分类、预览、确认，再写入长期知识库。

## 后续另开需求

- 内容创作者 Pack 是否未来默认推荐开启知识库。
- 项目知识提交到项目中心共享知识库。
- 是否把 `starworkKnowledgeProject` 拆成 ingest / synthesis / lint 多个项目内业务 Skill。
