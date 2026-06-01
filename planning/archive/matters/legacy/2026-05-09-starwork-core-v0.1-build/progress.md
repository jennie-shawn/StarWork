# 推进进度

- 2026-05-09：创建 Core v0.1 构建事项，绑定当前 Codex 会话。
- 2026-05-09：确认并维护 `matters/registry.md`，将本事项登记为 active，关联当前 Codex thread ID。
- 2026-05-09：输出 Core 完整框架与文件边界草案 Markdown，并生成对应 HTML 阅读稿。
- 2026-05-09：根据用户反馈，细化 `_系统/上下文/` 与 `_系统/任务/` 的边界，建议以 `project-status.md` 替代容易混淆的 `current-projects.md` 角色名。
- 2026-05-09：补充 `project-status.md`、`decisions.md`、`current-work.md` 三个文件的维护时机与判断顺序。
- 2026-05-09：抽样查看 content-ops、产品经理工作台、GFM 等卫星项目的 `decisions.md` 使用情况，判断 `decisions.md` 有价值但易膨胀，建议降级为 Core 推荐能力并设置高影响决策写入门槛。
- 2026-05-09：用户确认加上写入门槛后 `decisions.md` 可以存在；已写入项目决策记录，并在草案中标为阶段结论。
- 2026-05-09：梳理 Core v0.1 剩余不确定性，分为“必须拍板”“给默认方案”“留给 CLI / v0.2”三档。
- 2026-05-09：根据用户提出的中文/英文、matter 偏好、单项目/多项目等差异，补充 Core 多形态维护方案：Baseline + Profile + Capability。
- 2026-05-09：根据用户反馈，补充普通用户视角解释，明确 Core 最终形态、直接使用方式、与 CLI 和 Agent 的关系。
- 2026-05-09：根据用户反馈，继续把 Core 多状态解释降维为“同一 Core + 三个开关”：语言、身份/教训来源、工作追踪模式。
- 2026-05-09：结合主库 `matter-workspace` skill 和学员模板 `references/outputs` 现状，修正 Core 多状态方案：Starter mode 与 Matter mode 并存，matter 作为增强能力并需配套 skill。
- 2026-05-09：按用户反馈清理 HTML 阅读稿，删除过程讨论和长篇推敲，只保留 Core v0.1 当前结论版。
- 2026-05-09：补充 Core 产品仓库维护结构结论：以 `baseline + profiles + capabilities + presets + kits` 管理多状态 Core，避免多套 Core 复制分叉。
- 2026-05-09：将 `product/` 初始化为独立 Git 仓库，主分支为 `main`，并添加产品仓库级 `.gitignore`。
- 2026-05-09：按规划落地第一版 `product/core/`：新增 baseline、profiles、capabilities、presets、kits 五层结构，并提供中英文 Starter/Matter 首批模板。
- 2026-05-09：根据用户反馈修正 Core 落地：多语言 profile 补充 labels/CLI prompts/kit 文案边界；多项目 capability 从 `shared-identity/shared-lessons` 改为整体 `main-repo-sync`，并新增 `skill-mount`。
- 2026-05-09：向主库发送联络单 `handoff-20260509-175508-starwork-to-digital-twin-core-starwork-core-multi-project-mode`，请求确认多项目模式真实结构；随后按用户反馈重写为“请主库详细说明当前项目管理机制”的中性请求。
- 2026-05-09：收到主库回复，确认多项目模型为 Hub + Satellite：主库维护共享机制、注册表、技能、知识和联络路由；卫星项目维护自身事实源和执行过程。已据此修正 `main-repo-sync` 能力和 `zh-shared-matter` kit。
- 2026-05-09：根据用户反馈，将 Core 协议源文档改为中文优先：`README`、baseline、capabilities、profiles/presets/kits 说明均改为中文表达，英文 profile 和英文 kit 仍保留英文用户语境。
- 2026-05-09：新增 `product/core/core-v0.1-protocol.md` 作为 Core v0.1 第一阅读入口，明确 Core 是开源协议、CLI 负责稳定生成和检查、Kit 是参考实现或 CLI 输出。
- 2026-05-11：Core v0.1 阶段暂归档；后续如发现协议问题，可重新打开或另建修订事项。当前工作重心切换到 CLI v0.1 设计。

## 下一步

- 如进入 Core v0.1 封版，复核 `product/core/core-v0.1-protocol.md` 与各 capability 文档是否一致。
- CLI 相关讨论转入 `matters/2026-05-11-starwork-cli-v0.1-design/`。
