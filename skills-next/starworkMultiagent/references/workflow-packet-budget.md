# Workflow Packet Budget

Runner 默认生成 compact + reference packet，不复制完整 Workflow Definition。

## compact + reference

默认 packet 必须包含：

- `packet_mode: compact`
- `wf`
- `wf_i`
- `wf_def`
- `wf_v`
- `node`
- `inputs`
- `do`
- `return`
- `gate`

默认 instruction 不超过 2,000 中文字符；默认 response 不超过 1,500 中文字符。

## full packet

只有以下情况才使用 full packet：

1. 目标 Agent 无法访问项目文件。
2. manual handoff 必须完整自包含。
3. 用户明确要求完整上下文。

full packet 不超过 4,000 中文字符。

## 投递边界

packet 只是消息内容，不改变投递保证。跨 lane 节点仍必须先真实投递成功，再记录 delivered；失败时进入 `manual_handoff_required`，不得写 delivered。
