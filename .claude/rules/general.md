# General conventions

Applies across the whole repo (frontend, crud-server, game-server).

- Keep functions/methods small and single-purpose; prefer decomposing over long functions.
- No comments except to explain a non-obvious "why" (a hidden constraint, a workaround, a subtle invariant). Never explain what code does when a well-named identifier already makes that clear.
- Explicit error handling only at system boundaries (user input, external APIs, other services). Don't add try/except, validation, or fallbacks around internal calls that can't actually fail.
- Don't add abstractions, config flags, or generalized solutions beyond what the current task requires.

See `docs/PROJECT.md` for full requirements, architecture, and design specs.
