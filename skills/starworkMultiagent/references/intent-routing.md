# Intent Routing

优先把用户话语归到一个入口，不要一开始讲 CLI 子命令。

| 用户意图 | Skill 解释 | 主流程 |
|---|---|---|
| 把当前会话创建为常用智能体，负责 X | 登记当前会话为稳定职责位 | 先做前置检查，再按 `session-tools.md` 和 `context-and-compatibility.md` 绑定 |
| 初始化多 Agent 协作层 | 创建 Agent Lanes 协议文件 | 先说明这是写入协作记录，确认后维护项目事实源 |
| 增加一个负责 X 的 Agent / lane | 新增职责位，暂不一定绑定会话 | 先预览职责、范围、交接方式 |
| 把当前工具会话绑定到 X | 将真实 session 绑定到已有 lane | 先确认当前会话 ID，再记录 binding |
| 这个会话不再负责 X | 释放 lane 当前绑定 | 先提醒更新 worklog，再释放 |
| 看看现在有哪些 Agent 分工 | 读取 StarWork 协作状态 | 只读 status，汇总岗位和绑定 |
| 这个输出给其他 Agent 看 | 登记共享输出索引 | 读取 `lane-workspace-output-promotion.md` |
| 让开发 lane 开始开发 | 组装指令消息并投递到目标会话 | 读取 `delivery-guarantee.md`、`message-templates.md`、`session-tools.md` |
| 看看开发 lane 做到哪了 | 读取绑定，再观察目标会话和 worklog | 读取 `session-tools.md`、`lane-workspace-output-promotion.md` |
| 创建产品、开发、验收三个智能体 | 设计 lanes 后创建并绑定可工作的独立会话 | 读取 `team-onboarding.md` |
| 设计或启动 workflow | next 内测能力 | stable 只说明需要 next Skill 或等待正式发布 |

含混时先追问，不要擅自执行写入。例如“帮我做一个产品迭代循环”应先问：你是想先设计流程，还是现在按已有流程开始执行？
