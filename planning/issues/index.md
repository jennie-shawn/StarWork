# StarWork Issue 跟踪

用途：维护 StarWork 的反馈、问题、体验缺口和验收阻塞。

这个文件只做轻量看板和入口，不承载完整 issue 正文。各 Agent Lane 开工、验收或发布前，先读本文件；只有需要处理某个 issue 时，再打开对应详情文件。

## 当前 Issues

| ID | 标题 | 类型 | 优先级 | 状态 | 负责人 | 来源 | 详情 | 下一步 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ISSUE-004 | Host Adapter 覆盖用户规则文件且 sidecar 状态不一致 | cli / skill | P0 | closed | development lane | Host Adapter v0.1 产品验收 | [ISSUE-004.md](ISSUE-004.md) | 已关闭：产品复验通过，用户规则不被覆盖，sidecar state/doctor 一致，upgrade/repair Skill 承接方式明确。 |
| ISSUE-003 | MultiAgent `instruct` 返回 `sent` 后目标 turn 可能 interrupted | cli | P1 | closed | development lane | MultiAgent v0.2 产品验收 | [ISSUE-003.md](ISSUE-003.md) | 已关闭：默认 instruct 真实复验返回 completed，目标 turn 为 completed。 |
| ISSUE-002 | MultiAgent v0.2 `launch` 失败后仍写入 lane binding | cli | P0 | closed | development lane | MultiAgent v0.2 产品验收 | [ISSUE-002.md](ISSUE-002.md) | 已关闭：真实 launch 可完成并绑定，失败场景已有回归测试保护。 |
| ISSUE-001 | `starwork knowledge init` 重复运行生成 `.starwork-new` 噪音文件 | cli | P1 | closed | development lane | M2.11 Knowledge Capability 验收 | [ISSUE-001.md](ISSUE-001.md) | 已关闭：重复运行不生成噪音文件，用户修改不被覆盖，健康检查通过。 |

## 使用规则

- `index.md` 只保留一行摘要、状态、负责人、详情链接和下一步。
- 完整事实、证据、处理记录和验收方式写入 `ISSUE-XXX.md`。
- 新 issue 先复制 `template.md` 到 `ISSUE-XXX.md`，再在上方表格新增一行。
- 已关闭 issue 不在 index 展开历史，只保留详情链接。
- 已转 SPEC、GitHub Issue 或开发 lane 的问题，在详情文件中保留互链。
