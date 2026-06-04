# ISSUE-013：Cursor status --host 未真实报告 cursor agent status 登录态

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | cli / adapter / workflow |
| 优先级 | P1 |
| 状态 | closed |
| 来源 | Host Adapter v0.2 产品复验 |
| 发现日期 | 2026-06-04 |
| 关联 GitHub Issue | 无 |
| 关联 SPEC | `product/planning/features/host-adapters/specs/v0.2-cursor-session-adapter.md` |
| 关联验收 | Host Adapter v0.2 复验 |
| 负责人 | development lane |

## 现象

- 用户可见表现：`multiagent status --host --json` 输出 `cursor_agent_status: "unknown"`。
- 期望表现：按 Host Adapter v0.2 SPEC，Cursor `status --host` 应报告 `cursor agent status` 是否登录，并报告 `CURSOR_API_KEY` 是否设置且不泄露密钥值。
- 实际表现：即使 PATH 中存在可执行 `cursor`，且 fake `cursor agent status` 返回 `Logged in as fake@example.com`，CLI 输出仍为 `cursor_agent_status: "unknown"`。

## 证据

复验构造：

```text
1. 创建临时 StarWork 工作台并启用 cursor adapter。
2. 绑定 lane 为 cursor:cursor-accept-session。
3. 在 STARWORK_CURSOR_PROJECTS_DIR 下写入 agent-transcripts/<uuid>/<uuid>.jsonl。
4. 在 PATH 前置 fake cursor 命令，fake cursor agent status 返回 Logged in as fake@example.com。
5. 设置 CURSOR_API_KEY=super-secret-token。
6. 执行 multiagent status --host --json。
```

实际输出要点：

```json
{
  "cursor_cli_exists": true,
  "cursor_agent_status": "unknown",
  "cursor_api_key_present": true
}
```

正向点：

- `cursor_api_key_present` 为 boolean。
- 输出未泄露 `super-secret-token`。
- transcript 摘要、坏行处理和 `manual_handoff_required` 均正常。

## 影响范围

- 影响的功能：`starwork multiagent status --host --json` 的 Cursor host facts。
- 影响的用户：用 Cursor 作为宿主并需要判断 CLI resume / 认证可用性的用户。
- 是否影响发布 / 升级 / A 测：影响 Host Adapter v0.2 验收关闭。
- 是否有绕行方式：用户可手动运行 `cursor agent status`，但 StarWork status 输出没有履行 SPEC。

## 初步判断

实现只设置了：

```text
cursor_agent_status: "unknown"
```

并未执行或解析 `cursor agent status`。

应增加一个安全 probe：

- `cursor` 不存在：`cursor_agent_status: "not_found"` 或等价状态。
- `cursor agent status` 成功：解析为 `logged_in` / `not_logged_in` / `unknown`。
- 命令失败：输出错误类别，不泄露 token / 环境变量。
- 测试应覆盖 fake cursor CLI。

## 分流结果

- 是否转 SPEC：已在 Host Adapter v0.2 SPEC 中有要求，无需新增 SPEC。
- 是否转 GitHub：暂不转，先本地 issue 跟踪。
- 是否转开发 lane：是。
- 是否需要用户补信息：不需要。

## 下一步

development lane 修复 Cursor `status --host` 登录态 probe，并补测试覆盖 fake `cursor agent status`。

## 验收方式

- 验收条件 1：fake `cursor agent status` 返回 logged in 时，`multiagent status --host --json` 不再输出 `unknown`。
- 验收条件 2：fake `cursor agent status` 返回 not logged in 或失败时，CLI 输出明确状态。
- 验收条件 3：输出不泄露 `CURSOR_API_KEY` 或其他环境变量密钥值。
- 关闭标准：Host Adapter v0.2 复验通过。

## 复验记录

### 2026-06-04 product-planning 复验通过

复验构造：

```text
1. 创建临时 StarWork 工作台并启用 cursor adapter。
2. 绑定 lane 为 cursor:<session-id>。
3. 在 STARWORK_CURSOR_PROJECTS_DIR 下写入 agent-transcripts/<uuid>/<uuid>.jsonl。
4. PATH 前置 fake cursor 命令，分别模拟：
   - cursor agent status -> Logged in as fake@example.com
   - cursor agent status -> Not logged in
   - cursor agent status -> stderr 含 fake@example.com 后 exit 42
5. 设置 CURSOR_API_KEY=super-secret-token。
6. 执行 multiagent status --host --json。
```

复验结果：

| fake cursor 场景 | `cursor_agent_status` | 是否泄露 token / email / stderr |
| --- | --- | --- |
| Logged in | `logged_in` | 否 |
| Not logged in | `not_logged_in` | 否 |
| exit 42 + stderr | `error` | 否 |

结论：关闭。
