# Legacy Capability: starter-outputs v0.1

Starter Outputs 已降级为历史说明。v0.1 当前由 General Pack 提供参考资料、草稿和确认成果目录，不再把这些目录作为 Core 基础能力。

## 历史目录

```text
references/
outputs/drafts/
outputs/final/
```

## 规则

- `references/` / `参考资料/` 存放原始资料，默认只读。
- `outputs/drafts/` / `输出/草稿/` 存放等待审阅的 AI 草稿。
- `outputs/final/` / `输出/确认成果/` 存放用户确认后的成果。
- 新工作台应通过 `packs/general/` 生成这些目录。

## 适合场景

- 仅用于理解旧材料。
- 新实现以 General Pack 为准。
