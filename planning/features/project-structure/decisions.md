# Project Structure Decisions

## Accepted

- 当前会话职责切换为当前工作目录结构优化。
- `product/` 作为 StarWork 产品事实源继续保留。
- 新增 `product/planning/` 承接功能规划、版本 SPEC、讨论、参考和验收。
- 支线功能材料按 `product/planning/features/<feature>/` 归档。
- 根目录旧 `matters/`、`参考资料/`、`输出/` 已移除，不再作为长期工作区。

## Pending

- 旧 `matters/` 中哪些内容需要继续提炼进具体功能档案。
- 历史 M2.x SPEC 的迁移顺序。
- `product/docs/index.html` 是否需要同步增加 planning 入口。
