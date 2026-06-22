# Diagnosis Flow

## Step 1：只读诊断

优先执行：

```bash
starwork doctor --target <path> --json --inventory-depth all
```

如果用户没有给路径，先确认目标目录。不要默认扫描用户主目录或过大的上级目录。

读取 JSON 后先判断：

- 是否已有 `workspace`。
- 是否存在 `inventory`。
- 是否存在 `signals`。
- 是否缺少 workspace state。
- fail 是标准工作台损坏，还是历史模板缺少 state。
- 是否存在项目中心候选信号。

`doctor` 输出只当作事实和信号，不把 legacy 判断当作最终诊断。

## 宿主诊断

如果用户指定宿主，或目录里有宿主痕迹，再追加：

```bash
starwork doctor --target <path> --host <codex|claude-code|cursor|trae|all> --json
```

解释时分开说：

- StarWork 工作台结构问题。
- 宿主入口问题。
- Skill 目录问题。
- 同名 Skill 冲突。
- 宿主能力限制。

Cursor / Trae 不支持后台跨会话派活，不是 StarWork 故障；那只是需要人工交付。

## Step 2：读取少量关键文件

只读取最能解释项目性质的文件：

- `README.md`
- `AGENTS.md`
- `CLAUDE.md`
- `.cursorrules`
- `.cursor/rules/*`
- `.trae/rules/*`
- `_系统/上下文/项目状态.md`
- `_系统/上下文/当前项目.md`
- `_系统/任务/当前工作.md`
- `matters/registry.md`
- `事项/注册表.md`

文件不存在只记录缺失，不报错。

## 报告结构

诊断模式：

```text
## 诊断结论

## 我看到的事实

## 我推测的角色

## Core 逻辑贴近程度

## 缺失和风险

## 整理升级建议

## 需要你确认的问题
```
