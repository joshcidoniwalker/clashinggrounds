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
- Compose settings (origins, public API URLs, secrets, TURN, host ports) come from a root `.env` (gitignored); copy `.env.example` to start. Every variable has a default in `docker-compose.yml`, so it also runs without one.
- `docker compose exec crud-server python -m alembic upgrade head` — run migrations against the running container.
- **Gotcha:** adding an npm dependency doesn't reach a running frontend container on its own — the anonymous `node_modules` volume survives a plain rebuild. Run `docker compose up -d --force-recreate --renew-anon-volumes frontend` after `npm install`ing something new.

## Architecture

### Cross-service auth

`crud-server` issues JWTs (HS256) on signup/login. `game-server` verifies them locally against the same `JWT_SECRET` env var (`game-server/auth.py`: `verify_token`, `require_auth`) — it never calls back to `crud-server` for auth. Both services must be configured with matching secrets.

The one runtime call from `game-server` to `crud-server` is room creation: `POST /rooms` fetches `GET /room-categories` (`game-server/room/category_client.py`, `Config.CRUD_SERVER_URL`, 3s timeout) on every request, uncached, to validate the chosen category. If that fails, room creation returns 503; nothing else depends on it. `app.py` applies gevent monkey-patching first thing so this blocking call doesn't stall every other request and socket event.

### Bounded contexts

- `crud-server`: `identity` (accounts, auth, JWT issuance — implemented), `room_category` (the curated list of room categories, public `GET /room-categories`; changed only through Alembic data migrations — spec: `docs/ROOM_CATEGORIES.md`) and `character` (avatar customization — scaffolded only, Phase 6).
- `game-server`: `room` (room lifecycle + presence now; will also carry chat and WebRTC signaling in later phases).

### Redis schema (`game-server/room/repository.py`)

- `room:{id}` — hash: `name`, `category_slug`, `category_name`, `capacity`, `host_id`, `designated_successor_id`, `created_at`. The category name is captured at creation, so a later rename or retirement doesn't affect live rooms
- `room:{id}:member_order` — sorted set, `user_id → join timestamp` (oldest = longest-tenured; used as the host-handoff fallback)
- `room:{id}:member_names` — hash, `user_id → username`
- `room:{id}:seats` — hash, `user_id → seat index`, **speakers only**: having a seat is what makes someone a speaker rather than audience (spec: `docs/AUDIENCE.md`). Joiners start unseated; being added to the table claims the lowest free index atomically (Lua script `_CLAIM_SEAT`), kept until they leave the table, so seating never shuffles
- `room:{id}:muted` — set of muted `user_id`s, written by the `set_muted` socket event (speakers only; cleared when someone leaves the table)
- `room:{id}:chat` — list of JSON messages, oldest first; `RPUSH` + `LTRIM` caps it at `Config.CHAT_BUFFER_SIZE` (50)
- `rooms:index` — set of all active room ids (browse)
- `rate:chat:{user_id}` — counter with a 60s TTL set on the window's first message (fixed window, not sliding); caps chat at `Config.CHAT_RATE_LIMIT_PER_MINUTE` (20)
- `rate:room_create:{user_id}` — same fixed-window counter, capping room creation at `Config.ROOM_CREATE_RATE_LIMIT_PER_MINUTE` (5); over the cap, `POST /rooms` returns 429

### Host handoff

A host can designate a successor (`POST /rooms/<id>/designate-successor`). When the host leaves — either an explicit `POST /rooms/<id>/leave` or a Socket.IO disconnect — the designated successor is promoted if still present, else the longest-tenured remaining member (`game-server/room/service.py: leave_room`). A room with zero members is deleted from Redis immediately.

### Socket.IO channel

Carries presence (Phase 2), text chat (Phase 3), and WebRTC signaling (Phase 4). Client emits `join_room {token, room_id}` after a successful REST join; the server maps socket sid → `(room_id, user_id)` in an in-process dict (`game-server/room/sockets.py: _sid_presence` — not persisted, single-process only) and joins the Socket.IO room for broadcast grouping. Every room state change broadcasts one `room_updated` event carrying the full room detail, rather than granular per-action events.

Events: server → client `room_updated`, `room_closed`, `chat_history` (sent only to the joining sid, right after `join_room`), `chat_message`, `webrtc_signal`, `error`. Client → server `join_room`, `send_message {token, room_id, body}`, `set_muted {token, room_id, muted}`, `webrtc_signal {token, room_id, target_user_id, signal}`.

Each client event carries its own `token` rather than relying on the sid mapping, because a socket's identity is only established by `join_room` and the same pattern has to work for the pre-join case.

### WebRTC voice (Phase 4)

P2P mesh. The server only relays: `webrtc_signal` is addressed to one peer via `_presence_sids` (the reverse of `_sid_presence`, in `room/sockets.py`), checks both ends are room members, and forwards `signal` without inspecting it. `GET /rtc/ice-servers` (`rtc_bp`, authenticated) hands clients the STUN/TURN config from `Config.STUN_URL` / `TURN_URL` / `TURN_USERNAME` / `TURN_CREDENTIAL`.

`frontend/src/hooks/useVoiceChat.ts` drives the mesh off the member list in `room_updated` — no separate peer-join events. Each pair's **link** comes from both ends' roles: `duplex` between two speakers, `from:<speaker id>` (one-way) between a speaker and an audience member, none between two audience members. Both ends derive the same link, so exactly one offers: **the speaker on a one-way link, the lexicographically lower `user_id` on a duplex one**; without that rule both would offer at once and the negotiations collide. A pair whose link changes (someone joins or leaves the table) gets its connection closed and rebuilt, and members that disappear from the list get theirs closed, which is also how leaving tears a peer down.

Every signal carries its `link`. An incoming offer always replaces any existing connection with that peer (the other end may have rebuilt before this client rendered the role change); answers and candidates for a different link are dropped. Signals are handled strictly in order through a promise queue, because answering a duplex offer may first await the mic. The mic is only acquired while seated and is released on leaving the table.

Signals are `{description}` or `{candidate}` — remote ICE candidates arriving before `setRemoteDescription` are queued in `pendingCandidates` and flushed after, since `addIceCandidate` throws without a remote description.

**Dev-environment caveats:** TURN credentials are static (`coturn:changeme` in `docker-compose.yml`), not the time-limited `use-auth-secret` kind — fine locally, should change before deployment (Phase 7). On macOS, coturn's `network_mode: host` means "host" is the Docker VM, not macOS, so relay addresses it allocates are VM-internal; loopback peers are also denied by coturn's default policy, so `turnutils_uclient` against 127.0.0.1 returns 403 on channel bind even though allocation succeeds.

**Dev-server caveat:** `app.py` runs Flask-SocketIO with `debug=True`, which serves via Werkzeug and can't perform the websocket upgrade even though `gevent-websocket` is installed. Browsers silently fall back to long-polling, so this is invisible in the app, but non-browser Socket.IO clients may fail on the upgrade probe unless pinned to `transports=["polling"]`.

### Frontend auth

JWT lives in `localStorage` (`frontend/src/lib/auth.ts`). `frontend/src/hooks/useAuthUser.ts` reads it inside a `useEffect`, deliberately not a `useState` initializer — reading `localStorage` during the initial render would mismatch the server-rendered output and hydration-fail on every hard reload while logged in.

### Room view = live socket connection

The room page is a full-screen table (`components/RoomTable.tsx`, geometry in `lib/tableLayout.ts`) with no site top bar. Only speakers are drawn. Each client rotates the table so its own seat is drawn at bottom centre (an audience member uses the host's seat, or seat 0 if the host isn't seated) — `positionOfSeat` maps the server's seat index to a screen position; seat order is otherwise shared by all viewers. Every avatar goes through `components/Avatar.tsx`, the placeholder Phase 6 replaces with real characters. The speaking ring comes from `hooks/useSpeaking.ts`, which meters each audio stream (remote peers and the local mic) with a Web Audio analyser — nothing about speaking goes over the network.

`frontend/src/app/rooms/[id]/page.tsx` opens its Socket.IO connection on mount and closes it on unmount. Navigating away from a room by any means (not just the "Leave Room" button) triggers the same disconnect-based leave/host-handoff path on the backend.

## Environment

Node (via nvm) and Python 3.12 (via pyenv) are not assumed to be preinstalled — see `docs/ROADMAP.md` Phase 0 for how they were set up on the original dev machine.
