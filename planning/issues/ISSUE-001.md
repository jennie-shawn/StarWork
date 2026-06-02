# ISSUE-001：`starwork knowledge init` 重复运行生成 `.starwork-new` 噪音文件

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | cli |
| 优先级 | P1 |
| 状态 | closed |
| 来源 | M2.11 Knowledge Capability 产品验收 |
| 发现日期 | 2026-06-01 |
| 关联 SPEC | `product/planning/features/knowledge-base/specs/v0.1.md` |
| 关联验收 | `_系统/协作/lanes/product-planning/workspace/m2.11-knowledge-acceptance-report.md` |
| 负责人 | optimization lane |

## 现象

- 用户可见表现：在同一个项目里重复运行 `starwork knowledge init` 后，会出现 `.starwork-new` 结尾的重复文件。
- 期望表现：重复开启知识库能力时应保持安静；已有标准模板和项目内 Skill 文件不应重复生成。
- 实际表现：第二次运行会在知识库目录和项目内 Skill 目录生成重复文件。

## 复现方式

```bash
starwork init --type project --language zh --pack general --target <project> --yes
starwork knowledge init --target <project> --yes
starwork knowledge init --target <project> --yes
find <project>/知识库 -maxdepth 2 -type f
find <project>/.agents/skills/starworkKnowledgeProject -type f
```

重复运行后出现的文件包括：

```text
知识库/README.starwork-new.md
知识库/index.starwork-new.md
知识库/log.starwork-new.md
知识库/schema.starwork-new.md
.agents/skills/starworkKnowledgeProject/SKILL.starwork-new.md
.agents/skills/starworkKnowledgeProject/agents/openai.starwork-new.yaml
```

## 处理结果

- `knowledge init` 的标准知识库模板改为幂等写入：目标文件已存在且非空时跳过，空文件才补写。
- `starworkKnowledgeProject` 项目内 Skill 改为幂等复制：已有文件跳过，只补缺失文件。
- 增加回归测试，覆盖重复运行、用户修改 `schema.md` 不被覆盖、无 `.starwork-new` 噪音文件和 `knowledge check --json` 健康状态。

## 复验记录

2026-06-01 再次验收通过：

- `npm test` 通过。
- 临时中文项目中连续运行两次 `starwork knowledge init --yes` 后，`*.starwork-new*` 文件数量为 0。
- 手工改写 `知识库/schema.md` 为自定义内容后再次运行 init，文件内容保持不变。
- `starwork knowledge check --json` 返回 `ok: true`，且 `starworkKnowledgeProject` 已挂载到 Codex 和 Claude 两侧。

## 关闭结论

`ISSUE-001` 已关闭。
