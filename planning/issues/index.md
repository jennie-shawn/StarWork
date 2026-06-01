# StarWork Issue 跟踪

用途：维护 StarWork 的反馈、问题、体验缺口和验收阻塞。这里是本地 issue 跟踪唯一入口；确认要进入产品规划或开发实现的内容，再转入对应 feature SPEC、路线图、GitHub Issue 或开发 lane。

## 当前 Issues

| ID | 标题 | 类型 | 优先级 | 状态 | 负责人 | 来源 | 关联 | 下一步 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ISSUE-002 | MultiAgent v0.2 `launch` 失败后仍写入 lane binding | cli | P0 | fixed-pending-review | development lane | MultiAgent v0.2 产品验收 | `product/planning/features/multiagent/specs/v0.2-codex-orchestration.md`；`product/planning/features/multiagent/acceptance/2026-06-01-v0.2-acceptance-report.md` | 已修复 launch 绑定时机和失败处理，等待产品 lane 复验。 |
| ISSUE-001 | `starwork knowledge init` 重复运行生成 `.starwork-new` 噪音文件 | cli | P1 | closed | optimization lane | M2.11 Knowledge Capability 验收 | `product/planning/features/knowledge-base/specs/v0.1.md`；`_系统/协作/lanes/product-planning/workspace/m2.11-knowledge-acceptance-report.md` | 已复验通过并关闭：重复运行不生成噪音文件，用户修改不被覆盖，健康检查通过。 |

## ISSUE-002：MultiAgent v0.2 `launch` 失败后仍写入 lane binding

### 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | cli |
| 优先级 | P0 |
| 状态 | fixed-pending-review |
| 来源 | MultiAgent v0.2 产品验收 |
| 发现日期 | 2026-06-01 |
| 关联 SPEC | `product/planning/features/multiagent/specs/v0.2-codex-orchestration.md` |
| 关联验收 | `product/planning/features/multiagent/acceptance/2026-06-01-v0.2-acceptance-report.md` |
| 负责人 | development lane |

### 现象

- 用户可见表现：`multiagent launch` 返回失败，但 lane 仍显示已绑定到新创建的 Codex thread。
- 期望表现：Launch Message 发送成功后才绑定 lane；如果初始化消息发送失败，不应把失败 thread 作为当前 lane binding。
- 实际表现：真实 Codex app-server 上 `launch` 创建了 thread id，但初始化消息发送失败后，`agent-lanes.md` 和 `.starwork/agent-lanes/state.json` 仍写入了该 thread。

### 证据

再次验收中，`status --host`、`read`、`instruct --yes` 已经通过真实 Codex thread 验证。剩余问题集中在 `launch`：

```bash
starwork multiagent launch launch-test --target <tmp> --json --yes
```

返回：

```json
{
  "schema": "starwork.agent_lanes.launch.v0.2",
  "launches": [
    {
      "lane": "launch-test",
      "adapter": "codex",
      "status": "failed",
      "thread_id": "019e83a5-2ea7-7321-bb59-a1c1fc54e993",
      "warning": "Codex app-server did not return response 5"
    }
  ]
}
```

但 registry 已被写入：

```text
| launch-test | 待补充 | codex:019e83a5-2ea7-7321-bb59-a1c1fc54e993 | 待补充 | lanes/launch-test/worklog.md | lanes/launch-test/workspace |
```

随后 `multiagent read launch-test --turns 5 --json` 返回 `thread not loaded`。

### 影响范围

- 影响的功能：`multiagent launch`。
- 影响的用户：所有希望用 Codex 多会话编排的用户。
- 是否影响发布 / 升级 / A 测：影响 MultiAgent v0.2 对外可用性，应阻塞该能力发布。
- 是否有绕行方式：可以先手动创建 Codex thread，再用 `multiagent bind` 绑定；`instruct` 已可用于发送跨会话指令。

### 初步判断

第一次验收发现的 app-server 长连接问题已经修复。当前问题更像是 `launch` 的事务边界不清楚：thread 创建成功、初始化消息失败时，CLI 仍然执行了 registry 和 state 写入。

另外，`sendCodexInstruction()` 当前可能把最后一次 `thread/read` 超时视为整体失败，需要区分“turn 已完成但 read 验证失败”和“turn 未完成 / 未送达”。

### 分流结果

- 是否转 SPEC：不需要新 SPEC，属于 v0.2 实现缺陷。
- 是否转 GitHub：暂不需要，先由 development lane 修复。
- 是否转开发 lane：是。
- 是否需要用户补信息：不需要。

### 下一步

development lane 修复 `launch`：

- Launch Message 发送成功后才写入 `agent-lanes.md` 和 `.starwork/agent-lanes/state.json` binding。
- 初始化消息失败时，lane 仍保持 `unbound`；可以在 JSON 输出中返回 `created_thread_id` 供人工排查。
- 新增单测：thread 创建成功但 `turn/start` / `thread/read` 失败时，不得写入 binding。
- 继续确认英文镜像路径提示和 `starworkMultiagent` skill 中的中英文路径说明。

### 处理结果

2026-06-01 development lane 已完成修复：

- `codex app-server` 调用从一次性 stdin 输入改为长连接顺序 JSON-RPC：发送一条请求，等待对应 response，再继续下一条。
- `status --host --load` 会先 `thread/resume`，再 `thread/read`。
- `instruct` 会先确认 `thread/read`，再 `thread/resume`、`turn/start`，并等待 `turn/completed` 或超时。
- `launch` 会创建 Codex thread，再通过同一套顺序调用发送 Launch Message。
- `thread/list` 兼容真实返回结构 `result.data`。
- fake codex 测试改为按 stdin 行即时响应，避免一次性输入造成假阳性。
- 修复英文工作区 `multiagent share` 完成提示仍显示中文协作路径的问题。
- `starworkMultiagent` skill 补充中文 / 英文协作路径说明。

### 产品 lane 再次验收

2026-06-01 产品 lane 再次验收：

- `npm test` 通过：69 个测试全部通过。
- `git -C product diff --check` 通过。
- 对真实 Codex thread 运行 `status --host` 通过，能返回 thread 元信息。
- 对真实 Codex thread 运行 `status --host --load` 通过。
- 对真实 Codex thread 运行 `read <lane> --turns 2` 通过。
- 对真实 Codex thread 运行 `instruct --yes --json` 通过，返回 `host_delivery.status: completed` 和 `verified_by_thread_read: true`。
- `launch --yes --json` 未通过：创建了 thread id，但初始化消息发送失败，且仍写入 `agent-lanes.md` 和 `.starwork/agent-lanes/state.json` binding。

最新阻塞已经从“真实 Codex app-server 调用失败”收敛为“`launch` 失败后仍写入 lane binding”。

### 二次处理结果

2026-06-01 development lane 继续修复 `launch` 事务边界：

- `launch` 只有在 Launch Message 返回 `completed` 后，才写入 `agent-lanes.md` 和 `.starwork/agent-lanes/state.json` binding。
- 如果 thread 创建成功但 Launch Message 发送失败，JSON 返回 `created_thread_id` 供排查，但不返回可绑定的 `thread_id`，lane 保持 `unbound`。
- `sendCodexInstruction()` 不再把最后一次 `thread/read` 验证超时视为消息发送失败；turn 已完成时返回 `completed`，同时用 `verified_by_thread_read: false` 和 `verification_warning` 标记验证读失败。
- 新增回归测试：thread 创建成功但 `turn/start` 失败时，不写入 binding。
- 新增回归测试：turn 完成但最终 `thread/read` 验证超时时，允许绑定，并保留验证警告。
- 真实 app-server 复验后继续修正：`launch` 新建 thread 时显式传入目标工作台 `cwd`，`turn/start` 使用正式 `UserInput` 形态 `{ type: "text", text, text_elements: [] }`。
- `launch` 默认等待时间改为 90 秒，避免新 thread 首次加载 skills 和规则文件时被过早中断。
- 移除新 thread 后的错误 `thread/resume` 调用；真实协议中 `thread/start` 后直接 `turn/start` 才能完成首轮初始化。

### 开发复验

- `node --check cli/src/cli.js` 通过。
- `node --test cli/test/init.test.js` 通过：71 个测试全部通过。
- 对当前项目真实 Codex thread 运行 `multiagent read optimization --json --turns 1` 通过：返回 `readable: true`、`status: idle`、真实 thread name/cwd/turn_count。
- 对临时真实项目运行 `multiagent launch launch-test --timeout 90000 --json --yes` 通过：返回 `status: completed`、写入 `codex:<thread_id>` binding；随后 `multiagent read launch-test --turns 1 --json` 返回 `readable: true`、`status: idle`、`cwd` 为临时项目目录、最近 turn `completed`。

### 下一步

development lane 修复 `launch`：

- Launch Message 发送成功后才写入 `agent-lanes.md` 和 `.starwork/agent-lanes/state.json` binding。
- 初始化消息失败时，lane 仍保持 `unbound`；可以在 JSON 输出中返回 `created_thread_id` 供人工排查。
- 新增单测：thread 创建成功但 `turn/start` / `thread/read` 失败时，不得写入 binding。
- 继续确认英文镜像路径提示和 `starworkMultiagent` skill 中的中英文路径说明。

### 验收方式

- 对真实 Codex thread 运行 `status --host --json`，能返回 thread 元信息。
- 对 notLoaded thread 运行 `status --host --load --json`，能 resume 后返回 idle。
- 对真实 Codex thread 运行 `instruct --yes --json`，目标 thread 收到 `STARWORK:MULTIAGENT_MESSAGE v1` 消息，返回 `sent` 或 `completed`。
- `launch --yes --json` 能创建 thread、发送 Launch Message、写入 lane binding。
- 当 Launch Message 发送失败时，`agent-lanes.md` 不能写入失败 thread binding。
- `npm test` 通过。

## ISSUE-001：`starwork knowledge init` 重复运行生成 `.starwork-new` 噪音文件

### 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | cli |
| 优先级 | P1 |
| 状态 | closed |
| 来源 | M2.11 Knowledge Capability 产品验收 |
| 发现日期 | 2026-06-01 |
| 关联 SPEC | `product/planning/features/knowledge-base/specs/v0.1.md` |
| 关联验收 | `_系统/协作/lanes/product-planning/workspace/m2.11-knowledge-acceptance-report.md` |
| 负责人 | optimization lane |

### 现象

- 用户可见表现：在同一个项目里重复运行 `starwork knowledge init` 后，会出现 `.starwork-new` 结尾的重复文件。
- 期望表现：重复开启知识库能力时应保持安静；已有标准模板和项目内 Skill 文件不应重复生成。
- 实际表现：第二次运行会在知识库目录和项目内 Skill 目录生成重复文件。

### 复现方式

```bash
starwork init --type project --language zh --pack general --target <project> --yes
starwork knowledge init --target <project> --yes
starwork knowledge init --target <project> --yes
find <project>/知识库 -maxdepth 2 -type f
find <project>/.agents/skills/starworkKnowledgeProject -type f
```

### 证据

重复运行后出现的文件包括：

```text
知识库/README.starwork-new.md
知识库/index.starwork-new.md
知识库/log.starwork-new.md
知识库/schema.starwork-new.md
.agents/skills/starworkKnowledgeProject/SKILL.starwork-new.md
.agents/skills/starworkKnowledgeProject/agents/openai.starwork-new.yaml
```

### 影响范围

- 影响已有项目后续开启知识库能力时的信任感。
- 影响 `knowledge init` 的幂等性和可重复执行体验。
- 可能让 Agent 难以判断哪个 schema 或 Skill 文件才是正式文件。
- 暂未发现覆盖用户文件或删除数据，但会制造长期噪音。

### 初步判断

CLI 复用了通用文件写入逻辑：当目标文件已存在且非空时，为了避免覆盖用户内容，会生成 `.starwork-new` 文件。这个策略适合保护用户文件，但不适合重复安装 StarWork 自带的标准模板和 Capability 自带 Skill。

### 建议处理

- `knowledge init` 遇到已有标准模板文件时默认跳过，不生成 `.starwork-new`。
- 项目内 `starworkKnowledgeProject` Skill 已存在时默认跳过；只补齐缺失文件。
- 保留“不覆盖用户修改”的安全原则。
- 增加回归测试：重复运行 `starwork knowledge init` 后，不应出现 `*.starwork-new*`。

### 验收方式

- 对同一项目连续运行两次 `starwork knowledge init --yes`，知识库目录和项目内 Skill 目录都不出现 `.starwork-new` 文件。
- 用户修改过的 `schema.md` 不被覆盖。
- `starwork knowledge check --json` 仍返回可解释的健康状态。
- `npm test` 通过。

### 处理结果

- `knowledge init` 的标准知识库模板改为幂等写入：目标文件已存在且非空时跳过，空文件才补写。
- `starworkKnowledgeProject` 项目内 Skill 改为幂等复制：已有文件跳过，只补缺失文件。
- 增加回归测试，覆盖重复运行、用户修改 `schema.md` 不被覆盖、无 `.starwork-new` 噪音文件和 `knowledge check --json` 健康状态。

### 复验记录

2026-06-01 再次验收通过：

- `npm test` 通过：64 个测试全部通过。
- 临时中文项目中连续运行两次 `starwork knowledge init --yes` 后，`*.starwork-new*` 文件数量为 0。
- 手工改写 `知识库/schema.md` 为自定义内容后再次运行 init，文件内容保持不变。
- `starwork knowledge check --json` 返回 `ok: true`，且 `starworkKnowledgeProject` 已挂载到 Codex 和 Claude 两侧。

## 新 Issue 登记格式

复制 `product/planning/issues/template.md`，补齐后把摘要登记到上方表格。
