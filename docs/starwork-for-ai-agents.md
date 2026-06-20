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

## General Project Workspace Template

The default StarWork project workbench is built from two layers:

1. Project Kit: the baseline AI-readable project structure.
2. General Pack: the default business folders for references, drafts, and confirmed outputs.

The Chinese default structure looks like this:

```text
<project>/
  AGENTS.md
  README.md
  .starwork/
    workspace.json
    rules/
    handoff/
    drafts/
  .obsidian/
  .agents/
    skills/
  .claude/
    skills/
  _系统/
    上下文/
      当前项目.md
    任务/
      当前工作.md
    身份/
    教训/
    协作/
      agent-lanes.md
      shared.md
      lanes/
  参考资料/
  输出/
    草稿/
    确认成果/
```

English workspaces use the corresponding `_system/` paths and English business folders:

```text
<project>/
  AGENTS.md
  README.md
  .starwork/
  .obsidian/
  .agents/skills/
  .claude/skills/
  _system/
    context/current-project.md
    tasks/current-work.md
    identity/
    lessons/
    collaboration/
  references/
  outputs/
    drafts/
    final/
```

### Folder And File Roles

| Path | Layer | Use when | AI behavior |
| --- | --- | --- | --- |
| `AGENTS.md` | Project Kit | Any AI agent enters the project | Read first. It is the main AI entry rule file. Do not overwrite user-authored rules without a merge flow. |
| `README.md` | Project Kit | A human or AI needs a plain project overview | Keep it user-facing. Do not turn it into an internal state dump. |
| `.starwork/` | Runtime layer | CLI, doctor, adapters, migration, handoff, and generated internal state need machine-readable records | Treat as StarWork mechanism data. Do not edit by hand unless a SPEC or repair flow says so. |
| `.starwork/workspace.json` | Runtime layer | The CLI needs to know workspace type, profile, packs, adapters, and capabilities | Read for facts; write only through CLI. |
| `.starwork/rules/` | Runtime layer | Pack and profile rules need structured storage | Do not use as a user-facing knowledge base. |
| `.starwork/handoff/` | Runtime layer | StarWork needs durable handoff artifacts | Use for handoff records produced by StarWork flows, not general drafts. |
| `.starwork/drafts/` | Runtime layer | Existing projects need proposed AI entry docs before merge | Treat as pending proposals. Final AI entry docs are not active until merged. |
| `.obsidian/` | Project Kit | The workspace should open cleanly in Obsidian | Usually leave alone. |
| `.agents/skills/` | Project Kit | Codex or compatible hosts need project-mounted Skills | Only mount Skills intentionally. Do not put every global Skill here. |
| `.claude/skills/` | Project Kit | Claude-compatible hosts need project-mounted Skills | Same boundary as `.agents/skills/`. |
| `_系统/上下文/当前项目.md` | Project Kit | AI needs the current project state, purpose, and facts | Read early. Keep it as the project status fact source. |
| `_系统/任务/当前工作.md` | Project Kit | AI needs to know what is being worked on now | Read before proposing next actions. Update only when the current work state changes. |
| `_系统/身份/` | Project Kit | The project has local preferences, audience, user context, or stable background | Store project-local identity and preference notes, not global user identity unless explicitly copied. |
| `_系统/教训/` | Project Kit | The project accumulates reusable lessons or mistakes to avoid | Store reusable project lessons after they are confirmed. |
| `_系统/协作/agent-lanes.md` | MultiAgent capability | The project uses AI roles / lanes | Source of lane responsibilities, current session bindings, write scopes, worklogs, and workspaces. |
| `_系统/协作/shared.md` | MultiAgent capability | Lanes need shared outputs or cross-lane request records | Use as a collaboration ledger. Do not treat delivery as task completion. |
| `_系统/协作/lanes/<lane>/worklog.md` | MultiAgent capability | A lane needs durable progress history | Each lane updates its own worklog with decisions, outputs, verification, and next steps. |
| `_系统/协作/lanes/<lane>/workspace/` | MultiAgent capability | A lane needs process space for drafts, notes, evidence, and handoff material | Keep process work here until product-lead or the user promotes it to a formal project location. |
| `参考资料/` | General Pack | The user provides raw materials, source documents, links, screenshots, transcripts, or references | Default read-only. Do not rewrite original material unless explicitly asked. |
| `输出/草稿/` | General Pack | AI creates drafts, experiments, outlines, temporary analysis, or unconfirmed outputs | Safe place for unconfirmed AI work. Drafts are not the formal fact source. |
| `输出/确认成果/` | General Pack | The user has approved a deliverable or final output | Default confirmed-output location unless the project declares another formal source. |

### Optional Folders

| Optional path | Created by | Use when | Notes |
| --- | --- | --- | --- |
| `知识库/` | `starwork knowledge init` | The project needs stable reusable knowledge: customer background, product rules, terminology, long-term decisions, and synthesis | Do not dump raw materials here. Raw sources stay in `参考资料/`; knowledge should be curated. |
| `事项/` | Legacy / compatibility only | Old workspaces may still have matter-style records | Do not create new matter registries in current StarWork flows. |
| `_系统/主库同步/`, `.core-sync.json`, `.internal/` | Main-repo sync / hub-related flows | A workspace participates in main repository sync or hub management | Not part of the default project workbench for normal users. |

### How To Choose The Right Location

| If the content is... | Put it in... |
| --- | --- |
| Raw source material from the user or outside world | `参考资料/` |
| AI-generated but not confirmed | `输出/草稿/` or the current lane workspace |
| Confirmed final output | `输出/确认成果/` or the declared formal source |
| Current task state | `_系统/任务/当前工作.md` |
| Project facts and status | `_系统/上下文/当前项目.md` |
| Reusable project lessons | `_系统/教训/` |
| Stable knowledge synthesized from sources | `知识库/` after knowledge is enabled |
| MultiAgent lane process notes | `_系统/协作/lanes/<lane>/workspace/` |
| Cross-lane shared output index or request record | `_系统/协作/shared.md` |

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
