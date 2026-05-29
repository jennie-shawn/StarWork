---
name: starworkKnowledge
description: 'Help users create, inspect, and maintain a local StarWork project knowledge base by calling `starwork knowledge` first, then organizing long-term project knowledge safely.'
---

# starworkKnowledge

使用这个 skill，帮助用户开启和维护“项目知识库”。

项目知识库不是资料夹。它用于让 AI 长期整理当前项目里会反复用到的稳定理解。原始资料仍放在参考资料区，草稿和成果仍按工作台规则进入输出区。

## 边界

```text
starwork knowledge = 创建和检查知识库结构
starworkKnowledge skill = 判断、采访、整理、写入知识内容
```

必须优先使用 CLI：

- 开启知识库：先运行 `starwork knowledge init --dry-run`，用户确认后再运行 `starwork knowledge init --yes`。
- 查看状态：运行 `starwork knowledge status --json`。
- 检查结构：运行 `starwork knowledge check`。
- 涉及旧 `知识/`、`knowledge/` 或定制路径：先生成 `starwork.knowledge` blueprint，再运行 `starwork knowledge apply --blueprint <file> --dry-run`，用户确认后执行。

不要绕过 CLI 手写另一套目录结构。

## 工作流程

### 1. 用户想开启知识库

先确认当前目录：

```bash
starwork knowledge status --json
```

如果还没开启，用人话解释：

```text
知识库是让 AI 长期整理稳定知识的地方，不是放原始资料的文件夹。原始资料仍然留在参考资料区。
```

然后执行：

```bash
starwork knowledge init --dry-run
```

用户确认后：

```bash
starwork knowledge init --yes
starwork knowledge check
```

### 2. 用户给了新资料

先读：

1. `schema.md`
2. `index.md`

判断资料里是否有长期价值。

- 单个稳定主题：更新或创建 `pages/`。
- 跨多个主题形成的策略、复盘、方法或判断：更新或创建 `synthesis/`。
- 重要来源：记录到 `sources/`。
- 暂时无法归类：放入 `inbox/`，并写清楚为什么待整理。

最后更新 `index.md` 和 `log.md`。

### 3. 用户询问长期知识相关问题

先读 `index.md`，再读相关 `pages/` 和 `synthesis/`。

回答用户后，如果产生了可长期复用的新判断，先告诉用户你建议沉淀到知识库哪里；用户确认后再更新。

### 4. 用户要求策略、复盘或阶段判断

优先写入或更新 `synthesis/`。

`synthesis/` 应连接多个主题页、来源和项目经验。不要把一份原始资料直接改写成 synthesis。

必要时反向更新 `pages/`，再更新 `index.md` 和 `log.md`。

### 5. 用户已有旧知识目录

如果看到旧 `知识/`、`knowledge/`、`资料库/` 或类似目录，不要直接搬迁、改名或删除。

先判断它更像：

- 原始资料区
- 旧知识草稿
- 旧版项目知识库
- 项目中心共享知识链接
- 普通历史目录

然后和用户确认，再生成 blueprint。blueprint 只能做结构性动作，不能让 CLI 生成知识正文，也不能默认提交到项目中心。

## `pages/` 和 `synthesis/`

最简单的区别：

```text
pages/      = 知识卡片
synthesis/  = 思考成果
```

`pages/` 适合：

- 用户画像
- 标题结构
- 产品模块
- 客户需求
- 竞品账号

`synthesis/` 适合：

- 30 天冷启动策略
- 阶段复盘
- 增长方法论
- 定位调整建议

## 禁止事项

- 不把原始资料整包搬进知识库。
- 不把临时草稿、命令输出、单次任务过程放进知识库。
- 不默认提交到项目中心。
- 不自动移动、删除或改名旧 `知识/` / `knowledge/`。
- 不写没有来源、没有上下文的空泛总结。
