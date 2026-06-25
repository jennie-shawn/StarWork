# Workflow Builder

Workflow Builder 是 next 内测能力，只设计流程，不通知任何 Agent，不启动真实流程。

## 触发

用户表达“设计 workflow / 自动通知流程 / 产品开发循环 / 定义多 AI 协作流程”时进入 Builder。含混时先问：你是想先设计这个流程，还是现在就按已有流程开始执行？

## 第一屏

先说明：

```text
可以。我先帮你设计这个多 AI 协作流程。

这一步只会生成 workflow 草案，说明哪些 AI 岗位参与、每一步什么时候触发、要产出什么、哪些地方需要确认、完成后下一步交给谁。

在你确认前，我不会通知任何 Agent，也不会启动真实流程。
```

## 采访

至少采访：

- 目标：workflow 要稳定解决什么问题。
- 参与 AI 岗位：涉及哪些 lane，优先复用已有 lane。
- 触发条件：什么事件启动流程，什么事件表示当前节点完成。
- 每步输入：下一位 Agent 需要哪些材料才能开始。
- 每步产出：当前节点必须留下什么结果。
- Return Contract：完成后必须回传哪些字段。
- Gate / Stop：哪些节点必须人审，哪些状态停止。
- 写入边界：确认前只保存草案，不真实投递。

## 保存前预览

保存前展示预览表：

| 步骤 | 负责 lane | 触发条件 | 输入 | 产出 | Return Contract | Gate / Stop |
|---|---|---|---|---|---|---|

确认句固定为：

```text
如果这个 workflow 设计没问题，我只会先保存草案，不会启动流程或通知任何 Agent。
```

## 保存边界

用户确认后，只写入 builder lane workspace 草案：

```text
_系统/协作/lanes/<builder-lane>/workspace/drafts/workflows/<workflow-id>.draft.md
_system/collaboration/lanes/<builder-lane>/workspace/drafts/workflows/<workflow-id>.draft.md
```

Builder 禁止：

- 不投递消息。
- 不创建 workflow instance。
- 不写 `.starwork/workflows/state.json`。
- 不写 `product/`。
- 不记录 delivery status。
