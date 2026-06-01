# Trae 会话管理能力调研结果

## 调研元信息

- **Trae 版本**: Trae CN 3.3.43 (Build 2.3.17432, VS Code 1.107.1)
- **操作系统**: macOS 26.5 (Darwin)
- **调研日期**: 2026-06-01
- **调研方式**: 在当前 Trae 原生客户端内通过文件系统探索、环境变量检查、数据库读取、日志分析等方式实测
- **当前会话 ID**: `69e0a3b259b29ff710cfc441`
- **当前 Agent**: `solo_coder` (Agent 模式)
- **当前模型**: `deepseek//deepseek-v4-pro`

---

## 能力矩阵

| 能力 | UI 支持 | 可编程支持 | 稳定性 | StarWork 适配建议 | 证据 |
|---|---|---|---|---|---|
| 获取当前会话 ID | 不直接显示 | 可读: workspaceStorage `state.vscdb` 中的 `icube_session_agent_map` | 稳定 (24 字符 hex，跨重启持久) | **可适配**: 从 `state.vscdb` 安全读取 `icube_session_agent_map`，取当前 session_id | `state.vscdb` key `icube_session_agent_map` = `{"69e0a3b259b29ff710cfc441": "solo_coder"}` |
| 当前会话改名 | 不支持手动改名 | 不支持 | 自动生成标题 | **降级适配**: 无手动改名入口；StarWork 应使用自动生成标题或自行维护 lane 名称映射 | 日志显示 `generate_session_title` → "开始 Trae Session 管理研究"，仅在首条消息触发 |
| 列出历史会话 | UI 历史面板 | 可读: globalStorage `state.vscdb` 中 `all_session_badges_*` 键，以及 snapshot 目录列表 | 稳定 | **可适配**: 通过 `all_session_badges_*` 和 snapshot 目录枚举历史会话 ID | globalStorage `state.vscdb` 含 11 个 `all_session_badges_*` 键；snapshot 目录含 13 个历史会话 |
| 读取历史会话 | UI 可打开查看 | 加密数据库不可直接读；session 元数据可从 `state.vscdb` 读取 | 稳定 (UI) / 受限 (编程) | **降级适配**: 无法编程读取完整消息；可从 state.vscdb 读取 session → agent/model 映射 | `2103808520375648_ai-chat:sessionRelation:modelMap` 记录 session 模型映射 |
| 继续历史会话 | UI 可继续对话 | 内部 `ChatService::get_sessions` 方法存在，但不对外暴露 API | 稳定 (UI) | **降级适配**: 只能通过 UI 操作继续；StarWork 可提示用户手动恢复 | 日志含 `[ChatService] get_sessions cost time` 调用 |
| 导出会话 | UI 不支持导出 | 不支持 | 不支持 | **降级适配**: 无导出功能；StarWork 需自行维护 worklog 作为替代 | 所有 AI agent service 中未发现 export 相关方法 |
| 删除会话 | UI 可能支持 (未在当前环境确认) | 不支持 (无 delete 服务) | 不确定 | **不建议适配**: 不可编程，不可恢复 | 未发现 delete_session 服务；`snapshot_clean_up` 仅做自动清理 |
| 归档会话 | 不支持 | 不支持 | 不支持 | **降级适配**: 无归档功能；StarWork 可通过 lane workspace 自行归档 | 未发现 archive 相关功能 |
| 置顶会话 | 不支持 | 不支持 | 不支持 | **降级适配**: 无置顶功能；StarWork 可自行维护 lane 优先级列表 | 未发现 pin/favorite/star 相关功能 |
| Chat / Builder 历史统一性 | 统一历史列表 | 可读: session→agent映射区分模式 | 稳定 | **可适配**: Chat(solo_coder) 和 Builder(dev_builder) 共享同一 session 存储系统 | `globalModeMap` = `{"solo_coder":0,"dev_builder":1}`; sessions 无类型区分 |
| Inline Chat 历史 | 当前环境未找到独立 Inline Chat 历史 | 未发现 | 不确定 | **跳过**: 当前调研未发现 Inline Chat 独立历史机制 | 所有 session 数据只区分 solo_coder/dev_builder agent |
| 长会话摘要 | 自动摘要 | 内部机制，不可编程调用 | 稳定 (内部) | **可适配**: 摘要参数可从日志提取；StarWork worklog 仍需显式交接 | `agentic_summary_config`: `kept_history_message_limit: 4`, `kept_history_token_limit: 8000` |
| checkpoint / revert | Snapshot v2 系统存在但活动会话中为空 | 内部 git repo 管理，不可编程调用 | 内部可用 | **降级适配**: snapshot v2 使用 git 管理文件版本，但为内部机制；StarWork 不适合直接依赖 | snapshot 目录含 git repos，但当前会话中为 `init empty branch`；`chat_turn_finish` 触发 snapshot 创建 |
| 本地会话存储 | 加密 SQLite (`database.db`) + `state.vscdb` + snapshot git repos | 可读: state.vscdb (SQLite), storage.json, 日志文件；不可读: database.db (加密) | 稳定 | **可适配 (限非加密部分)**: 安全读取 state.vscdb 和日志获取 session 元数据；禁止直接操作加密 database.db | database.db 文件类型为 `data` (加密)，`file` 命令无法识别 |

---

## 详细调研记录

### 1. 当前会话识别

**发现**:
- Trae 的每个 Chat 会话拥有一个 **24 字符的十六进制 ID**（如 `69e0a3b259b29ff710cfc441`），作为唯一标识符
- 该 ID 出现在多个位置：
  - `icube_session_agent_map`：将 session_id 映射到 agent 名称
  - snapshot 目录名：`ModularData/ai-agent/snapshot/<session_id>/`
  - session badge：`all_session_badges_<session_id>`
  - session 关系映射：`*_ai-chat:sessionRelation:modelMap`, `planModeMap`, `specModeMap`
- session_id 与项目绑定 (`project_id: 6a1cf80eaa1f10964208c0c8`)，跨重启稳定
- **注意**: badge 键中 session_id 末尾数字与 snapshot 目录名差 1（badge 末尾 +1 → snapshot 目录名），这表明 badge ID 和实际 session ID 使用不同的编号规则

**当前会话的具体数据**:
```json
// icube_session_agent_map
{"69e0a3b259b29ff710cfc441": "solo_coder"}

// sessionRelation:modelMap
{"69e0a3b259b29ff710cfc441": {"solo_coder": "3_deepseek_deepseek//deepseek-v4-pro"}}

// planModeMap / specModeMap
{"69e0a3b259b29ff710cfc441": false}
```

**环境层级的 session 概念**:
- `ICUBE_CODEMAIN_SESSION`: `4743c340-9ecf-4502-9220-54fb98f740ed`（IDE 实例级别，非 Chat 会话）
- IPC `connect_session_id`: `eeeb24d7-35da-45c4-9837-f08a8082f651`（前端到后端 IPC 通道）
- Chat session_id: `69e0a3b259b29ff710cfc441`（StarWork 应使用此 ID）

**StarWork 适配建议**: 使用 Chat session_id（snapshot 目录名格式）作为 `trae:<session-id>`

---

### 2. 当前会话命名 / 改名

**发现**:
- Trae **自动生成** 会话标题，使用 `title_generation` 模型
- 当前会话首个用户消息后，系统通过 LLM 生成了标题: **"开始 Trae Session 管理研究"**
- 标题生成逻辑：`should_generate_title: true` 仅在首条消息时触发，后续消息 `should_generate_title: false`
- **没有发现手动重命名的 API 或 CLI 入口**
- 标题存储在加密的 `database.db` 中，无法直接读取

**日志证据**:
```
generate_session_title: session_id: "69e0a3b259b29ff710cfc441", generated_title: "开始 Trae Session 管理研究"
```

**StarWork 适配建议**: 
- 无法实现类似 Codex `thread/name/set` 的 adapter
- StarWork 应自行维护 lane 名称到 session_id 的映射
- `multiagent bind --session-name` 在 Trae 中应降级：使用 StarWork 自定义名称，而非宿主改名

---

### 3. 会话列表

**发现**:
- 历史会话可通过 globalStorage `state.vscdb` 中的 `all_session_badges_<id>` 键枚举
- 发现 **11 个历史会话** badge 记录（含跨项目）
- snapshot 目录中有 **13 个** 历史会话目录
- Session 列表按项目 (`project_id`) 区分，每个项目一个 badge（`all_session_badges_<project_id>`）
- 没有发现搜索、筛选、排序的程序化接口

**历史会话 badge ID 列表**:
```
69a2f6b7533394d391dcb3e1, 69a2f6e6533394d391dcb462, 69ac2677f59091d2d5dd8bdf,
69bebb812d77abdb6d257af4, 69ce1d843177ca6b4ca0b31e, 69ce257a3177ca6b4ca0b321,
69ce26e83177ca6b4ca0b427, 69e0864259b29ff710cfc320, 69e087c359b29ff710cfc3d2,
69e0a3b259b29ff710cfc440
```

**StarWork 适配建议**: 可安全读取 badge 键枚举 session，再配合 session 关系映射获取每个 session 的 agent 和模型信息

---

### 4. 会话读取

**发现**:
- 完整消息历史存储在加密的 `database.db` 中，**无法通过编程方式读取**
- 可通过 `state.vscdb` 安全读取 session **元数据**（agent、model、plan/spec mode 映射）
- ChatService 内部有 `get_messages`、`get_turns` 方法但不对外暴露 API
- `chat_message_query_limit: 400`, `history_query_limit: 300` 表明系统内部支持大量历史查询

**StarWork 适配建议**: 
- 无法编程读取完整会话内容
- 可读取元数据用于 lane 状态追踪
- StarWork 应自行通过 worklog 机制记录关键上下文

---

### 5. 会话继续 / 恢复

**发现**:
- 内部 ChatService 有 `get_sessions` 方法和 session 缓存机制 (`build_server_history_ids_cache`)
- 消息同步机制：`SyncHistory notify_server_history_change`
- 从日志看，同一 session 内的多次消息（多个 trace_id）共享同一 session_id
- 会话继续能力仅通过 UI 提供，无程序化接口

**StarWork 适配建议**:
- `multiagent continue <lane>` 在 Trae 中应降级为人工操作提示
- 可引导用户在 Trae UI 中打开对应历史会话继续
- StarWork worklog 机制仍然是必需的显式交接手段

---

### 6. 会话导出

**发现**:
- 在所有 AI agent service 列表中未发现任何 export 相关服务
- AI agent 支持的服务: `agent`, `chat`, `ckg`, `commercial`, `configuration`, `healthcheck`, `model`, `privacy_mode`, `project`, `sandbox`, `snapshot`, `task`, `todo_list`
- 无 `export`、`download`、`backup` 等服务
- 用户可能可以手动选择和复制对话文本

**StarWork 适配建议**:
- 导出功能完全不可用
- StarWork 必须自行维护 worklog 作为会话内容记录
- lane workspace 的内容需要通过 worklog 手动填充

---

### 7. 会话删除、归档、置顶

**发现**:
- 未发现 `delete`、`archive`、`pin`、`favorite`、`star` 相关服务
- snapshot 系统有 `snapshot_clean_up: { enable: true }` 自动清理机制
- badge 键的删除功能未知

**StarWork 适配建议**:
- `multiagent release --archive-session` 无法在 Trae 中自动执行
- 可降级为人工提示：让用户手动清理/保留会话
- StarWork 可自行在 lane workspace 中维护归档状态

---

### 8. Chat / Builder / Inline Chat 的会话边界

**发现**:
- Trae 使用 agent 系统区分模式：
  - `solo_coder` → Agent 模式（Chat）
  - `dev_builder` → Builder 模式
- 全局模式映射：`{"solo_coder": 0, "dev_builder": 1}`
- **Chat 和 Builder 共享同一 session 存储系统**：session_id 格式相同，存储位置相同
- 从 Chat 切换到 Builder 会创建新 session（不同 agent），旧 session 历史保留
- Builder 特定模型有 `builder: true` 标记
- 未发现独立的 Inline Chat 历史机制

**StarWork 适配建议**:
- Trae 的 session 边界 = agent 边界
- StarWork lane 应对应到具体的 (project, session_id, agent_type) 三元组
- 跨 agent 模式切换意味着需要创建新的 lane

---

### 9. 代码修改回滚 / checkpoint

**发现**:
- Trae 有 **Snapshot v2** 系统，基于 git 管理每个 session 的文件变更
- snapshot 目录：`ModularData/ai-agent/snapshot/<session_id>/v2/.git`
- 当前状态：所有 snapshot repos 只有初始的 `init empty branch` 提交
- `chat_turn_finish` 触发 `create_new_version_v2` 创建新 snapshot
- 日志显示：`snapshot_v2: { enable_v2: true, force_double_write: false }`
- 有 `get_session_ai_touched_files` 方法追踪 AI 修改的文件
- 回滚能力仅限 Trae UI 内部使用，无程序化接口

**StarWork 适配建议**:
- Snapshot v2 是内部机制，StarWork **不建议**直接依赖
- checkpoint 与 chat history 是同一个系统（都绑定在 session_id 下）
- 不适合直接映射 lane 生命周期，因为：
  - 不可编程触发 checkpoint
  - 无法跨 session 对比
  - 回滚粒度未知

---

### 10. 长会话上下文管理

**发现**:
- Trae 有自动摘要机制 (`agentic_summary_config`)：
  - `summary_message_token_limit: 2000` - 摘要最大 token
  - `kept_history_token_limit: 8000` - 保留的历史 token 上限
  - `kept_history_message_limit: 4` - 保留最近 4 条消息
  - `minimum_current_turn_token_usage: 15000` - 触发摘要的最小当前轮 token
- 无手动摘要命令
- 摘要后旧消息是否可查看：取决于 UI 实现，无法确认
- 模型切换：session 绑定模型，切换模型不确定是否继承上下文

**StarWork 适配建议**:
- Trae 自动摘要不能替代 StarWork worklog
- worklog 需要做**显式交接**（摘要语义、关键结论、待办事项）
- StarWork 应在超过一定轮次后提示用户生成 worklog

---

### 11. Trae CLI / API / 本地存储

**发现**:

**CLI**: `trae-cn` 命令仅是 VSCode 风格的 IDE 启动器（`--diff`, `--goto`, `--new-window` 等），**不支持任何 session/chat 管理命令**

**API**: 无公开 session 管理 API。所有 AI agent 服务通过内部 IPC 通信，不对外暴露

**本地存储**:
| 存储文件 | 格式 | 可读性 | 内容 |
|---|---|---|---|
| `ModularData/ai-agent/database.db` | 加密 SQLite | **不可读** | 完整聊天历史、消息、标题 |
| `User/workspaceStorage/<hash>/state.vscdb` | SQLite | **可读** | session→agent 映射、model 设置、plan/spec mode |
| `User/globalStorage/state.vscdb` | SQLite | **可读** | 全局 session badges、用户偏好 |
| `User/globalStorage/storage.json` | JSON | **可读** | 窗口状态、最近文件 |
| `ModularData/ai-agent/snapshot/<id>/v2/.git` | Git repo | **可读** | 代码变更快照 (当前为空) |
| `ModularData/ai-agent/sandbox/<project>.json` | JSON | **可读** | 沙箱权限配置 |
| `logs/<date>/Modular/ai-agent_*_stdout.log` | 日志 | **可读** | 详细的会话生命周期日志 |

**StarWork 适配建议**:
- **可以安全读取**: `state.vscdb`、`storage.json`、日志文件
- **禁止直接操作**: `database.db`（加密，修改可能破坏 Trae 状态）
- StarWork adapter **不应**依赖加密数据库
- 建议 StarWork adapter 通过读取 state.vscdb 获取 session 元数据

---

## 结论

### A. 可直接适配 StarWork 的能力

1. **session_id 获取**: 从 `state.vscdb` 的 `icube_session_agent_map` 安全读取当前 session_id
2. **session 列表**: 从 `all_session_badges_*` 键和 snapshot 目录枚举历史 session
3. **session 元数据**: 从 `state.vscdb` 读取 session→agent、session→model 映射
4. **长会话摘要参数**: 从日志获取摘要配置，辅助 StarWork 判断 worklog 触发时机
5. **日志监控**: 从 AI agent stdout 日志获取 session 生命周期事件

### B. 只能降级适配（人工操作）的能力

1. **会话命名**: 无手动改名入口；StarWork 自行维护 lane 名称映射
2. **会话继续**: 只能通过 UI；StarWork 提示用户手动恢复
3. **会话导出**: 完全不可用；StarWork 使用 worklog 替代
4. **会话删除/归档/置顶**: 无程序化入口；StarWork 自行在 lane workspace 管理
5. **checkpoint/回滚**: 内部机制，不适合 StarWork 直接依赖

### C. 不支持或不建议依赖的能力

1. **直接操作 `database.db`**: 加密存储，修改可能破坏 Trae 状态
2. **Inline Chat 历史**: 未发现独立机制
3. **批量导出**: 不存在
4. **跨项目 session 管理**: session 与 project 绑定，无跨项目 API

### D. StarWork 在 Trae 中的 session_id 策略

**推荐格式**: `trae:<24-char-hex-session-id>`

获取方式：
1. 读取 workspaceStorage 的 `state.vscdb` → `icube_session_agent_map`
2. 取最后一个/唯一的 session_id
3. 验证该 session_id 在 snapshot 目录中存在

### E. `multiagent bind --session-name` 在 Trae 中的行为

**降级处理**: 不支持宿主改名，StarWork CLI 自行存储自定义名称到 lane 配置文件

### F. Trae 是否适合实现以下命令

| 命令 | 可行性 | 说明 |
|---|---|---|
| `multiagent status --host` | ✅ 可适配 | 可读取 state.vscdb 获取当前 session 状态 |
| `multiagent continue <lane>` | ⚠️ 降级 | 无法自动恢复；提示用户手动打开历史会话 |
| `multiagent release --archive-session` | ⚠️ 降级 | 无法自动归档；在 lane workspace 中标记并提示用户 |

---

## 建议工作流

### 在 Trae 中把当前会话登记为 StarWork lane 并完成交接

```
1. 用户在 Trae 中开启一个新 Chat 会话，执行 StarWork 任务

2. 登记 lane:
   $ starwork multiagent bind --lane feature-research
   → CLI 读取 state.vscdb 获取当前 session_id: 69e0a3b259b29ff710cfc441
   → 在 _系统/协作/lanes/feature-research/lane.json 记录:
     {
       "host": "trae",
       "session_id": "69e0a3b259b29ff710cfc441",
       "agent": "solo_coder",
       "model": "deepseek//deepseek-v4-pro",
       "bound_at": "2026-06-01T11:10:30+08:00"
     }

3. 执行任务过程中，AI 在 lane workspace 中记录 worklog:
   _系统/协作/lanes/feature-research/workspace/worklog.md

4. 任务完成后 release:
   $ starwork multiagent release feature-research
   → 标记 lane 为 released
   → 提示用户: "请在 Trae 中手动保留或清理会话 69e0a3b259b29ff710cfc441"
   → worklog 作为交接产物保留在 lane workspace

5. 其他 agent/lane 读取交接产物:
   $ starwork multiagent status --lane feature-research
   → 输出 lane 状态、session 信息、worklog 摘要
```

---

## 附录：关键文件路径速查

| 用途 | 路径 |
|---|---|
| 主数据目录 | `~/Library/Application Support/Trae CN/` |
| AI agent 加密数据库 | `ModularData/ai-agent/database.db` |
| 工作区状态 (可读 SQLite) | `User/workspaceStorage/<hash>/state.vscdb` |
| 全局状态 (可读 SQLite) | `User/globalStorage/state.vscdb` |
| 全局配置 JSON | `User/globalStorage/storage.json` |
| session snapshot git repos | `ModularData/ai-agent/snapshot/<session_id>/v2/.git` |
| AI agent 日志 | `logs/<date>/Modular/ai-agent_*_stdout.log` |
| 沙箱配置 | `ModularData/ai-agent/sandbox/<project_id>.json` |
| 用户配置 | `~/.trae-cn/` |
