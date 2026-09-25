import { Avatar } from '@/components/Avatar';
import { AlertIcon, CrownIcon, MicOffIcon } from '@/components/icons';
import type { Member } from '@/lib/gameApi';
import type { SeatVoice } from '@/lib/seatVoice';
import { SEAT_DIAMETER, type SeatPoint } from '@/lib/tableLayout';

export type SeatView = {
  member: Member;
  isSelf: boolean;
  isHost: boolean;
  isNextHost: boolean;
  voice: SeatVoice;
  speaking: boolean;
};

function VoiceBadge({ voice }: { voice: SeatVoice }) {
  if (
    voice !== 'muted' &&
    voice !== 'failed' &&
    voice !== 'connecting' &&
    voice !== 'reconnecting'
  ) {
    return null;
  }

  return (
    <span className="pointer-events-none absolute -right-1 -bottom-1 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-background bg-[#0B0B0E]">
      {voice === 'muted' && <MicOffIcon className="h-3 w-3" />}
      {voice === 'failed' && <AlertIcon className="h-3 w-3" />}
      {(voice === 'connecting' || voice === 'reconnecting') &&
        [0, 200, 400].map((delay) => (
          <span
            key={delay}
            className="mx-px h-[3px] w-[3px] animate-blink rounded-full bg-[#FFB020] motion-reduce:animate-none"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
    </span>
  );
}

export function Seat({
  view,
  point,
  selected,
  onSelect,
}: {
  view: SeatView;
  point: SeatPoint;
  selected: boolean;
  onSelect: () => void;
}) {
  const { member, isSelf, isHost, isNextHost, voice, speaking } = view;

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: point.x, top: point.y, width: SEAT_DIAMETER, height: SEAT_DIAMETER }}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        aria-label={isSelf ? `${member.username} (you)` : member.username}
        aria-expanded={selected}
        className={`relative block cursor-pointer rounded-full ${
          selected ? 'shadow-[0_0_0_3px_#0F0F12,0_0_0_5px_#F5F5F7]' : 'shadow-[0_0_0_3px_#0F0F12]'
        }`}
      >
        {speaking && (
          <span
            className="absolute -inset-1.5 animate-talk rounded-full shadow-[0_0_0_3px_#2FD675,0_0_18px_2px_rgba(47,214,117,0.55)] motion-reduce:animate-none"
            aria-hidden
          />
        )}
        <Avatar userId={member.user_id} username={member.username} size={SEAT_DIAMETER} />
      </button>

      {(isHost || isNextHost) && (
        <CrownIcon
          variant={isHost ? 'host' : 'next'}
          className="pointer-events-none absolute top-0 left-1/2 w-[30px] -translate-x-1/2 -translate-y-[62%] drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]"
        />
      )}

      <VoiceBadge voice={voice} />

      <span className="pointer-events-none absolute top-[calc(100%+7px)] left-1/2 max-w-[110px] -translate-x-1/2 truncate rounded-full border border-[#2C2C34] bg-[#0B0B0E]/85 px-2.25 py-0.75 text-xs font-extrabold whitespace-nowrap text-foreground">
        {member.username}
        {isSelf && <span className="font-bold text-[#9A9AA5]"> (you)</span>}
      </span>
    </div>
  );
}

export function EmptyChair({ point }: { point: SeatPoint }) {
  const size = SEAT_DIAMETER * 0.72;

  // Rotated so the chair's back always faces away from the table.
  return (
    <div
      className="pointer-events-none absolute rounded-[30%] border border-[#2C2C34] bg-[#18181D] before:absolute before:inset-x-[10%] before:-top-[7px] before:h-[9px] before:rounded-md before:border before:border-[#34343D] before:bg-[#22222A]"
      style={{
        left: point.x,
        top: point.y,
        width: size,
        height: size,
        transform: `translate(-50%, -50%) rotate(${(point.angle * 180) / Math.PI + 90}deg)`,
      }}
      aria-hidden
    />
  );
}
