# StarWork Issue 跟踪

用途：维护 StarWork 的反馈、问题、体验缺口和验收阻塞。这里是本地 issue 跟踪唯一入口；确认要进入产品规划或开发实现的内容，再转入对应 feature SPEC、路线图、GitHub Issue 或开发 lane。

## 当前 Issues

| ID | 标题 | 类型 | 优先级 | 状态 | 负责人 | 来源 | 关联 | 下一步 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ISSUE-002 | MultiAgent v0.2 真实 Codex app-server 调用失败 | cli | P0 | fixed-pending-review | development lane | MultiAgent v0.2 产品验收 | `product/planning/features/multiagent/specs/v0.2-codex-orchestration.md`；`product/planning/features/multiagent/acceptance/2026-06-01-v0.2-acceptance-report.md` | 已修复 app-server 长连接顺序调用、英文路径提示和 skill 路径说明，等待产品 lane 复验。 |
| ISSUE-001 | `starwork knowledge init` 重复运行生成 `.starwork-new` 噪音文件 | cli | P1 | closed | optimization lane | M2.11 Knowledge Capability 验收 | `product/planning/features/knowledge-base/specs/v0.1.md`；`_系统/协作/lanes/product-planning/workspace/m2.11-knowledge-acceptance-report.md` | 已复验通过并关闭：重复运行不生成噪音文件，用户修改不被覆盖，健康检查通过。 |

## ISSUE-002：MultiAgent v0.2 真实 Codex app-server 调用失败

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

- 用户可见表现：`status --host`、`read`、`instruct` 在真实 Codex thread 上无法稳定读取或发送。
- 期望表现：CLI 可以通过 Codex app-server 读取 thread、resume thread、发送格式化跨会话指令，并留下项目内记录。
- 实际表现：单测通过，但真实 app-server 上 CLI 只稳定收到 `initialize` 响应，后续 JSON-RPC 请求可能被丢弃。

### 证据

在临时 StarWork 项目中绑定真实 Codex 测试 thread 后执行：

```bash
starwork multiagent status --host --target <tmp> --json
```

返回：

```json
{
  "adapter": "codex",
  "readable": false,
  "status": "notLoaded",
  "warning": "Codex app-server did not return thread/read"
}
```

执行真实发送：

```bash
starwork multiagent instruct development --from product-planning --message "..." --target <tmp> --json --yes
```

返回：

```json
{
  "host_delivery": {
    "adapter": "codex",
    "status": "failed",
    "warning": "Codex thread/read failed before send"
  }
}
```

对照验证：用长连接方式启动 `codex app-server --listen stdio://`，先发送 `initialize` 并等待响应，再顺序发送 `thread/list`、`thread/read`、`thread/resume`，可以拿到真实数据。

### 影响范围

- 影响的功能：`multiagent status --host`、`multiagent read`、`multiagent instruct`、`multiagent launch`。
- 影响的用户：所有希望用 Codex 多会话编排的用户。
- 是否影响发布 / 升级 / A 测：影响 MultiAgent v0.2 对外可用性，应阻塞该能力发布。
- 是否有绕行方式：可以继续使用项目内 lane registry、shared context 和手动转发；不能依赖 CLI 自动跨会话发送。

### 初步判断

当前实现用 `spawnSync` 一次性把多条 JSON-RPC 消息写入 app-server stdin 并立即关闭输入。真实 app-server 需要长连接和顺序等待响应，否则会出现后续请求被丢弃的问题。

另外，`thread/list` 的真实返回结构是 `result.data`，当前 `listCodexThreads()` 解析逻辑也需要同步修复。

### 分流结果

- 是否转 SPEC：不需要新 SPEC，属于 v0.2 实现缺陷。
- 是否转 GitHub：暂不需要，先由 development lane 修复。
- 是否转开发 lane：是。
- 是否需要用户补信息：不需要。

### 下一步

development lane 修复 Codex app-server adapter：

- 改为长连接 / 顺序 JSON-RPC 调用。
- `status --host --load` 先 `thread/resume` 再 `thread/read`。
- `instruct` 先 `thread/resume`，再 `turn/start`，并等待 `turn/completed` 或超时。
- 修复 `thread/list` 的 `result.data` 解析。
- 增加接近真实 app-server 行为的测试，避免 fake codex 因同步一次性返回造成误判。

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

### 开发复验

- `node --check cli/src/cli.js` 通过。
- `node --test cli/test/init.test.js` 通过：69 个测试全部通过。
- 对当前项目真实 Codex thread 运行 `multiagent read optimization --json --turns 1` 通过：返回 `readable: true`、`status: idle`、真实 thread name/cwd/turn_count。

### 验收方式

- 对真实 Codex thread 运行 `status --host --json`，能返回 thread 元信息。
- 对 notLoaded thread 运行 `status --host --load --json`，能 resume 后返回 idle。
- 对真实 Codex thread 运行 `instruct --yes --json`，目标 thread 收到 `STARWORK:MULTIAGENT_MESSAGE v1` 消息，返回 `sent` 或 `completed`。
- `launch --yes --json` 能创建 thread、发送 Launch Message、写入 lane binding。
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
