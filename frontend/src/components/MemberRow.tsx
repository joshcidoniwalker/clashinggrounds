import { avatarColorFor } from '@/lib/avatarColor';
import type { Member } from '@/lib/gameApi';

export function MemberRow({
  member,
  isHost,
  isDesignatedSuccessor,
  showMakeHost,
  onMakeHost,
}: {
  member: Member;
  isHost: boolean;
  isDesignatedSuccessor: boolean;
  showMakeHost: boolean;
  onMakeHost: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#2C2C34] bg-[#1B1B20] px-4.5 py-3.5">
      <div className="flex items-center gap-3">
        <div
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full"
          style={{ background: avatarColorFor(member.user_id) }}
        >
          <span className="font-display text-sm font-bold text-white">
            {member.username[0]?.toUpperCase()}
          </span>
        </div>
        <span className="text-[15px] font-bold text-foreground">{member.username}</span>
        {isHost && (
          <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-extrabold tracking-[0.3px] text-accent uppercase">
            Host
          </span>
        )}
        {isDesignatedSuccessor && (
          <span className="rounded-full bg-[#7C5CFF]/15 px-2.5 py-1 text-[11px] font-extrabold tracking-[0.3px] text-[#7C5CFF] uppercase">
            Next Host
          </span>
        )}
      </div>
      {showMakeHost && (
        <button
          onClick={onMakeHost}
          className="cursor-pointer text-[13px] font-bold text-[#9A9AA5] hover:text-foreground"
        >
          {isDesignatedSuccessor ? 'Next Host ✓' : 'Set as Next Host'}
        </button>
      )}
    </div>
  );
}
