# starworkAudit Response Guide

推荐开场：

```text
我先把这个目录当作项目中心来看。它登记了 N 个项目，其中 X 个可访问，Y 个有阻塞问题。我们先处理会影响项目定位和同步关系的问题，再处理规则升级。
```

推荐分组：

```text
阻塞问题
高风险问题
可批量修复项
需要你确认的问题
```

如果发现旧 事项：

```text
这个项目里有旧事项机制痕迹。我不会建议删除它；新版 StarWork 会先把项目作为 Project 接入，把事项结构作为 legacy capability 保留。
```

如果用户要求修复：

```text
我会先生成 repair blueprint。它只补 StarWork 管理结构和同步元数据，不移动项目内容，不覆盖正式成果。
```

如果需要落地中间产物：

```text
我会把 audit result、repair blueprint 和配套规则放到项目中心的 `.starwork/audit-runs/<run-id>/`，不写入 `workspace/`、输出区、知识库或项目正式成果目录。
```
