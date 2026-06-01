# matters/ 事项管理规则

`matters/` 是 StarWork 的事项推进过程工作区。

## 核心规则

1. 一个值得持续推进的具体工作，应创建为一个 matter。
2. matter 目录命名格式：`YYYY-MM-DD-short-slug`。
3. `matters/registry.md` 是事项索引，必须记录 `matter_id`、`status`、`codex_thread_id`、`path`、`updated`。
4. AI 在会话中定位当前 matter 时，先读取 `CODEX_THREAD_ID`；如果 registry 中有对应线程，优先使用对应 matter。
5. 找不到当前线程对应 matter 时，不自动创建；只有用户明确要求“创建事项”或确认后，才新增 matter。
6. matter 内可以有 `drafts/`，但成熟内容要晋升到 `product/`，晋升后以 `product/` 为准。
7. 完成或长期暂停的 matter 从 `Active` 移到 `Paused` 或 `Archived`，必要时再移动目录。

## 单个 matter 默认结构

```text
matters/<matter-id>/
├── README.md
├── progress.md
├── notes.md
├── drafts/
└── handoff.md
```

## product/ 边界

`matters/` 记录“怎么推进”；`product/` 存放“最终产品是什么”。

不要把正式产品事实源只留在 matter 中。matter 草稿定稿后，应写入 `product/` 对应目录。

