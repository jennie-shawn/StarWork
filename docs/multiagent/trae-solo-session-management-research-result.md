# Trae Solo App 会话管理能力调研结果

## 调研元信息

- **调研日期**: 2026-06-02
- **调研方式**: 基于公开信息的外部调研（官方文档、技术文章、产品评测）。**非原生 App 内实测**——未在 Trae Solo App 环境中直接运行调研。
- **对应指令**: `product/docs/multiagent/05-trae-solo-session-management-research-instructions.md`
- **关键信息来源**:
  - Trae Solo 官方文档 (w3cschool/traedocs)
  - TRAE 会话导出功能全拆解 (头条, 2026)
  - Trae Solo 独立端发布分析 (头条, 2026-03-31)
  - Trae Solo 三端联动发布 (头条, 2026-05)
  - Trae Solo vs Codex 对比分析 (头条, 2026)
  - 国内 Trae Solo 使用介绍 (CSDN, 2025-11)
  - Trae Solo 中国版正式发布 (掘金, 2025-12)

**重要警告**: 本次调研**未在 Trae Solo App 原生环境中实测**。以下结论基于公开信息推导，可能存在误差。强烈建议在 Trae Solo App 环境中按指令文档中的 Prompt 进行实测验证，并产出补充调研结果。

---

## Trae Solo App 核心概念辨析

在深入能力矩阵之前，需要先厘清 Trae Solo App 中的几个关键概念：

| 概念 | 定义 | 与 StarWork 的对应关系 |
|---|---|---|
| **Workspace (工作区)** | 一个项目的工作空间，是 Solo App 的组织顶层单元。桌面端打开一个目录即为一个 Workspace。 | 对应 StarWork 的 project |
| **Task (任务)** | Workspace 内的一个独立任务。每个 task 有独立的对话上下文、独立的执行计划和产物。多个 task 可并行运行。 | **最接近 StarWork lane 的概念**。一个 lane 可绑定到一个 task。 |
| **Conversation/Chat (对话)** | 一个 task 内的聊天记录。包含用户需求、AI 计划、执行步骤、代码变更、产物等。 | 对应 lane 的会话内容/worklog 原料 |
| **Solo Agent (智能体)** | 主导执行的核心 AI。可调用子 Agent 拆解任务。 | 对应 StarWork lane 的执行主体 |
| **Run (执行)** | 一个 task 的一次执行过程。task 可以多次 "run"（即继续对话追加需求）。 | Task 内的多次对话轮次 |
| **Session (会话)** | Trae Solo 中 "session" 的概念不如 task 明确。官方文档多用 task，提及 session 更多指移动端的远程常驻任务。 | 需要进一步确认 session 与 task 是否同义 |

**关键判断**: Trae Solo App 中 **task** 是比 session 更核心、更明确的组织单元。StarWork lane 建议绑定到 task 级别，而不是 session 级别。

---

## A. 能力矩阵

| 能力 | UI 支持 | 可编程支持 | 稳定性 | StarWork 适配建议 | 证据 |
|---|---|---|---|---|---|
| 获取当前 Workspace/Project ID | 不明确。Workspace 对应本地目录路径。是否有云端 project ID 未知。 | 未知。无公开 API。可能可通过 Workspace 路径间接定位。 | 未知 | **降级适配**。Workspace 路径可用于 StarWork project 级别定位。若存在云端 project ID，可能仅能在分享链接中获取。 | 官方文档未提及 project ID 概念；Workspace 基于本地目录 |
| 获取当前 Task ID | 不明确。Task 在 UI 中以名称标识。是否有内部 ID 未知。 | 未知。无公开 API。 | 未知 | **降级适配**。若存在内部 task ID，需进一步探索其可读取性。StarWork 可退而使用 task 名称+时间戳生成 `trae-solo:<task-name>-<date>` | 官方文档显示 task 可重命名、可删除，暗示有内部 ID，但未暴露 |
| Task 重命名 | ✅ 支持。点击 task 卡片 "···" → 重命名 | 无程序化入口 | 中（UI 操作稳定） | **降级适配**。`multiagent bind --session-name` 在 Trae Solo 中应提示用户手动重命名 task。StarWork 可自行维护 lane 名称映射。 | 官方文档明确："点击任务卡片右上角的 ··· 按钮，在菜单中选择相应的选项"（含重命名） |
| 创建新 Task | ✅ 支持。按钮/快捷键 `Cmd+Ctrl+N` (macOS) / `Ctrl+Alt+N` (Win) | 无程序化入口 | 高 | **降级适配**。StarWork CLI 可输出提示告知用户创建新 task 并绑定。无法通过 CLI 自动创建。 | 官方文档："点击任务面板顶部的新任务按钮"或快捷键 |
| 列出历史 Task | ✅ 支持。Task 面板在左侧展示当前 Workspace 所有 task | 无程序化 API | 中（UI 操作稳定） | **降级适配**。StarWork 无法程序化列出 task。但 task 列表在 UI 中显式可见，可提示用户手动查看。 | 官方文档显示 task 面板以列表形式展示所有 task，含状态标识 |
| 读取历史对话内容 | ✅ 支持。打开历史 task 查看完整对话。含需求、计划、执行步骤、代码变更。 | ❌ 不支持编程读取 | 中（UI 操作稳定） | **降级适配**。StarWork 可通过 worklog 机制自行记录关键上下文。无法自动读取历史对话。 | 官方文档描述工具面板含编辑器、文档、终端、代码变更等；导出功能说明对话内容完整可回顾 |
| 继续历史 Task | ✅ 支持。打开历史 task 可继续追加需求对话。 | 无程序化入口 | 高（核心功能） | **降级适配**。`multiagent continue <lane>` 应提示用户在 Trae Solo 中手动打开对应 task 继续。 | 多篇文章确认 task 可继续；云端保活机制使 task 持久可用 |
| Fork/Duplicate Task | ❌ 未发现支持。官方文档无此功能描述。 | ❌ 不支持 | 无 | **不支持**。StarWork 不应依赖此能力。可提示用户手动创建新 task 并复制上下文。 | 官方文档和公开文章均未提及 fork/duplicate task 功能 |
| 导出对话 | ✅ 支持。IDE 模式：对话条目右侧「导出」按钮；SOLO 模式：task 卡片 "···" → 「Export Chat」。输出 Markdown 格式。 | ❌ 不支持编程导出 | 中（UI 操作稳定，格式为 Markdown） | **可直接适配（人工操作）**。导出的 Markdown 对话文件可放入 lane workspace 作为 worklog 原材料。StarWork 可提示用户导出后放入 lane workspace。注意：当前仅中国版支持导出。 | 头条文章详细解析导出功能；Markdown 格式、手机/电脑可读 |
| 分享链接 | 未明确。可能支持分享。 | 未知 | 未知 | **降级适配**。若分享链接包含稳定 task/project 标识，可用于 StarWork 的 `trae-solo:<id>` 生成。 | 官方文档提及智能体导入链接 (`s.trae.com.cn/a/xxx`)；task/project 分享链接未证实 |
| 删除 Task | ✅ 支持。task 卡片 "···" → 删除 | ❌ 不支持编程删除 | 低（删除不可恢复） | **不建议自动适配**。StarWork **严禁**自动删除用户 task。`multiagent release` 可提示用户手动清理 task。 | 官方文档确认删除操作 |
| 归档 Task | ❌ 未发现支持。无归档概念。 | ❌ 不支持 | 无 | **降级适配**。StarWork 可在 lane workspace 自行管理归档状态（如 rename task 加 `[done]` 前缀）。 | 无归档功能的相关文档或文章 |
| 置顶/收藏 Task | ❌ 未发现支持。无 pin/favorite/star 功能。 | ❌ 不支持 | 无 | **降级适配**。StarWork 可自行维护 lane 优先级列表。 | 无置顶/收藏功能的相关文档或文章 |
| Checkpoint / Rollback | ⚠️ 部分支持。「代码变更」工具可追溯至多 15 个会话的代码变动。Spec 模式的 spec/tasks/checklist 文档存储在 `.trae/specs/` 目录下可版本控制。 | ❌ 不支持编程触发 | 中 | **降级适配**。代码变更追踪提供了一定回滚能力，但仅为 diff 查看，非 checkpoint/rollback 系统。StarWork 可通过 `.trae/specs/` 下的文档获取部分状态信息。 | 官方文档；掘金文章确认「代码变更」工具支持回溯 15 个会话记录 |
| 长项目上下文管理 | ✅ 支持。自动上下文压缩（用户可主动触发）。手动压缩入口存在。 | ❌ 不支持编程控制 | 中 | **降级适配**。压缩后旧消息可能不可见。StarWork **仍需 worklog 做显式交接**。 | 掘金文章："用户可主动触发压缩功能，精炼对话内容"；"系统也会自动执行压缩操作" |
| 多 Task 并行 | ✅ 核心功能。同一 Workspace 可同时运行多个 task。每个 task 独立上下文。 | ❌ 不支持编程控制 | 高 | **可直接适配（人工操作）**。多 lane 可映射到多 task。StarWork 可将不同 lane 绑定到不同 task。 | 官方文档："支持在一个项目中同时管理多个任务"；"每个任务拥有独立的上下文环境" |
| 跨设备 State Sync | ✅ 核心功能。桌面、Web、移动端三端状态同步。task 在云端持续运行，设备休眠不中断。 | ❌ 无公开 API | 中（依赖云端服务） | **降级适配**。三端同步是 Trae Solo 核心优势，但对 StarWork 适配帮助有限。lane 状态无法自动跨设备同步到 StarWork 体系。 | 多篇文章确认三端联动、任务远程常驻、云端保活 |
| 导出为代码/产物 | ⚠️ 部分支持。可部署到 Vercel 等平台。`.trae/specs/` 下的 Spec 文档可版本控制。无打包下载入口。 | ❌ 不支持编程导出 | 低 | **降级适配**。导出的 Markdown 对话是主要可用产物。代码本身在本地 workspace 目录中。 | 官方文档描述部署功能；Spec 文档存储在 `.trae/specs/` |
| API / CLI / 本地存储 | ❌ 无公开 API。无 session/task 管理 CLI。存储主要为云端，本地可能仅存 workspace 文件和 `.trae/` 配置目录。 | ❌ 无 API | 低（依赖平台演进） | **不建议适配**。StarWork adapter 不应依赖内部存储或假设 API 存在。唯一安全操作：读取 `.trae/specs/` 目录和导出的 Markdown 文件。 | Trae Solo 为独立端，不同于 Trae IDE 的 VS Code 插件体系；无 CLI 入口 |
| 需求/计划/产物/聊天的边界 | ✅ 同一 task 内统一。用户需求、AI 计划、生成步骤、产物预览、聊天记录均为同一 task 的一部分。修改需求后旧需求保留在历史中。 | 无 | 中 | **可直接适配**。Task 边界清晰：一个 task = 一条完整的 lane 工作流。StarWork lane 应绑定到一个 task。 | 官方文档和评测文章描述 task 内统一视图 |
| 新 task 继续同一项目 | ✅ 支持。同一 Workspace 下创建新 task，新 task 有独立上下文但共享项目文件。**新旧 task 之间是否自动读取旧 task 对话未知**。 | 无 | 中 | **降级适配**。跨 task 上下文不自动继承。StarWork 的 worklog 是跨 task/lane 交接的必要手段。 | 官方文档："多任务并行"确认同一项目多个独立 task |

---

## 详细调研记录

### 1. Workspace / Project / Task 识别

**发现**:

Trae Solo App 使用 **Workspace**（本地目录）作为项目组织顶层单元，并在 Workspace 内创建多个 **Task** 作为执行单元。

- **Workspace**: 桌面端打开本地目录即为一个 Workspace。Workspace 路径可用于 StarWork 的 project 级别定位。
- **Task**: 每个 task 有独立名称、对话历史和执行上下文。Task 是 Trae Solo 中最接近 StarWork lane 概念的组织单元。
- **Task ID**: 官方文档未暴露 task 的内部 ID。Task 在 UI 中以用户命名标识。是否存在内部稳定 ID 未知。
- **项目 ID**: 是否存在云端 project ID 未知。分享链接（若存在）中可能包含。

**StarWork 适配建议**:
- 短期方案：使用 `trae-solo:<task-name>-<date>` 作为人工 ID
- 中期方案：若发现分享链接包含稳定标识，使用分享链接中的标识
- 不建议尝试从本地存储或云端数据库中提取 ID

**关键证据**:
- 官方文档 task 管理页面显示 task 列表、命名、删除操作
- 未在任何文档中发现 task ID 的暴露方式
- 与 Trae IDE 不同：Trae IDE 有 session ID (`icube_session_agent_map`); Trae Solo 的 task ID 可能存在于云端数据库

---

### 2. Task 命名 / 重命名

**发现**:
- ✅ Task 支持重命名：点击 task 卡片右上角的 "···" 按钮 → 重命名
- ❌ 无程序化改名入口（无 CLI、无 API）
- ❌ 无法通过本地文件修改 task 名称
- ❌ 无自动命名机制（与 Trae IDE 的 `generate_session_title` 不同）
- 改名后 task 面板立即显示新名称

**StarWork 适配建议**:
- `multiagent bind --session-name` 在 Trae Solo 中应降级为：提示用户手动创建 task 时使用指定名称，或创建后手动重命名
- StarWork CLI 应自行存储 lane 名称（不依赖宿主同步）

---

### 3. Task 列表与历史列表

**发现**:
- ✅ Task 面板以列表形式展示当前 Workspace 所有 task
- ✅ 每个 task 显示名称和状态
- ❌ 无搜索、筛选、排序功能（在公开文档中未发现）
- ❌ 无草稿/已发布/已完成/失败等分类标记
- ✅ 可通过 UI 打开历史 task 查看完整内容
- ⚠️ Task 是否跨设备同步：是（云端存储），但 task 列表是否完整展示历史所有 task 未知

**StarWork 适配建议**:
- `multiagent status` 可提示用户在 task 面板中查看当前所有 task/lane
- StarWork 应自行维护 lane registry（不依赖宿主 task 列表）
- StarWork release 后在 lane workspace 标记状态即可（宿主侧无自动化手段）

---

### 4. 历史读取

**发现**:
- ✅ 打开历史 task → 可查看完整对话（用户需求、AI 回复、计划、生成步骤、代码变更）
- ✅ 代码变更工具：可回溯至多 15 个会话的代码变动（独立标签页展示 diff）
- ✅ 导出功能：导出完整对话为 Markdown 文件
- ❌ 无 API 或程序化读取方式
- ⚠️ 上下文压缩后旧消息是否可查看：不确定（取决于压缩程度）

**StarWork 适配建议**:
- 导出的 Markdown 文件是 worklog 原材料的最佳来源
- StarWork 可建立「每次关键里程碑导出对话 → 放入 lane workspace」的约定
- 代码变更工具的回溯能力可辅助 worklog 中的代码改动记录

---

### 5. 继续 / 恢复历史 Task

**发现**:
- ✅ 打开历史 task 可继续追加需求对话
- ✅ Task 在云端保活，设备休眠不中断
- ⚠️ 继续时模型是否获得完整上下文：取决于上下文压缩状态。压缩后旧消息可能以摘要形式存在。
- ❌ 无 fork/duplicate task 功能
- ❌ 无法向非当前 task 发送 follow-up（只能打开目标 task 后在对话中输入）

**StarWork 适配建议**:
- `multiagent continue <lane>` 应降级为：提示用户在 Trae Solo 的 task 面板中找到对应 task 并打开继续
- 跨 task 的 follow-up 不支持（与 Claude Code 一致）
- worklog 仍然是显式交接的关键

---

### 6. 导出与分享

**发现**:
- ✅ **导出对话**: 任务级导出，格式为 **Markdown**。入口：
  - IDE 模式：对话条目右侧「导出」按钮
  - SOLO 模式：task 卡片 "···" → 「Export Chat」
- ✅ 导出内容含完整对话记录（用户输入 + AI 回复）
- ⚠️ 导出是否含代码变更、计划、产物预览：待确认
- ⚠️ 当前仅中国版支持导出（国际版暂未支持，截至文章发布时间）
- ❌ 无批量导出功能
- ❌ 无分享链接功能（task/project 分享未证实）
- 智能体有导入链接 (`s.trae.com.cn/a/xxx`)，但 task 无类似链接

**StarWork 适配建议**:
- **导出功能是 Trae Solo 对 StarWork 最有价值的适配点**
- StarWork 可约定：每次 lane 交接时，用户导出 task 对话为 Markdown → 存入 `_系统/协作/lanes/<lane-id>/workspace/` 作为 worklog 附件
- 导出文件可被其他 AI 工具（包括 StarWork 本身）读取分析
- 导出功能降低了 StarWork 对 worklog 自动生成能力的依赖

---

### 7. 删除、归档、置顶、收藏

**发现**:
- ✅ 删除 Task: task 卡片 "···" → 删除
- ❌ 无归档 (archive) 功能
- ❌ 无置顶 (pin) 功能
- ❌ 无收藏 (favorite/star) 功能
- ⚠️ 删除是否可恢复：未明确，很可能不可恢复

**StarWork 适配建议**:
- StarWork **严禁**自动删除用户 task
- `multiagent release` 可提示用户：手动重命名 task（如加 `[done]` 前缀）、或手动删除
- StarWork 在 lane workspace 自行管理 lane 生命周期状态

---

### 8. 项目版本、Checkpoint 与 Rollback

**发现**:
- ✅ **代码变更工具**: 追溯至多 15 个会话的代码变动（diff 查看，非 checkpoint）
- ✅ **Spec 模式**: 生成 spec.md、tasks.md、checklist.md，存储在 `.trae/specs/` 目录下（可 git 版本控制）
- ❌ 无 checkpoint/rollback 系统（与 Claude Code 的 snapshot 系统不同）
- ⚠️ 子 Agent fork 机制存在（子 Agent 拥有独立上下文空间），但不是面向用户的 checkpoint 系统

**StarWork 适配建议**:
- `.trae/specs/` 下的 Spec 文档可作为 lane workspace 的状态快照
- 代码变更工具的回溯能力有限（最多 15 个会话），不适合作为 StarWork 的 checkpoint 依赖
- StarWork 应自行通过 worklog 记录关键里程碑

---

### 9. 需求、计划、产物和聊天的边界

**发现**:
- ✅ 同一 task 内，需求描述、AI 计划、生成步骤、产物预览、聊天记录均为统一视图
- ✅ 修改需求后，旧需求和旧计划保留在对话历史中
- ⚠️ 产物（代码文件）脱离聊天历史可单独存在（存在本地 workspace 目录中），但产物与对话的关联需要通过 task 上下文查看
- ❌ 新 task 继续同一项目时，**不会自动读取旧 task 的对话**（task 之间上下文隔离）
- Spec 模式的文档（`.trae/specs/`）跨 task 可读（文件系统共享）

**StarWork 适配建议**:
- Task 边界清晰 = Lane 边界清晰。一个 lane 绑定到一个 task 是合理的。
- 跨 lane 交接必须通过 worklog 或导出对话实现（因为 task 间上下文隔离）
- `.trae/specs/` 目录可作为跨 lane 共享的规划文档

---

### 10. 长会话 / 长项目上下文管理

**发现**:
- ✅ 自动上下文压缩（系统监测到上下文超出窗口时触发）
- ✅ 用户可主动触发压缩（「用户可主动触发压缩功能，精炼对话内容」）
- ⚠️ 压缩后旧消息是否可查看：未明确。压缩机制是用摘要替代旧消息，还是同时保留旧消息待用户展开，取决于 UI 实现。
- ⚠️ 切换模型/智能体时系统自动压缩
- ❌ 无手动摘要、项目总结、handoff、report 专用入口
- 压缩参数（如保留消息数、token 限制）未公开

**StarWork 适配建议**:
- Trae Solo 自动压缩不能替代 StarWork worklog
- worklog 需要做**显式交接**（压缩摘要对用户不透明）
- StarWork 应在超过一定轮次后提示用户导出对话并生成 worklog

---

### 11. 多 Task / 多会话并行

**发现**:
- ✅ **核心功能**: 同一 Workspace 支持多 task 并行运行
- ✅ 每个 task 独立上下文、独立历史
- ✅ 任务在云端并行执行（设备休眠不中断）
- ✅ 移动端可同时监控多个 task 进度
- ❌ 多个 task 修改同一文件时的冲突处理：未在文档中说明（可能依赖文件系统级冲突）
- ✅ task 之间不共享对话上下文

**StarWork 适配建议**:
- **多 task 并行是 Trae Solo 对 StarWork 的重要适配点**
- 每个 lane 绑定到一个 task，多个 lane 可在同一 Workspace 下并行
- StarWork 的 lane write_scope 可约束不同 task 操作的文件范围
- 移动端监控能力对于 StarWork 的 `multiagent status` 提供了「人可以随时查看多 lane 进度」的基础

---

### 12. API / URL / 本地存储

**发现**:

| 维度 | 结论 |
|---|---|
| **公开 API** | ❌ 不存在。Trae Solo 为独立桌面/移动端 App，不提供 HTTP API 或 IPC 接口 |
| **CLI** | ❌ 不存在。Trae Solo 无命令行工具。Trae IDE 有 `trae-cn` 但仅用于启动 IDE |
| **URL 标识** | ⚠️ 智能体有分享链接 (`s.trae.com.cn/a/xxx`)，但 task/project 分享链接未证实 |
| **本地存储** | ⚠️ `.trae/specs/` 目录存在；workspace 文件即用户项目文件；其他本地存储位置未公开 |
| **云端存储** | ✅ 核心存储方式。task 上下文、对话历史、状态均为云端存储，支持跨设备同步 |
| **离线可用性** | ⚠️ 不确定。task 云端保活机制暗示强依赖网络 |
| **安全读取** | ⚠️ `.trae/specs/` 可安全读取；不应尝试读取或操作云端数据库或本地加密存储 |

**StarWork 适配建议**:
- StarWork adapter **不应依赖任何内部存储或假设 API 存在**
- 唯一安全操作：读取 `.trae/specs/` 目录（Spec 模式的产物）
- 导出的 Markdown 对话文件（用户主动导出）是安全的读取途径
- 不应尝试读取云端数据库或推测本地配置文件路径

---

## B. 结论

### 可直接适配 StarWork 的能力

1. **Task 导出（Markdown）**: Trae Solo 的对话导出功能是目前最直接可用的适配点。导出的 Markdown 文件可放入 lane workspace 作为 worklog 附件。**注意：仅中国版支持导出。**

2. **多 Task 并行**: 同一 Workspace 支持多 task 并行，每个 task 独立上下文。StarWork lane 可一对一绑定到 task。多 lane 可在同一项目下并行开展工作。

3. **Task 边界 = Lane 边界**: Task 内的需求、计划、执行、产物的统一视图，天然适合映射为一个 StarWork lane 的完整工作流。

4. **`.trae/specs/` 目录**: Spec 模式的产物（spec.md、tasks.md、checklist.md）可安全读取，适合作为 lane workspace 的规划文档参考。

5. **跨设备 State Sync**: Task 在云端保活、三端同步。虽然无法程序化利用，但为人工操作提供了便利（用户可在任意设备查看 lane 状态）。

### 只能降级适配（人工操作，无法自动化）

1. **session_id 生成**: Task ID 不对外暴露。StarWork 应使用人工 ID：`trae-solo:<task-name>-<date>`。在 `multiagent bind` 时由用户确认 task 名称，StarWork 生成人工 ID。

2. **Task 重命名**: 仅 UI 操作。`multiagent bind --session-name` 应提示用户手动重命名 task。

3. **Task 列表/历史**: 仅 UI 查看。StarWork 自行维护 lane registry。

4. **继续/恢复 Task**: 仅 UI 操作。`multiagent continue <lane>` 应提示用户手动打开对应 task。

5. **导出对话**: 仅 UI 操作。StarWork 可提示用户「请将当前 task 导出为 Markdown 并保存到 lane workspace」。

6. **归档/置顶/删除**: 无自动入口。StarWork 自行管理 lane 生命周期。

### 不支持或不建议适配

1. **程序化 API/CLI**: 不存在。StarWork adapter 不应尝试任何自动化操作。

2. **Fork/Duplicate Task**: 不支持。跨 lane 复用上下文只能通过导出对话实现。

3. **Checkpoint/Rollback 系统**: 不存在。代码变更工具的 diff 回溯不是 checkpoint 系统。

4. **操作云端数据库或本地加密存储**: 严禁。可能破坏用户数据、违反服务条款。

5. **分享链接作为稳定 ID**: 未证实。不应假设其稳定性。

### StarWork 在 Trae Solo 中如何生成 session_id

**推荐格式**: `trae-solo:<task-name>-<ISO-date>`

示例：
```
trae-solo:后端API-Review-2026-06-02
trae-solo:前端-登录页面-2026-06-02
```

生成方式：
1. `multiagent bind` 时提示用户输入 task 名称
2. StarWork CLI 取当前日期
3. 组合为 `trae-solo:<task-name>-<date>` 格式
4. 写入 lane registry

若未来发现 task 存在稳定内部 ID 且可安全读取，可升级为 `trae-solo:<task-id>`。

### `multiagent bind --session-name` 策略

**降级处理**: 
- StarWork CLI 自行存储 lane 名称
- 输出提示：「请在 Trae Solo 中将当前 task 重命名为 `<session-name>`」
- 不阻塞执行（改名失败不致命）

### Trae Solo 是否适合实现关键命令

| StarWork 命令 | 实现判断 | 说明 |
|---|---|---|
| `multiagent status --host` | ⚠️ 降级 | 无法自动读取 task 状态。可输出当前 Workspace 路径、已知 lane 名称等 StarWork 侧信息。 |
| `multiagent continue <lane>` | ⚠️ 降级 | 无法自动恢复 task。提示用户：「请在 Trae Solo 的 task 面板中找到名为 `<lane-name>` 的 task 并打开继续」。 |
| `multiagent release --archive-session` | ⚠️ 降级 | 无法自动归档/删除 task。提示用户：「请导出当前 task 对话为 Markdown 并保存到 lane workspace，然后可选择删除或重命名 task（加 `[done]` 前缀）」。 |

---

## C. 建议工作流

### 将当前 Trae Solo Task 登记为 StarWork Lane

```text
# 步骤 1：在 Trae Solo 中创建一个新 Task
→ 点击 task 面板「新任务」按钮（或快捷键 Cmd+Ctrl+N）
→ 命名 task 为 lane 名称，例如：「后端 API Review」

# 步骤 2：在 task 对话中执行 StarWork 绑定
→ 向 Trae Solo 中的 AI 说明 StarWork lane 绑定需求
→ Trae Solo AI 协助执行：
   starwork multiagent bind api-review \
     --host trae-solo \
     --session-name "后端 API Review"

# 步骤 3：StarWork CLI 内部动作
→ 生成人工 session_id: trae-solo:后端API-Review-2026-06-02
→ 写入 lane registry: _系统/协作/lanes/api-review/lane.json
   {
     "host": "trae-solo",
     "session_id": "trae-solo:后端API-Review-2026-06-02",
     "session_name": "后端 API Review",
     "bound_at": "2026-06-02T10:00:00+08:00",
     "workspace_path": "/path/to/current/workspace"
   }
→ 创建 lane workspace 目录和初始 worklog
→ 提示用户：✅ Lane api-review 已绑定到 Trae Solo task「后端 API Review」

# 步骤 4：在 task 工作过程中维护 worklog
→ AI 在 lane workspace 中记录关键决策、进展、待办
→ 阶段性导出对话为 Markdown，存入 lane workspace/

# 步骤 5：交接 / Release
→ 用户导出 task 完整对话 → 存入 lane workspace/
→ 执行: starwork multiagent release api-review
→ StarWork: 标记 lane 为 released，生成 worklog 摘要
→ 提示用户：「Task「后端 API Review」已完成。可选择重命名为「[done] 后端 API Review」或删除。」
```

### 多 Lane 并行场景

```text
# Trae Solo Workspace: my-project/
# Task 面板左侧可见多个 task:

Task 1: "后端 API Review"      → Lane: api-review
Task 2: "前端登录页面"          → Lane: login-ui
Task 3: "技术文档撰写"          → Lane: tech-docs

# 三个 task 并行运行，各自独立上下文
# StarWork 在 _系统/协作/lanes/ 下有三个 lane 目录
# 每个 lane 有独立的 worklog 和 workspace

# 用户可在移动端随时查看各 task 进度
# 桌面端继续任一 task 的 worklog 记录
```

### Release 后清理

```text
# starwork multiagent release api-review 执行：

1. 提示用户：
   「请导出当前 task 对话为 Markdown，保存到：
    _系统/协作/lanes/api-review/workspace/conversation-export-2026-06-02.md」

2. StarWork 内部：
   - 标记 lane 为 released
   - 从 worklog 生成摘要
   - 保留 lane workspace 作为交接产物

3. 提示用户（Trae Solo 侧）：
   「建议操作（可选）：
    - 将 task 重命名为「[done] 后端 API Review」
    - 或删除 task（⚠ 不可恢复）
    - 或保留 task 作为历史记录」
```

---

## 与 Trae IDE (VS Code 插件版) 的对比摘要

| 维度 | Trae IDE (已调研) | Trae Solo App (本调研) | StarWork 差异影响 |
|---|---|---|---|
| 产品形态 | VS Code 插件 | 独立桌面/Web/移动端 App | Solo 无 CLI，适配只能靠人工 |
| Session/Task 标识 | session_id (24 hex) 可从 state.vscdb 读取 | Task ID 不对外暴露 | Solo 只能用人工 ID |
| 存储 | 本地为主（SQLite + state.vscdb + 日志） | 云端为主（跨设备 State Sync） | Solo 无本地可读数据 |
| 可编程性 | state.vscdb 可安全读取 | 无任何可编程入口 | Solo 适配更受限 |
| 导出 | 不支持（用户需自行复制） | ✅ 支持导出 Markdown | Solo 的导出是重要优势 |
| 多任务并行 | Solo Coder 的子 Agent 并行 | ✅ Task 级别的多任务并行 | Solo 更适合多 lane 映射 |
| 重命名 | 自动生成标题，无手动改名 | ✅ 手动重命名 Task | Solo 可手动对齐 lane 名称 |
| 适合的 StarWork 策略 | 读取 state.vscdb 获取 session_id | 人工 ID + 导出 Markdown 做 worklog | 两个产品适配路径完全不同 |

---

## 关键局限与待验证项

1. **本调研非原生实测**: 所有结论基于公开信息。强烈建议在 Trae Solo App 环境中按指令文档中的 Prompt 进行实测。
2. **Task ID 是否可发现**: 未在公开文档中找到。实测时请检查 task 导出文件、分享链接（若存在）、本地 `.trae/` 目录。
3. **导出完整性**: 导出 Markdown 是否包含代码变更 diff、计划步骤、子 Agent 活动、产物预览链接，需要实测确认。
4. **国际版适配**: 当前导出功能仅中国版支持。国际版用户需等待功能上线。
5. **Task 生命周期**: Task 是否能长期保留（不自动清理），需要实测或查阅官方说明。
6. **移动端的 Task 管理**: 移动端 UI 的 task 操作（重命名、删除、导出）是否完整，需要实测。

---

## 后续建议

1. **优先**: 在 Trae Solo App 中按 `05-trae-solo-session-management-research-instructions.md` 中的 Prompt 执行原生实测，产出补充调研结果。
2. **其次**: 实测导出 Markdown 的完整性和格式，确认其作为 worklog 原料的可用性。
3. **再次**: 探索 `.trae/` 目录下是否有可安全读取的配置文件（如 task 列表、名称映射等）。
4. **设计**: 基于人工 ID 方案设计 StarWork `multiagent bind` 的 Trae Solo 适配流程。
