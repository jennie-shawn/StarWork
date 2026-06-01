# MultiAgent Acceptance

Acceptance evidence for v0.2 currently lives in CLI tests:

- `multiagent bind --pin records host metadata without rollback when pin is unsupported`
- `multiagent status --host and read expose Codex observations`
- `multiagent instruct records shared request and sends formatted Codex instruction`
- `multiagent launch creates and binds Codex threads with launch message`

Run:

```bash
npm test
```
