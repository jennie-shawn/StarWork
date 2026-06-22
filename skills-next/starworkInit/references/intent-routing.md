# Intent Routing

先判断用户是不是已经在要求“创建、接入、初始化项目工作台或项目中心”。

## 回到主入口

这些请求回到 `starwork` 主入口：

- StarWork 是什么。
- 怎么开始。
- 怎么安装。
- 我该用哪个能力。
- 只是在比较 Init / Doctor / MultiAgent / Knowledge。

## 使用 starworkInit

这些请求使用 `starworkInit`：

- 创建项目工作台。
- 接入已有项目。
- 初始化 StarWork。
- 把旧项目改造成 AI 协作工作台。
- 从 MultiAgent 回流，先补项目入口和写入边界。
- 创建项目中心或多项目中枢。

## 默认判断

- 一个具体项目、阶段目标或成果交付：`project`。
- 管理多个项目、统一身份 / 教训 / 知识 / skills：`hub`。
- 不确定时先按 `project` 解释，再问用户是否其实要管理多个项目。

每次只问一个问题。不要一次性问完类型、语言、路径、结构、知识库和宿主。
