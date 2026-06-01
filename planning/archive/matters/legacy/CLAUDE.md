# matters/ 事项管理规则

本目录是 StarWork 的事项推进过程工作区。

开始处理事项时：

1. 读取 `matters/registry.md`。
2. 读取当前会话的 `CODEX_THREAD_ID`，如可用。
3. 如果 registry 中有对应线程，打开对应 matter。
4. 如果没有对应 matter，不自动创建；先继续使用用户指定目录，或询问是否创建新 matter。

单个 matter 默认包含：

- `README.md`
- `progress.md`
- `notes.md`
- `drafts/`
- `handoff.md`

成熟内容从 `drafts/` 晋升到 `product/`，晋升后以 `product/` 为准。

