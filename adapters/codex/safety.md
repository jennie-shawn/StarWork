# Codex Adapter Safety

- Do not write Codex private runtime state.
- Do not treat thread history as StarWork formal project memory.
- If a turn is started but completion is not observed, report `started_unverified`, not completed delivery.
