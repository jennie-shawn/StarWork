# Smoke Checklist

## File And Manifest Smoke

```bash
node --check product/cli/test/init.test.js
node --test product/cli/test/init.test.js --test-name-pattern "codex plugin|plugin adapter|workflow next|multiagent"
```

Expected:

- `plugin.json` parses as JSON.
- No `mcpServers`, `apps`, or hooks are declared.
- Bundled Skill is named `starworkMultiagentNext`.
- Bundled references include Workflow Builder, Workflow Runner, Workflow Run State, packet budget, delivery guarantee, and session tools.

## Local Plugin Smoke

From repository root:

```bash
codex plugin marketplace add product/adapters/codex-plugin --json
codex plugin list --available --json
codex plugin add starwork-multiagent-workflow-next --marketplace starwork-codex-plugin --json
codex plugin list --json
```

If the environment already has a marketplace with the same local path or plugin name, record the existing state instead of forcing a destructive cleanup.

## Explicit Invocation Smoke

Open Codex in a StarWork workspace and use:

```text
Use $starworkMultiagentNext to check this StarWork workspace, then help me design a MultiAgent workflow. Do not start the workflow until I confirm.
```

Pass criteria:

- Codex selects the bundled `starworkMultiagentNext` Skill.
- The Skill requires StarWork CLI `@next`.
- The Skill does not claim to provide thread tools itself.
- The Skill stops or enters `manual_handoff_required` when delivery tools are unavailable.
