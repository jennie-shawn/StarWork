# starworkMultiagent Skill 包装计划

## Summary

新增一个系统级 StarWork Skill：`product/skills/starworkMultiagent/`，用于帮助 AI 正确使用 `starwork multiagent` 的所有子命令：

- `init`
- `add`
- `bind`
- `release`
- `status`
- `share`

它不替代 CLI，不直接定义新协议；它负责把用户自然语言中的“常用智能体 / 当前会话职责 / 多 Agent 分工”翻译成安全的 `starwork multiagent` 命令组合，并在写入前优先 dry-run 或请求确认。

CLI 子命令保持工程语义：

- `init`：初始化 Agent Lanes 协议文件和协作层。
- `add`：新增一个稳定职责位。
- `bind`：把具体会话绑定到职责位。
- `release`：释放职责位的当前会话。
- `status`：读取协作状态。
- `share`：登记跨职责位可读输出。

Skill 层负责提供用户语义：

> “请把当前会话登记成一个常用智能体，它负责 X。”

这类请求在 skill 中应解释为：必要时先初始化协议层，然后新增职责位，并绑定当前会话。

## Key Changes

### 新增 `starworkMultiagent/SKILL.md`

frontmatter：

```yaml
name: starworkMultiagent
description: Use this skill when a user wants AI help designing, initializing, updating, binding, releasing, inspecting, or sharing StarWork multiagent / Agent Lanes collaboration state with `starwork multiagent`.
```

工作流：

- 先判断用户语义：登记当前会话为常用智能体、初始化协作层、增加职责位、绑定会话、释放会话、查看状态、登记共享输出。
- 先读取 `AGENTS.md`、项目状态、当前工作、`_系统/协作/agent-lanes.md`、`_系统/协作/shared.md`。
- 如未启用 Agent Lanes，但用户是在登记常用智能体，先建议或执行 `starwork multiagent init --dry-run`，再继续 `add` 和 `bind`。
- 写入类命令默认先给 dry-run 或请求用户确认。
- 不自动创建固定 lane；lane ID、职责和写入范围必须来自用户场景。

### 新增 `starworkMultiagent-spec.md`

记录 skill 的判断边界、子命令映射、输出结构和安全约束。

只引用 `product/core/agent-lanes-spec.md` 作为机制事实源，避免重复维护协议。

### 更新索引和文档

- `product/skills/README.md` 增加 `starworkMultiagent`。
- `product/README.md` 的系统 Skill 安装命令覆盖该 Skill：

```bash
npx skills add https://github.com/jennie-shawn/StarWork/tree/main/product/skills --full-depth -g -a codex -y
```

- `product/docs/cli-skill-registry.html` 增加 `starworkMultiagent` 与 `starwork multiagent` 的配合关系。
- `product/docs/agent-install-guide.md` 如存在安装命令清单，也同步加入。

## Skill Behavior

### 用户语义：登记当前会话为常用智能体

这是 `starworkMultiagent` 最重要、最常见的入口。

触发场景：

- 用户说“把这个会话创建为一个常用智能体”
- 用户说“这个会话以后负责 X”
- 用户说“登记一个负责 X 的 Agent”
- 用户说“让当前 Codex 作为 X 智能体”

行为：

1. 读取当前工作台状态和 Agent Lanes 文件。
2. 如果 `_系统/协作/agent-lanes.md` 不存在，先执行或建议：

```bash
starwork multiagent init --target <path> --dry-run
```

3. 采访或确认：
   - agent / lane ID，例如 `research`、`writing`、`review`
   - 这个智能体负责什么
   - 它可以主动修改哪些路径
   - 当前会话 ID，无法自动识别时使用 `--session`
4. 生成或执行：

```bash
starwork multiagent add <lane> --purpose "<text>" --write "<path-globs>" --target <path> --dry-run
starwork multiagent bind <lane> --session <agent:session-id> --target <path> --dry-run
```

5. 用户确认后再去掉 dry-run 执行。

注意：

- 不要求用户理解 `init/add/bind` 的区别。
- 可以向用户解释为“登记常用智能体”，但落地时仍使用 CLI 的协议命令组合。
- 如果 lane 已存在，则跳过 `add`，只做 `bind` 或提示是否覆盖绑定。

### `init`

触发场景：

- 用户明确要求“初始化 multiagent / Agent Lanes 协作层”
- 用户要一次性创建多个空职责位
- skill 在“登记常用智能体”流程中发现协作层尚不存在

行为：

- `init` 是协议初始化，不是“创建智能体”的完整用户动作。
- 可以采访多个 lane ID，但不要要求用户一开始就想清楚所有智能体。
- 输出或执行：

```bash
starwork multiagent init --lanes <ids> --target <path> --dry-run
```

### `add`

触发场景：

- 用户明确要新增一个职责位，但暂时不绑定当前会话。
- skill 在“登记常用智能体”流程中需要先创建 lane。

行为：

- 必须确认 `lane-id`、`purpose`、`write_scope`。
- 输出或执行：

```bash
starwork multiagent add <lane> --purpose "<text>" --write "<path-globs>"
```

### `bind`

触发场景：

- 用户要把当前会话绑定到已有职责位。
- skill 在“登记常用智能体”流程中创建或确认 lane 后绑定当前会话。

行为：

- 优先使用真实会话 ID。
- 无法识别时提示使用 `--session <agent:session-id>`。

### `release`

触发场景：

- 用户说“这个会话不再负责某 lane”
- 用户说“释放职责位”

行为：

- 先提醒更新 worklog。
- 再执行 release。

### `status`

触发场景：

- 用户想看当前多 Agent 分工。
- 用户想知道哪些 lane 未绑定。
- 用户想知道有哪些共享请求或共享输出。

行为：

- 默认只读，可直接执行：

```bash
starwork multiagent status --json
```

- AI 基于输出解释当前分工、未绑定 lane、共享请求。

### `share`

触发场景：

- 某个 Agent 的输出需要其他 lane 读取。

行为：

- 必须确认来源 lane、标题、路径、受众 lane、状态。
- 只登记索引，不搬运文件。

## Safety Rules

- 这是系统 Skill，和 `starworkInit`、`starworkDoctor` 一样全局安装。
- 不拆成多个子命令 skill；保持一个入口，降低安装和触发成本。
- 不写死后端、前端、测试等职责；示例只能作为说明，不能作为默认 lane。
- 不写入 `matters/registry.md`。
- 不创建任务系统、锁系统、JSON manifest。
- 写入前默认 dry-run 或确认；只读 `status` 可以直接运行。
- 如果用户要求实际执行，执行后建议运行：

```bash
starwork multiagent status --target <path> --json
```

## Test Plan

### 静态检查

- `starworkMultiagent/SKILL.md` frontmatter 可被 skills CLI 识别。
- skill description 覆盖 `init`、`add`、`bind`、`release`、`status`、`share` 的触发语义。

### 文档检查

- `product/skills/README.md`、产品 README、CLI/Skill 注册表均出现 `starworkMultiagent`。
- 文档中不把旧的 lanes 命令名作为可用命令出现。

### 行为验收

- 给定“请把当前会话创建为一个负责资料整理的常用智能体”，skill 将其解释为“登记常用智能体”，必要时先 `init`，然后生成 `add + bind` 命令。
- 给定“我想让三个 Agent 分别负责资料、写作、审校”，skill 输出 `multiagent init` 和后续 `add/bind` 建议，而不是生成固定前端/后端/测试。
- 给定“把当前 Codex 绑定到 review”，skill 要求或使用 session ID，并生成 `starwork multiagent bind review ...`。
- 给定“这个输出给 writing 和 review 看”，skill 生成 `starwork multiagent share ...`，不移动原文件。

## Assumptions

- 采用一个总 Skill：`starworkMultiagent`。
- 归属为系统 Skill，默认通过 `skills add ... -g` 安装。
- 默认策略是“确认后执行”：AI 可以运行只读状态检查；写入类命令先 dry-run 或征得用户确认。
