# StarWork MultiAgent Workflow Next Codex Plugin

This is an experimental Codex plugin adapter for StarWork MultiAgent Workflow Next.

It improves Codex-side installation, discovery, and explicit triggering for the bundled `$starworkMultiagentNext` Skill. It does not replace StarWork CLI, Core, `.starwork/`, `_系统/协作/`, lane bindings, request records, or workflow run state.

## Install CLI Next First

```bash
npm install -g @jennie-shawn/starwork@next
npx @jennie-shawn/starwork@next --version
```

The plugin does not bundle the CLI. Workflow state remains in the target StarWork workspace.

## Install The Local Plugin Adapter

For internal smoke from this repository:

```bash
codex plugin marketplace add product/adapters/codex-plugin --json
codex plugin list --available --json
codex plugin add starwork-multiagent-workflow-next --marketplace starwork-codex-plugin --json
codex plugin list --json
```

If Codex reports that the marketplace already exists, use `codex plugin list --available --json` to confirm `starwork-multiagent-workflow-next` is visible.

## Start With Explicit Invocation

Use the plugin bundled Skill by name:

```text
Use $starworkMultiagentNext to check this StarWork workspace, then help me design a MultiAgent workflow. Do not start the workflow until I confirm.
```

For an existing confirmed workflow:

```text
Use $starworkMultiagentNext to inspect the confirmed workflow definition and show the next route preflight before any delivery.
```

## Boundaries

- This is a workflow next internal test path, not the stable StarWork installation path.
- The plugin does not provide `create_thread`, `send_message_to_thread`, `read_thread`, or other Codex thread tools.
- If thread tools are unavailable, the Skill must use tool discovery and then `manual_handoff_required` when needed.
- The plugin does not run workflows in the background or continuously without user-visible route preflight.
- The plugin is not a full StarWork product plugin and does not include MCP servers, hooks, or connectors.

## Fallback Without Plugin

If you are not testing the plugin adapter, install the next Skill directory directly:

```bash
npx skills add https://github.com/jennie-shawn/StarWork/tree/main/skills-next --full-depth -g -a codex -y
```

Do not use the stable `skills/` directory to test workflow next.
