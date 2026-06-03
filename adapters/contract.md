# StarWork Host Adapter Contract

Host Adapter is the StarWork layer that translates the workspace protocol for a concrete AI host.

It does not redefine Core, Kit, or Pack structure. It records what each host can read, generate, mount, inspect, continue, or only handle manually.

## Profile Schema

Each built-in host has:

```text
product/adapters/<host>/profile.json
product/adapters/<host>/rules.md
product/adapters/<host>/safety.md
```

`profile.json` must use:

```json
{
  "schema": "starwork.adapter.profile.v0.1",
  "host": "cursor",
  "label": "Cursor",
  "version": "0.1",
  "rules": {},
  "skills": {},
  "sessions": {},
  "memory": {},
  "commands": {},
  "safety": {}
}
```

## Capability Levels

Only these values are valid:

```text
supported | partial | manual | unsupported | unknown
```

- `supported`: stable automatic behavior.
- `partial`: available but incomplete, environment-dependent, or not stable enough to promise.
- `manual`: StarWork can generate instructions or handoff text, but the user must act.
- `unsupported`: not supported or not safe to rely on.
- `unknown`: not researched enough to make a promise.

`partial`, `manual`, and `unknown` must never be described as automatic completion.

## State

Workspace adapter state lives in:

```text
.starwork/adapters.json
```

`.starwork/workspace.json.adapters` remains a short compatibility summary only.

## Safety Rules

Adapters must not write host private transcripts, private databases, encrypted stores, or global configuration unless the user explicitly asks for a documented host-level action.

Host private history is never a StarWork source of truth.
