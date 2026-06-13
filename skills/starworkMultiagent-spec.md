# `starworkMultiagent` Skill SPEC

## 状态

- 版本：v0.9 implementation note
- 所属模块：StarWork Skills
- Skill 名称：`starworkMultiagent`
- 相关命令：`starwork multiagent`
- 相关 Core 能力：Agent Lanes
- 实现状态：友好引导体验改版中
- 目标：把用户关于多 AI 协作的自然语言请求，转成“先解释、再检查、再设计、先预览、确认后执行”的安全协作流程

## 一句话定义

`starworkMultiagent` 是 StarWork 的多 AI 协作顾问。

它面向用户时讲“AI 岗位、当前 AI 会话、可以整理或修改的范围、交接消息”；面向项目事实源时仍维护 Agent Lanes；面向 Codex App 时仍直接调用标准线程工具。

## v0.9 用户体验原则

### 用户看到 AI 岗位

默认用户语言：

| 内部词 | 用户可见说法 |
|---|---|
| lane | AI 岗位 / 职责位 |
| session / thread | AI 会话 / 当前会话 |
| write_scope | 可以整理或修改的范围 |
| binding | 把这个会话登记到某个岗位 |
| shared output | 共享给其他 AI 的成果 |
| handoff | 交接消息 |
| CLI | StarWork 命令工具 |
| host / adapter | 你正在使用的 AI 工具 |
| dry-run | 先预览，不真正写入 |

内部词只在用户追问机制、开发验收、调试记录或协议消息正文中出现。

### 第一屏先解释流程

用户说“创建 AI 团队 / 开启 MultiAgent / 创建多个 Agent”时，先输出：

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

第一屏不得出现 `lane`、`write_scope`、`binding`、`thread`、`CLI`、`doctor` 或具体 multiagent 子命令。

### 只问自然问题

创建团队时，先问：

```text
这个项目主要想完成什么？
你希望哪些事情交给不同 AI 分开做？
有没有哪些文件或内容不希望 AI 主动修改？
```

不要向用户索要 lane id、write scope 或 session id。Skill 根据回答生成内部字段。

### 先预览，再写入

创建或调整岗位前，用表格预览：

| AI 岗位 | 负责什么 | 可以整理或修改的范围 | 交接方式 |
|---|---|---|---|
| 调研助手 | 整理资料和用户痛点 | 调研笔记、资料区 | 共享调研摘要 |
| 写作助手 | 写初稿和改表达 | 草稿、文档区 | 提交草稿给检查助手 |
| 检查助手 | 检查事实和风险 | 检查记录 | 给出修改建议 |

表格后加：

```text
如果这个方案没问题，我再创建这些协作记录。
```

所有写入前说明：

```text
下面是预览，还不会真正写入。
```

写入后说明：

```text
这次只写入了协作记录，没有改你的业务内容。
```

如果会修改正式文件，列出文件、目的和确认点。

### 不套模板

Skill 可以用内容创作、课程制作、产品开发、资料整理等少量例子帮助用户理解拆分方式，但必须说明：

```text
这些只是参考，我会根据你当前这个项目重新设计，不会直接套模板。
```

不得把示例做成固定模板选择器。

## v0.8 调用边界

v0.9 只改变用户交互层，不改变 v0.8 工具边界。

Codex App 正常路径继续直接调用：

- `create_thread`
- `send_message_to_thread`
- `read_thread`
- `list_threads`
- `set_thread_title`
- `set_thread_pinned`
- `set_thread_archived`

CLI 只记录 StarWork 项目事实源：

- `starwork doctor --target <path> --json`
- `starwork multiagent init`
- `starwork multiagent add`
- `starwork multiagent bind`
- `starwork multiagent release`
- `starwork multiagent status --target <path> --json`
- `starwork multiagent share`
- `starwork multiagent request record`

Codex App 正常路径不得恢复旧的 CLI 自动投递、创建或消息模板路径。

## 主要流程

### 创建 AI 团队

1. 用户语言第一屏说明 AI 岗位是什么。
2. 只读检查项目是否准备好，并说明只读取、不写入。
3. 用自然问题采访项目目标、分工需求和禁止主动修改的内容。
4. 给岗位表格预览，并等待用户确认。
5. 用户确认后写入协作记录。
6. 需要独立 Codex 会话时，用 `create_thread` 创建，用 `set_thread_title` 命名，必要时用 `set_thread_pinned` 置顶，再用 `multiagent bind` 记录真实会话。
7. 汇报时区分岗位已创建、会话已绑定、消息已送达和目标任务已完成。

### 绑定当前会话

先说：

```text
我可以把当前这个 AI 会话登记成一个长期岗位。以后你就可以说“让验收助手继续处理”，而不是每次从头解释。
```

如果拿不到当前会话 ID，先允许用户“稍后绑定”，不要一上来要求 `codex:<thread-id>`。

### 跨岗位交接

先说：

```text
我会把这条任务整理成一段交接消息，发送给对应的 AI 岗位，并记录在项目协作记录里。

这表示消息送达了，不表示对方已经完成任务。需要的话，我可以接着帮你查看它的进展。
```

成功投递后用 `multiagent request record` 记录 `delivered_via_codex_thread_tool`。

### 查看进展

汇报分三块：

```text
1. AI 会话最近状态：<summary>
2. 岗位工作记录：<worklog summary>
3. 共享成果：<shared output summary>
```

不要把会话最近有回复直接说成任务完成。

## 降级与安全接入

目标目录不是 StarWork 工作台时，说：

```text
我还不能确认这个目录已经适合开启多 AI 分工。

为了避免写错位置，我建议先完成项目接入检查。这个过程会先预览，不会直接改文件。
```

AI 入口文档处于 `pending_merge` 时，说这是为了避免不同 AI 读到不一致规则，然后转入 `starworkInit` 安全接入。

自动线程工具不可用时，说：

```text
当前这个 AI 工具暂时不能自动把消息送到另一个会话。

我会换成更稳妥的方式：生成一段交接消息，让你复制给目标 AI 会话。
这样项目记录仍然清楚，也不会误以为任务已经自动完成。
```

必须展示完整 `STARWORK:MULTIAGENT_MESSAGE`，并明确“还没有自动送达”。不得说已通知或已发送成功。

## 状态口径

| 状态 | 可以说 | 不可以说 |
|---|---|---|
| 岗位已创建 | 已经创建了 AI 岗位 | Agent 已经开始工作 |
| 会话已绑定 | 这个岗位已经有对应 AI 会话 | 任务已经完成 |
| 消息已送达 | 交接消息已发送给目标会话 | 目标会话已经完成任务 |
| 目标任务已完成 | 目标会话已明确回报完成，或 worklog / shared output 有完成证据 | 只因消息已发送就说完成 |

## 验收标准

- 第一屏包含 AI 岗位、负责什么、可以整理或修改哪些内容、交接、先预览和确认后。
- 第一屏不包含内部词：lane、write_scope、binding、thread、CLI、doctor、multiagent init、multiagent add。
- 创建团队时先问项目目标、分工需求和禁止主动修改内容。
- 创建或调整岗位前用表格预览，并有“如果这个方案没问题，我再创建这些协作记录。”
- 写入前说“下面是预览，还不会真正写入”；写入后说“这次只写入了协作记录，没有改你的业务内容。”
- 自动工具不可用时说明还没有自动送达，并给出完整可复制交接消息。
- v0.8 禁止项扫描继续通过。
