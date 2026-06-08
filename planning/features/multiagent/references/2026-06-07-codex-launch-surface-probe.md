# 2026-06-07 Codex launch surface probe

## 目的

验证 ISSUE-017 的根因：`starwork multiagent launch` 生成的 Codex 会话为什么缺少会话控制工具，以及是否可能是 StarWork 使用 `launch` / App Server 的方式有问题。

## 测试环境

- 日期：2026-06-07
- 当前宿主：Codex App
- StarWork CLI：本地 `product/cli/bin/starwork.js`
- Codex CLI：`codex-cli 0.128.0`
- 测试目录：临时 StarWork 工作台，未写入真实项目业务文件

## 测试 1：当前 Codex App turn 的工具可见性

操作：

```text
tool_search:
create_thread list_threads read_thread send_message_to_thread set_thread_pinned set_thread_archived set_thread_title automation_update
```

结果：

```text
Found 0 tools
```

结论：

当前 Codex App turn 不可见线程控制工具，也不可见 `automation_update`。

## 测试 2：当前 Desktop App control socket

操作：

```bash
codex app-server proxy
```

结果：

```text
failed to connect to socket at ~/.codex/app-server-control/app-server-control.sock
No such file or directory
```

结论：

当前 CLI 不能通过 `app-server proxy` 连接正在运行的 Codex Desktop App control socket。StarWork 现有 `launch` 不是在复用当前 Desktop App 容器，而是在启动 standalone `codex app-server`。

## 测试 3：短 timeout 的真实 `multiagent launch`

操作摘要：

```bash
starwork init --type project --pack general --target <tmp> --yes
starwork multiagent init --target <tmp> --yes
starwork multiagent add probe --purpose "工具探测" --write "_系统/协作/lanes/probe/**" --target <tmp> --yes
starwork multiagent launch probe --target <tmp> --json --yes --timeout 12000
```

结果摘要：

```json
{
  "status": "failed",
  "created_thread_id": "019ea038-b87e-7511-84ec-eb74fe8f51a3",
  "turn_id": "019ea038-b8bd-7df2-930f-09cfc9df95fe",
  "warning": "Codex turn/completed was not observed for Launch Message",
  "binding_status": "unbound",
  "rename_status": "ok"
}
```

随后 `thread/read`：

```json
{
  "name": "工具探测 Agent",
  "status": { "type": "notLoaded" },
  "turns": [
    {
      "status": "interrupted",
      "items": 0
    }
  ]
}
```

结论：

短 timeout 会创建 thread 并改名，但 CLI 结束 standalone app-server 后，Launch Message turn 可能变成 `interrupted`。这不是可工作的 Agent 创建结果，不应绑定 lane。

## 测试 4：长 timeout 的真实 `multiagent launch`

操作摘要：

```bash
starwork multiagent launch probe --target <tmp> --json --yes --timeout 70000
```

结果摘要：

```json
{
  "status": "completed",
  "thread_id": "019ea039-af1c-7400-863e-eb675c836e81",
  "turn_id": "019ea039-af39-7fb2-ae34-c50d3a83bfa4",
  "verified_by_thread_read": true,
  "binding_status": "bound",
  "rename_status": "ok"
}
```

随后 `thread/read`：

```json
{
  "name": "工具探测 Agent",
  "status": { "type": "notLoaded" },
  "turns": [
    {
      "status": "completed",
      "items": 5
    }
  ]
}
```

结论：

当前 `launch` 方式可以创建并绑定可读的 Codex thread，但它依赖等待 Launch Message turn 完成。它不是短时间后台派生。

## 测试 5：launch 生成会话的工具可见性

对长 timeout 创建出的 thread，先 `thread/resume`，再用实验性 `turn/start` 发送只读工具探测消息。

目标会话回复：

```text
本 turn 中 tool_search 不可见，无法按优先路径搜索。

我当前可见的工具里没有这些会话/线程控制工具：

create_thread / list_threads / read_thread / send_message_to_thread /
set_thread_pinned / set_thread_archived / set_thread_title / automation_update

可见的相近工具只有子代理控制类：
spawn_agent、send_input、wait_agent、resume_agent、close_agent
```

结论：

`starwork multiagent launch` 通过 standalone `codex app-server` 创建出来的 Codex thread，实测不具备当前 Codex Desktop App 线程控制工具，也不可见 `tool_search`。

## 测试 6：具备 Desktop thread tools 的新会话对 launch thread 的标准投递

2026-06-08 切换到新的 Codex App 会话后，当前 product-planning turn 已能通过 `tool_search` 发现：

```text
create_thread
list_threads
read_thread
send_message_to_thread
set_thread_pinned
set_thread_archived
set_thread_title
automation_update
```

用同一轮新会话重新执行长 timeout launch：

```bash
starwork multiagent launch probe --target <tmp> --json --yes --timeout 90000
```

结果：

```json
{
  "status": "completed",
  "thread_id": "019ea506-7fe1-7192-bd7f-c2a748b5b1d0",
  "binding_status": "bound",
  "session_name": "工具探测：根据 launch 后的会话检查工具面 Agent"
}
```

随后使用当前 Codex App 标准线程工具向该 launch thread 发送只读诊断：

```text
send_message_to_thread(threadId = 019ea506-7fe1-7192-bd7f-c2a748b5b1d0)
```

结果：

```text
No AppServerManager registered for conversationId: 019ea506-7fe1-7192-bd7f-c2a748b5b1d0
```

同时 `read_thread` 可以读取该 thread，状态为 `notLoaded`，首个 Launch Message turn 为 `completed`。

结论：

即使当前 Codex App turn 具备 Desktop thread-control tools，StarWork 通过 standalone `codex app-server` launch 出来的 thread 也不一定注册在当前 Desktop App 的 AppServerManager 中。它可以被读取和出现在 thread list 中，但不能被当前标准 `send_message_to_thread` 继续投递。

## 综合结论

ISSUE-017 不是单纯的“工具偶尔消失”。更准确的根因是：

1. StarWork 当前 Codex `launch` 使用 standalone `codex app-server`。
2. 该方式创建的是可执行 lane 工作的 App Server worker thread，不是 Codex Desktop App 当前会话那种可能暴露 thread coordination tools 的控制容器。
3. CLI 当前无法通过 `app-server proxy` 连接 Desktop App control socket，因此没有证据表明可以从 CLI 创建“具备 Desktop App 线程控制工具”的会话。
4. 即使当前 App turn 具备 `send_message_to_thread`，也不能假设该工具能投递到 standalone launch 创建的 thread；实测会返回 `No AppServerManager registered for conversationId`。
5. `launch` 如果 timeout 太短，会把 Launch Message turn 变成 `interrupted`，形成一个已创建但不可工作的 thread。

## 产品影响

- `launch` 可以保留为“创建 lane worker”的能力，但不能承诺该 worker 能自动控制其它会话。
- `launch` 成功标准必须继续要求 Launch Message turn completed；否则不绑定。
- `launch` 输出和 state 必须记录该 session 的来源和控制能力：
  - `session_origin = starwork_launch`
  - `session_surface = codex_app_server`
  - `session_role = worker`
  - `model_visible_thread_tools = absent_observed` 或 `assumed_absent`
  - `can_control_other_sessions = false`
- 如果未来要创建具备 Codex Desktop App thread tools 的会话，需要重新研究 Desktop App control socket / host tools，不应复用 standalone app-server launch 作为证明。
