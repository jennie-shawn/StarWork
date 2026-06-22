# Custom Blueprint

只有用户明确需要定制目录或规则时，才进入本 reference。用户不确定时优先建议标准结构。

## 友好采访

采访要像聊天，不要像配置表。

### 正式成果

问：

```text
等这个工作台用一段时间后，你最希望未来的自己回来翻到什么？
是最终交付物、发布记录、客户确认版，还是项目清单？
```

常见映射：

- 最终成果、交付物、确认版本：`输出/确认成果/` 或用户指定目录。
- 已发布内容、发布记录：`发布记录/`。
- 答不上来：默认 `输出/确认成果/`。

### 日常工作区

问：

```text
你平时会在哪里“干活”？
比如写草稿、放参考资料、记录推进过程、整理待办和阶段判断。
```

默认单项目使用 `输出/草稿/`，除非用户指定已有目录。

### 额外目录和规则

只新增未来确实会反复使用的目录。避免含义重叠、只为好看、或与通用结构已有目录重复的目录。

至少考虑两类规则：

- `rules/file-boundaries.md`：不同信息放哪里。
- `rules/workflow.md`：Agent 如何推进工作。

## 输出初始化建议

用户还在讨论时，输出初始化建议，不写入最终工作台：

```markdown
## 初始化建议

- 工作区类型：
- 基础结构：
- 语言：
- 场景能力：
- 目标目录：
- 文件夹名：
- 正式成果：
- 当前工作区：
- 额外目录：
- 需要注入的规则：

## 为什么这样选

...

## 后续执行

...
```

## Init Blueprint 最小示例

```json
{
  "schema": "starwork.init_blueprint.v0.1",
  "name": "我的项目工作台",
  "workspace_type": "project",
  "kit": "project",
  "language": "zh",
  "pack": "general",
  "paths": {
    "formal_source": "定稿/",
    "business_work_area": "工作稿/"
  },
  "directories": [
    {
      "path": "资料库/",
      "purpose": "存放用户提供的原始资料和参考信息",
      "write_policy": "read_only_by_default"
    },
    {
      "path": "工作稿/",
      "purpose": "存放 AI 生成的草稿、方案和中间版本",
      "write_policy": "writable"
    },
    {
      "path": "定稿/",
      "purpose": "存放用户确认后的最终成果",
      "write_policy": "confirm_before_write"
    }
  ],
  "agent_rules": [
    { "slot": "workspace.file_boundaries", "from": "rules/file-boundaries.md" },
    { "slot": "workspace.workflow", "from": "rules/workflow.md" }
  ]
}
```

## 执行

```bash
starwork init --target <workspace-path> --blueprint <init-blueprint.json> --dry-run
starwork init --target <workspace-path> --blueprint <init-blueprint.json> --yes
starwork doctor --target <workspace-path>
```

不要创建空的可选目录或文件。不要把 blueprint 文件夹当成最终工作台；它只是 CLI 执行输入。
