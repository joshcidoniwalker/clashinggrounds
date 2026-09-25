---
paths:
  - "crud-server/**/*.py"
  - "game-server/**/*.py"
---

# Python conventions

- Full type hints on all functions and methods.
- Pydantic v2 idioms (`model_validate`, `ConfigDict`, etc.) at API/serialization boundaries only.
- Use plain dataclasses or attrs for internal domain entities rather than Pydantic — Pydantic stays at the boundary, domain objects stay framework-agnostic (fits the light-DDD split).
- Format with `black`, lint with `ruff`.
- Test with `pytest`; unit tests only for now, no integration suite yet.

## Code architecture — light DDD

Organize each service by bounded context/domain, not by technical layer (no top-level `models/`, `routes/`, `services/`). Use entities and repositories where they add clarity; skip heavier tactical patterns (aggregates, domain events, CQRS) unless a specific problem calls for them.

- **crud-server** contexts: `identity` (accounts, auth, JWT issuance), `room_category` (curated room categories), `character` (avatar customization, persisted character data).
- **game-server** context: `room` (room lifecycle, presence, text chat, WebRTC signaling — one context for now, tightly coupled around a room's lifetime).
- Shape per context: `<context>/{models.py, repository.py, service.py, routes.py}`.
