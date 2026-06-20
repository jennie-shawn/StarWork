# ISSUE-026：starworkMultiagent Skill 过长导致读取可靠性和维护风险

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | skill / docs / product |
| 优先级 | P1 |
| 状态 | closed |
| 来源 | 用户反馈 / product-lead 复核 / product-multiagent 设计 |
| 发现日期 | 2026-06-18 |
| 关联 GitHub Issue | 无 |
| 关联 SPEC | `product/planning/features/multiagent/specs/v0.13-starworkMultiagent-skill-decomposition.md` |
| 关联验收 | `ISSUE-020` / `ISSUE-024` / `ISSUE-025` |
| 负责人 | development lane |

## 现象

- 用户可见表现：Codex 读取 `starworkMultiagent` Skill 时需要分段读取，并提示“skill 文件还没读完，我继续读后半段”。
- 期望表现：主 Skill 足够短，Agent 默认能稳定读完所有硬安全规则；低频流程按场景读取 references。
- 实际表现：stable / next `starworkMultiagent/SKILL.md` 已超过 500 / 650 行，普通 MultiAgent 场景也会加载大量 workflow、host、template、onboarding 细节。

## 证据

用户反馈截图显示：

```text
skill 文件还没读完，我继续读后半段。然后只做只读检查，不会直接把这个项目改成 StarWork 或写入协作 lane。
```

product-lead 复核：

```text
stable product/skills/starworkMultiagent/SKILL.md：约 528 行
next product/skills-next/starworkMultiagent/SKILL.md：约 656 行
本地已安装 next Skill：约 640 行
```

product-multiagent 草案：

```text
_系统/协作/lanes/product-multiagent/workspace/drafts/2026-06-18-starworkMultiagent-skill-decomposition-spec.md
```

## 影响范围

- 影响的功能：`starworkMultiagent`、MultiAgent 团队创建、跨 lane 投递、workflow builder / runner、宿主会话控制。
- 影响的用户：使用 StarWork MultiAgent 的所有 Codex / Skill 用户，next workflow tester 受影响更明显。
- 是否影响发布 / 升级 / A 测：影响 next workflow 和 MultiAgent 的可靠性；不是功能不可用，但会增加漏读和误执行风险。
- 是否有绕行方式：Agent 可以继续分段读完整 Skill，但这依赖执行纪律，不适合作为长期产品机制。

## 初步判断

分段读取本身不必然出错，但主 Skill 已经承担过多长流程。继续叠加 host adapter、workflow、release hygiene 规则，会进一步扩大漏读、token 浪费和 stable / next 漂移风险。

应将 `starworkMultiagent` 改为“短主 Skill + references 分场景加载”：

- 主 Skill 保留当前会话 ID、真实投递、工具发现、状态写入顺序、CLI 账本边界、成功口径和前置保护。
- 团队创建、消息模板、宿主工具表、workflow builder / runner、compatibility upgrade 等长流程迁入 references。
- stable / next 用测试防止 hard rules 漂移。

## 分流结果

- 是否转 SPEC：是，转 `v0.13-starworkMultiagent-skill-decomposition.md`。
- 是否转 GitHub：暂不转，先本地 issue 跟踪。
- 是否转开发 lane：是。
- 是否需要用户补信息：不需要，已有截图与当前 Skill 行数证据。

## 下一步

development lane 按 v0.13 SPEC 实现：

1. 缩短 stable / next 主 `SKILL.md`。
2. 新增 stable / next `references/`。
3. 将长流程迁出，保留 hard safety rules。
4. 补 references 路径、主 Skill 长度、stable / next 差异和禁止项扫描测试。
5. 更新安装说明，明确 references 必须随 Skill 完整安装。

## 处理记录

- 2026-06-18：product-lead 根据用户截图判断 `starworkMultiagent` 过长存在可靠性风险，通知 product-multiagent 先设计。
- 2026-06-18：product-multiagent 输出 Skill decomposition 草案。
- 2026-06-18：product-lead 复核通过，晋升为 v0.13 SPEC，并转 development 实现。
- 2026-06-18：product-lead 复验 development 实现，主 Skill 行数、references 结构、hard safety rules、stable / next 差异和 v0.8 禁止项初验通过；目标回归测试 123/123 通过。阻塞项：npm registry 已有 `next` dist-tag，但 `product/docs/alpha-test-guide.md` 和 `product/docs/multiagent-user-guide.md` 仍写“当前 npm 尚未发布 next dist-tag”，并让 workflow next tester 使用 `@latest` CLI；`product/cli/test/init.test.js` 还断言该旧口径。该问题会误导内测用户安装 stable/latest CLI 测 workflow，需打回 development 小修。
- 2026-06-18：development 完成复验阻塞小修。`alpha-test-guide.md` 与 `multiagent-user-guide.md` 已改为 workflow next 使用 `@jennie-shawn/starwork@next` + `skills-next --full-depth`，删除“尚未发布 next dist-tag / 用 @latest 获取 CLI”旧口径；测试改为禁止旧口径回归并要求 next 安装命令。product-lead 二次复验通过：`node --check product/cli/src/cli.js`、`node --check product/cli/test/init.test.js`、`git -C product diff --check`、目标回归测试 123/123、`npm test` 123/123。ISSUE-026 关闭，v0.13 SPEC 标记 accepted。

## 复验阻塞

2026-06-18 product-lead 复验发现：

```json
{
  "alpha": "0.1.0-alpha.0",
  "latest": "0.1.0-alpha.25",
  "next": "0.1.0-alpha.25"
}
```

因此 workflow next 内测文档不得继续说 `next` dist-tag 尚未发布，也不得要求 tester 用 `@latest` CLI 作为 workflow next CLI 来源。

需要修复：

1. `product/docs/alpha-test-guide.md` 的 workflow next 安装命令改为 `npm install -g @jennie-shawn/starwork@next`，版本检查改为 `npx @jennie-shawn/starwork@next --version` 或等价 next 口径。
2. `product/docs/multiagent-user-guide.md` 删除“尚未发布 next dist-tag”旧说明，改为 next CLI + `skills-next` 目录组合。
3. 保留普通用户 stable/latest 安装命令，明确 stable Skill 目录不能用于测试 workflow next。
4. `product/cli/test/init.test.js` 删除对“尚未发布 next dist-tag”的正向断言，改为断言文档不含该旧口径，并断言 workflow next 文档包含 `@jennie-shawn/starwork@next`。
5. 修复后重新运行 `node --check product/cli/src/cli.js`、`node --check product/cli/test/init.test.js`、`git -C product diff --check`、目标回归测试和 `npm test`。

## 验收方式

- 验收条件 1：stable 主 Skill 不超过 240 行，next 主 Skill 不超过 260 行；任何情况下不得超过 280 行。
- 验收条件 2：主 Skill 保留当前会话 ID、必须真实投递、工具发现、manual handoff、request record 顺序、CLI 账本边界、成功口径等 hard rules。
- 验收条件 3：团队创建、消息模板、宿主工具表、workflow builder / runner 等长流程迁入 references。
- 验收条件 4：主 Skill 中列出的 references 都真实存在；references 缺失时高风险动作必须停止。
- 验收条件 5：stable 不包含 workflow builder / runner 可执行流程；next 包含 workflow references 和 next channel 提醒。
- 验收条件 6：v0.8 禁止项未恢复，v0.12 投递保证未丢失。
- 关闭标准：已满足。v0.13 SPEC 全部验收通过，目标测试和 `npm test` 通过。
