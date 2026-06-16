# ISSUE-022：MultiAgent 升级后文件结构变化需要兼容已有用户

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | cli / skill / core / upgrade / workflow |
| 优先级 | P1 |
| 状态 | ready-for-development |
| 来源 | 用户反馈 / 产品风险 |
| 发现日期 | 2026-06-15 |
| 关联 GitHub Issue | 无 |
| 关联 SPEC | `product/planning/features/multiagent/specs/v0.10-upgrade-migration-compatibility.md` |
| 关联验收 | 无 |
| 负责人 | product-lead lane |

## 现象

- 用户可见表现：MultiAgent 后续版本如果调整文件结构、目录名称、状态文件位置或协作记录格式，已有用户的工作台可能无法被新版本正确读取或继续使用。
- 期望表现：MultiAgent 升级时应识别旧结构，提供兼容读取、迁移预览、受控修复和明确提示，避免让已有用户突然失去 lane、binding、request、shared output 或 worklog 记录。
- 实际表现：当前问题是前置风险登记。需要确认现有 MultiAgent 结构演进是否已有明确兼容策略，以及 CLI / Skill / doctor / upgrade 是否能覆盖已有用户。

## 证据

用户反馈原话：

```text
multiagent需要考虑升级后，如果文件结构有变化，如何对已有用户做兼容
```

相关风险场景：

```text
- 旧版本 MultiAgent 工作区已有 .starwork/agent-lanes/ 或 _系统/协作/ 记录。
- 新版本调整 lane state、binding、requests、shared outputs、worklog 或协作目录。
- 新版 starworkMultiagent / CLI 只按新结构读取，导致旧用户看不到已有团队和会话绑定。
- 自动迁移若没有预览和确认，可能覆盖用户手写的协作记录。
```

## 影响范围

- 影响的功能：`starworkMultiagent`、`starwork multiagent status/add/bind/share/request record`、`starwork doctor`、`starwork upgrade`、MultiAgent 文件结构和状态模型。
- 影响的用户：已经创建过 MultiAgent 团队、lane、会话绑定、共享输出或跨 lane request 的既有用户。
- 是否影响发布 / 升级 / A 测：影响后续版本升级可信度。文件结构一旦演进，没有兼容策略会造成已有工作台不可读、误判为空或重复初始化。
- 是否有绕行方式：用户可以手工迁移文件，但不适合普通用户，也容易破坏历史记录。

## 初步判断

这不是单个命令 bug，而是 MultiAgent 的版本化和迁移策略缺口。需要把 MultiAgent 工作区结构视为长期协议：新增字段应优先向后兼容；移动路径或改格式时必须有 schema/version、legacy detection、dry-run migration、doctor warning 和可恢复策略。

## 分流结果

- 是否转 SPEC：是，已转入 MultiAgent v0.10 upgrade compatibility / schema migration 规格。
- 是否转 GitHub：暂不转，先在本地产品问题单跟踪。
- 是否转开发 lane：待用户确认后由 product-lead lane 交 development lane 落地。
- 是否需要用户补信息：暂不需要。该问题属于明确的架构风险。

## 下一步

product-lead lane 已晋升 MultiAgent v0.10 升级兼容 SPEC。下一步待用户确认后交 development lane 实现，重点覆盖：

1. MultiAgent 文件结构和状态文件的 version / schema 标识。
2. 旧结构识别规则：能检测历史 lane registry、binding、request、shared output、worklog 位置。
3. 兼容读取策略：新版本默认不得把旧结构误判为空工作台。
4. 迁移策略：默认 dry-run，列出将创建、移动、复制、合并或保留的文件。
5. 安全边界：不覆盖用户手写记录；不删除旧文件；必要时生成 pending migration / backup / sidecar。
6. doctor 行为：发现旧结构时给出清晰状态、风险和下一步命令。
7. Skill 行为：`starworkMultiagent` 遇到旧结构时先解释升级影响，不直接继续写新结构。

## 验收方式

- 验收条件 1：给定至少一个旧版 MultiAgent fixture，新版 `status` 能识别已有 lane 和 binding，而不是显示空团队。
- 验收条件 2：`doctor` 能识别旧版 MultiAgent 结构，并给出兼容 / 迁移建议。
- 验收条件 3：升级或修复命令提供 dry-run，明确列出结构变化和将写入的文件。
- 验收条件 4：迁移不得覆盖用户手写 worklog、shared outputs 或 request 记录。
- 验收条件 5：`starworkMultiagent` Skill 在旧结构上会先提示升级兼容事项，并等待用户确认后再执行会写入的迁移或新结构初始化。
- 关闭标准：MultiAgent 兼容升级 SPEC 被接受，development lane 完成旧结构 fixture、doctor/status/upgrade 或 repair 行为，并通过自动化测试与一次手工 smoke。
