# Progress

## 已完成

- 2026-05-19：确认公开分发口径为 GitHub `jennie-shawn/starwork` 与 npm `@jennie-shawn/starwork`。
- 2026-05-19：完成 `0.1.0-alpha.1` 发布验证，`npx @jennie-shawn/starwork --help` 可运行。
- 2026-05-19：验证 `npx skills add jennie-shawn/starwork --skill starworkInit -g -a codex -y` 与 `starworkSpawn` 安装可被识别。
- 2026-05-19：修正 `starworkInit` skill 采访流程：跳过未定稿场景 Pack 选择，必须询问中文/英文语言。
- 2026-05-19：将公开 README 改为中文，并新增面向 Agent 的安装指南。

## 已完成补充

- 2026-05-19：确认 npm `latest` 已更新到 `@jennie-shawn/starwork@0.1.0-alpha.3`。
- 2026-05-20：确认 npm `latest` 已更新到 `@jennie-shawn/starwork@0.1.0-alpha.7`，版本包含 `starwork upgrade`、`starworkDoctor`、`starworkUpgrade`、Kit 自带 Skill 和 Hub Skill registry 第一版。
- 2026-05-22：确认后续产品口径收敛为 `starworkDoctor` 同时负责历史模板诊断和升级蓝图生成，独立 `starworkUpgrade` 系统 Skill 从公开安装心智中移除；`starwork upgrade` CLI 保留为 blueprint 执行器。
- 2026-05-22：将产品包版本准备推进到 `0.1.0-alpha.8`，用于承接 doctor signals / reasons 增强、`starworkDoctor` golden examples 和独立升级 skill 移除。
- 2026-05-22：继续将产品包版本准备推进到 `0.1.0-alpha.9`，用于承接 `starworkDoctor` 人话诊断、Hub-like 主库识别和 Hub preserve-names upgrade 支持。
- 2026-05-22：确认 npm `latest` 已更新到 `@jennie-shawn/starwork@0.1.0-alpha.9`，GitHub `main` 为 `bb94ab8`；本机 `/opt/homebrew/bin/starwork` 已切换到 npm 包安装，全局 Codex Skills 已更新 `starworkInit`、`starworkDoctor`、`starworkMultiagent`，独立 `starworkUpgrade` 系统 Skill 仍保持移除。
- 2026-05-21：补齐 CLI 版本与帮助入口：`starwork --version` 可输出当前版本，总 help 改为面向 A 测用户的命令入口说明，并同步 README、安装指南与 roadmap。
- 2026-05-21：优化 `starwork init` 交互：用户可见命名改为单事务项目/多事务项目，默认推荐单事务项目；先问工作台类型和语言，Hub 自动选择中枢 Pack，单项目默认通用 Pack，不再询问未定稿场景 Pack。
- 2026-05-25：调研 Codex 子 Agent 功能，确认其更适合作为 Codex runtime 的临时并行 delegation；StarWork 应在 Agent Lanes / Codex adapter 层承接分工、写入边界和结果登记，不把它做成 Core 必需能力。
- 2026-05-25：研究无 CLI 学员 zip 分发方案，验证 `project + general + zh` 与 `hub + hub-management + zh` 两类 CLI 组装后的工作台可 zip、解压并通过 doctor；确认 zip 应作为 A 测低摩擦入口，不能直接打裸 Kit 目录。
- 2026-05-29：确认 npm `latest` 已更新到 `@jennie-shawn/starwork@0.1.0-alpha.16`；该版本包含 M2.8 命名体系优化、M2.10 Core Kit / Pack 边界清理、项目中心语言一致化和 Core profile 验收补丁。

## 进行中

- 收集 A 测用户对安装、`init`、`doctor`、`spawn`、`upgrade`、skills 调用和 Kit 自带 Skill 分发的反馈。

## 待处理

- 若决定发布 zip 入口，补一个 release 生成脚本和 zip 内 `开始使用.md`。
- 若 A 测反馈显示 `npx skills add` 命令过长，再评估是否需要发布独立 installer 包。
- 用真实历史模板验证 `doctor -> starworkDoctor -> upgrade` 升级链路。
- 跟进 M2.11 知识库能力是否进入下一轮 A 测包。
- A 测链路稳定后，创建内容创作者 Pack v0.1 matter。
