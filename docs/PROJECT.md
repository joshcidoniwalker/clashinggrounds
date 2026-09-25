# Clashing Grounds

## Overview
Web platform for creating and joining chatrooms with real-time voice and text chat. Users have persistent accounts; rooms themselves are ephemeral — a room exists only while its designated host is present.

## Goals
- Users sign up, log in, and keep a persistent identity across sessions
- Users can create a room (becoming its host) and browse/join existing rooms
- Rooms support real-time text chat and peer-to-peer voice chat
- A room disappears when its host leaves — no persistence beyond that lifetime
- Each user creates and customizes a persistent character (avatar), shown seated at a table alongside other members' characters while in a room

## Non-goals (for now)
- Video chat
- Persistent chat history or room history
- Native mobile apps
- Moderation tooling beyond basic host controls

## Tech Stack
- **Frontend:** Next.js
- **CRUD/Auth server:** Python 3.12+, Flask (Blueprints), Pydantic, Alembic, PostgreSQL — owns accounts and persisted data
- **Game server:** Python 3.12+, Flask (Blueprints) + Flask-SocketIO (eventlet/gevent), Redis — owns rooms, presence, text chat, WebRTC signaling
- **Voice:** WebRTC, peer-to-peer; signaling relayed over the game server's WebSocket layer; self-hosted coturn as TURN fallback for NAT traversal
- **Inter-service auth:** CRUD server issues a signed JWT on login; game server verifies the JWT signature locally (no callback to the CRUD server)

## Architecture
Two independently deployable backend services, plus the frontend:

1. **CRUD server** (Flask + Postgres) — accounts, auth, JWT issuance, character data (one persisted character per user), and the curated list of room categories. No knowledge of rooms or voice.
2. **Game server** (Flask + Flask-SocketIO + Redis) — room lifecycle, presence, text chat, WebRTC signaling. Exposes REST endpoints for room browse/create/join/leave, plus a WebSocket channel for realtime events (chat messages, signaling, presence). Verifies JWTs issued by the CRUD server independently. Has no knowledge of character appearance data — it only broadcasts member user IDs.

Next.js frontend calls the CRUD server (REST) for auth/account/character data, and the game server (REST + WebSocket) for everything room-related. When rendering a room, the frontend gets the member user IDs from the game server and fetches their character appearance data directly from the CRUD server.

**Room lifecycle:** a room exists only while its host is connected. All room state (membership, host, in-room chat) lives in Redis — nothing room-related is written to Postgres.

## Design specs / Core mechanics

**Room creation & host designation**
- The creator becomes the room's host and sets: room name, category (one of a curated list, Just Chatting preselected; fixed once created — see `docs/ROOM_CATEGORIES.md`), and capacity (configurable per room, up to a hard ceiling of **12** members — P2P mesh connection count grows as N·(N-1)/2, so 12 means up to 66 simultaneous connections at full capacity). All rooms are public-listed for MVP — see Room browsing.

**Host disconnect & handoff**
- A host may designate a successor (explicit host queue) at any time while hosting.
- On host disconnect: promote the designated successor if one is set; otherwise promote the longest-tenured remaining member.
- If no members remain when the host disconnects, the room is torn down immediately and its Redis state is deleted.

**Room browsing**
- All rooms are public-listed for MVP — anyone, logged in or not, can see the open rooms (name, category, and member count only, never who's in them), and any logged-in user can join one up to its capacity. The public listing is what the landing page's "Explore rooms" grid shows. Both it and the logged-in room browser can be filtered by category. No invite-only rooms yet (revisit later if needed).

**Text chat: format & delivery**
- Messages are JSON events over the Socket.IO channel: `{room_id, sender_id, body, sent_at}`.
- Redis keeps a short rolling buffer of the last **50 messages** per room so a client that reconnects within the room's lifetime can catch up.
- Nothing is persisted beyond the room's lifetime — when the room is torn down, its chat buffer is deleted along with the rest of its Redis state.

**WebRTC signaling flow**
- Mesh topology: each member connects directly (P2P) to every other member in the room.
- Offer/answer SDP and ICE candidates are relayed peer-to-peer through the game server's Socket.IO channel (the server never touches media, only signaling messages).
- coturn (self-hosted) is the TURN fallback when direct P2P connection fails (symmetric NAT, restrictive firewalls, etc.).

**Rate limiting & abuse prevention**
- Basic per-user limits enforced in the game server via Redis counters: a cap on rooms created per user per minute, and a cap on chat messages sent per user per minute. Exact thresholds TBD once there's real usage data to tune against.

**Character creation & rendering**
- Each user has exactly one persisted character, owned by the CRUD server/Postgres. Creating a character is a required step of signup — an account isn't complete until a character is designed (no skip, no default-assigned character). Editable anytime afterward from settings.
- Customization is preset-based for MVP: the user picks one option per slot from a fixed set of choices per slot — no freeform color/shape editing. Slots: hair, eyes, head shape, clothes, skin tone, shoes, accessories. Exact preset count per slot is determined by what the chosen asset pack provides.
- Rendered as 2D layered sprites: each slot is an image layer, composited together (CSS/Canvas) into the final character.
- Art source: **undecided** — originally the Kenney Modular Character Pack, but that's full-body and front-facing, which doesn't suit the top-down room table (see Room table view). The chosen pack needs top-down, bust, or portrait art that reads well inside a circular seat. Several packs may be trialled in Phase 6.
- In a room, each member's character is rendered seated at a shared table alongside the other members present.
- The game server never handles character data — it only broadcasts which user IDs are in a room; each client fetches those users' character data from the CRUD server to render them.
- **Batch fetch:** the CRUD server exposes `GET /characters?user_ids=1,2,3` returning an array of character data for the requested users in one call, so rendering an N-member room doesn't require N separate requests per client.

**Room table view**
- Top-down, pill-shaped table (straight sides, rounded ends) sized to roughly 80% of the screen width and 56% of its height, with seats sitting on its rim. Seats are drawn for the room's full capacity; unoccupied seats render as empty chairs, so the layout never shifts as people join or leave.
- Seat order is global and stable: the game server assigns each member the lowest free seat index at join time (Redis hash `user_id → seat`), and a member keeps that seat until they leave. Each client then rotates the table so the viewer's own seat is always drawn at bottom centre — everyone sees themselves in the same chair, while the order around the table (who sits beside whom) is the same for all viewers.
- Each occupied seat shows: the avatar (placeholder colored-initial circle until Phase 6), a name plate, a host crown / next-host badge, a speaking ring driven by local voice-activity detection on each audio stream, and a voice status indicator (muted / connecting / failed).
- Mute state is broadcast: toggling the mic tells the game server, which includes each member's mute state in `room_updated`.
- Clicking an occupied seat opens a popover with that member's details; for the host, it carries "Set as Next Host".
- A Participants button (people icon + `present/capacity` count — the only place the member count appears) opens a list of everyone in the room: avatar, name, Host / Next Host tag, voice status, and "Set as Next Host" per row for the host. It shares the top-right slot with chat — opening either one closes the other.
- Chat is a semi-transparent black overlay with white text over the table, open by default, with a show/hide toggle.
- The room view has no site top bar (logo / username / Log Out) — the table page is the whole screen, and leaving the room returns to pages that have it. A header floats over the top of the table: Leave Room at top left, the room name centred (Manrope; truncated with an ellipsis past ~440px, full name in a tooltip on hover or focus), and Participants, Mute and Show/Hide Chat at top right. The chat overlay sits top right, beneath those buttons.
- The table's centre carries the Clashing Grounds logo and wordmark.

## Conventions & Workflow

- **Repo layout:** monorepo — `/frontend` (Next.js), `/crud-server` (Flask + Postgres), `/game-server` (Flask-SocketIO + Redis).
- **Code architecture — light DDD:** each backend service is organized by bounded context/domain (not by technical layer like `models/`, `routes/`, `services/` at the top level). Entities and repositories are used where they add clarity; heavier tactical patterns (aggregates, domain events, CQRS) are only introduced if a specific problem calls for them — not applied by default.
  - **CRUD server** bounded contexts: `identity` (accounts, auth, JWT issuance), `room_category` (curated room categories), and `character` (avatar customization, persisted character data).
  - **Game server** bounded context: `room` (room lifecycle, presence, text chat, WebRTC signaling — kept as one context for now since these are tightly coupled around a single room's lifetime).
  - Example shape per context: `crud-server/identity/{models.py, repository.py, service.py, routes.py}`, mirrored for `character`; `game-server/room/{...}` likewise.
- **Python conventions:** full type hints on all functions/methods; Pydantic v2 idioms (`model_validate`, `ConfigDict`, etc.) at API/serialization boundaries; plain dataclasses or attrs for internal domain entities rather than Pydantic (fits the light-DDD split between domain and boundary layers).
- **Next.js conventions:** App Router (`app/` directory, not Pages Router); React Server Components by default, Client Components only where interactivity requires it (forms, sockets, etc.); TypeScript `strict: true`.
- **Cross-language conventions:** keep functions/methods small and single-purpose; no comments except to explain a non-obvious "why"; explicit error handling only at system boundaries (user input, external APIs) — don't add try/except or validation around internal calls that can't actually fail.
- **Testing:** pytest for both backend servers, unit tests only for now (no integration test suite yet — revisit once the services stabilize).
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, etc.), trunk-based with short-lived feature branches merged to `main`.
- **Linting/formatting:** `ruff` + `black` for both Python services, ESLint + Prettier for the Next.js frontend.
- **Deployment:** self-hosted VPS(es), all services (frontend, both backends, Postgres, Redis, coturn) run as Docker containers via Docker Compose.

## Current Status
Nothing built yet. Stack, architecture, core mechanics, and workflow conventions are all decided (above). Next step: scaffold the three codebases per the monorepo layout above.

## Open Questions
None currently — revisit as design decisions surface during implementation.
