---
name: starworkMultiagent
description: 'Design and maintain StarWork Agent Lanes with `starwork multiagent`: init, update, bind, release, inspect, share, launch, and send cross-session instructions.'
---

# starworkMultiagent

使用这个 skill，把用户关于“常用智能体”“当前会话职责”“多 Agent 分工”“跨 Agent 输出共享”“跨会话指令”“查看其他 lane 进度”“创建 lane thread”的自然语言请求，转换成安全的 `starwork multiagent` 命令组合。

`starworkMultiagent` 不是 `starwork multiagent` 命令本身。它负责判断用户意图、确认 lane 语义和写入边界，并在写入前优先 dry-run 或请求确认。CLI 只负责稳定执行。

不要把职责写死为前端、后端、测试。lane ID、职责和写入范围必须来自当前项目语境。

## 参考

需要完整边界、验收标准和子命令映射时，读取：

```text
../starworkMultiagent-spec.md
../../core/agent-lanes-spec.md
../../planning/features/multiagent/specs/v0.2-codex-orchestration.md
```

不要在 skill 内重复维护 Agent Lanes 协议细节；以 Core SPEC 为事实源。

## 先读上下文

开始前优先读取当前工作区内这些文件，存在多少读多少：

```text
AGENTS.md
_系统/上下文/current-projects.md
_系统/上下文/decisions.md
_系统/上下文/product-principles.md
_系统/任务/current-work.md
_系统/协作/agent-lanes.md
_系统/协作/shared.md
_system/context/current-project.md
_system/context/decisions.md
_system/tasks/current-work.md
_system/collaboration/agent-lanes.md
_system/collaboration/shared.md
```

中文项目使用 `_系统/协作/`；英文项目使用 `_system/collaboration/`。不要在英文项目里新建中文协作路径，也不要在中文项目里新建英文协作路径。

如果用户指定了目标目录，所有命令都加 `--target <path>`。如果没有指定，默认目标是当前工作区。

## 前置边界：只在 StarWork 工作台内创建团队

`starworkInit` 负责把普通项目变成 StarWork 工作台；`starworkMultiagent` 只负责已有 StarWork 工作台里的团队协作。

开始任何 `multiagent init/add/bind/launch` 写入前，先确认目标目录是 StarWork 工作台：

```bash
starwork doctor --target <path> --json
```

如果目标不是 StarWork 工作台，立即停止 multiagent 写入，不要尝试局部初始化，不要新建 `AGENTS.starwork-new.md` 或只补 `_系统/协作/`。下一步是切换到 `starworkInit` Skill，由它采访用户、选择工作台类型和 Pack、处理已有规则入口，并在用户确认后调用 CLI。`starworkInit` 完成且 `starwork doctor --target <path>` 通过后，才继续 multiagent 流程。

如果 `starwork doctor --target <path> --host <host> --json` 或 `.starwork/adapters.json` 显示 `rules_entry_status: pending_merge`，也必须停止 `multiagent init/add/bind/launch`。这表示 AI 入口文档还只是 `.starwork/drafts/` 草稿，先切回 `starworkInit` 整合最终 `AGENTS.md` / 宿主规则入口；完成并重新 doctor 后，才能继续创建或绑定团队。

## 判断用户意图

优先把用户话语归到一个入口，不要一开始讲 CLI 子命令。

| 用户意图 | Skill 解释 | CLI 组合 |
|---|---|---|
| “把当前会话创建为常用智能体，负责 X” | 登记当前会话为一个稳定职责位 | 必要时 `init`，再 `add`，再 `bind` |
| “初始化多 Agent 协作层” | 创建 Agent Lanes 协议文件 | `multiagent init` |
| “增加一个负责 X 的 Agent / lane” | 新增职责位，暂不一定绑定会话 | `multiagent add` |
| “把当前工具会话绑定到 X” | 将具体 session 绑定到已有 lane | `multiagent bind` |
| “这个会话不再负责 X” | 释放 lane 当前绑定 | `multiagent release` |
| “看看现在有哪些 Agent 分工” | 读取协作状态 | `multiagent status --json` |
| “这个输出给其他 Agent 看” | 登记共享输出索引 | `multiagent share` |
| “让开发 lane 开始开发” | 向目标 lane 发送格式化跨会话指令 | `multiagent instruct <lane>` |
| “看看开发 lane 做到哪了” | 读取目标 lane 可用的宿主观察结果 | `multiagent read <lane>` 或 `multiagent status --host` |
| “把这条消息交给另一个工具里的会话” | 生成并记录人工交付消息 | `multiagent handoff <lane>` |
| “继续这个 lane” | 输出 resume 命令或人工继续步骤 | `multiagent continue <lane>` |
| “帮我创建产品、开发、验收三个智能体” | 设计 lanes 后创建并绑定可工作的独立会话 | `multiagent add ...` + `multiagent launch --lanes ...` |
| “把这个 lane 固定起来” | 绑定 lane 后请求宿主置顶；是否支持由 CLI 返回 | `multiagent bind --pin` |

## 常用流程：创建 Agent 团队

“创建 Agent 团队 / 创建多个智能体 / 产品、开发、验收三个智能体”不是只创建 lane。完整成功标准是：每个目标职责都有 lane、每个 lane 已绑定可工作的独立 session，或者输出中明确说明哪些 lane 未完成以及阻塞原因。

1. 先按“前置边界”确认目标是 StarWork 工作台，并确认宿主入口不是 `pending_merge`；非 StarWork 目标或 `pending_merge` 目标都转 `starworkInit`，不要运行 `multiagent init` 做局部初始化。
2. 读取 `agent-lanes.md` 和 `state.json`，判断哪些 lane 已存在，哪些需要新增。
3. 对缺失 lane 先 dry-run `multiagent add`，确认 `lane-id`、职责和写入范围；用户确认后执行 `--yes`。
4. 对需要独立 session 的 lanes，执行：

```bash
starwork multiagent launch --lanes <lane1,lane2,lane3> --target <path> --json --yes
```

5. 检查 JSON 中每个 lane 的 `launch_status`、`rename_status` 和 `binding_status`。只有 `binding_status: "bound"` 才能告诉用户该 Agent 已创建并可工作；`unbound` 必须带 warning 和下一步。
6. 默认会话名由 CLI 自动生成：`<职责名> Agent`。如果 `rename_status` 是 `warning`，说明宿主命名失败但 StarWork 绑定结果仍以 `binding_status` 为准。

只有用户明确说“先只初始化协作层 / 先只建职责位 / lane-only”时，才可以停在 `multiagent init/add`。

## 常用流程：登记当前会话为常用智能体

这是最常见入口。

1. 读取当前工作区状态和 Agent Lanes 文件。
2. 如果当前语言对应的 `agent-lanes.md` 不存在，先建议或执行：

```bash
starwork multiagent init --target <path> --dry-run
```

3. 确认或从用户语义提取：
   - lane ID，例如 `research`、`writing`、`review`。这些只是示例，不是默认值。
   - 职责描述。
   - 可主动修改的路径范围。
   - 该 lane 的过程工作区，中文项目默认是 `_系统/协作/lanes/<lane-id>/workspace/`，英文项目默认是 `_system/collaboration/lanes/<lane-id>/workspace/`。
   - 当前 session ID；无法自动识别时，请用户提供 `agent:session-id`。
   - 宿主会话显示名称；仅当用户希望在宿主会话列表中同步改名时使用。
4. 生成 dry-run 命令：

```bash
starwork multiagent add <lane> --purpose "<text>" --write "<path-globs>" --target <path> --dry-run
starwork multiagent bind <lane> --session <agent:session-id> --session-name "<display-name>" --target <path> --dry-run
```

5. 用户确认后，再把写入类命令改为 `--yes` 执行。

如果 lane 已存在，不重复 `add`；只做 `bind`，并说明是否会替换已有绑定。若已有其他 session 绑定，默认先停下来确认。

`--session-name` 是宿主工具显示增强，不是 StarWork 事实源。用户未要求改名时不要强行添加；如果添加，必须在 dry-run 中说明会尝试修改宿主会话标题，且失败不影响 lane binding。

## 子命令使用规则

## 宿主能力路由

Skill 不维护宿主能力矩阵，不根据工具名称自行判断能否自动发送、读取、创建或改名。凡是依赖宿主能力的动作，都调用 StarWork CLI，并根据 CLI 返回的结构化状态解释下一步。

常见 CLI 返回：

- `delivered`：消息已通过宿主标准能力投递；不代表目标任务完成。
- `manual_handoff_required`：CLI 已生成可复制交付消息，需要用户手动发给目标会话。
- `needs_adapt`：目标宿主还没准备好；引导用户先运行 `starwork adapt <host> --target <path> --dry-run`，确认后再执行。
- `unbound`：目标 lane 尚未绑定 session；先 `bind` 或 `launch`。
- `unsupported`：当前宿主明确不支持该能力。
- `failed`：CLI 尝试执行失败；保留项目记录，提示用户可重试或走 handoff。

解释时只说用户下一步，不展开宿主私有路径、数据库、transcript 或底层 API 细节。

### init

`init` 是协议初始化，不是“创建智能体”的完整用户动作。

触发：

- 用户明确要求初始化 multiagent / Agent Lanes 协作层。
- 用户要一次性创建多个空职责位。
- 登记当前会话时发现协作层不存在。

命令：

```bash
starwork multiagent init --lanes <ids> --target <path> --dry-run
```

不要要求用户一开始想清楚所有 lane。可以先创建空协作层，再按实际工作增加 lane。

### add

新增稳定职责位。

必须确认：

- `lane-id`
- `purpose`
- `write_scope`

命令：

```bash
starwork multiagent add <lane> --purpose "<text>" --write "<path-globs>" --target <path> --dry-run
```

### bind

把具体会话绑定到已有 lane。

优先使用真实 session ID。Codex 环境可尝试读取 `CODEX_THREAD_ID`；Claude Code 环境可尝试读取 `CLAUDE_CODE_SESSION_ID`；读取不到时，要求用户提供：

```text
codex:<session-id>
claude-code:<session-id>
cursor:<session-id>
trae:<session-id>
```

命令：

```bash
starwork multiagent bind <lane> --session <agent:session-id> --target <path> --dry-run
```

如果用户要把当前会话命名成某个常用智能体，可加入：

```bash
starwork multiagent bind <lane> --session <agent:session-id> --session-name "<display-name>" --target <path> --dry-run
```

推荐显示名称格式：

```text
<职责名> Agent
```

例如 `CLI 维护 Agent`、`产品规划 Agent`。不要默认加入项目名、目录名、thread id、UUID、日期、`lane`、`session` 等内部词。是否能同步宿主标题由 CLI 返回；失败只作为 warning，不影响 StarWork binding。

如果用户要求置顶这个 lane，可加入：

```bash
starwork multiagent bind <lane> --session <agent:session-id> --pin --target <path> --dry-run
```

`--pin` 是宿主增强能力；当前 Codex 接口不稳定时 CLI 会输出 unsupported warning，不回滚 StarWork binding。

### release

释放 lane 当前绑定。

执行前提醒用户先更新该 lane 的 worklog，至少写清当前状态、输出和下一步。

命令：

```bash
starwork multiagent release <lane> --target <path> --dry-run
```

### status

只读检查，可以直接运行：

```bash
starwork multiagent status --target <path> --json
```

运行后用人话解释：

- 当前 lane 列表。
- 哪些 lane 已绑定 / 未绑定。
- 每个 lane 的写入范围。
- 每个 lane 的 workspace 路径。
- shared outputs 和 cross-lane requests 中需要关注的内容。

如果用户问“其他 lane 现在做到哪了”，优先使用：

```bash
starwork multiagent status --host --target <path> --json
```

如果用户指定某一个 lane：

```bash
starwork multiagent read <lane> --turns 5 --target <path> --json
```

解释时必须提醒：这是宿主观察结果，正式交接仍以 lane worklog 和 shared outputs 为准。宿主前端不刷新不等于发送失败。

### share

登记某个 lane 的输出，供其他 lane 读取。

必须确认：

- 来源 lane。
- 标题。
- 相对路径。
- 受众 lane。
- 状态：`draft`、`ready` 或 `confirmed`。

命令：

```bash
starwork multiagent share <from-lane> --title "<title>" --path "<relative-path>" --audience "<lane-list>" --status <status> --target <path> --dry-run
```

只登记索引，不移动、不复制文件。

### instruct

向另一个 lane 发送结构化跨会话指令。

必须确认或推断：

- from lane
- to lane
- 指令内容
- 目标 lane 的写入边界
- 完成后如何回报

命令：

```bash
starwork multiagent instruct <to-lane> --from <from-lane> --message "<text>" --target <path> --dry-run
```

用户确认后再执行 `--yes`。CLI 会先把请求写入 shared context，再判断宿主运行时能力：可标准投递则发送；不可标准投递则返回 handoff、needs_adapt、unbound、unsupported 或 failed 等状态。发送失败时，项目内记录仍保留。

默认情况下，`instruct` 只确认消息已投递到目标 lane，返回 `delivered`。`delivered` 不等于目标任务完成，不要告诉用户“对方已经完成”。后续用 `read`、目标 lane worklog 或回传指令追踪：

```bash
starwork multiagent read <to-lane> --turns 3 --target <path> --json
```

只有看到目标 turn 为 `completed`，或目标 lane 后续明确回报，才把这次跨会话指令视为完成。如果用户明确要求同步等待，再加 `--wait-completion`；若返回 `started_unverified`，只能说明已启动但未观察到完成。

对非 Codex 宿主：

- Claude Code / Cursor / Trae 不能默认说“已自动发送给另一个会话”。
- 如果 CLI 返回 `manual_handoff_required`，只能说“已生成交付消息，等待用户手动发送”。
- 交付消息必须包含目标 lane、任务、上下文、写入边界和完成后回报方式。

如果用户明确只想生成人工交付包，使用：

```bash
starwork multiagent handoff <to-lane> --from <from-lane> --message "<text>" --target <path> --dry-run
```

如果用户想继续 Claude Code 中的 lane，使用：

```bash
starwork multiagent continue <lane> --target <path> --json
```

### launch

为已有 lane 创建独立宿主会话，并发送 StarWork 格式化 Launch Message。

命令：

```bash
starwork multiagent launch <lane> --target <path> --dry-run
starwork multiagent launch --lanes product-planning,development,review --target <path> --dry-run
```

不要自动创建 lane。lane 不存在时，先用 `multiagent add` 设计职责和写入范围。

正式执行时优先使用 `--json`，并按结果判断：

- `launch_status` 表示宿主会话和 Launch Message 是否完成。
- `rename_status` 表示宿主会话命名是否完成；warning 需要告诉用户。
- `binding_status` 表示 StarWork lane 是否已绑定可工作的 session；不是 `bound` 时不能说团队创建完成。

## Lane Workspace 与正式输出

每个 lane 默认有自己的过程工作区：

```text
_系统/协作/lanes/<lane-id>/workspace/
_system/collaboration/lanes/<lane-id>/workspace/
```

使用规则：

- 草稿、调研笔记、中间分析和临时实验结果，优先放入当前 lane workspace。
- 用户认可的最终交付物、项目正式文档、发布稿和确认稿，应晋升到项目正式输出目录。
- workspace 内容需要其他 lane 读取时，用 `starwork multiagent share` 登记到当前语言对应的 `shared.md`。
- 晋升后，以项目正式输出目录中的文件为准；workspace 保留过程记录。
- 不要把 workspace 当成新的长期事实源或归档库。

## 安全规则

- 写入类命令默认先 `--dry-run` 或征得用户确认。
- 用户明确要求执行后，写入类命令使用 `--yes`。
- `status` 是只读命令，可以直接运行。
- 不写入 `matters/registry.md`。
- 不创建任务系统、锁系统或 JSON manifest。
- 不自动决定项目该有哪些 lane。
- 不把示例 lane 当默认模板。
- 不把 lane workspace 当成项目正式输出目录。
- lane 外文件修改前，先登记共享请求或取得用户明确授权。

## 输出格式

讨论阶段优先输出简短方案：

```markdown
## Multiagent 建议

- 目标：
- 需要的 lane：
- 当前会话绑定：
- 写入范围：
- 需要执行的 dry-run：

## 待确认

- ...
```

执行后建议运行：

```bash
starwork multiagent status --target <path> --json
```

然后总结当前分工和下一步。
