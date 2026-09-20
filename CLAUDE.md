# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Clashing Grounds is a web platform for creating and joining voice/text chatrooms. Monorepo with three services: `frontend` (Next.js), `crud-server` (Flask + Postgres — accounts/identity, character data), `game-server` (Flask-SocketIO + Redis — room lifecycle, presence, will host chat/voice signaling).

Full requirements, architecture decisions, and design specs: `docs/PROJECT.md`. Phased build plan with acceptance criteria and current status: `docs/ROADMAP.md`. Coding conventions (path-scoped, auto-loaded): `.claude/rules/`.

## Commands

### Frontend (`frontend/`)

- `npm run dev` — dev server on :3000
- `npm run build`, `npm run start`
- `npm run lint` (ESLint) — no separate typecheck script; use `npx tsc --noEmit`
- `npx prettier --write .` — format

### crud-server / game-server (each has its own `.venv`, Python 3.12)

- `.venv/bin/python app.py` — dev server (crud-server :5001, game-server :5002)
- `.venv/bin/ruff check --fix .` / `.venv/bin/black .` — lint/format
- `.venv/bin/pytest` — run tests (`testpaths = ["tests"]`; no tests written yet, just `tests/__init__.py`)
- crud-server migrations: `.venv/bin/alembic revision --autogenerate -m "..."` then `.venv/bin/alembic upgrade head`. `alembic/env.py` reads `DATABASE_URL` from `config.Config`; when running outside Docker, override it to the host-exposed port, e.g. `DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5433/crud .venv/bin/alembic upgrade head`.

### Full stack

- `docker compose up -d --build` — all five containers (frontend :3000, crud-server :5001, game-server :5002, postgres :5433→5432, redis :6380→6379, coturn on host network). Host ports for postgres/redis are remapped because 5432/6379 may already be taken locally (e.g. OrbStack).
- `docker compose exec crud-server python -m alembic upgrade head` — run migrations against the running container.
- **Gotcha:** adding an npm dependency doesn't reach a running frontend container on its own — the anonymous `node_modules` volume survives a plain rebuild. Run `docker compose up -d --force-recreate --renew-anon-volumes frontend` after `npm install`ing something new.

## Architecture

### Cross-service auth

`crud-server` issues JWTs (HS256) on signup/login. `game-server` verifies them locally against the same `JWT_SECRET` env var (`game-server/auth.py`: `verify_token`, `require_auth`) — it never calls back to `crud-server`. Both services must be configured with matching secrets.

### Bounded contexts

- `crud-server`: `identity` (accounts, auth, JWT issuance — implemented) and `character` (avatar customization — scaffolded only, Phase 5).
- `game-server`: `room` (room lifecycle + presence now; will also carry chat and WebRTC signaling in later phases).

### Redis schema (`game-server/room/repository.py`)

- `room:{id}` — hash: `name`, `capacity`, `host_id`, `designated_successor_id`, `created_at`
- `room:{id}:member_order` — sorted set, `user_id → join timestamp` (oldest = longest-tenured; used as the host-handoff fallback)
- `room:{id}:member_names` — hash, `user_id → username`
- `rooms:index` — set of all active room ids (browse)

### Host handoff

A host can designate a successor (`POST /rooms/<id>/designate-successor`). When the host leaves — either an explicit `POST /rooms/<id>/leave` or a Socket.IO disconnect — the designated successor is promoted if still present, else the longest-tenured remaining member (`game-server/room/service.py: leave_room`). A room with zero members is deleted from Redis immediately.

### Socket.IO is presence-only for now

The channel exists from Phase 2 purely to detect disconnects for host handoff — no chat messages flow over it yet (that's Phase 3). Client emits `join_room {token, room_id}` after a successful REST join; the server maps socket sid → `(room_id, user_id)` in an in-process dict (`game-server/room/sockets.py: _sid_presence` — not persisted, single-process only) and joins the Socket.IO room for broadcast grouping. Every state change broadcasts one `room_updated` event carrying the full room detail, rather than granular per-action events.

### Frontend auth

JWT lives in `localStorage` (`frontend/src/lib/auth.ts`). `frontend/src/hooks/useAuthUser.ts` reads it inside a `useEffect`, deliberately not a `useState` initializer — reading `localStorage` during the initial render would mismatch the server-rendered output and hydration-fail on every hard reload while logged in.

### Room view = live socket connection

`frontend/src/app/rooms/[id]/page.tsx` opens its Socket.IO connection on mount and closes it on unmount. Navigating away from a room by any means (not just the "Leave Room" button) triggers the same disconnect-based leave/host-handoff path on the backend.

## Environment

Node (via nvm) and Python 3.12 (via pyenv) are not assumed to be preinstalled — see `docs/ROADMAP.md` Phase 0 for how they were set up on the original dev machine.
