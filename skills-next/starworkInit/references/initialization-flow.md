# Initialization Flow

## Step 1：工作台类型

问：

```text
你是想管理一个具体项目，还是建立一个能管理多个项目的项目中心？
```

- 具体项目、阶段目标、成果交付：`project`。
- 多项目登记、共享身份 / 教训 / 知识 / skills：`hub`。

默认优先建议 `project`。只有用户明确要建立项目中心时，才推荐 `hub`。

## Step 2：语言

必须问：

```text
这个工作台你想用中文结构，还是英文结构？
```

- 中文工作：`language=zh`。
- 英文协作或英文目录：`language=en`。
- 不确定：默认 `zh`。

## Step 3：目标路径

在讨论定制目录前，先确认最终写入哪里。

要求：

- 最终建议必须写出绝对路径。
- 用户未确认最终路径时，只能讨论方案或执行 dry-run，不能正式写入。
- 如果用户改了文件夹名，后续 dry-run 和正式执行都必须使用用户确认后的路径。
- 目标目录已存在且非空时，必须提示风险，并使用 `--agent-docs draft`。

## 标准 project

用户接受标准结构时：

```bash
starwork init --type project --pack general --language <zh|en> --target <workspace-path> --dry-run
starwork init --type project --pack general --language <zh|en> --target <workspace-path> --yes
starwork doctor --target <workspace-path>
```

已有非空项目改用 `--agent-docs draft`，并在写入后进入待整合草稿流程。

## 项目中心 hub

项目中心不让用户选择 Pack；使用项目中心管理结构。仍然要问语言和目标路径。

项目中心初始化建议应说明：

- 工作区类型：`hub`。
- 基础结构：项目中心。
- 场景能力：项目登记、跨项目联络、回写待审、共享身份 / 教训 / 知识 / skills。

## dry-run 复述

dry-run 后用用户语言复述：

- 目标路径。
- 是否新建目录。
- 准备新增。
- 准备更新。
- 不会改动。
- 需要用户确认。

确认后再执行 `--yes`，完成后运行或建议运行 `starwork doctor --target <path>`。
