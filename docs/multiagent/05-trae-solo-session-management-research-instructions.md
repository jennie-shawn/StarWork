# Trae Solo App 会话管理能力调研指令

## 基本信息

- 日期：2026-06-02
- 优先级：低
- 用途：把本文复制或引用给 Trae Solo App，让 Trae Solo 在自己的原生 App 环境中实测会话、项目和历史管理能力。
- 目标：获得可用于 StarWork `multiagent` / Agent Lanes 适配设计的 Trae Solo App 会话管理能力矩阵。

## 调研前提

这不是调研 Trae IDE，也不是调研 Trae Solo 的产品生成能力、页面生成质量或模型能力。

本次只关心 Trae Solo App 如何管理“会话 / app project / solo project / task / run / history / artifact”：

- 能不能识别当前 Solo 项目或当前聊天会话。
- 能不能获得稳定项目 ID、会话 ID、任务 ID 或 run ID。
- 能不能重命名项目或会话。
- 能不能列出历史项目、历史会话、历史任务。
- 能不能读取、恢复、继续、导出、删除、归档或置顶项目/会话。
- Solo 的聊天、需求、计划、生成记录、产物和版本是否属于同一个历史系统。
- 这些能力是否有 UI、App 内入口、URL、API、本地文件或云端项目标识。

## 给 Trae Solo App 的调研 Prompt

下面这段可以直接复制到 Trae Solo App 的新会话或当前项目中执行：

```text
你现在运行在 Trae Solo App 原生环境里。请帮我调研 Trae Solo App 的“会话、项目和历史管理能力”，不要调研页面生成能力、编码执行能力或模型能力。

背景：
我正在设计 StarWork 的 multiagent / Agent Lanes 功能。StarWork 会把多个 AI 会话登记为不同职责位 lane，并需要知道宿主工具是否支持会话识别、命名、恢复、历史读取、导出、归档等能力。Trae Solo App 可能不是 IDE chat，而是围绕 app/project/task/run 管理工作，因此请同时调研“项目级”和“会话级”的标识与历史。

请你在当前 Trae Solo App 环境中尽量实测，而不是只凭公开文档回答。可以使用 Trae Solo UI、项目列表、历史记录、设置、帮助文档、URL、导出入口、可安全读取的本地缓存/日志等方式调查。但不要删除真实项目或历史，不要修改私有数据库，不要做不可逆操作。

请按以下能力逐项调研，并给出证据来源：

1. 当前项目 / 会话识别
- Trae Solo 是否能显示当前 app project / solo project 的唯一 ID？
- 是否能显示当前 chat / task / run 的唯一 ID？
- ID 是否出现在 URL、分享链接、项目设置、导出文件、日志或本地缓存中？
- 项目 ID、会话 ID、任务 ID、run ID 是否是不同概念？
- 这些 ID 是否跨重启、跨设备、跨浏览器稳定？
- 哪个 ID 最适合作为 StarWork 的 `trae-solo:<session-id>`？

2. 当前项目 / 会话命名
- Trae Solo 是否支持重命名项目？
- 是否支持重命名单个会话、任务、run 或生成记录？
- 改名入口在哪里？
- 改名后项目列表、历史列表、分享页或导出文件是否同步显示新名称？
- 是否存在 API、URL 参数、本地状态入口或自动化方式可程序化改名？
- 是否能安全实现类似 Codex `thread/name/set` 的 adapter？

3. 项目列表与历史列表
- Trae Solo 是否有项目列表、最近项目、历史项目或 dashboard？
- 是否能列出一个项目下的历史会话、需求、任务、run、版本或生成记录？
- 是否支持搜索、筛选、按项目/时间/状态排序？
- 是否能区分草稿、已发布、已完成、失败、归档项目？
- 是否能通过 URL/API/本地文件程序化列出？

4. 历史读取
- 是否能打开历史项目或历史会话查看完整内容？
- 历史中是否包含用户需求、AI 回复、计划、生成步骤、文件/页面改动、预览截图、运行日志、错误修复记录？
- 是否能看到每一次生成或修改的版本差异？
- 是否能读取或复制完整历史文本？
- 是否能通过本地文件、云端 API 或导出文件安全读取？

5. 继续 / 恢复历史项目
- 打开历史项目后是否可以继续追加需求？
- 继续时模型是否获得旧项目完整上下文，还是只保留当前产物状态？
- 是否可以从某个历史 run / version 继续？
- 是否可以 fork / duplicate 一个历史项目继续？
- 是否支持向非当前项目或非当前会话发送 follow-up prompt？
- 该能力是否适合 StarWork 的 `multiagent continue <lane>`？

6. 导出与分享
- Trae Solo 是否支持导出项目、代码、设计稿、需求记录或聊天记录？
- 是否支持导出当前或历史会话？
- 导出入口在哪里？
- 导出格式是什么？例如 zip、GitHub repo、Markdown、JSON、HTML、图片、链接。
- 分享链接是否包含稳定项目 ID 或 run ID？
- 导出内容是否适合放入 StarWork lane workspace，例如 `_系统/协作/lanes/<lane-id>/workspace/`？
- 是否支持批量导出？

7. 删除、归档、置顶、收藏
- 是否支持删除项目或会话？是否可恢复？
- 是否支持归档 archive，而不是删除？
- 是否支持置顶 pin、收藏 favorite、star 或固定项目？
- 是否支持隐藏项目或从最近列表移除？
- 这些能力是否有 UI 或可编程入口？
- 哪些能力适合映射到 StarWork `release` 后的宿主清理动作？

8. 项目版本、checkpoint 与 rollback
- Trae Solo 是否保存项目版本或 checkpoint？
- 是否能恢复到某个历史版本、run 或生成步骤？
- rollback 是否可撤销？
- checkpoint 是否跨重启保留？
- checkpoint 与聊天历史是同一个系统还是两个系统？
- 版本 ID 是否可被 StarWork 记录为 shared output 或 lane workspace 元数据？

9. 需求、计划、产物和聊天的边界
- Trae Solo 中“需求描述”“AI 计划”“生成步骤”“产物预览”“聊天记录”是否是同一条会话的一部分？
- 如果修改需求，旧需求和旧计划是否保留？
- 项目产物是否能脱离聊天历史单独存在？
- 新会话继续同一个项目时，是否能读取旧聊天？
- 这些边界对 StarWork lane worklog 有什么影响？

10. 长会话 / 长项目上下文管理
- Trae Solo 是否会自动摘要长项目或长聊天？
- 是否有手动摘要、项目总结、handoff、report 入口？
- 旧消息是否仍可查看？
- 继续历史项目时模型依赖完整历史、摘要，还是当前产物状态？
- StarWork 是否仍需要 worklog 来做显式交接？

11. 多项目 / 多会话并行
- Trae Solo 是否支持同时打开多个项目或多个会话？
- 多项目是否有独立历史、独立预览、独立导出？
- 是否能在同一项目中开多个并行任务？
- 多个会话同时修改同一项目时，Trae Solo 如何处理冲突？
- 这对 StarWork lane write_scope 有什么补充或限制？

12. API / URL / 本地存储
- Trae Solo 是否提供官方 API 管理项目、会话、历史、导出或分享？
- URL 中是否包含稳定 project/session/run 标识？
- 本地是否有可读缓存、日志或配置？路径是什么？
- Trae Solo 是否主要云端存储？离线时历史是否可用？
- 读取本地或云端数据是否安全？是否可能破坏 Trae Solo 状态？
- StarWork adapter 是否应该依赖这些内部存储或 URL？请给出风险判断。

请最终输出：

A. 一张能力矩阵，列为：
能力 / UI 支持 / 可编程支持 / 稳定性 / 适配 StarWork 建议 / 证据

B. 一段结论：
- Trae Solo App 中哪些能力可直接适配 StarWork？
- 哪些只能人工操作？
- 哪些不支持或不建议依赖？
- StarWork 在 Trae Solo 中应该如何生成 `session_id`？应该用项目 ID、会话 ID、任务 ID 还是人工 ID？
- `multiagent bind --session-name` 在 Trae Solo 中应支持、降级还是跳过？
- Trae Solo 是否适合实现 `multiagent status --host`、`multiagent continue <lane>`、`multiagent release --archive-session`？

C. 一个建议工作流：
如何在 Trae Solo App 中把一个当前项目或当前会话登记为 StarWork lane，并完成后续交接。

请明确标注你的 Trae Solo App 版本、运行环境、调研日期。
```

## StarWork 需要的能力矩阵模板

Trae Solo App 输出时建议使用这个表：

| 能力 | UI 支持 | 可编程支持 | 稳定性 | StarWork 适配建议 | 证据 |
|---|---|---|---|---|---|
| 获取当前项目 ID | 待测 | 待测 | 待测 | 待测 | 入口/URL/截图/路径 |
| 获取当前会话 / task / run ID | 待测 | 待测 | 待测 | 待测 | 入口/URL/截图/路径 |
| 项目改名 | 待测 | 待测 | 待测 | 待测 | 入口/URL/截图/路径 |
| 会话 / run 改名 | 待测 | 待测 | 待测 | 待测 | 入口/URL/截图/路径 |
| 列出历史项目 | 待测 | 待测 | 待测 | 待测 | 入口/URL/截图/路径 |
| 列出项目内历史会话 / run | 待测 | 待测 | 待测 | 待测 | 入口/URL/截图/路径 |
| 读取历史内容 | 待测 | 待测 | 待测 | 待测 | 入口/URL/截图/路径 |
| 继续历史项目 / 会话 | 待测 | 待测 | 待测 | 待测 | 入口/URL/截图/路径 |
| fork / duplicate 项目 | 待测 | 待测 | 待测 | 待测 | 入口/URL/截图/路径 |
| 导出项目 / 代码 / 历史 | 待测 | 待测 | 待测 | 待测 | 入口/URL/截图/路径 |
| 分享链接 | 待测 | 待测 | 待测 | 待测 | 入口/URL/截图/路径 |
| 删除项目 / 会话 | 待测 | 待测 | 待测 | 待测 | 入口/URL/截图/路径 |
| 归档项目 / 会话 | 待测 | 待测 | 待测 | 待测 | 入口/URL/截图/路径 |
| 置顶 / 收藏项目 | 待测 | 待测 | 待测 | 待测 | 入口/URL/截图/路径 |
| checkpoint / rollback | 待测 | 待测 | 待测 | 待测 | 入口/URL/截图/路径 |
| 长项目摘要 / handoff | 待测 | 待测 | 待测 | 待测 | 入口/URL/截图/路径 |
| API / URL 稳定标识 | 待测 | 待测 | 待测 | 待测 | 入口/URL/截图/路径 |
| 本地或云端存储 | 待测 | 待测 | 待测 | 待测 | 入口/URL/截图/路径 |

## StarWork 适配判断标准

### 可直接适配

满足以下任一条件：

- 有稳定官方 API、URL 或导出入口。
- 有稳定 UI 操作，且 StarWork 只需要给用户提示，不需要自动化。
- 有安全导出格式，可以进入 lane workspace。
- 项目 ID、会话 ID 或 run ID 跨重启稳定，可作为 `trae-solo:<id>`。

### 只能降级适配

满足以下任一条件：

- 只有 UI，没有可编程入口。
- 只有分享 URL 或导出文件能间接定位项目。
- 能手动完成，但无法由 StarWork CLI 稳定执行。
- 只能用人工 ID，例如 `trae-solo:<project-name>-<date>`。

### 不建议适配

满足以下任一条件：

- 需要直接改写 Trae Solo 私有数据库、云端状态或缓存。
- 删除不可恢复。
- URL 或 ID 仅短期有效。
- 能力依赖不稳定实验 UI。
- 会破坏用户项目历史、发布状态或隐私。

## 调研产物落地建议

Trae Solo App 完成调研后，把结果保存为：

```text
product/docs/multiagent/trae-solo-session-management-research-result.md
```

如果调研中产生截图、分享链接、导出样例或复制出的会话文本，不要放根目录；优先放：

```text
_系统/协作/lanes/capability-research/workspace/
```

或经确认后放入：

```text
product/docs/multiagent/assets/
```
