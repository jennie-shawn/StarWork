# ISSUE-015：MultiAgent 创建 Agent 时把使用场景写进会话名称

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | cli / skill / workflow |
| 优先级 | P2 |
| 状态 | closed |
| 来源 | 用户反馈 / 截图 |
| 发现日期 | 2026-06-06 |
| 关联 GitHub Issue | 无 |
| 关联 SPEC | `product/planning/features/multiagent/specs/v0.6-launch-session-control-capability.md` |
| 关联验收 | `ISSUE-010` |
| 负责人 | development lane |

## 现象

- 用户可见表现：使用 Multi-Agent 创建 Agent 时，宿主会话名称不合规范，把 Agent 的使用场景或任务说明也写进了标题。
- 期望表现：会话标题只表达简短职责名，格式应类似 `<职责名> Agent`，例如 `数据复盘 Agent`、`素材准备 Agent`、`内容写作 Agent`、`选题管理 Agent`。
- 实际表现：会话标题出现 `数据复盘 Agent: 根据用户提供的每周...`、`素材准备 Agent: 根据内容脚本准备封面方案...` 等长文本，冒号后混入了任务场景描述。

## 证据

用户截图中的会话列表显示：

```text
数据复盘 Agent: 根据用户提供的每周、每...
素材准备 Agent: 根据内容脚本准备封面方案、...
内容写作 Agent: 根据已登记或已确认选题生成...
选题管理 Agent: 只负责登记自媒体选题、维护...
```

用户原话：

```text
使用Multi-Agent创建Agent的时候，它的名称写得不合规范，把这个Agent的使用场景也写进去了。
```

关联历史 issue：

```text
ISSUE-010：MultiAgent 创建 Agent 时应强制使用可读会话命名格式
```

`ISSUE-010` 已关闭，约定默认会话名为 `<职责名> Agent`，不包含项目名、目录名、thread id、UUID、日期、状态词、`lane`、`session` 等内部词。本次反馈补充了新的禁区：不应包含使用场景、任务说明、职责长描述或冒号后的解释文本。

## 影响范围

- 影响的功能：`starworkMultiagent`、`starwork multiagent launch` / Agent 团队创建、Codex host session title sync。
- 影响的用户：批量创建多个 Agent 的用户。
- 是否影响发布 / 升级 / A 测：影响 A 测体验。会话名过长会让宿主会话列表难以扫描，且多个 Agent 的职责边界被标题长描述挤压。
- 是否有绕行方式：用户可以手动改名，但批量创建时成本高，也容易和 StarWork lane state 中的建议名称不一致。

## 初步判断

- 命名生成逻辑可能直接复用了 lane purpose / agent description，而不是从中提取短职责名。
- Skill 或 CLI 缺少对 session name 的长度和内容约束。
- 已有 `ISSUE-010` 解决了“不带项目名 / 内部词”，但没有显式禁止“冒号 + 使用场景描述”。

## 分流结果

- 是否转 SPEC：暂不新建 SPEC，先关联 MultiAgent v0.2 Codex orchestration SPEC 和 `ISSUE-010` 的命名口径。
- 是否转 GitHub：否，先走本地 issue。
- 是否转开发 lane：是。
- 是否需要用户补信息：否，已有截图和例子。

## 下一步

development lane 复核并修复：

1. 将 Agent 会话名生成逻辑固定为短名：`<职责名> Agent`。
2. 禁止会话名包含冒号后的用途说明、完整职责描述、任务目标、场景句子或长 prompt。
3. 从 lane purpose / agent description 生成标题时，只提取短职责名，不直接拼接整段描述。
4. 增加回归测试，覆盖中文职责名、带冒号描述、长职责说明和批量 Agent 创建。

## 产品修复方案

本 issue 并入 MultiAgent v0.6 修复批次。

核心要求：

- 新增短标题提取函数，不再直接用完整 `lane.purpose` 拼接 session name。
- 默认标题固定为 `<短职责名> Agent`。
- 遇到 `:`、`：`、`。`、换行、逗号、顿号后的内容全部丢弃。
- 禁止标题包含使用场景、任务说明、完整句子、项目路径或 UUID。
- fake Codex 的 `thread/name/set` input、CLI JSON 输出和 `.starwork/agent-lanes/state.json` 中的 `session_name` 必须一致。

落地 SPEC：

```text
product/planning/features/multiagent/specs/v0.6-launch-session-control-capability.md
```

## 验收方式

- 验收条件 1：截图中的四类 Agent 应生成类似 `数据复盘 Agent`、`素材准备 Agent`、`内容写作 Agent`、`选题管理 Agent` 的短标题。
- 验收条件 2：会话名不包含 `:`、`：` 后的解释文本。
- 验收条件 3：会话名不包含“根据...”“只负责...”“用于...”“负责...生成...”等完整使用场景句子。
- 验收条件 4：JSON / state 中的 `session_name` 与宿主会话标题一致，且同样符合短名规则。
- 关闭标准：development lane 修复并通过命名相关回归测试 / 真实创建复验。

## 处理记录

### 2026-06-08 product-planning 复验通过

development lane 已完成 ISSUE-015 修复并回传复验。产品复验结论：通过，关闭本 issue。

确认点：

- `deriveLaneRoleName` 不再保留 `根据` / `只负责` / `用于` 开头的长使用场景，改为 lane id 可读名兜底。
- `multiagent message launch` 和 legacy/manual `multiagent launch` 均使用同一 `session_name` 短标题。
- `starworkMultiagent` Skill 明确读取 CLI JSON 中的 `message` 和 `session_name`，并用 `set_thread_title(threadId, session_name)` 设置标题；不从 `purpose`、Launch Message 或用户使用场景长句自行拼标题。
- 回归样例覆盖 `数据复盘 Agent`、`素材准备 Agent`、`内容写作 Agent` 和 `Topic Management Agent`。
- 旧逻辑扫描未发现 Skill 正常创建流程恢复 app-server 会话控制路径；CLI 中 app-server helper 仍属 v0.7 已知 legacy diagnostic 残留，不影响本 issue 关闭。

复验命令：

```bash
node --check product/cli/src/cli.js
node --check product/cli/test/init.test.js
git -C product diff --check
node --test product/cli/test/init.test.js --test-name-pattern 'multiagent launch message uses short lane role names|starworkMultiagent skill uses Codex standard session tools directly'
npm test
```

结果：

- `node --check` 通过。
- `git -C product diff --check` 通过。
- 目标回归测试命令实际运行 99/99，通过。
- `npm test` 99/99，通过。
