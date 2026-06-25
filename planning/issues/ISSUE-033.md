# ISSUE-033：MultiAgent Codex Plugin Adapter MVP

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 类型 | adapter / skill / docs / workflow / release |
| 优先级 | P1 |
| 状态 | closed |
| 来源 | 用户反馈 / capability-research / product-multiagent 草案 |
| 发现日期 | 2026-06-22 |
| 关联 GitHub Issue | 无 |
| 关联 SPEC | `product/planning/features/multiagent/specs/v0.15-codex-plugin-adapter-mvp.md` |
| 关联验收 | 无 |
| 负责人 | development lane |

## 现象

- 用户可见表现：workflow next 需要分别安装 CLI 和 `skills-next`，入口不够集中；用户不容易感知这是 Codex 里的实验性 workflow next 入口。
- 期望表现：提供一个实验性的 Codex Plugin Adapter，让用户在 Codex 里能看到 `StarWork MultiAgent Workflow Next`，显式调用 bundled Skill 设计或启动 workflow。
- 实际表现：当前只有 CLI + Skill 目录安装方式，没有 plugin packaging 和 plugin smoke。

## 证据

```text
用户要求：
“OK 那你去下需求吧，我们做一个版本出来感受一下”

product-multiagent 草案：
_系统/协作/lanes/product-multiagent/workspace/drafts/2026-06-22-codex-plugin-adapter-mvp-spec.md
```

## 影响范围

- 影响的功能：workflow next 安装体验、Codex 入口、Skill references 分发、A 测体验。
- 影响的用户：Codex 用户、workflow next 内测用户。
- 是否影响发布 / 升级 / A 测：影响 workflow next A 测入口，但不阻塞 stable。
- 是否有绕行方式：继续使用 `@next` CLI + `skills-next --full-depth`。

## 初步判断

MVP 应只做 Codex plugin packaging + bundled `starworkMultiagentNext` Skill + references + smoke，不做 full StarWork plugin、MCP、hooks、connector，也不替代 CLI / Core / `.starwork` / workflow run state。

## 分流结果

- 是否转 SPEC：是，已转 `v0.15-codex-plugin-adapter-mvp.md`。
- 是否转 GitHub：待定。
- 是否转开发 lane：是。
- 是否需要用户补信息：不需要。

## 下一步

通知 development 按 v0.15 SPEC 实现 plugin adapter MVP。

## 验收方式

- 验收条件 1：存在 `product/adapters/codex-plugin/starwork-multiagent-workflow-next/` plugin package，含 `.codex-plugin/plugin.json`、bundled `starworkMultiagentNext` Skill、references、README / smoke。
- 验收条件 2：plugin 明确 next workflow 定位，不宣称自带 thread tools、不替代 CLI、不做后台自动 workflow。
- 关闭标准：local plugin install smoke 和 explicit `$starworkMultiagentNext` invocation smoke 通过。

## 复验记录

2026-06-22 product-lead 复验通过。

- plugin package 已存在：`product/adapters/codex-plugin/starwork-multiagent-workflow-next/`。
- `plugin.json` 标注 `starwork-multiagent-workflow-next` / `0.15.0-next.0`，未声明 MCP、hooks、connector 或 apps。
- bundled Skill 唯一入口为 `starworkMultiagentNext`，frontmatter 包含 next channel 和 Codex plugin adapter 标识。
- bundled references 与 `product/skills-next/starworkMultiagent/references/**` 逐文件一致。
- local plugin smoke 使用临时 `CODEX_HOME` 通过：marketplace add、available list、plugin add、installed list 均成功。
- 验证通过：`node --check product/cli/src/cli.js`、`node --check product/cli/test/init.test.js`、`git -C product diff --check`、目标测试 133/133、`npm test` 133/133。
