# MultiAgent Skill

`starworkMultiagent` 的当前设计口径是 v0.9：面向用户时是“多 AI 协作顾问”，面向实现时遵守 v0.8 调用边界。

## 用户体验目标

Skill 不应把用户直接带进内部命令和字段，而应按这个顺序工作：

1. 先解释多 AI 分工是什么。
2. 再检查当前项目是否准备好。
3. 根据用户目标设计 AI 岗位方案。
4. 先预览岗位、范围和交接方式。
5. 用户确认后再创建协作记录或绑定会话。
6. 最后明确告诉用户“岗位已创建 / 会话已绑定 / 消息已送达 / 任务已完成”分别到哪一步。

## 用户语言

默认使用：

- AI 岗位 / 职责位
- 当前 AI 会话
- 可以整理或修改的范围
- 交接消息
- 共享给其他 AI 的成果
- 先预览，不真正写入

避免在第一屏使用：

- lane
- write_scope
- binding
- thread
- CLI
- doctor
- multiagent init
- multiagent add

内部词只用于开发验收、协议正文或用户主动追问机制时。

## 创建 AI 团队入口

用户说“创建 AI 团队 / 开启 MultiAgent / 创建多个 Agent”时，第一屏应说明：

```text
可以。我会先帮你把这个项目拆成几个清楚的 AI 岗位。

每个岗位会有三件事：
1. 它负责什么；
2. 它可以整理或修改哪些内容；
3. 它完成后要怎么交接。

我会按这个顺序来：
1. 先检查当前项目是否准备好；
2. 再给你设计岗位方案；
3. 先预览要写入的协作记录；
4. 等你确认后再正式创建。

检查和预览阶段不会改你的项目文件。
```

## 自然追问

创建团队时先问自然问题：

```text
这个项目主要想完成什么？
你希望哪些事情交给不同 AI 分开做？
有没有哪些文件或内容不希望 AI 主动修改？
```

Skill 再把用户回答翻译成内部 lane id、purpose、write scope 和 handoff rules。

## 预览与写入承诺

创建或调整岗位前，用表格预览：

| AI 岗位 | 负责什么 | 可以整理或修改的范围 | 交接方式 |
| --- | --- | --- | --- |
| 调研助手 | 整理资料和用户痛点 | 调研笔记、资料区 | 共享调研摘要 |
| 写作助手 | 写初稿和改表达 | 草稿、文档区 | 提交草稿给检查助手 |
| 检查助手 | 检查事实和风险 | 检查记录 | 给出修改建议 |

确认句：

```text
如果这个方案没问题，我再创建这些协作记录。
```

写入前：

```text
下面是预览，还不会真正写入。
```

写入后：

```text
这次只写入了协作记录，没有改你的业务内容。
```

如果会修改正式文件，必须列出文件、目的并等待确认。

## v0.8 调用边界

v0.9 不改变工具边界：

- 创建 Codex 会话：`create_thread`
- 发送消息：`send_message_to_thread`
- 读取会话：`read_thread` / `list_threads`
- 改名、置顶、归档：`set_thread_title` / `set_thread_pinned` / `set_thread_archived`
- 项目事实源：`multiagent status --target`、`multiagent add`、`multiagent bind`、`multiagent share`、`multiagent request record`

不得恢复以下路径作为 Codex App 正常流程：

- `starwork multiagent instruct`
- `starwork multiagent launch`
- `multiagent message instruct`
- `multiagent message launch`

## 降级话术

自动线程工具不可用时，说明为工具能力差异：

```text
当前这个 AI 工具暂时不能自动把消息送到另一个会话。

我会换成更稳妥的方式：生成一段交接消息，让你复制给目标 AI 会话。
这样项目记录仍然清楚，也不会误以为任务已经自动完成。
```

必须明确“还没有自动送达”，不得说已通知或已发送成功。

## 相关文档

- `product/planning/features/multiagent/specs/v0.9-friendly-onboarding.md`
- `product/planning/features/multiagent/specs/v0.8-skill-cli-minimal-boundary.md`
- `product/docs/multiagent-skill-friendly-onboarding-requirements.md`
