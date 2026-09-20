import type { RoomSummary } from '@/lib/gameApi';

function PeopleIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#9A9AA5"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="8" r="3" />
      <path d="M2 20c0-3.3 3-5 7-5s7 1.7 7 5" />
      <circle cx="17" cy="8" r="2.4" />
      <path d="M16 15.2c2.7.3 4 1.6 4 4.3" />
    </svg>
  );
}

export function RoomCard({
  room,
  onJoin,
  joining,
}: {
  room: RoomSummary;
  onJoin: () => void;
  joining: boolean;
}) {
  const full = room.member_count >= room.capacity;

  return (
    <div>
      <div className="aspect-[16/10] w-full rounded-[14px] bg-[radial-gradient(120%_140%_at_30%_20%,rgba(47,214,117,0.22),rgba(20,20,24,0.95)_65%)]" />
      <div className="mt-3 flex items-end justify-between gap-2.5">
        <div className="flex flex-col gap-1">
          <span className="text-base font-bold text-foreground">{room.name}</span>
          <div className="flex items-center gap-1.5">
            <PeopleIcon />
            <span className="text-[13px] text-[#9A9AA5]">
              {room.member_count}/{room.capacity} members
            </span>
          </div>
        </div>
        {full ? (
          <span className="shrink-0 rounded-full bg-[#3A3A42] px-5 py-2 text-[13px] font-extrabold text-[#8A8A93]">
            Full
          </span>
        ) : (
          <button
            onClick={onJoin}
            disabled={joining}
            className="shrink-0 rounded-full bg-accent px-5 py-2 text-[13px] font-extrabold text-white disabled:opacity-60"
          >
            Join
          </button>
        )}
      </div>
    </div>
  );
}
