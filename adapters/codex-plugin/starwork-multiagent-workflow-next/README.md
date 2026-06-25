# StarWork MultiAgent Workflow Next Codex Plugin

Experimental Codex plugin adapter for StarWork MultiAgent Workflow Next.

This package is a Codex-side installation and entry layer. It bundles the `starworkMultiagentNext` Skill and its references so Codex users can explicitly start workflow-next conversations without manually installing the `skills-next` directory.

## What This Plugin Does

- Adds a Codex plugin entry named `StarWork MultiAgent Workflow Next`.
- Bundles the next Skill at `skills/starworkMultiagentNext/`.
- Bundles all workflow references required for Builder, Runner, packet budget, delivery guarantee, Workflow Run State, and self-delivery guard.
- Encourages explicit invocation with `$starworkMultiagentNext`.

## What It Does Not Do

- It does not replace the StarWork CLI.
- It does not replace StarWork Core, `.starwork/`, `_系统/协作/`, lane registry, request records, or workflow run state.
- It does not include MCP servers, hooks, connectors, or a full StarWork product plugin.
- It does not provide Codex thread tools such as `create_thread`, `send_message_to_thread`, or `read_thread`.
- It does not run workflow steps in the background or continuously without user-visible routing.

If Codex thread tools are unavailable, the bundled Skill must follow StarWork delivery rules and enter `manual_handoff_required` with a copyable handoff message.

## Required CLI

Install StarWork CLI next separately:

```bash
npm install -g @jennie-shawn/starwork@next
npx @jennie-shawn/starwork@next --version
```

The plugin improves Codex-side Skill / references installation. The CLI remains responsible for project facts and workflow state:

```bash
starwork multiagent workflow start --definition <path> --entry-node <node> --actor-lane <lane> --target <path> --json --yes
starwork multiagent workflow status --run <run-id> --target <path> --json
starwork multiagent workflow route --run <run-id> --event <event-json-or-key> --target <path> --json
starwork multiagent workflow event record --run <run-id> --type <type> --status <status> --target <path> --json --yes
```

## Local Smoke

From the repository root:

```bash
codex plugin marketplace add product/adapters/codex-plugin --json
codex plugin list --available --json
codex plugin add starwork-multiagent-workflow-next --marketplace starwork-codex-plugin --json
codex plugin list --json
```

Then start a Codex session in a StarWork workspace and explicitly invoke:

```text
Use $starworkMultiagentNext to check this StarWork workspace, then help me design a MultiAgent workflow. Do not start the workflow until I confirm.
```

For Runner smoke:

```text
Use $starworkMultiagentNext to inspect the confirmed workflow definition and show the next route preflight before any delivery.
```

Expected behavior:

- Builder only designs, interviews, previews, and saves a draft.
- Runner reads confirmed definition plus `.starwork/workflows/runs/<run-id>.json`.
- Runner displays run id, current step, from lane, target lane, target session, route source, and delivery mode.
- Self-delivery risk is blocked as `blocked_self_delivery`.
- Missing thread tools result in `manual_handoff_required`, not a false delivery claim.

## Bundled Skill Source

The bundled Skill is synced from:

```text
product/skills-next/starworkMultiagent/
```

Intentional plugin wrapper differences:

- Skill name is `starworkMultiagentNext`.
- The default prompt recommends explicit `$starworkMultiagentNext` invocation.
- `agents/openai.yaml` disables implicit invocation for MVP conflict control.

References should stay byte-for-byte aligned with `product/skills-next/starworkMultiagent/references/` unless a future SPEC explicitly authorizes a plugin-specific fork.
