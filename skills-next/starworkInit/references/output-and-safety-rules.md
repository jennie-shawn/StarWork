# Output And Safety Rules

## 项目事实源纯度

`_系统/上下文/当前项目.md` 或 `_system/context/current-project.md` 只记录用户项目事实：

- 项目目标。
- 当前阶段。
- 近期重点。
- 主要事实源。
- 风险。
- 下一步业务动作。

不要写入：

- StarWork 初始化完成情况。
- blueprint 文件路径。
- dry-run 结果。
- 没有使用的目录列表。
- npm、skills、doctor 的安装或检查过程。
- AI 自己为什么这样选择的解释。

如果用户没有提供明确项目事实，current-project 保持 `TBD` / `待填写`。

## AGENTS 和规则文件边界

`AGENTS.md` 是长期入口规则，不是初始化报告。

默认只写长期章节：

- Read First / 开始前先读。
- Read When Relevant / 相关时再读。
- File Boundaries / 文件边界。
- Workflow / 工作方式。
- Confirmation Required / 需要确认。

不要在 `AGENTS.md` 或 `.starwork/rules/*.md` 中写入：

- `Folders Not Used`
- `Initialized as`
- `StarWork project workspace`
- blueprint path
- dry-run result
- doctor result
- npm install result
- spec 文件缺失或本机路径缺失

如果需要防止 AI 创建旧默认目录，写成正向边界规则，例如“代码放 `src/`，产品文档放 `docs/`，不要另建含义重复的顶层工作目录”。

## 成功汇报

按层说明：

- 检查完成。
- 写入预览完成。
- 工作台骨架已写入。
- AI 入口待整合或已生效。
- doctor 检查通过或仍有待处理项。

不要把骨架写入、入口待合并、入口生效、MultiAgent 可继续混成一个状态。
