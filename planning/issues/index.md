# StarWork Issue 跟踪

用途：维护 StarWork 的反馈、问题、体验缺口和验收阻塞。

这个文件只做轻量看板和入口，不承载完整 issue 正文。各 Agent Lane 开工、验收或发布前，先读本文件；只有需要处理某个 issue 时，再打开对应详情文件。

## 当前 Issues

| ID | 标题 | 类型 | 优先级 | 状态 | 负责人 | 来源 | 详情 | 下一步 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ISSUE-020 | Codex App 中 multiagent instruct 未使用原生线程消息而降级为人工转交 | cli / skill / adapter / workflow | P1 | closed | development lane | GitHub Issue #8 / 用户反馈 | [ISSUE-020.md](ISSUE-020.md) | 已关闭：MultiAgent v0.8 复验通过，Codex App 正常路径由 Skill 直接调用标准线程工具，CLI 只做项目事实源记录。 |
| ISSUE-019 | doctor 应检查必需 Kit Skills 并给出安全修复指引 | cli / core / kit-pack / skill | P1 | closed | development lane | GitHub Issue #7 | [ISSUE-019.md](ISSUE-019.md) | 已关闭：Workspace Doctor v0.1 复验通过，Hub Kit required skills 覆盖 `starworkSpawn` / `starworkAudit`，普通 doctor warn，strict fail。 |
| ISSUE-018 | doctor 应尊重 preserve-names Hub 的 Skill 注册表路径 | cli / core / kit-pack | P1 | closed | development lane | GitHub Issue #6 | [ISSUE-018.md](ISSUE-018.md) | 已关闭：Workspace Doctor v0.1 复验通过，preserve-names Hub 优先使用 `core_role_mapping` 中的 `skills/` 路径。 |
| ISSUE-017 | MultiAgent launch 生成的会话缺少会话控制工具 | skill / cli / adapter / workflow | P1 | closed | development lane | 用户反馈 / 测试发现 | [ISSUE-017.md](ISSUE-017.md) | 已关闭：v0.7 复验通过，Codex 场景由 starworkMultiagent 直接调用标准工具，CLI 只做状态和模板辅助。 |
| ISSUE-016 | 新手初始化体验缺少术语解释、选择背景和设计意图 | product / skill / cli / docs | P1 | closed | product-planning lane | GitHub Issue #4 / 新用户反馈 | [ISSUE-016.md](ISSUE-016.md) | 已关闭：v0.2 二次复验通过，初始化和 Init-family Skill 已按产品认知、预览安全和真实创建/更新分组落地。 |
| ISSUE-015 | MultiAgent 创建 Agent 时把使用场景写进会话名称 | cli / skill / workflow | P2 | closed | development lane | 用户反馈 / 截图 | [ISSUE-015.md](ISSUE-015.md) | 已关闭：短标题复验通过，message launch / legacy launch 均输出 `<短职责名> Agent`，Skill 使用 CLI `session_name` 调 `set_thread_title`。 |
| ISSUE-014 | MultiAgent 创建流程不应额外生成 AGENTS.starwork.md 和 README.starwork-new.md | cli / skill / workflow | P1 | closed | development lane | GitHub Issue #3 / 用户反馈 | [ISSUE-014.md](ISSUE-014.md) | 已关闭：v0.5 二次复验通过，已有项目生成 agent docs 草稿 / pending merge，不再生成根入口 sidecar 或 README 副本。 |
| ISSUE-013 | Cursor status --host 未真实报告 cursor agent status 登录态 | cli / adapter / workflow | P1 | closed | development lane | Host Adapter v0.2 产品复验 | [ISSUE-013.md](ISSUE-013.md) | 已关闭：fake Cursor CLI 的 logged in / not logged in / error 场景均通过，且不泄露 token、邮箱或 stderr。 |
| ISSUE-012 | manual_handoff_required 时不应误报已通知，必须提供可复制消息 | cli / skill / workflow | P1 | closed | development lane | 用户反馈 / 真实跨 lane 通知 | [ISSUE-012.md](ISSUE-012.md) | 已关闭：非 JSON `manual_handoff_required` 输出已直接展示完整 handoff message，并明确尚未自动送达。 |
| ISSUE-011 | StarWork Skill 不应内置宿主适配百科，运行时宿主能力应由 CLI 判断 | skill / cli / adapter / workflow | P1 | closed | development lane | 用户反馈 / 产品架构判断 | [ISSUE-011.md](ISSUE-011.md) | 已关闭：Skill 已收敛为 CLI 调用与状态解释；运行时宿主能力由 CLI 判断。 |
| ISSUE-010 | MultiAgent 创建 Agent 时应强制使用可读会话命名格式 | cli / skill / workflow | P2 | closed | development lane | 用户反馈 / 产品补充要求 | [ISSUE-010.md](ISSUE-010.md) | 已关闭：默认会话名已改为 `<职责名> Agent`，不含项目名和内部词。 |
| ISSUE-009 | 非 StarWork 目录的 MultiAgent 引导应转入 starworkInit Skill，而不是直接提示运行 CLI | skill / cli / workflow | P2 | closed | development lane | 用户反馈 / 产品验收 | [ISSUE-009.md](ISSUE-009.md) | 已关闭：CLI / Skill / A 测文档均指向 `starworkInit` Skill 接入流程。 |
| ISSUE-008 | MultiAgent `instruct` 默认等待目标会话完成导致发送方阻塞且目标 turn 可能 interrupted | cli / workflow | P1 | closed | development lane | 用户反馈 / 真实跨会话通知 | [ISSUE-008.md](ISSUE-008.md) | 已关闭：v0.4 路由已禁止低层 turn 模拟，标准投递不可用时返回 `manual_handoff_required`。 |
| ISSUE-007 | MultiAgent 创建会话后没有自动改成对应 Agent 名称 | cli / skill / workflow | P2 | closed | development lane | 用户反馈 | [ISSUE-007.md](ISSUE-007.md) | 已关闭：批量 launch 已支持自动命名；后续命名格式由 `ISSUE-010` 校准为 `<职责名> Agent`。 |
| ISSUE-006 | MultiAgent 创建团队只生成 lane，没有创建和绑定独立会话 | cli / skill / workflow | P1 | closed | development lane | 用户反馈 / 真实项目 | [ISSUE-006.md](ISSUE-006.md) | 已关闭：团队创建不再停留在 lane-only；launch v0.3 暴露逐 lane 绑定状态，未完成不误报完成。 |
| ISSUE-005 | MultiAgent 在非 StarWork 项目初始化时生成 AGENTS 副本而非合并入口 | cli / skill / workflow | P1 | closed | development lane | 用户反馈 / 真实项目 | [ISSUE-005.md](ISSUE-005.md) | 已关闭：非 StarWork 目标拒绝 multiagent launch，并由 `starworkInit` Skill 接管标准接入流程；不生成 `AGENTS.starwork-new.md`。 |
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
