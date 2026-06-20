# Context And Compatibility

任何 MultiAgent 写入前，先确认目标目录、入口规则和 MultiAgent 状态。

## StarWork 工作台

`starworkInit` 负责把普通项目接入 StarWork；`starworkMultiagent` 只负责已有 StarWork 工作台里的协作记录。

目标不是 StarWork 工作台时：

1. 停止 multiagent 写入。
2. 不做局部初始化，不创建无人读取的 AI 规则草稿。
3. 转 `starworkInit` 做安全接入、预览和确认。

## pending merge

如果 doctor 或 adapter 状态显示 AI 入口文档仍是 `pending_merge`：

1. 停止创建 lane、绑定会话、投递消息和记录 request。
2. 说明 AI 入口还没有最终生效，避免不同 AI 读到不一致规则。
3. 转 `starworkInit` 整合最终入口文件。

## v0.10 compatibility

开始任何会写入 MultiAgent 状态的动作前，读取：

```bash
starwork multiagent status --target <path> --json
```

如果 `multiagent.compatibility.status` 不是 `current`：

1. 可以汇总已有 AI 岗位，不能把旧结构误说成“没有 AI 岗位”。
2. 不得继续写入新岗位、绑定会话、登记 shared output 或记录 request。
3. 先解释升级影响，再给出安全预览：

```bash
starwork multiagent upgrade --target <path> --dry-run
```

4. 用户确认后才执行：

```bash
starwork multiagent upgrade --target <path> --yes
```

5. 迁移成功并重新检查为 `current` 后，才继续原任务。

如果状态为 `blocked_conflict` 或 `unknown_partial`，不得承诺自动修复；列出冲突来源，建议用户或 product-lead 人工判断。
