# 跨项目协调层

这里是跨项目联络单的中央路由层。

`messages/` 记录 queued、delivered、acknowledged、closed 等状态；项目中心自己的本地收发队列在 `.starwork/handoff/`。
