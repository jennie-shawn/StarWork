# Message Templates

Codex App 正常路径中，Skill 自己组装 StarWork 消息，不调用 CLI 模板生成器。消息必须完整可复制。

## Instruction Message

```text
<!-- STARWORK:MULTIAGENT_MESSAGE v1 -->

# StarWork MultiAgent Instruction

message_type: instruction
request_id: <REQ-id>
from_lane: <from-lane>
to_lane: <to-lane>
created_at: <ISO time>
recorded_in: _系统/协作/shared.md

## 消息内容

<用户指令或任务说明>

## 边界

- 只在你的 write_scope 内主动修改：<write-scope>
- 如需修改 write_scope 之外的文件，先在共享记录中说明需要授权。
- 不要修改与本任务无关的文件。
- 当前工作区：<absolute-target-path>

## 完成后请回报

1. 更新你的 lane worklog。
2. 如有正式输出，登记 Shared Outputs。
3. 如需验收，向来源 lane 回传复验请求。

<!-- /STARWORK:MULTIAGENT_MESSAGE -->
```

## Launch Message

Launch Message 使用同一包装格式，标题可写成 `# StarWork MultiAgent Launch`。正文包含：

- lane 职责。
- 写入范围。
- 当前工作区。
- 启动后的第一步。
- 回报方式。

## Manual handoff

自动工具不可用时，输出 `manual_handoff_required`，展示完整消息，并明确“尚未自动送达”。不要说已通知或已发送成功。

## Return contract

要求目标 lane 回传时，明确字段：

- changed_files / output_paths
- verification
- risks
- next_action
- acceptance_needed

字段按任务裁剪，不强行套模板。
