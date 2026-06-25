# Safety And Output Rules

## 写入确认

- 写入类 CLI 命令默认先 dry-run 或征得用户确认。
- 用户明确要求执行后，写入类 CLI 命令使用 `--yes`。
- `status`、`doctor --json` 和只读观察可以直接运行。
- 如果会改正式文件，先列出文件、目的和确认点。

## 禁止行为

- 不写入 `matters/registry.md`。
- 不创建任务系统、锁系统或额外 JSON manifest。
- 不自动决定项目该有哪些 lane。
- 不把示例 lane 当默认模板。
- 不把 lane workspace 当成项目正式输出目录。
- 不用 CLI 模拟宿主自动投递。
- 不把消息已送达说成目标任务已完成。

## 输出格式

对用户汇报时：

- 清楚区分“StarWork 状态已记录”和“宿主工具动作已成功”。
- 只有标准工具调用成功且 CLI 记录成功时，才说 Agent 已创建并绑定或消息已投递。
- 工具不可见或失败时，直接给出 `manual_handoff_required` 和完整可复制消息。
- 完成状态必须来自目标 lane 的明确回报、worklog、shared output 或宿主会话观察。
