# Workspace Doctor

## 定位

本功能档案用于管理 `starwork doctor` 的诊断能力、健康检查口径和安全修复指引。

`doctor` 的产品目标不是“文件存在性检查器”，而是帮助用户和 Agent 判断当前目录是否真的是一个可工作的 StarWork 工作台：关键入口是否存在、升级映射是否被尊重、Kit / Pack / Capability 带来的必需能力是否落地、诊断结果是否能指导下一步修复。

## 当前状态

- 状态：v0.1 已实现并通过产品复验。
- 当前生效 SPEC：`specs/v0.1-required-kit-skills-and-preserve-names-paths.md`。

## 相关范围

- `starwork doctor` CLI。
- `.starwork/workspace.json`、`.starwork/skills.json` 和升级状态。
- Hub / Project Kit 的必需 Skill 检查。
- preserve-names upgrade 的角色路径解析。
- doctor 的 JSON 输出、非 JSON 输出和 strict 语义。

## 非目标

- 不在本功能中设计自动修复命令。
- 不让 `doctor` 静默写入、复制或挂载 Skill。
- 不把 Kit-bundled Skills 变成全局系统 Skill。
- 不改变 `starwork init` / `starwork spawn` 的创建流程，除非 doctor 检查必须同步读取其事实源。
