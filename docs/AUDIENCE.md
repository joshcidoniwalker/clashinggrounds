# Audience & Speakers

Feature design spec. Changes how joining a room and speaking work: joiners start in an **audience** that can listen and chat, and the host decides who sits at the table and speaks.

Status: **implemented** on branch `feat/audience`; not yet verified in a browser.

## Summary

- A room has two kinds of member: **speakers** (seated at the table, can speak) and **audience** (listen and chat, not shown at the table, cannot speak).
- Everyone who joins a room joins as audience. The only exception is the creator, who starts seated.
- The host moves people between the two: **Add to table** (audience → speaker) and **Move to audience** (speaker → audience).
- Being host is independent of being a speaker. The host can leave the table, stay host from the audience, and take a seat again later.
- A room's capacity is the number of **seats at the table** — i.e. the maximum number of speakers. The audience is unlimited.

## Roles and rules

### Joining

- `POST /rooms/<id>/join` always succeeds for an existing room; a room is never "full" to a joiner. The joiner becomes an audience member with no seat.
- Audience members are never asked for microphone permission.

### Capacity

- `capacity` (still 2–12, chosen at creation) caps speakers only. The host counts toward it only while seated.
- There is no audience limit (see Known limitations for what this means for voice).

### Host

- The creator starts as host, seated in seat 0, live.
- The host can be a speaker or an audience member, and switches between them freely:
  - **Leave table** (like any speaker) moves them to the audience; they remain host.
  - **Take a seat** moves a host in the audience back to the table: lowest free seat, arriving live like an Add to table. Disabled with "No free seats" when the table is full.
- Nobody else can move the host between the table and the audience.

### Create Room modal

- The "Capacity" field is relabelled **"Seats"**. Its range (2–12) and default are unchanged.

### Add to table (promotion)

- Host-only action, on an audience member other than the host (the host uses Take a seat for themselves).
- Takes effect immediately; the audience member isn't asked first.
- They're given the **lowest free seat index** (same rule as today's joins), and keep it until they leave the table.
- They arrive **live (unmuted)**: their client requests mic permission as they're seated.
  - If permission is denied or there's no microphone, they stay seated, muted, with a mic-unavailable voice status. They can still leave the table.
- Rejected when every seat is taken (server-side check, atomic with seat assignment so two simultaneous promotions can't both take the last seat).

### Move to audience (demotion by host)

- Host-only action, on any speaker other than the host.
- The person stays in the room as an audience member; their seat is freed; their mic is released (local tracks stopped, so the browser's mic indicator turns off).
- A Next Host designation is unaffected.

### Leave table (voluntary step-down)

- Any speaker, host included, can move themselves to the audience. Same effects as a host demotion.

### Next Host

- The host can designate any other member, speaker or audience, as Next Host (as today).
- Moving between the table and the audience doesn't affect the designation.

### Host handoff and room closure

Unchanged from today (`docs/PROJECT.md` → Host disconnect & handoff), with roles ignored. When the host leaves the room (explicit leave or socket disconnect):

1. The designated successor becomes host, if still in the room.
2. Otherwise, the longest-tenured remaining member becomes host, speaker or audience.
3. The room closes only when nobody is left in it.

Tenure is time since joining the room (not time since being seated).

The new host keeps their current role: a new host from the audience stays in the audience and can Take a seat if they want. A new host who was in the audience gets a toast: "You're now the host".

## Voice

The P2P mesh stays. Which pairs connect, and in which direction, now depends on role:

| Pair                | Connection                                  |
| ------------------- | ------------------------------------------- |
| speaker ↔ speaker   | two-way audio (as today)                    |
| speaker → audience  | one-way: speaker sends, audience only receives |
| audience ↔ audience | no connection                               |

- The server-side signal relay still only checks that both ends are room members; it doesn't need to know about roles.
- When someone changes role, their connections are rebuilt to match the table above (driven off `room_updated`, as the mesh is today).
- The speaking ring and voice status are only shown for speakers.

### Known limitations

- Each speaker uploads one stream per other member, audience included. With a large audience this will degrade speaker bandwidth/CPU (expected to become a problem somewhere around a few dozen listeners). Accepted for now; the long-term fix is an SFU, which is out of scope here.

## UI

### Room header

- The Participants button reads **people icon + "Participants"**, with no count.
- **Mute** is shown only to speakers. Audience members see no mic control.
- **Leave table** is a header button shown to every speaker, host included.
- **Take a seat** is a header button, in the same slot, shown only to the host while in the audience.
- Leave Room, room name, and Show/Hide Chat are unchanged for everyone.

### Table view

- Only speakers are drawn at the table. Audience members aren't drawn anywhere on it.
- Speaker's view: unchanged, rotated so their own seat is at bottom centre.
- Audience member's view (including a host in the audience): rotated so the **host's** seat is at bottom centre while the host is seated; when the host is in the audience, unrotated with seat 0 at bottom centre. It re-orients whenever the host changes or the host's seat changes.
- Seat popover (clicking a seated speaker):
  - For the host, on any other speaker: **Move to audience** alongside "Set as Next Host".
  - On your own seat: **Leave table**.

### Participants panel

Two sections, in this order:

1. **Speakers {n}/{capacity}** — e.g. "Speakers 5/8". Existing rows (avatar, name, (you), Host / Next Host tag, voice status, speaking ring). For the host, each other speaker's row has **Set as Next Host** and **Move to audience**. Existing sort order (host, then you, then seat order).
2. **Audience {n}** — e.g. "Audience 23". Rows show avatar, name, (you), and Host / Next Host tag; no voice status or speaking ring. Sorted alphabetically by username. For the host, each other row has **Add to table** and **Set as Next Host**, and the host's own row has **Take a seat**. Add to table and Take a seat are disabled when all seats are taken, with "No free seats" shown as the reason.

The current footer ("N open seats" / "Room is full") is replaced by the Speakers count.

### Toasts

New component — the app has no toast/notification UI yet.

- Bottom centre, auto-dismiss after ~4s, no close button.
- Shown only to the person affected:
  - Added to the table by the host: "You've been added to the table"
  - Moved to the audience by the host: "The host moved you to the audience"
  - Became host through handoff while in the audience: "You're now the host"
- No toast when you step down or take a seat yourself.

### Chat

Unchanged. Audience and speakers read and send messages the same way, and chat doesn't show who is a speaker.

### Room cards (room browser and landing page "Explore rooms")

- Show speakers and audience, e.g. **"5/8 speakers · 23 listening"**.
- A room is never shown as full or unjoinable.
- The public listing still carries counts only, never identities.

## Proposed technical approach

A starting point for implementation, not settled requirements.

### Redis

- `room:{id}:member_order` and `room:{id}:member_names` keep holding **everyone** (speakers and audience).
- `room:{id}:seats` holds **speakers only**. Having a seat is what makes someone a speaker, so there's no separate role key.
- `room:{id}:muted` only ever contains speakers; entries are removed on demotion.
- Promotion's "seat is free and count < capacity" check and the seat write must be atomic (Lua script or `WATCH`/`MULTI`).

### API

- `Member.seat` becomes nullable (`None` = audience) in `models.py` / `RoomDetail`.
- `RoomSummary`: replace `member_count` with `speaker_count` and `audience_count`.
- `POST /rooms/<id>/join`: drop the capacity check and `RoomFullError`/409; add as audience.
- New host/self actions, as REST like `designate-successor`, each broadcasting `room_updated`:
  - `POST /rooms/<id>/speakers` `{user_id}` — host adds an audience member to the table; with their own `user_id`, this is Take a seat. 403 not host, 400 not in audience, 409 no free seat.
  - `DELETE /rooms/<id>/speakers/<user_id>` — host moves any speaker (self included) to the audience, or a speaker removes themselves. 403 if caller is neither host nor that user; 400 if target isn't a speaker.
- `set_muted` rejects audience members.
- `designate_successor` and `leave_room` handoff: unchanged.

### Frontend

- Toasts come from diffing your own state between consecutive `room_updated` events: audience → speaker you didn't trigger yourself means "added"; speaker → audience you didn't trigger yourself means "moved"; becoming host while in the audience means "now the host". No new socket events needed.
- `useVoiceChat` builds peer connections from the role table above. For speaker↔audience pairs the speaker is always the offerer (offering from the audience side would need the audience to create a receive-only transceiver first; offering from the speaker side avoids that). The lower-`user_id` rule still applies between two speakers.
- Mic is acquired on becoming a speaker and released on becoming audience.

## Out of scope

- Hand raising / requests to speak.
- Asking an audience member before seating them.
- Kicking someone out of the room entirely.
- The host choosing which seat someone gets.
- An SFU or any audience cap.

## Rollout

- No migration. Live rooms in Redis are flushed on deploy.
- After implementation, update `docs/PROJECT.md` (Room creation, Room browsing, WebRTC signaling flow, Room table view) and `CLAUDE.md` (Redis schema, Socket.IO/WebRTC notes) to match.

## Acceptance criteria

- Joining any existing room succeeds and puts the joiner in the audience; no mic prompt.
- Audience members hear all speakers, can read and send chat, and aren't drawn on the table.
- The host can Add to table (lowest free seat, arrives unmuted) and Move to audience from both the Participants panel and the seat popover. Add to table is disabled with "No free seats" when the table is full.
- Any speaker, host included, can Leave table from the header and from their own seat popover; the host stays host.
- A host in the audience can Take a seat from the header and from their own Audience row (lowest free seat, live), disabled when the table is full.
- A denied mic permission on promotion leaves the user seated and muted.
- Next Host can be set on any member and survives role changes.
- Host leaving the room hands off to the designated successor, then the longest-tenured member of either role; the new host keeps their role. The room closes only when empty.
- Audience members see the host's seat at bottom centre, or seat 0 when the host isn't seated.
- The Create Room modal labels the field "Seats".
- The Participants button reads "Participants"; the panel shows "Speakers n/capacity" and "Audience n" sections as specified.
- The affected user gets a bottom-centre toast when the host adds or moves them, or when they become host while in the audience.
- Room cards show "x/y speakers · z listening" and never show a room as full.
