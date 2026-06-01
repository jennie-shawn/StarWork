# Trae 会话管理能力调研指令

## 基本信息

- 日期：2026-06-01
- 优先级：低
- 用途：把本文复制或引用给 Trae，让 Trae 在自己的原生客户端环境中实测会话管理能力。
- 目标：获得可用于 StarWork `multiagent` / Agent Lanes 适配设计的 Trae 会话管理能力矩阵。

## 调研前提

这不是调研 Trae 的 Builder / Solo 编码能力，也不是调研 Trae 的模型能力。

本次只关心 Trae 如何管理“会话 / chat / builder history / side chat / inline chat history”：

- 能不能识别当前会话。
- 能不能获得稳定会话 ID。
- 能不能重命名当前会话。
- 能不能列出历史会话。
- 能不能读取、继续、导出、删除、归档或置顶会话。
- Chat、Builder、Inline Chat 的历史是否属于同一个系统。
- 这些能力是否有 UI、命令面板、CLI、API、本地文件或数据库入口。

## 给 Trae 的调研 Prompt

下面这段可以直接复制到 Trae 的新会话中执行：

```text
你现在运行在 Trae 原生客户端里。请帮我调研 Trae 的“会话管理能力”，不要调研 Builder / Solo 的编码执行能力。

背景：
我正在设计 StarWork 的 multiagent / Agent Lanes 功能。StarWork 会把多个 AI 会话登记为不同职责位 lane，并需要知道宿主工具是否支持会话识别、命名、恢复、历史读取、导出、归档等能力。

请你在当前 Trae 环境中尽量实测，而不是只凭公开文档回答。可以使用 Trae UI、命令面板、设置、帮助文档、CLI、可安全读取的本地配置/数据库路径等方式调查。但不要修改私有数据库，不要删除真实历史，不要做不可逆操作。

请按以下能力逐项调研，并给出证据来源：

1. 当前会话识别
- Trae 是否能显示当前 Chat / Builder / Side Chat 的唯一 ID？
- Inline Chat 是否有独立会话 ID？
- 如果 UI 不显示，是否能从命令、开发者工具、本地文件、日志或导出内容中找到稳定 ID？
- 该 ID 是否跨重启稳定？
- 是否适合作为 StarWork 的 `trae:<session-id>`？

2. 当前会话命名 / 改名
- 当前 Chat / Builder 会话是否支持手动改名？
- 改名入口在哪里？
- 改名后历史列表是否同步显示新名称？
- 是否存在命令面板、CLI、API 或本地状态入口可程序化改名？
- 是否能安全实现类似 Codex `thread/name/set` 的 adapter？

3. 会话列表
- Trae 是否能列出历史 Chat / Builder 会话？
- 入口在哪里？例如 Show History、侧边栏、命令面板、项目历史。
- 是否支持搜索、筛选、按项目区分、按时间排序？
- Chat 和 Builder 是否在同一个历史列表？
- Inline Chat 是否进入历史列表？
- 是否能通过 CLI/API/本地文件程序化列出？

4. 会话读取
- 历史会话能否完整打开查看？
- 打开后是否包含完整消息、工具调用、代码 diff、终端输出、附件或截图？
- 是否能看到 Builder 的执行步骤、修改文件、命令运行记录？
- 是否能导出为 Markdown、JSON、HTML 或其他格式？
- 导出的内容是否包含会话标题、时间、模型、上下文文件、代码修改摘要？
- 是否能通过本地文件或数据库安全读取？

5. 会话继续 / 恢复
- 打开历史会话后是否可以继续发送新消息？
- 继续时模型是否能获得旧会话完整上下文，还是只展示历史但不进入上下文？
- Chat 历史和 Builder 历史是否都能继续？
- 是否能从历史会话创建一个新会话，并带入历史上下文？
- 该能力对 StarWork “从 lane worklog 恢复工作”有什么启发？

6. 会话导出
- 是否支持导出当前或历史会话？
- 导出入口在哪里？
- 导出格式是什么？
- 导出是否能用于 StarWork lane workspace，例如 `_系统/协作/lanes/<lane-id>/workspace/`？
- 是否支持批量导出？
- 如果不支持导出，是否可以复制完整会话文本？

7. 会话删除、归档、置顶
- 是否支持删除会话？是否可恢复？
- 是否支持归档 archive，而不是删除？
- 是否支持置顶 pin/favorite/star？
- 这些能力是否有 UI 或可编程入口？
- 哪些能力适合映射到 StarWork `release` 后的宿主清理动作？

8. Chat / Builder / Inline Chat 的会话边界
- Chat 模式和 Builder 模式是否是不同会话类型？
- 从 Chat 切到 Builder 是否保留同一个历史上下文？
- Builder 生成的代码修改记录是否跟 chat message 绑定？
- Inline Chat 是否会进入 Side Chat 历史？
- 不同模式的历史在 UI 和存储上是否统一？

9. 代码修改回滚 / checkpoint
- Trae 是否按会话保存代码修改 checkpoint？
- 是否只能在最新 Chat 窗口回滚？
- 支持回滚多少轮？
- 回滚是否不可撤销？
- checkpoint 是否跨重启保留？
- checkpoint 与 chat history 是同一个系统还是两个系统？
- 它是否适合映射 StarWork 的 lane 生命周期？如果不适合，请说明边界。

10. 长会话上下文管理
- Trae 是否会自动摘要长会话？
- 是否有手动摘要命令？
- 摘要后旧消息是否仍可查看？
- 切换模型后是否继承旧会话上下文？
- StarWork 是否仍需要 worklog 来做显式交接？

11. Trae CLI / API / 本地存储
- Trae 是否提供 CLI 管理 chat/session/history？
- 是否有官方 API 管理普通会话？
- 本地会话是否存储在 SQLite、JSON、日志或其他文件中？路径是什么？
- 读取这些文件是否安全？是否可能破坏 Trae 状态？
- StarWork adapter 是否应该依赖这些内部存储？请给出风险判断。

请最终输出：

A. 一张能力矩阵，列为：
能力 / UI 支持 / 可编程支持 / 稳定性 / 适配 StarWork 建议 / 证据

B. 一段结论：
- Trae 中哪些能力可直接适配 StarWork？
- 哪些只能人工操作？
- 哪些不支持或不建议依赖？
- StarWork 在 Trae 中应该如何生成 `session_id`？
- `multiagent bind --session-name` 在 Trae 中应支持、降级还是跳过？
- Trae 是否适合实现 `multiagent status --host`、`multiagent continue <lane>`、`multiagent release --archive-session`？

C. 一个建议工作流：
如何在 Trae 中把一个当前会话登记为 StarWork lane，并完成后续交接。

请明确标注你的 Trae 版本、操作系统、调研日期。
```

## StarWork 需要的能力矩阵模板

Trae 输出时建议使用这个表：

| 能力 | UI 支持 | 可编程支持 | 稳定性 | StarWork 适配建议 | 证据 |
|---|---|---|---|---|---|
| 获取当前会话 ID | 待测 | 待测 | 待测 | 待测 | 入口/截图/路径/命令 |
| 当前会话改名 | 待测 | 待测 | 待测 | 待测 | 入口/截图/路径/命令 |
| 列出历史会话 | 待测 | 待测 | 待测 | 待测 | 入口/截图/路径/命令 |
| 读取历史会话 | 待测 | 待测 | 待测 | 待测 | 入口/截图/路径/命令 |
| 继续历史会话 | 待测 | 待测 | 待测 | 待测 | 入口/截图/路径/命令 |
| 导出会话 | 待测 | 待测 | 待测 | 待测 | 入口/截图/路径/命令 |
| 删除会话 | 待测 | 待测 | 待测 | 待测 | 入口/截图/路径/命令 |
| 归档会话 | 待测 | 待测 | 待测 | 待测 | 入口/截图/路径/命令 |
| 置顶会话 | 待测 | 待测 | 待测 | 待测 | 入口/截图/路径/命令 |
| Chat / Builder 历史统一性 | 待测 | 待测 | 待测 | 待测 | 入口/截图/路径/命令 |
| Inline Chat 历史 | 待测 | 待测 | 待测 | 待测 | 入口/截图/路径/命令 |
| 长会话摘要 | 待测 | 待测 | 待测 | 待测 | 入口/截图/路径/命令 |
| checkpoint / revert | 待测 | 待测 | 待测 | 待测 | 入口/截图/路径/命令 |
| 本地会话存储 | 待测 | 待测 | 待测 | 待测 | 入口/截图/路径/命令 |

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

- 需要直接改写 Trae 私有数据库。
- 删除不可恢复。
- 能力依赖不稳定实验 UI。
- 会破坏用户历史或隐私。

## 调研产物落地建议

Trae 完成调研后，把结果保存为：

```text
product/docs/multiagent/trae-session-management-research-result.md
```

如果调研中产生截图、导出样例或复制出的会话文本，不要放根目录；优先放：

```text
_系统/协作/lanes/feature-research/workspace/
```

或经确认后放入：

```text
product/docs/multiagent/assets/
```
