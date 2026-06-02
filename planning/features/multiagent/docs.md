# MultiAgent Docs

User-facing docs should explain Codex orchestration in plain terms:

- A lane can ask another lane to work by sending a formatted instruction.
- StarWork records the request in the project before or alongside host delivery.
- `status --host` and `read` show Codex host observations, not project truth.
- Codex Desktop may not refresh immediately; this does not mean delivery failed.
- `notLoaded` means a thread may exist but is not loaded by the current app-server session.
- `launch` binds the lane only after the launch message is delivered or confirmed completed by a final read.
- `instruct` defaults to waiting for the target turn to complete. If the result is `started_unverified`, the instruction may have started but is not confirmed complete; users should run `read <lane>` before trusting the handoff.

Docs that mention multiagent should include the new command family:

```bash
starwork multiagent status --host --target . --json
starwork multiagent read development --turns 5 --target . --json
starwork multiagent instruct development --from product-planning --message "..." --target . --dry-run
starwork multiagent launch development --target . --dry-run
```
