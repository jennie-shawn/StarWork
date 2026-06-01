# MultiAgent CLI

## v0.2 Commands

- `starwork multiagent status --host`：在 StarWork lane 状态之外，读取 Codex host observation。默认不加载 thread；需要主动加载时使用 `--load`。
- `starwork multiagent read <lane>`：读取某个 lane 绑定的 Codex thread。默认只读元信息；`--turns N` 只展示最近 N 个 turns。
- `starwork multiagent instruct <to-lane>`：先写入 shared context，再向目标 Codex thread 发送 StarWork 格式化指令。
- `starwork multiagent launch <lane>`：为已有 lane 创建 Codex thread，发送 Launch Message，并绑定回 lane。
- `starwork multiagent bind --pin`：在绑定成功后 best-effort 置顶 Codex thread；当前无稳定 pin 接口时输出 warning，不回滚 binding。

## State

Machine-readable host state is stored in:

```text
.starwork/agent-lanes/state.json
```

Human-readable lane state remains in the language-specific collaboration files:

```text
_系统/协作/agent-lanes.md
_系统/协作/shared.md
_system/collaboration/agent-lanes.md
_system/collaboration/shared.md
```

## Host Boundary

Codex host data is an observation layer. It is useful for reading thread state and delivery results, but the StarWork project files remain the collaboration source of truth.
