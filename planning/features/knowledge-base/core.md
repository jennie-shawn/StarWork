# Knowledge Base Core Impact

## Capability

知识库应作为可选 Capability，而不是 Project Kit 默认目录。

建议 Core 位置：

```text
product/core/capabilities/knowledge/
```

## Project Kit

Project Kit 不应默认包含：

- `知识库/`
- `knowledge-base/`
- 旧 `知识/`
- 旧 `knowledge/`

## Workspace State

开启后可在 `.starwork/workspace.json` 声明：

```json
{
  "capabilities": {
    "knowledge": {
      "enabled": true,
      "root": "知识库",
      "language": "zh",
      "mode": "local",
      "version": "0.1",
      "project_skill_ids": ["starworkKnowledgeProject"]
    }
  }
}
```
