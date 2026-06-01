# Cursor 会话管理能力调研指令

## 基本信息

- 日期：2026-06-01
- 优先级：中
- 用途：把本文复制或引用给 Cursor，让 Cursor 在自己的原生客户端环境中实测会话管理能力。
- 目标：获得可用于 StarWork `multiagent` / Agent Lanes 适配设计的 Cursor 会话管理能力矩阵。

## 调研前提

这不是调研 Cursor 的 Agent 编码能力，也不是调研 Background Agent 的执行能力。

本次只关心 Cursor 如何管理“会话 / chat / tab / history / thread”：

- 能不能识别当前会话。
- 能不能获得稳定会话 ID。
- 能不能重命名当前会话。
- 能不能列出历史会话。
- 能不能读取、继续、导出、删除、归档或置顶会话。
- 能不能把历史会话作为当前会话上下文。
- 这些能力是否有 UI、命令面板、CLI、API、本地文件或数据库入口。

## 给 Cursor 的调研 Prompt

下面这段可以直接复制到 Cursor 的新会话中执行：

```text
你现在运行在 Cursor 原生客户端里。请帮我调研 Cursor 的“会话管理能力”，不要调研 Agent 编码能力。

背景：
我正在设计 StarWork 的 multiagent / Agent Lanes 功能。StarWork 会把多个 AI 会话登记为不同职责位 lane，并需要知道宿主工具是否支持会话识别、命名、恢复、历史读取、导出、归档等能力。

请你在当前 Cursor 环境中尽量实测，而不是只凭公开文档回答。可以使用 Cursor UI、命令面板、设置、帮助文档、CLI、可安全读取的本地配置/数据库路径等方式调查。但不要修改私有数据库，不要删除真实历史，不要做不可逆操作。

请按以下能力逐项调研，并给出证据来源：

1. 当前会话识别
- Cursor 是否能显示当前 chat/tab/session 的唯一 ID？
- 如果 UI 不显示，是否能从命令、开发者工具、本地文件、SQLite、日志或导出文件中找到稳定 ID？
- 该 ID 是否跨重启稳定？
- 是否适合作为 StarWork 的 `cursor:<session-id>`？

2. 当前会话命名 / 改名
- 当前 chat/tab 是否支持手动改名？
- 改名入口在哪里？
- 改名后历史列表是否同步显示新名称？
- 是否存在命令面板、CLI、API 或本地状态入口可程序化改名？
- 是否能安全实现类似 Codex `thread/name/set` 的 adapter？

3. 会话列表
- Cursor 是否能列出历史 chats / sessions？
- 入口在哪里？例如 sidebar、Agents window、Chat History、命令面板。
- 是否支持搜索、筛选、按项目区分、按时间排序？
- 是否能通过 CLI/API/本地文件程序化列出？

4. 会话读取
- 历史会话能否完整打开查看？
- 打开后是否包含完整消息、工具调用、代码 diff、终端输出、附件或截图？
- 是否能导出为 Markdown 或其他格式？
- 导出的内容是否包含会话标题、时间、模型、上下文文件、代码修改摘要？
- 是否能通过本地文件或数据库安全读取？

5. 会话继续 / 恢复
- 打开历史会话后是否可以继续发送新消息？
- 继续时模型是否能获得旧会话完整上下文，还是只展示历史但不进入上下文？
- Cursor 是否有 `@Past Chats` 或类似能力把旧会话带入新会话上下文？
- 该能力对 StarWork “从 lane worklog 恢复工作”有什么启发？

6. 会话导出
- 是否支持导出当前或历史会话？
- 导出入口在哪里？
- 导出格式是什么？
- 导出是否能用于 StarWork lane workspace，例如 `_系统/协作/lanes/<lane-id>/workspace/`？
- 是否支持批量导出？

7. 会话删除、归档、置顶
- 是否支持删除会话？是否可恢复？
- 是否支持归档 archive，而不是删除？
- 是否支持置顶 pin/favorite/star？
- 这些能力是否有 UI 或可编程入口？
- 哪些能力适合映射到 StarWork `release` 后的宿主清理动作？

8. 多会话 / 多标签
- Cursor 是否支持多个 chat tabs 同时存在？
- 每个 tab 是否有独立上下文、模型、历史？
- tab 标题是否可手动命名？
- 多 tab 同时编辑同一文件时，Cursor 如何处理冲突？
- 这对 StarWork lane write_scope 有什么补充或限制？

9. 长会话上下文管理
- Cursor 是否会自动摘要长会话？
- 是否有 `/summarize` 或手动摘要命令？
- 摘要后旧消息是否仍可查看？
- 摘要是否会影响继续工作时的准确性？
- StarWork 是否仍需要 worklog 来做显式交接？

10. Checkpoint / revert
- Cursor 是否按会话保存代码修改 checkpoint？
- 是否能恢复到某个会话步骤前？
- checkpoint 是否跨重启保留？
- checkpoint 与 chat history 是同一个系统还是两个系统？
- 它是否适合映射 StarWork 的 lane 生命周期？如果不适合，请说明边界。

11. Background Agent 会话历史
- Background Agent 的聊天是否和普通 chat 在同一个历史入口？
- 是否有独立入口或远程历史？
- 是否能被普通 `@Past Chats` 引用？
- 是否有可程序化 ID、读取、继续、命名、归档能力？
- 请只从“会话管理”角度回答，不要展开 Background Agent 执行能力。

12. Cursor CLI / API / 本地存储
- Cursor 是否提供 CLI 管理 chat/session/history？
- 是否有官方 API 管理普通会话？
- 本地会话是否存储在 SQLite 或其他文件中？路径是什么？
- 读取这些文件是否安全？是否可能破坏 Cursor 状态？
- StarWork adapter 是否应该依赖这些内部存储？请给出风险判断。

请最终输出：

A. 一张能力矩阵，列为：
能力 / UI 支持 / 可编程支持 / 稳定性 / 适配 StarWork 建议 / 证据

B. 一段结论：
- Cursor 中哪些能力可直接适配 StarWork？
- 哪些只能人工操作？
- 哪些不支持或不建议依赖？
- StarWork 在 Cursor 中应该如何生成 `session_id`？
- `multiagent bind --session-name` 在 Cursor 中应支持、降级还是跳过？
- Cursor 是否适合实现 `multiagent status --host`、`multiagent continue <lane>`、`multiagent release --archive-session`？

C. 一个建议工作流：
如何在 Cursor 中把一个当前会话登记为 StarWork lane，并完成后续交接。

请明确标注你的 Cursor 版本、操作系统、调研日期。
```

## StarWork 需要的能力矩阵模板

Cursor 输出时建议使用这个表：

| 能力 | UI 支持 | 可编程支持 | 稳定性 | StarWork 适配建议 | 证据 |
|---|---|---|---|---|---|
| 获取当前会话 ID | 待测 | 待测 | 待测 | 待测 | 入口/截图/路径/命令 |
| 当前会话改名 | 待测 | 待测 | 待测 | 待测 | 入口/截图/路径/命令 |
| 列出历史会话 | 待测 | 待测 | 待测 | 待测 | 入口/截图/路径/命令 |
| 读取历史会话 | 待测 | 待测 | 待测 | 待测 | 入口/截图/路径/命令 |
| 继续历史会话 | 待测 | 待测 | 待测 | 待测 | 入口/截图/路径/命令 |
| 导出会话 Markdown | 待测 | 待测 | 待测 | 待测 | 入口/截图/路径/命令 |
| 删除会话 | 待测 | 待测 | 待测 | 待测 | 入口/截图/路径/命令 |
| 归档会话 | 待测 | 待测 | 待测 | 待测 | 入口/截图/路径/命令 |
| 置顶会话 | 待测 | 待测 | 待测 | 待测 | 入口/截图/路径/命令 |
| 多 chat tabs | 待测 | 待测 | 待测 | 待测 | 入口/截图/路径/命令 |
| `@Past Chats` | 待测 | 待测 | 待测 | 待测 | 入口/截图/路径/命令 |
| 长会话摘要 | 待测 | 待测 | 待测 | 待测 | 入口/截图/路径/命令 |
| checkpoint / revert | 待测 | 待测 | 待测 | 待测 | 入口/截图/路径/命令 |
| Background Agent 历史 | 待测 | 待测 | 待测 | 待测 | 入口/截图/路径/命令 |

## StarWork 适配判断标准

### 可直接适配

满足以下任一条件：

- 有稳定官方 CLI / API。
- 有稳定 UI 操作，且 StarWork 只需要给用户提示，不需要自动化。
- 有安全导出格式，可以进入 lane workspace。

### 只能降级适配

满足以下任一条件：

- 只有 UI，没有可编程入口。
- 有本地存储，但不是官方接口。
- 能手动完成，但无法由 StarWork CLI 稳定执行。

### 不建议适配

满足以下任一条件：

- 需要直接改写 Cursor 私有数据库。
- 删除不可恢复。
- 能力依赖不稳定实验 UI。
- 会破坏用户历史或隐私。

## 调研产物落地建议

Cursor 完成调研后，把结果保存为：

```text
product/docs/multiagent/cursor-session-management-research-result.md
```

如果调研中产生截图或导出样例，不要放根目录；优先放：

```text
_系统/协作/lanes/feature-research/workspace/
```

或经确认后放入：

```text
product/docs/multiagent/assets/
```
