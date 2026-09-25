# Clashing Grounds — Implementation Roadmap

Living document. Phases are ordered by dependency — each one builds on what's already working. See `docs/PROJECT.md` for full requirements/architecture; this doc only covers sequencing, deliverables, and how to know a phase is actually done.

Status legend: ⬜ not started · 🟨 in progress · ✅ done

## Phase 0 — Scaffolding & tooling ✅
Set up the monorepo structure and base tooling. No feature logic yet.

**Deliverable:** `docker-compose up` brings up empty-but-running frontend, crud-server, game-server, Postgres, Redis, and coturn containers.

**Acceptance criteria:**
- Monorepo layout matches `docs/PROJECT.md` Conventions & Workflow (`/frontend`, `/crud-server`, `/game-server`)
- Each backend has its bounded-context folder skeleton (`identity`, `character` in crud-server; `room` in game-server) — empty modules, no logic
- Linting/formatting configured and passing on empty scaffolds: ruff + black (Python), ESLint + Prettier (Next.js)
- Alembic initialized against Postgres with zero migrations
- `git init` done, initial commit made
- `docker-compose up` starts all five services without errors

## Phase 1 — Identity ✅
Accounts, auth, JWT issuance/verification. Everything else depends on a user existing.

**Deliverable:** a user can sign up, log in, and stay logged in across a refresh; the game server can independently verify a JWT it's handed.

**Acceptance criteria:**
- `POST /signup` and `POST /login` on the CRUD server work against Postgres (`identity` context)
- Login returns a signed JWT; game server verifies its signature locally (no callback) via a test-protected endpoint
- Frontend has functional signup/login forms and persists the session (e.g. redirect to a placeholder authenticated page on success)

## Phase 2 — Room lifecycle (text/voice not included yet) ✅
Room creation, browsing, joining, capacity, host handoff — all via the game server's `room` context and Redis. No chat or voice content yet, just membership and lifecycle.

**Deliverable:** multiple logged-in users can create, browse, join, and leave rooms; host handoff and teardown work correctly.

**Acceptance criteria:**
- REST endpoints for browse/create/join/leave work against Redis-backed room state
- Room capacity (configurable per room, hard ceiling 12) is enforced — join rejected past cap
- Disconnecting the host promotes the designated successor, or the longest-tenured remaining member if none was set
- A room with zero members is deleted from Redis immediately
- Frontend has a room browser (list + create form) and a bare room view showing the current member list (plain text, no avatars yet)

## Phase 3 — Text chat ✅
Real-time messaging inside a room over the Socket.IO channel already established in Phase 2's room context.

**Deliverable:** members of the same room exchange real-time text messages; a reconnecting client catches up on recent history.

**Acceptance criteria:**
- Messages (`{room_id, sender_id, body, sent_at}`) delivered to all room members in real time
- Redis rolling buffer caps at 50 messages per room, oldest evicted first
- A client that reconnects mid-session receives the buffered messages
- Per-user message-rate limit enforced via Redis counters (set to 20 messages per minute, fixed window — `Config.CHAT_RATE_LIMIT_PER_MINUTE`)
- Frontend room view has a working chat panel

## Phase 4 — Voice chat (WebRTC) ✅
P2P mesh voice between room members, signaled over the same Socket.IO channel.

**Deliverable:** users in a room can hear each other.

**Acceptance criteria:**
- Two clients on the same network establish a direct P2P audio connection via signaling relayed through the game server
- Two clients separated by NAT successfully connect via the self-hosted coturn TURN fallback — **partially verified:** coturn grants a relay allocation with the credentials the game server issues, and clients are configured with it as fallback, but an actual NAT-separated connection can't be exercised on one machine. Confirm alongside the Phase 7 criterion "coturn reachable and functioning from outside the VPS's local network."
- Leaving a room cleanly tears down that user's peer connections
- Frontend has mute/unmute and per-member connection-status indicators

## Phase 5 — Room table UI ✅
Redesign the room view around a shared table, with placeholder avatars standing in for characters. Kept separate from the character system so the room layout can be settled (and committed) before committing to an art pack.

**Deliverable:** the room view shows everyone present seated around a table, with host/successor status, voice state, and host controls carried over from the current member list.

**Acceptance criteria:**
- Room view is a full-page top-down pill-shaped table (spec: `docs/PROJECT.md` → Room table view), with seats drawn for every capacity from 2 up to the 12-member ceiling and empty chairs for unoccupied seats
- Each seat renders a placeholder avatar behind a single avatar component, so Phase 6 swaps in real characters without touching the table layout
- Seat assignment is server-side, global, and stable: members already seated don't move when someone joins or leaves
- Each occupied seat shows name plate, host crown / next-host badge, speaking ring, and voice status; clicking a seat opens a popover carrying the host's "Set as Next Host" control
- Mute state is broadcast to the room and shown on the muted member's seat
- Chat is a toggleable semi-transparent overlay in the top-right, open by default
- A Participants button (carrying the member count) opens a list of everyone present, with the host's "Set as Next Host" control per row
- Per-user room-creation rate limit enforced (extends Phase 3's rate-limiting approach)

## Phase 6 — Character system ⬜
Persisted, customizable characters, rendered seated at the room's table.

**Deliverable:** a user can design a character, and everyone present in a room sees each other's characters seated at the table.

**Acceptance criteria:**
- `character` context on the CRUD server persists one character per user (slots: hair, eyes, head shape, clothes, skin tone, shoes, accessories)
- `GET /characters?user_ids=...` batch endpoint returns correct data for multiple users in one call
- Character sprites composited from the Kenney Modular Character Pack render correctly for all seven slots
- The room table's placeholder avatars (Phase 5) are replaced with rendered characters for everyone present
- Character edits are reflected the next time the room is viewed/joined (no live mid-session update required for MVP)
- Signup flow (built in Phase 1 without this step) is reworked to insert a required character-creation step — signup isn't complete until a character is designed, no skip
- Login/signup screen background is revisited: swap the current placeholder gradient for a tiled view of rendered avatars seated in rooms, now that character/room rendering actually exists
- Landing page's room-card thumbnails (currently an abstract gradient placeholder) are revisited: swap in an actual live/rendered preview of each room's table, now that room/character rendering actually exists

## Phase 7 — Hardening & deployment ⬜
Get the full stack running for real, outside localhost.

**Deliverable:** the complete user flow — sign up → create character → create/join a room → chat and talk — works end-to-end on a deployed VPS.

**Acceptance criteria:**
- All five services run via Docker Compose on the target VPS
- coturn reachable and functioning from outside the VPS's local network
- Full golden-path flow verified on the deployed instance, not just localhost
