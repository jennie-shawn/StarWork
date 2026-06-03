# ISSUE-011：StarWork Skill 不应内置宿主适配百科，运行时宿主能力应由 CLI 判断

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | skill / cli / adapter / workflow |
| 优先级 | P1 |
| 状态 | closed |
| 来源 | 用户反馈 / 产品架构判断 |
| 发现日期 | 2026-06-03 |
| 关联 GitHub Issue | 无 |
| 关联 SPEC | `product/planning/features/multiagent/specs/v0.4-runtime-host-routing.md`、`product/planning/features/multiagent/references/host-compatibility-and-adaptation.md` |
| 关联验收 | 无 |
| 负责人 | development lane |

## 现象

- 用户可见表现：`starworkMultiagent` Skill 中出现 Codex、Claude Code、Cursor、Trae 等宿主工具的适配细节，容易变成“工具兼容性百科”。
- 期望表现：Skill 只负责用户意图判断、友好采访和对应 StarWork CLI 的调用流程；某次命令能不能执行由 CLI 在运行时判断。`adapt` 只负责准备宿主环境、写入 adapter state 和让 `doctor --host` 可检查。
- 实际表现：当前 Skill 中有宿主能力表、部分工具限制和能力判断口径，后续容易过期，也会让 Agent 在 Skill 层直接判断工具能力。

## 证据

用户反馈：

```text
不应该把所有工具的适配情况写到skill.md，skill.md里就写对应cli的调用方式就行了，而工具的标准能力则由cli封装。

补充校准：

不应该用 adapt 做业务命令的兼容判断分发；应该用 CLI 做运行时兼容判断。adapt 是准备工作，负责生成规则入口、创建 Skill 目录和写 adapter state。
```

## 影响范围

- 影响的功能：`starworkMultiagent`、`starworkInit`、`starwork adapt`、Host Adapter、Skill 分发。
- 影响的用户：所有通过 Agent 使用 StarWork Skill 的用户。
- 是否影响发布 / 升级 / A 测：影响 A 测。Skill 过厚会增加误判和过期风险。
- 是否有绕行方式：用户可让 Agent 先执行 CLI / doctor / adapt，但 Skill 文案如果继续包含宿主百科，仍会诱导 Agent 自己判断。

## 初步判断

更合理的边界：

```text
Skill：理解用户意图，决定调用哪个 StarWork CLI，以人话解释 CLI 输出。
CLI：封装 StarWork 协议、宿主能力判断、执行和降级。
adapt：准备宿主环境，生成规则入口、创建 Skill 目录、写 adapter state。
adapter profile：记录每个宿主支持什么、不支持什么、需要人工处理什么。
```

Skill 不应直接维护：

- 各宿主完整能力矩阵。
- 某个宿主的私有路径、数据库、transcript 细节。
- 某个宿主是否支持某项能力的长期判断。
- 某次业务命令应该自动执行还是人工交付的判断。

Skill 可以保留：

- CLI 子命令怎么调用。
- 什么时候先 dry-run。
- 什么时候读 JSON 输出。
- 如何把 CLI 输出翻译成人话。
- 当 CLI 返回 `unsupported` / `manual_handoff_required` / `needs_adapt` / `unbound` 时，下一步怎么引导用户。

## 分流结果

- 是否转 SPEC：需要补入 Host Adapter / MultiAgent 规划文档。
- 是否转 GitHub：否，先走本地 issue。
- 是否转开发 lane：是。
- 是否需要用户补信息：否。

## 下一步

development lane 复核并修正：

1. 收敛 `product/skills/starworkMultiagent/SKILL.md`，移除宿主工具百科式内容。
2. 保留 StarWork CLI 调用流程、dry-run / json / yes 的安全执行方式。
3. `starworkMultiagent` 只调用 CLI 并解释 CLI 返回状态。
4. CLI 实现运行时宿主能力判断：`delivered`、`manual_handoff_required`、`needs_adapt`、`unbound`、`unsupported`、`failed`。
5. `adapt` 只负责准备宿主环境：规则入口、Skill 目录、adapter state 和 doctor 检查，不做某次 `instruct` 的业务路由。
6. 更新测试或验收脚本，确保 Skill 不再要求 Agent 自己判断具体宿主能力。

## 验收方式

- 验收条件 1：`starworkMultiagent` Skill 中不再维护 Codex / Claude Code / Cursor / Trae 的完整能力矩阵。
- 验收条件 2：Skill 只描述 StarWork CLI 调用方式和用户交互流程。
- 验收条件 3：宿主能力运行时判断由 CLI 输出，Skill 只解释输出。
- 验收条件 4：`adapt` 只承担准备工作，不决定某次业务命令如何执行。
- 验收条件 5：当 CLI 输出 `needs_adapt`、`unsupported`、`manual_handoff_required`、`unbound` 等状态时，Skill 有对应用户引导。
- 关闭标准：development lane 完成 Skill 收敛并通过产品复验。

## Development 处理记录

2026-06-03 development lane 已按 v0.4 runtime host routing 修复：

- `starworkMultiagent` Skill 删除宿主能力矩阵，不再维护 Codex / Claude Code / Cursor / Trae 的工具百科。
- Skill 保留用户意图路由、CLI 调用方式、dry-run / json / yes 安全流程，并按 CLI 返回状态解释下一步。
- CLI 新增 `resolveHostRuntimeCapability` 路由，统一输出 `manual_handoff_required`、`needs_adapt`、`unbound`、`unsupported` 等状态。
- `adapt` 仍只负责准备宿主入口、Skill 目录、adapter state 和 doctor 检查；业务命令路由在 `multiagent instruct` 内完成。
- 回归测试覆盖 Skill 不含宿主能力矩阵、不含 `Codex app-server` 口径，以及 CLI 运行时路由状态。

验证：`npm test` 通过 90/90。

## 产品复验

2026-06-03 product-planning lane 复验通过，`ISSUE-011` 关闭。

复验结论：

- `starworkMultiagent` Skill 不再维护 Codex / Claude Code / Cursor / Trae 的完整宿主能力矩阵。
- Skill 保留用户意图路由、CLI 调用、dry-run / json / yes 安全流程，以及对 CLI 返回状态的解释。
- Skill 对 `manual_handoff_required`、`needs_adapt`、`unbound`、`unsupported`、`failed` 等状态有用户下一步引导。
- 运行时宿主能力判断已收敛到 CLI 的 `resolveHostRuntimeCapability`。
- `adapt` 仍保持为宿主准备工作，不承诺某次业务命令一定自动发送。

复验结果：

- Skill 中仅保留必要的宿主称谓示例和 CLI 状态解释，未出现能力矩阵或低层 app-server 投递口径。
- 目标测试通过。
- `npm test` 通过 90/90。
