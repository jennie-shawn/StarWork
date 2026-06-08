# ISSUE-017：MultiAgent launch 生成的会话缺少会话控制工具

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | cli / adapter / workflow |
| 优先级 | P1 |
| 状态 | closed |
| 来源 | 用户反馈 / 测试发现 |
| 发现日期 | 2026-06-06 |
| 关联 GitHub Issue | 无 |
| 关联 SPEC | `product/planning/features/multiagent/specs/v0.7-codex-standard-session-tools.md` |
| 关联验收 | `ISSUE-008` / `ISSUE-011` |
| 负责人 | development lane |

## 现象

- 用户可见表现：测试过程中发现，使用 MultiAgent `launch` 创建出来的会话，没有 Codex 会话控制工具。
- 期望表现：StarWork 在执行 MultiAgent 创建、跨会话投递、会话改名、pin/archive 等依赖会话控制能力的操作前，应能识别当前会话是否真的具备这些工具。
- 实际表现：`launch` 生成的新会话即使处在 Codex 相关环境中，也可能没有 `create_thread`、`send_message_to_thread`、`set_thread_title` 等会话控制工具；如果 StarWork 只按宿主名或适配 profile 判断能力，就会误判可自动控制会话。

## 证据

用户原话：

```text
我刚刚测试过程中发现，使用 launch 功能生成的会话，就天生没有那些会话控制工具。
```

相关历史事实：

```text
ISSUE-008 已记录：不同 Codex 会话 / 启动入口 / 工具注入状态可能导致标准线程工具可用性不同。
ISSUE-011 已记录：运行时宿主能力应由 CLI 判断，Skill 不应内置宿主能力百科。
```

相关能力名称包括但不限于：

```text
create_thread
send_message_to_thread
set_thread_title
set_thread_pinned
set_thread_archived
read_thread
```

2026-06-07 追加实测：

```text
product/planning/features/multiagent/references/2026-06-07-codex-launch-surface-probe.md
```

关键结论：

- 当前 Codex App turn 中，`tool_search` 搜索线程控制工具返回 `Found 0 tools`。
- `codex app-server proxy` 连接当前 Desktop App control socket 失败，默认 socket 不存在。
- StarWork 当前 `launch` 使用 standalone `codex app-server`。
- 短 timeout 时，thread 会被创建并改名，但 Launch Message turn 变成 `interrupted`，lane 不应绑定。
- 长 timeout 时，thread 可正常完成并绑定。
- 对 launch 生成的 thread 做 `thread/resume + turn/start` 只读诊断后，目标会话明确回复：`tool_search` 不可见，也没有 `create_thread` / `send_message_to_thread` / `set_thread_title` 等线程控制工具，只看到子代理控制类工具。

2026-06-08 新 product-planning 会话追加对照：

- 当前 Codex App turn 已能发现 `create_thread` / `list_threads` / `read_thread` / `send_message_to_thread` / `set_thread_pinned` / `set_thread_archived` / `set_thread_title` / `automation_update`。
- 重新执行长 timeout `multiagent launch` 后，Launch Message turn completed，lane 成功绑定。
- 当前 App 的 `read_thread` 可以读取该 launch thread。
- 当前 App 的标准 `send_message_to_thread` 向该 launch thread 投递时返回：`No AppServerManager registered for conversationId`。
- 判断：launch thread 可被列表 / 读取观察，不等于它已注册在当前 Desktop App 的可投递 conversation manager 中。

同日进一步对照：

- 当前 App 使用标准 `create_thread` 创建新会话成功。
- 该新会话内 `tool_search` 可见 `create_thread`、`list_threads`、`read_thread`、`send_message_to_thread`、`set_thread_pinned`、`set_thread_archived`、`set_thread_title`、`automation_update`。
- 当前 App 可继续用标准 `send_message_to_thread` 向该新会话投递，并获得正常回复。
- 判断：Codex App 标准会话控制工具可以创建可继续投递的会话；StarWork 当前 `launch` 的问题是使用了 standalone app-server surface。

## 影响范围

- 影响的功能：MultiAgent launch / instruct / bind 后命名、跨会话通知、会话创建、会话改名、运行时 host capability routing。
- 影响的用户：通过 MultiAgent `launch` 自动创建 Codex 会话的用户。
- 是否影响发布 / 升级 / A 测：影响 A 测和 MultiAgent 可信度。StarWork 如果误判当前会话可控，可能承诺自动创建 / 投递 / 改名，但实际只能人工交付。
- 是否有绕行方式：可以人工复制 handoff message 或手动创建 / 改名会话，但必须由 StarWork 明确降级提示，不能误报自动完成。

## 初步判断

- 不能把 `host=codex`、Codex 线程 ID 或 adapter profile 直接等同于“当前会话具备会话控制工具”。
- `launch` 生成会话是通过 standalone `codex app-server` 创建的 worker thread；它可以工作，但不是 Codex Desktop App 标准 thread-control surface。
- 即使当前 Codex App turn 具备标准线程工具，也不能直接证明这些工具可控制 standalone launch 创建出的 worker thread；本轮实测标准 `send_message_to_thread` 对 launch thread 返回 AppServerManager 缺失。
- 用 Codex App 标准 `create_thread` 创建的会话可以继续被标准 `send_message_to_thread` 投递，说明修复方向应从“标记 app-server worker 缺能力”升级为“Codex 正常路径统一使用标准会话控制工具”。
- `launch` timeout 过短会导致目标 turn interrupted；这属于 launch 完成判定和等待策略问题，应与工具缺失一起修。
- `launch` 生成会话是一个明确的缺控制能力来源，应纳入运行时 probe 和 state 标记范围。
- CLI / Skill 输出需要区分：
  - `host_profile_supports_thread_control`
  - `current_session_tools_available`
  - `session_surface`
  - `session_origin`
  - `session_role`
  - `operation_can_execute_now`
- 当当前会话缺少会话控制工具时，必须返回 `manual_handoff_required`、`unsupported` 或等价降级状态，并给出可复制操作说明。

## 分流结果

- 是否转 SPEC：已转入 MultiAgent v0.7 Codex Skill 直调标准工具 SPEC。
- 是否转 GitHub：否，先走本地 issue。
- 是否转开发 lane：是。
- 是否需要用户补信息：暂不需要。若开发复现不足，再补充具体 `launch` 命令、目标 lane 和生成会话 ID。

## 下一步

development lane 按 v0.7 SPEC 复核并修复：

1. `starworkMultiagent` 在 Codex 场景下直接调用 `create_thread` / `send_message_to_thread` / `read_thread` / `set_thread_title` 等标准工具。
2. CLI 不再作为 Codex host action broker；只保留 StarWork 文件状态、消息模板和 request 记录辅助。
3. `starworkMultiagent` 不再调用 `starwork multiagent launch` 来创建 Codex thread，也不再调用 `multiagent instruct` 来执行 Codex 自动投递。
4. 当前 Agent 不可见标准工具时，返回 `manual_handoff_required` 和完整可复制消息。

## 产品修复方案

本 issue 是当前 MultiAgent 可信度最高风险项。核心不是“Codex 能不能创建 thread”，而是：

```text
Codex 场景下，MultiAgent Skill 必须直接调用 Codex App 标准会话控制工具；standalone app-server 和 CLI host-action 中转都不能作为正常路径。
```

修复方向：

1. Codex launch 场景由 `starworkMultiagent` 直接调用 `create_thread`。
2. Codex instruct 场景由 `starworkMultiagent` 直接调用 `send_message_to_thread`。
3. Codex read/status 场景由 `starworkMultiagent` 直接调用 `read_thread` / `list_threads`。
4. Codex rename / pin / archive 场景由 `starworkMultiagent` 直接调用 `set_thread_title` / `set_thread_pinned` / `set_thread_archived`。
5. CLI 只负责 `multiagent init/add/bind/release/share/status` 这类 StarWork 状态操作，以及 message 模板 / request record 辅助命令。
6. 禁止用 app-server `thread/start` / `turn/start` / `thread/resume` / `thread/name/set` 冒充标准能力。
7. 禁止把 CLI `host_action_required` / completion 作为 Codex Skill 正常执行链路。

落地 SPEC：

```text
product/planning/features/multiagent/specs/v0.7-codex-standard-session-tools.md
```

## 验收方式

- 验收条件 1：`starworkMultiagent` 创建 Codex Agent 时直接调用 `create_thread`，不再通过 CLI launch。
- 验收条件 2：`starworkMultiagent` 投递 Codex 指令时直接调用 `send_message_to_thread`，不再通过 CLI instruct 自动投递。
- 验收条件 3：read / status / rename / pin / archive 由 Skill 调用对应标准工具。
- 验收条件 4：当前 Agent 不可见标准工具时，输出 `manual_handoff_required` 和完整可复制消息。
- 关闭标准：development lane 修复 Skill，并通过标准 `create_thread` 创建会话、标准 `send_message_to_thread` 继续投递的真实对照复验。

## 产品复验记录

2026-06-08 product-planning lane 复验通过，`ISSUE-017` 关闭。

复验结论：

- `starworkMultiagent` Codex 主流程已改为直接使用 Codex App 标准工具：
  - 创建 lane 会话：`create_thread`
  - 发送跨 lane 指令：`send_message_to_thread`
  - 读取 lane 状态：`read_thread`
  - 搜索 / 确认会话：`list_threads`
  - 标题 / 置顶 / 归档：`set_thread_title`、`set_thread_pinned`、`set_thread_archived`
- Skill 旧逻辑扫描通过：
  - 不再把 `starwork multiagent launch --lanes` 作为 Codex 创建 Agent 团队主流程。
  - 不再把 `starwork multiagent instruct` 作为 Codex 自动投递主流程。
  - 不再出现 `launch_status` / `binding_status` / `host_action_required` / `host-action complete` 作为 Codex 正常链路。
  - 不再出现 `thread/start` / `turn/start` / `thread/resume` / `thread/name/set` / `thread/read` / `thread/list` 作为 Skill 正常路径描述。
- CLI 已新增 Skill 辅助命令：
  - `starwork multiagent message launch`
  - `starwork multiagent message instruct`
  - `starwork multiagent request record`
- CLI Codex 正常路径已降级为状态 / 模板 / 记录辅助：
  - `multiagent launch` 不再创建或绑定 Codex thread，只输出 Launch Message 和 `manual_handoff_required`。
  - `multiagent read/status --host` 对 Codex 返回 `use_starworkMultiagent_tool`，提示由 Skill 使用 `read_thread`。
  - `multiagent bind` 纯记录模式不调用 Codex app-server；`--session-name` / `--pin` 仅提示由 Skill 先调用标准工具。

真实 Codex 标准工具 smoke：

- 使用 `create_thread` 创建临时线程：`019ea54e-0e3d-7343-a53b-0fcd91a1ccc1`。
- 使用 `send_message_to_thread` 向该线程继续投递，目标回复 `v0.7 smoke delivered`。
- 使用 `read_thread` 读取该线程，确认两轮 turn 均 completed。
- 使用 `set_thread_title` 改名为 `ISSUE-017 v0.7 Smoke Agent`。
- 使用 `set_thread_pinned` 完成 pin / unpin。
- 使用 `set_thread_archived` 归档临时 smoke 线程。

验证命令：

```bash
node --check product/cli/src/cli.js
node --check product/cli/test/init.test.js
git -C product diff --check
node --test product/cli/test/init.test.js --test-name-pattern 'starworkMultiagent skill|multiagent launch|multiagent message instruct|request record|bind .*Codex|status --host and read'
npm test
rg -n "multiagent launch --lanes|starwork multiagent instruct|launch_status|binding_status|host_action_required|host-action complete|thread/start|turn/start|thread/resume|thread/name/set|thread/read|thread/list|multiagent read --host|status --host" product/skills/starworkMultiagent/SKILL.md
```

验证结果：

- `node --check product/cli/src/cli.js` 通过。
- `node --check product/cli/test/init.test.js` 通过。
- `git -C product diff --check` 通过。
- 目标回归测试通过，99/99。
- 全量 `npm test` 通过，99/99。
- Skill 旧逻辑扫描无命中。
- 真实 Codex 标准工具 smoke 通过。

非阻塞观察：

- `product/cli/src/cli.js` 中仍保留 `launchCodexLane`、`sendCodexInstruction`、`renameCodexThreadBestEffort`、`observeCodexThread` 等 app-server helper。当前检索显示这些 helper 已不在 Codex launch / read / status / bind 正常路径中使用；`sendCodexInstruction` 只挂在 `canAutoSend` 分支，而 `probeHostStandardSendCapability("codex")` 固定返回 unavailable。后续若要进一步清理代码体积，可将这些 helper 改名为 legacy diagnostic 或移除，但不阻塞 ISSUE-017 关闭。

关闭结论：

`ISSUE-017` 已关闭。当前实现满足 v0.7：Codex 自动会话控制由 `starworkMultiagent` 直接调用 Codex App 标准工具；CLI 不再用 standalone app-server 作为 Codex 正常创建 / 投递 / 读取路径。
