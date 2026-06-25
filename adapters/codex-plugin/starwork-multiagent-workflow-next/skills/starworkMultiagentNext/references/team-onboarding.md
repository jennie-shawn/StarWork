# Team Onboarding

创建 Agent 团队不是只创建 lane。完整成功标准是：每个目标职责都有 lane、每个 lane 已绑定可工作的独立 session，或者输出中明确说明哪些 lane 未完成以及阻塞原因。

## 第一屏

用户说“开启 MultiAgent”“创建 AI 团队”“帮我创建多个 Agent”时，先用用户语言解释：

- 会把项目拆成几个清楚的 AI 岗位。
- 每个岗位有职责、可以整理或修改的范围、交接方式。
- 先检查项目，再设计岗位方案，再预览写入，确认后创建。
- 检查和预览阶段不会改业务内容。

不要在第一屏出现 lane、write_scope、binding、thread、CLI、doctor 或具体子命令。

## 自然追问

只问用户能自然回答的问题：

- 这个项目主要想完成什么？
- 希望哪些事情交给不同 AI 分开做？
- 哪些文件或内容不希望 AI 主动修改？

不要索要 lane id、write scope 或 session id。Skill 根据回答生成内部字段。

## 预览与确认

创建或调整岗位前，用表格预览：

| AI 岗位 | 负责什么 | 可以整理或修改的范围 | 交接方式 |
|---|---|---|---|

表格后加：

```text
如果这个方案没问题，我再创建这些协作记录。
```

所有写入前说明“下面是预览，还不会真正写入”。写入后说明“这次只写入了协作记录，没有改你的业务内容”。

## 会话创建与绑定

每个需要独立 Codex session 的 lane：

1. 组装 Launch Message。
2. 标题建议用短职责名，格式固定为 `<职责名> Agent`。
3. 调用 `create_thread`。
4. 如需命名，调用 `set_thread_title`。
5. 如需置顶，调用 `set_thread_pinned`。
6. 只有 `create_thread` 返回 thread id 后，才用 `multiagent bind` 记录真实 binding。

工具不可见或失败时，说明具体失败点，展示 Launch Message 供用户手动复制；不能说这个 Agent 已创建并绑定。

只有用户明确说“先只初始化协作层 / 先只建职责位 / lane-only”时，才可以停在职责位。
