# Lane Workspace And Output Promotion

每个 lane 默认有自己的过程工作区：

```text
_系统/协作/lanes/<lane-id>/workspace/
_system/collaboration/lanes/<lane-id>/workspace/
```

## 使用规则

- 草稿、调研笔记、中间分析和临时实验结果，优先放入当前 lane workspace。
- 用户认可的最终交付物、项目正式文档、发布稿和确认稿，应晋升到项目正式输出目录。
- workspace 内容需要其他 lane 读取时，用 `starwork multiagent share` 登记到当前语言对应的 `shared.md`。
- 晋升后，以项目正式输出目录中的文件为准；workspace 保留过程记录。
- 不要把 workspace 当成新的长期事实源或归档库。

## 读取 lane 状态

用户问某个 lane 做到哪了时：

1. 先读 StarWork 协作状态。
2. 对已绑定的 Codex session，调用 `read_thread`；需要查找历史会话时，调用 `list_threads`。
3. 汇总时区分宿主会话最近状态、lane worklog、shared outputs / cross-lane requests。

`read_thread` 是宿主观察，不替代 lane worklog。正式交接仍以 lane worklog 和 shared outputs 为准。

## 晋升输出

过程材料只有在用户认可、产品负责人确认或 workflow gate 通过后，才晋升为正式输出。晋升前说明目标文件、目的和是否会改正式目录。
