import { CategoryPill } from '@/components/CategoryPill';
import { PeopleIcon } from '@/components/icons';
import { roomCountsLabel, type RoomSummary } from '@/lib/gameApi';

export function RoomCard({
  room,
  onJoin,
  joining,
}: {
  room: RoomSummary;
  onJoin: () => void;
  joining: boolean;
}) {
  return (
    <div>
      <div className="aspect-[16/10] w-full rounded-[14px] bg-[radial-gradient(120%_140%_at_30%_20%,rgba(47,214,117,0.22),rgba(20,20,24,0.95)_65%)]" />
      <div className="mt-3 flex items-end justify-between gap-2.5">
        <div className="flex flex-col gap-1">
          <CategoryPill name={room.category.name} />
          <span className="text-base font-bold text-foreground">{room.name}</span>
          <div className="flex items-center gap-1.5">
            <PeopleIcon />
            <span className="text-[13px] text-[#9A9AA5]">{roomCountsLabel(room)}</span>
          </div>
        </div>
        <button
          onClick={onJoin}
          disabled={joining}
          className="shrink-0 rounded-full bg-accent px-5 py-2 text-[13px] font-extrabold text-white disabled:opacity-60"
        >
          Join
        </button>
      </div>
    </div>
  );
}
