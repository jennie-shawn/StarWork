# Codex 会话能力调研与 StarWork Multiagent 启发

## 基本信息

- 日期：2026-06-01
- 优先级：高
- 目标：梳理 Codex 最近暴露出的会话、线程、后台任务和工作树能力，并判断它们对 StarWork `multiagent` / Agent Lanes 的产品启发。
- 结论状态：可作为 StarWork multiagent 课程交付前的核心输入。

## 调研假设

1. 这里的 Codex 指 OpenAI Codex CLI / Codex Desktop / Codex App 这一组能力，不只指终端里的单次 CLI 会话。
2. “这两天更新的会话能力”一部分来自公开文档和 changelog，一部分来自当前 Codex App 运行时实际暴露的工具接口。后者应视为产品方向信号，不应直接当成稳定公开 API。
3. StarWork 不应复制 Codex 的宿主能力，而应把这些能力吸收为跨 Agent 的协作协议、命名、索引和交接层。

## 当前 StarWork Multiagent 基线

StarWork 当前已经实现的 multiagent 不是“启动多个模型”，而是 Agent Lanes 协作层：

- `product/core/agent-lanes-spec.md` 定义 lane registry、session binding、write scope、worklog、lane workspace、shared context。
- `product/cli/src/cli.js` 已实现 `starwork multiagent init/add/bind/release/status/share`。
- `starwork multiagent bind` 支持 `--session-name`，可以在绑定 lane 后 best-effort 同步 Codex 宿主会话名。
- Codex 会话命名增强通过 `codex app-server --listen stdio://` 调用 `thread/name/set`，失败只 warning，不回滚 lane binding。
- `product/skills/starworkMultiagent/SKILL.md` 把自然语言“登记当前会话为常用智能体”转换为 `init/add/bind/share` 等安全命令，写入类命令先 dry-run。

这意味着 StarWork 的关键价值不是替代 Codex 会话管理，而是让不同宿主里的会话获得稳定职责、写入边界、共享索引和可交接上下文。

## Codex 新会话能力清单

### 1. 线程成为可管理对象

当前 Codex App 运行时已暴露后台线程工具：

| 能力 | 运行时接口 | 对用户意味着什么 |
|---|---|---|
| 创建线程 | `create_thread` | 可从当前项目或项目外新建一个后台 Codex 工作会话。 |
| 列出线程 | `list_threads` | 可按 query 找到近期线程，而不是只能靠左侧 UI 人工查找。 |
| 读取线程 | `read_thread` | 可在不打开线程的情况下读取最近状态和 turn 摘要。 |
| 继续线程 | `send_message_to_thread` | 可给已有线程发送后续 prompt，使它继续工作。 |
| 改名线程 | `set_thread_title` | 可把线程标题同步成职责名。 |
| pin / unpin | `set_thread_pinned` | 可把长期职责线程固定在会话列表。 |
| archive / unarchive | `set_thread_archived` | 可把过期或已交接线程收纳起来。 |

这组能力说明 Codex 正在从“当前聊天”走向“可编排的线程池”。对 StarWork 来说，`session` 不再只是一个字符串，而是可以被查找、命名、继续、归档和置顶的宿主对象。

### 2. 项目线程可以选择 local 或 worktree 环境

`create_thread` 的 project target 支持：

- `environment: { type: "local" }`
- `environment: { type: "worktree", startingState: ... }`

这和 OpenAI Codex App 的 worktrees 文档方向一致：Codex App 支持在 project 内用 local、worktree、cloud 等环境承载不同任务，并把工作树作为隔离并行开发的基础。

对 StarWork 的启发是：lane 的 `write_scope` 只解决文件边界，worktree 解决 Git 工作副本边界。课程里应明确区分：

- Agent Lanes：谁负责什么、在哪里记录、哪些输出给谁看。
- Worktree：这个职责位是否需要隔离代码改动。
- Thread：某个职责位当前由哪个 Codex 会话接手。

### 3. 后台线程可以被继续，而不必重新打开上下文

`send_message_to_thread` 可以向已有线程发送 follow-up prompt，`read_thread` 可以查看它最近状态。这意味着用户或主协调 Agent 可以把一个 lane 看作“可唤醒的长期智能体”。

StarWork 当前 `bind` 只记录 `current_session`，还没有“唤醒 lane”的命令。Codex 的新能力提示 StarWork 可以在 v0.2 设计：

```text
starwork multiagent resume <lane> --message "<prompt>"
```

但 v0.1 课程中不要承诺自动唤醒。更稳妥的口径是：StarWork 已经能登记和命名职责线程；Codex 新能力让未来的 lane resume 成为可行方向。

### 4. pin / archive 让会话生命周期变得可产品化

Codex 现在不仅能重命名线程，还能置顶和归档线程。对应到 StarWork：

- `bind`：把线程设为某 lane 当前负责人。
- `pin`：该 lane 是项目长期角色，建议固定在宿主会话列表。
- `release`：解除 lane 当前绑定。
- `archive`：该线程已完成交接，不再作为当前职责位出现。

这给 StarWork 一个很清晰的生命周期模型：

```text
unbound lane
  -> bind thread
  -> optionally rename + pin
  -> worklog/share outputs
  -> release
  -> optionally archive old thread
```

当前 StarWork 只做到了 bind / release / rename。置顶和归档可以进入后续 Codex adapter 增强，但不应进入 Core 必选协议。

### 5. Automations 把“会话”扩展成“定时或心跳工作”

当前 Codex App 运行时还暴露 `automation_update`：

- cron automation：针对 workspace 的定期后台任务。
- heartbeat automation：附着在当前 thread 上，稍后唤醒继续对话。

这对 StarWork 的 multiagent 课程有两个启发：

1. 长期 lane 不一定要一直有人盯。某些 lane 可以由自动化定期巡检，例如 weekly research、CI follow-up、反馈收集。
2. StarWork 应避免把自动化塞进 Agent Lanes v0.1。Agent Lanes 先解决职责、边界和交接；自动化属于更高层的调度能力。

建议课程里用一句话讲清楚：StarWork multiagent 是“多会话协作协议”，不是“自动调度系统”。

### 6. Sub-agent 工具与 StarWork Lanes 是两层

当前运行时还暴露 `spawn_agent`、`send_input`、`wait_agent`、`close_agent`、`resume_agent`。这些是单次任务内的子 Agent 分治能力，不等于 StarWork 的长期 lane。

二者差异：

| 维度 | Codex sub-agent | StarWork lane |
|---|---|---|
| 生命周期 | 通常服务于当前任务，完成后关闭 | 可长期存在，跨会话接力 |
| 事实源 | 宿主运行时 | 项目内 `_系统/协作/` |
| 主要目标 | 并行执行或探索 | 职责稳定、边界清晰、输出可交接 |
| 适合场景 | 临时分治、并行调研、并行修复 | 课程交付、项目常设角色、跨天协作 |

课程中应避免把 `multiagent` 讲成“开多个 sub-agent”。更准确的说法是：Codex 的 sub-agent 是执行资源；StarWork lane 是组织协议。

## 对 StarWork Multiagent 的产品启发

### 启发 1：把 lane 从“登记表”升级为“宿主线程投影”

当前 `_系统/协作/agent-lanes.md` 已有 `current_session`。结合 Codex 线程工具，未来每个 lane 可以有一个宿主线程投影：

```text
lane.id
lane.purpose
lane.write_scope
lane.current_session
lane.host.title
lane.host.pinned
lane.host.archived
lane.last_seen_status
```

注意这些 host 字段不应成为 Core 必填项。它们属于 adapter observation 或 state cache，避免让 Cursor / Trae / Claude Code 无法支持时拖累协议。

### 启发 2：`status` 应从“表格输出”升级为“协作驾驶舱”

Codex 能 read thread 后，`starwork multiagent status` 的未来形态可以不只列 lane，还能显示：

- 该 lane 当前绑定线程是否可访问。
- 线程标题是否与 lane 目的匹配。
- 线程是否 pinned。
- 线程最近一次状态摘要。
- 线程是否已 archive 但 lane 仍绑定。
- worklog 是否落后于线程状态。

v0.1 已有 `status --json`，适合作为未来 adapter 注入更多宿主状态的承载点。

### 启发 3：增加“常用智能体”的显式体验

用户真正想要的不是 `bind` 这个工程动作，而是：

```text
把这个会话设为 StarWork 课程交付研究 Agent。
以后我一眼能看出来，必要时能继续叫它干活。
```

因此课程里应该优先讲“常用智能体”体验：

1. 设计 lane。
2. 绑定当前 Codex 线程。
3. 同步会话名。
4. 必要时 pin。
5. 通过 worklog / shared.md 交接产物。

CLI 仍叫 `multiagent bind`，但用户教学语言应偏产品化。

### 启发 4：新增 adapter 能力分级，而不是要求所有宿主全支持

建议为 StarWork adapters 定义能力矩阵：

| Adapter 能力 | Codex 当前可行性 | 是否进入 Core |
|---|---|---|
| session id detection | 部分可行，`codex:<thread-id>` | Core 需要 session 字符串，不强制自动识别 |
| rename session | 已在本项目实现 `thread/name/set` | Adapter 增强 |
| list sessions | 运行时已暴露 `list_threads` | Adapter 增强 |
| read session summary | 运行时已暴露 `read_thread` | Adapter 增强 |
| continue session | 运行时已暴露 `send_message_to_thread` | Adapter 增强 |
| pin session | 运行时已暴露 `set_thread_pinned` | Adapter 增强 |
| archive session | 运行时已暴露 `set_thread_archived` | Adapter 增强 |
| create worktree session | 运行时已暴露 `create_thread` worktree target | Adapter 增强 |
| scheduled lane run | 运行时有 automation | 高层调度能力，不进 Agent Lanes v0.1 |

### 启发 5：把“释放 lane”设计成完整交接，而不是只清空 session

Codex 支持 archive 后，`release` 的体验可以升级为：

1. 提醒更新 worklog。
2. 解除 lane binding。
3. 可选归档旧线程。
4. 保留 shared outputs。
5. 下一个线程可以重新 bind 同一 lane。

当前 CLI 已在 release 后提示更新工作记录，这是正确方向。未来可增加：

```text
starwork multiagent release <lane> --archive-session
```

但该参数只应在 Codex adapter 支持时生效。

## 课程交付建议

### 推荐主线

课程不要从“多 Agent 技术”开场，而应从学员痛点开场：

```text
多个 AI 会话同时帮你做事时，最大的问题不是启动它们，而是：
谁负责什么？
能改哪里？
产物放哪？
下次谁接得住？
我怎么在宿主会话列表里找回它？
```

然后把 StarWork multiagent 定位为：

```text
StarWork multiagent = 给多个 AI 会话加上职责位、边界、工作记录和共享索引。
Codex 新会话能力 = 让这些职责位在宿主工具里更容易被命名、找回、继续和收纳。
```

### 建议课程结构

1. 为什么“开多个聊天窗口”不是 multiagent。
2. Agent Lanes：用职责位替代任务堆。
3. `init/add/bind/status/share/release` 六个动作。
4. Codex Desktop 中的会话命名、置顶、归档和后台线程如何辅助 StarWork。
5. 实战：把一个课程交付项目拆成 `research`、`course-design`、`material-review` 三个 lane。
6. 限制：自动唤醒、跨线程派活、宿主线程读取属于后续 adapter 增强，不是 v0.1 承诺。

## StarWork 后续路线建议

### P0：课程前必须讲清楚

- StarWork 的事实源在项目内，不在 Codex 私有状态里。
- `--session-name` 是显示增强，不是绑定事实源。
- lane workspace 放过程材料，正式产物仍进 `product/docs/` 等项目正式目录。
- `shared.md` 只登记索引，不搬运文件。

### P1：Codex adapter 近期可做

- 在 `multiagent bind` 后支持可选 pin。
- 在 `multiagent release` 后支持可选 archive。
- 新增 `multiagent status --host`，读取 Codex thread 标题、pin/archive 状态和最近摘要。
- 新增 `multiagent continue <lane>`，通过已绑定 thread 发送 follow-up prompt。

### P2：暂不进入课程承诺

- 自动创建多个后台线程并分配任务。
- 自动合并多线程代码改动。
- 自动调度定时 lane。
- 跨宿主统一读取所有会话历史。

## 风险与边界

- Codex App 运行时工具是当前环境暴露的能力，不等于所有用户环境都可用。
- `codex app-server` 和线程管理接口可能继续变化，StarWork 只能 best-effort 对接。
- 课程中应把“稳定协议”和“宿主增强”分开讲，避免学员误以为 StarWork 依赖某一个 Codex 内部接口。
- 不能为了会话同步直接改写 `~/.codex` 私有数据库或索引文件。

## 来源

- OpenAI Developers: [Codex App features](https://developers.openai.com/codex/app/features)
- OpenAI Developers: [Codex App worktrees](https://developers.openai.com/codex/app/worktrees)
- OpenAI Help Center: [Codex changelog](https://help.openai.com/en/articles/11428266-codex-changelog)
- GitHub: [openai/codex releases](https://github.com/openai/codex/releases)
- 当前 Codex App 运行时工具说明：`create_thread`、`list_threads`、`read_thread`、`send_message_to_thread`、`set_thread_title`、`set_thread_pinned`、`set_thread_archived`、`automation_update`
- 本项目事实源：`product/core/agent-lanes-spec.md`
- 本项目事实源：`product/core/agent-lanes-session-naming-spec.md`
- 本项目事实源：`product/skills/starworkMultiagent-spec.md`
- 本项目实现：`product/cli/src/cli.js`
