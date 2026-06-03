# Claude Code 会话管理能力调研指令

## 基本信息

- 日期：2026-06-02
- 优先级：中
- 用途：把本文复制或引用给 Claude Code，让 Claude Code 在自己的原生 CLI / IDE 集成环境中实测会话管理能力。
- 目标：获得可用于 StarWork `multiagent` / Agent Lanes 适配设计的 Claude Code 会话管理能力矩阵。

## 调研前提

这不是调研 Claude Code 的编码能力，也不是调研 Claude 模型能力。

本次只关心 Claude Code 如何管理“会话 / conversation / transcript / project context / resume / memory”：

- 能不能识别当前会话。
- 能不能获得稳定会话 ID。
- 能不能重命名当前会话。
- 能不能列出历史会话。
- 能不能读取、恢复、继续、导出、删除、归档或置顶会话。
- 能不能将历史会话或 transcript 作为新会话上下文。
- CLI、配置文件、本地 transcript、IDE 集成和 slash commands 是否提供可用入口。

## 给 Claude Code 的调研 Prompt

下面这段可以直接复制到 Claude Code 的新会话中执行：

```text
你现在运行在 Claude Code 原生环境里。请帮我调研 Claude Code 的“会话管理能力”，不要调研编码能力或模型能力。

背景：
我正在设计 StarWork 的 multiagent / Agent Lanes 功能。StarWork 会把多个 AI 会话登记为不同职责位 lane，并需要知道宿主工具是否支持会话识别、命名、恢复、历史读取、导出、归档等能力。

请你在当前 Claude Code 环境中尽量实测，而不是只凭公开文档回答。可以使用 Claude Code CLI、slash commands、help、配置文件、可安全读取的本地 transcript / project state / logs、IDE 集成说明等方式调查。但不要修改私有数据库，不要删除真实历史，不要做不可逆操作。

请按以下能力逐项调研，并给出证据来源：

1. 当前会话识别
- Claude Code 是否能显示当前会话 / conversation / transcript 的唯一 ID？
- 是否存在环境变量、CLI 命令、slash command、本地 transcript 文件名或元数据能表示当前会话？
- 该 ID 是否跨重启稳定？
- 是否适合作为 StarWork 的 `claude-code:<session-id>`？
- 如果没有稳定 ID，推荐 StarWork 如何生成人工 session id？

2. 当前会话命名 / 改名
- Claude Code 当前会话是否支持手动标题或名称？
- 是否有 slash command、CLI、IDE UI 或配置入口可改名？
- 改名后是否会影响历史列表、transcript 文件名或 IDE 展示？
- 是否存在可安全程序化改名的入口？
- 是否能安全实现类似 Codex `thread/name/set` 的 adapter？

3. 会话列表
- Claude Code 是否能列出历史会话 / conversations / transcripts？
- 入口在哪里？例如 CLI 命令、resume picker、slash command、本地 transcript 目录、IDE 面板。
- 是否支持搜索、筛选、按项目区分、按时间排序？
- 是否能通过 CLI/API/本地文件程序化列出？
- 会话列表是否只限当前项目，还是跨项目？

4. 会话读取
- 历史会话能否完整打开查看？
- 是否可以读取完整消息、工具调用、文件修改、终端输出、计划、附件或截图？
- 本地 transcript 是否是 JSON、JSONL、Markdown、纯文本或其他格式？
- transcript 是否包含时间、cwd、模型、工具调用、用户消息、assistant 消息和文件路径？
- 是否能通过本地文件安全读取？是否有隐私或稳定性风险？

5. 会话继续 / resume
- Claude Code 是否支持 resume 历史会话？
- resume 入口是什么？例如命令、参数、slash command、交互式选择器。
- resume 后模型是否获得旧会话完整上下文，还是只获得摘要？
- 是否支持从指定 transcript / session id resume？
- 是否支持向某个非当前会话发送 follow-up prompt？
- 该能力是否适合 StarWork 的 `multiagent continue <lane>`？

6. 会话导出
- 是否支持导出当前或历史会话？
- 导出入口在哪里？
- 导出格式是什么？
- 如果没有官方导出，是否可以安全复制或读取 transcript 文件？
- 导出内容是否适合放入 StarWork lane workspace，例如 `_系统/协作/lanes/<lane-id>/workspace/`？
- 是否支持批量导出？

7. 会话删除、归档、置顶
- 是否支持删除历史会话？是否可恢复？
- 是否支持归档 archive，而不是删除？
- 是否支持置顶 pin/favorite/star？
- 这些能力是否有 UI、CLI、slash command 或可编程入口？
- 哪些能力适合映射到 StarWork `release` 后的宿主清理动作？

8. 项目上下文与记忆
- Claude Code 是否有项目级 memory / instructions / CLAUDE.md / settings？
- 当前会话如何读取项目说明？
- 项目级记忆和会话历史是什么关系？
- `CLAUDE.md` 或类似文件是否适合承载 StarWork lane 使用规则？
- 这些能力能否帮助新会话恢复某个 lane 的工作？

9. 长会话上下文管理
- Claude Code 是否有 compact / summarize / context compression 能力？
- 是否有手动触发命令？
- compact 后旧消息是否仍可查看？
- resume 后是否使用 compact summary？
- StarWork 是否仍需要 worklog 来做显式交接？

10. 多会话并行
- Claude Code 是否支持多个终端 / IDE 会话同时打开同一项目？
- 多会话是否有独立 transcript？
- 是否能区分每个会话的职责或标题？
- 多会话同时编辑同一文件时，Claude Code 如何避免或提示冲突？
- 这对 StarWork lane write_scope 有什么补充或限制？

11. 权限、工具和工作目录状态
- Claude Code 会话是否记录工具权限、approval mode、sandbox、cwd、git branch 等状态？
- resume 后这些状态是否恢复？
- StarWork 绑定 lane 时是否需要记录这些宿主状态？
- 哪些状态应只作为 adapter cache，不应进入 Core 必填事实源？

12. Claude Code CLI / API / 本地存储
- Claude Code 是否提供 CLI 管理 session/history/transcript？
- 是否有官方 API 管理普通会话？
- 本地会话存储路径是什么？
- 读取这些文件是否安全？是否可能破坏 Claude Code 状态？
- StarWork adapter 是否应该依赖这些内部存储？请给出风险判断。

请最终输出：

A. 一张能力矩阵，列为：
能力 / UI 或 CLI 支持 / 可编程支持 / 稳定性 / 适配 StarWork 建议 / 证据

B. 一段结论：
- Claude Code 中哪些能力可直接适配 StarWork？
- 哪些只能人工操作？
- 哪些不支持或不建议依赖？
- StarWork 在 Claude Code 中应该如何生成 `session_id`？
- `multiagent bind --session-name` 在 Claude Code 中应支持、降级还是跳过？
- Claude Code 是否适合实现 `multiagent status --host`、`multiagent continue <lane>`、`multiagent release --archive-session`？

C. 一个建议工作流：
如何在 Claude Code 中把一个当前会话登记为 StarWork lane，并完成后续交接。

请明确标注你的 Claude Code 版本、操作系统、调研日期。
```

## StarWork 需要的能力矩阵模板

Claude Code 输出时建议使用这个表：

| 能力 | UI 或 CLI 支持 | 可编程支持 | 稳定性 | StarWork 适配建议 | 证据 |
|---|---|---|---|---|---|
| 获取当前会话 ID | 待测 | 待测 | 待测 | 待测 | 入口/路径/命令 |
| 当前会话改名 | 待测 | 待测 | 待测 | 待测 | 入口/路径/命令 |
| 列出历史会话 | 待测 | 待测 | 待测 | 待测 | 入口/路径/命令 |
| 读取历史会话 | 待测 | 待测 | 待测 | 待测 | 入口/路径/命令 |
| resume 历史会话 | 待测 | 待测 | 待测 | 待测 | 入口/路径/命令 |
| 向非当前会话发送 follow-up | 待测 | 待测 | 待测 | 待测 | 入口/路径/命令 |
| 导出会话 | 待测 | 待测 | 待测 | 待测 | 入口/路径/命令 |
| 删除会话 | 待测 | 待测 | 待测 | 待测 | 入口/路径/命令 |
| 归档会话 | 待测 | 待测 | 待测 | 待测 | 入口/路径/命令 |
| 置顶会话 | 待测 | 待测 | 待测 | 待测 | 入口/路径/命令 |
| transcript 本地存储 | 待测 | 待测 | 待测 | 待测 | 入口/路径/命令 |
| 项目级 memory / CLAUDE.md | 待测 | 待测 | 待测 | 待测 | 入口/路径/命令 |
| compact / summarize | 待测 | 待测 | 待测 | 待测 | 入口/路径/命令 |
| 多会话并行 | 待测 | 待测 | 待测 | 待测 | 入口/路径/命令 |
| 权限和工作目录状态恢复 | 待测 | 待测 | 待测 | 待测 | 入口/路径/命令 |

## StarWork 适配判断标准

### 可直接适配

满足以下任一条件：

- 有稳定官方 CLI / API。
- 有稳定 UI 或 CLI 操作，且 StarWork 只需要给用户提示，不需要自动化。
- 有安全 transcript 或导出格式，可以进入 lane workspace。

### 只能降级适配

满足以下任一条件：

- 只有交互式 UI，没有可编程入口。
- 有本地存储，但不是官方接口。
- 能手动完成，但无法由 StarWork CLI 稳定执行。

### 不建议适配

满足以下任一条件：

- 需要直接改写 Claude Code 私有数据库或 transcript。
- 删除不可恢复。
- 能力依赖不稳定实验 UI。
- 会破坏用户历史、权限状态或隐私。

## 调研产物落地建议

Claude Code 完成调研后，把结果保存为：

```text
product/docs/multiagent/claude-code-session-management-research-result.md
```

如果调研中产生 transcript 样例、导出文件或命令输出，不要放根目录；优先放：

```text
_系统/协作/lanes/capability-research/workspace/
```

或经确认后放入：

```text
product/docs/multiagent/assets/
```
