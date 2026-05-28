# StarWork 产品方向

## 产品定位

StarWork 是面向 Codex、Claude Code、Cursor、Trae、Claw Code 等 Agent 的 AI 工作系统套件，用于支持用户和 Agent 进行长期、连续、可审计的真实工作协作。

StarWork 不是完整自研 Agent Runtime，也不是单纯开源文件夹模板。它的产品价值在于工作系统层：让 Agent 能稳定理解、继续、记录、复盘和改进用户的长期工作。

## 产品四层

StarWork 拆成四层：

1. StarWork Core：开源 AI 工作区协议
2. StarWork CLI：安装、检查、适配和 Pack 管理工具
3. StarWork Packs：面向岗位和场景的工作流包
4. StarWork Course：方法论课程与陪跑服务

四层分工：

- Core 负责可信度、标准和传播。
- CLI 负责产品感、安装体验和降低门槛。
- Packs 负责具体场景解决方案和商业化。
- Course 负责教育、转化、高客单服务和方法论表达。

Course 层继续由 `珍妮丁丁GFM` 承载。本项目承载产品本体：Core、CLI、Packs、Skills、Adapters、schemas、examples、正式产品文档和发布材料。

## 方向约束

- 不复用旧本地 Runtime spike 作为产品基础，它只作为历史参考。
- 不把自研完整 Agent Runtime 作为 v0.1 主线。
- 不把 Claude Code SDK、Claude Agent SDK 或海外服务作为默认产品依赖。
- 第一阶段不做 OpenClaw 式消息平台 gateway。
- 不把 StarWork 讲成“文件夹模板”；文件结构只是 Core 协议的可见载体。
- 不把课程材料直接搬进本产品项目，除非已经晋升为产品事实、正式文档、示例或 Pack 资产。

## 首个产品闭环

第一阶段产品闭环是：

```text
Core v0.1 协议
        ↓
CLI v0.1 安装与适配
        ↓
公开 A 测安装验证
        ↓
内容创作者 Pack v0.1 与 Demo 工作区
```

目标是先证明：普通用户可以安装 StarWork，创建单项目或多项目工作台，并让 Agent 清楚知道项目状态、当前工作、成果、过程材料和 Skill 分发分别如何维护。安装链路稳定后，再用内容创作者 Pack 验证具体场景闭环。

## v0.1 当前收敛

截至 2026-05-20，Core 被定义为开源 AI 工作区协议；Kit 是协议的参考落地结构；CLI 负责稳定生成、检查、升级、适配、安装 Pack 和分发 Kit 自带 Skill；Skill 负责帮助 Agent 生成配置、诊断目录、生成 blueprint 和调用工具；Pack 负责场景定制。

当前已经形成：

- Core v0.1 协议入口与五类 Kit 结构。
- `starwork init`、`starwork spawn`、`starwork doctor`、`starwork upgrade`、`starwork adapt`、`starwork pack install` 第一版。
- `starwork spawn --blueprint` 第一版，可按工作台定制单从项目中心创建定制化项目工作台。
- `starworkSpawn` skill 第一版，用于帮助 Agent 设计 Spawn Blueprint。
- `starworkInit` skill 第一版，用于帮助 Agent 采访用户并生成初始化建议。
- `starworkDoctor` 第一版，用于把历史模板诊断和升级蓝图生成交给 Agent 判断，再由 CLI 保守执行。
- Skill 管理与分发第一版：系统 Skill、工作台模板自带 Skill、项目中心托管 Skill、Pack 自带 Skill 和项目本地 Skill 已有基本边界。
- 公开 A 测分发入口：GitHub `jennie-shawn/StarWork` 与 npm `@jennie-shawn/starwork`。
- Pack 源包结构：语言无关业务角色 + `languages/` 多语言落地配置。

下一步重点不是继续扩张 Core，而是先验证 CLI 与 Skills 能否被 A 测用户顺利安装和调用，并打磨 `init`、`doctor`、`upgrade` 和 Skill 分发体验；安装链路稳定后，再进入内容创作者 Pack 的场景验证。
