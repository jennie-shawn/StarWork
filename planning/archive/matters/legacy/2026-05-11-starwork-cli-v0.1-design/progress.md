# 推进进度

- Created: 2026-05-11
- Status: complete
- Next step: M2 CLI v0.1 最小闭环已完成，后续进入 Content Creator Pack v0.1 matter。

## 记录

- 2026-05-11：Core v0.1 协议入口完成并提交后，工作重心切换到 CLI v0.1。
- 2026-05-11：用户提出先一个命令一个命令研究，并指出 `init` 的交互方式应该更加友好。
- 2026-05-11：确认 `init` 的核心流程应为“选择工作区类型 -> 选择 Pack -> 预览 -> 执行”，并输出正式规格 `product/cli/init-spec.md`。
- 2026-05-12：确认 Pack 源包采用 JSON 结构声明 + Markdown 规则片段 + CLI 组装的模型，并输出正式规格 `product/packs/pack-structure-spec.md`。
- 2026-05-12：落地 `starwork init` 第一版 Node CLI，实现轻量单项目、长期单项目、多项目中枢三种工作区类型，以及 `general`、`content-creator`、`hub-management` 三个 Pack 的初始化组装。
- 2026-05-15：集中盘点 Kit 结构，确认中文 Kit 语义目录应中文化，卫星项目统一命名为 `zh-satellite-*`，并输出 `product/core/kits/kit-structure-reference.md` 作为后续事实依据。
- 2026-05-15：根据用户补充意见收敛 Hub 结构：`identity/`、`lessons/` 保留在中枢根目录；`项目/` 按中文镜像本地化；`skills/`、`.incoming/` 保持英文工具入口名。
- 2026-05-15：将 Pack 结构升级为“语言无关业务角色 + `languages/` 多语言落地配置”，并调整 CLI init 按语言读取 Pack 路径、规则、模板和 seed。
- 2026-05-15：用户确认 M1 Core v0.1 可以封版，CLI v0.1 正式进入 `starwork doctor`。
- 2026-05-15：输出 `starwork doctor` 第一版命令规格，明确其定位为工作台体检命令，v0.1 先检查 Core、Kit、Pack 和 workspace state 的一致性，不做自动修复。
- 2026-05-15：落地 `starwork doctor` 第一版实现，支持默认人类可读输出、`--json` 输出和失败退出码，并补充 7 个 doctor 测试。
- 2026-05-15：落地 `starwork adapt` 和 `starwork pack install` 第一版，实现 Agent 适配入口生成 / 登记、已有工作台补装 Pack、workspace state 更新和安全写入；CLI 测试扩展到 17 个，全部通过。M2 CLI v0.1 最小闭环完成。
