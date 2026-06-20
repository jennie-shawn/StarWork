# StarWork for AI Agents

This document helps an AI agent quickly understand what StarWork is, what it can do, and how to safely guide a user.

Use it when a user says things like:

- "What is StarWork?"
- "Help me start using StarWork."
- "Install StarWork for me."
- "Can this project use multiple AI agents?"
- "Explain StarWork to another AI."

## Short Definition

StarWork is a project workbench for AI collaboration.

It turns an ordinary project folder into a place where AI agents can reliably understand:

- what the project is;
- what is being worked on now;
- which files are safe to edit;
- where drafts, notes, evidence, and final outputs belong;
- what previous AI sessions decided or handed off;
- which AI role is responsible for which work.

StarWork is not a black-box automation tool and not a replacement for the user's project. It is a collaboration layer that helps humans and AI agents keep context, boundaries, records, and handoffs clear.

## Product Principles

| Principle | Meaning for AI agents |
| --- | --- |
| Explain before acting | Tell the user what StarWork will do before running commands or writing files. |
| Preview before write | Prefer dry-run / preview first; wait for confirmation before writing. |
| Protect user files | Do not overwrite business code, existing rules, or user-authored documents without explicit confirmation. |
| Keep facts in the project | Use StarWork files, worklogs, shared outputs, and status records instead of relying only on chat memory. |
| Separate drafts from final outputs | Drafts and process notes belong in lane workspaces or draft areas; confirmed docs belong in formal project locations. |
| Delivery is not completion | Sending a message to another AI role means the handoff was delivered, not that the target task is done. |

## Current Capability Map

| Capability | User-facing purpose | Primary entry |
| --- | --- | --- |
| Main StarWork routing | Explain StarWork, choose the right path, guide installation or first use | `starwork` Skill |
| Project initialization | Create or connect a project workbench safely | `starworkInit` Skill / `starwork init` |
| Workspace diagnosis | Check whether a workspace is healthy and what needs attention | `starworkDoctor` Skill / `starwork doctor` |
| Project knowledge base | Maintain reusable background, rules, terminology, and long-term decisions | `starworkKnowledge` Skill / `starwork knowledge` |
| MultiAgent collaboration | Create AI roles, bind sessions, share outputs, and send cross-lane instructions | `starworkMultiagent` Skill / `starwork multiagent` |
| Workflow next | Design and run early workflow handoff flows with compact packets | `skills-next/starworkMultiagent` |
| Project center | Manage multiple project workbenches from a hub workspace | Hub workspace + bundled kit skills |
| Host adapters | Prepare AI tool entry files for Codex, Claude Code, Cursor, Trae, and similar hosts | `starwork adapt` / host docs |

## Stable vs Next

| Channel | Use for | Install source |
| --- | --- | --- |
| stable / latest | Normal users, project init, doctor, knowledge, MultiAgent roles and handoffs | `skills/` |
| next | Workflow Builder / Runner internal testing and early feedback | `skills-next/` |

Stable users should not test workflow next with the stable Skill directory.

Workflow next testers should use:

```bash
npm install -g @jennie-shawn/starwork@next
npx skills add https://github.com/jennie-shawn/StarWork/tree/main/skills-next --full-depth -g -a codex -y
```

The `--full-depth` flag is required because `starworkMultiagent` uses `references/` files. If references are missing, high-risk MultiAgent or workflow actions should stop and report an incomplete Skill installation.

## How To Install For A User

If the user asks an AI to install StarWork, install only the CLI and Skills. Do not initialize a project during installation.

Stable CLI:

```bash
npm install -g @jennie-shawn/starwork@latest
starwork --version
starwork --help
```

Stable Codex Skills:

```bash
npx skills add https://github.com/jennie-shawn/StarWork/tree/main/skills --full-depth -g -a codex -y
npx skills ls -g -a codex --json
```

Expected global system Skills:

- `starwork`
- `starworkInit`
- `starworkDoctor`
- `starworkKnowledge`
- `starworkMultiagent`

Do not globally install kit or project-local Skills such as `starworkSpawn`, `starworkAudit`, `starworkKnowledgeProject`, or other capability-specific Skills unless a StarWork workspace explicitly provides them.

## First-Use Guidance

When a user says "help me use StarWork", start with a friendly explanation:

```text
StarWork helps turn this project folder into an AI-readable workbench.

I will first check the project and explain what I find.
Then I will show a preview of any files StarWork would create or update.
I will wait for your confirmation before writing anything.
```

Then decide the path:

| User situation | Recommended path |
| --- | --- |
| New empty folder | `starworkInit` can create a project workbench after preview. |
| Existing real project | `starworkInit` should preserve existing files and generate drafts for AI entry docs if needed. |
| User only wants a health check | Use `starworkDoctor`; do not repair or write by default. |
| User wants long-term reusable context | Use `starworkKnowledge`. |
| User wants multiple AI roles | Use `starworkMultiagent`, but only after the workspace is healthy. |
| User wants workflow automation | Use next workflow only if CLI and Skill are both next. |

## Safety Rules For AI Agents

Before writing:

1. Explain what will happen.
2. Prefer dry-run / preview.
3. List files that may be created or updated.
4. Wait for user confirmation.
5. Report clearly what was actually changed.

Never imply that:

- a message was delivered if no host delivery tool succeeded;
- a target AI finished a task just because a message was sent;
- a project is fully ready when AI entry docs are still pending merge;
- a stable Skill installation can test next workflow behavior.

## MultiAgent In One Minute

StarWork MultiAgent lets a project have stable AI roles called lanes.

A lane is a role, such as product lead, development, research, operations, or review. A session is the actual AI conversation currently bound to that role.

MultiAgent records:

- the role and purpose of each lane;
- the current AI session bound to that lane;
- the files that lane may edit;
- worklogs and workspace folders for that lane;
- shared outputs and cross-lane requests.

For Codex App, normal cross-session actions should use Codex standard thread tools directly:

| Action | Tool |
| --- | --- |
| create a lane session | `create_thread` |
| send an instruction | `send_message_to_thread` |
| read a session | `read_thread` / `list_threads` |
| set title | `set_thread_title` |
| pin / unpin | `set_thread_pinned` |
| archive / unarchive | `set_thread_archived` |

The CLI is the project ledger. It records facts like lane status, bindings, shared outputs, and request delivery status. It should not simulate host thread actions.

## Workflow Next In One Minute

Workflow next is an internal-testing capability for repeatable multi-agent handoff flows.

It has two modes:

| Mode | Purpose | Safety boundary |
| --- | --- | --- |
| Workflow Builder | Design a workflow definition with roles, triggers, inputs, outputs, gates, and return contracts | Only design and save drafts; do not notify agents or create instances. |
| Workflow Runner | Execute a confirmed workflow node by sending a compact packet to the target lane | Must confirm target session and real delivery; message delivery is not task completion. |

Default packets should be compact + reference based. Do not paste full workflow definitions into every agent message unless the target agent cannot access the project files or the user explicitly requires a full self-contained handoff.

## Where To Look First

When operating inside a StarWork project, read available context in this order:

```text
AGENTS.md
_系统/上下文/current-projects.md
_系统/上下文/decisions.md
_系统/上下文/product-principles.md
_系统/任务/current-work.md
_系统/协作/agent-lanes.md
_系统/协作/shared.md
product/planning/issues/index.md
```

For English workspaces, use the corresponding `_system/` paths.

## Useful Documents

| Document | Use |
| --- | --- |
| `README.md` | User-facing StarWork introduction. |
| `docs/agent-install-guide.md` | How an AI should install CLI and Skills for a user. |
| `docs/multiagent-user-guide.md` | Friendly MultiAgent user guide. |
| `docs/alpha-test-guide.md` | Alpha testing flows and acceptance checks. |
| `docs/cli-skill-registry.html` | Public CLI and Skill capability registry. |
| `planning/issues/index.md` | Current and historical product issues. |
| `planning/features/multiagent/README.md` | MultiAgent current product state. |

## Suggested Prompt For Another AI

```text
Please read `docs/starwork-for-ai-agents.md` first.

Then help me understand this StarWork project:
1. summarize what StarWork is;
2. list which StarWork capabilities are relevant to my request;
3. tell me whether you need to install CLI / Skills, initialize a workspace, run doctor, enable knowledge, or set up MultiAgent;
4. preview any file changes before writing.
```

