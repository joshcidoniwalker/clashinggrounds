import { Avatar } from '@/components/Avatar';
import { HostTag } from '@/components/HostTag';
import { NextHostButton } from '@/components/NextHostButton';
import type { SeatView } from '@/components/Seat';
import { VoiceStatus } from '@/components/VoiceStatus';

function listOrder(a: SeatView, b: SeatView): number {
  return (
    Number(b.isHost) - Number(a.isHost) ||
    Number(b.isSelf) - Number(a.isSelf) ||
    a.member.seat - b.member.seat
  );
}

function ParticipantRow({
  view,
  canDesignate,
  onMakeHost,
}: {
  view: SeatView;
  canDesignate: boolean;
  onMakeHost: () => void;
}) {
  const { member, isSelf, isHost, isNextHost, voice, speaking } = view;

  return (
    <li className="flex items-center gap-2.5 rounded-xl p-2 hover:bg-white/5">
      <div
        className={`shrink-0 rounded-full ${speaking ? 'shadow-[0_0_0_2px_#000,0_0_0_4px_#2FD675]' : ''}`}
      >
        <Avatar userId={member.user_id} username={member.username} size={34} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-1.5 text-sm font-extrabold">
          <span className="truncate">{member.username}</span>
          {isSelf && <span className="font-bold text-white/50">(you)</span>}
          {(isHost || isNextHost) && <HostTag variant={isHost ? 'host' : 'next'} />}
        </div>
        <VoiceStatus voice={voice} speaking={speaking} />
      </div>
      {canDesignate && !isSelf && !isHost && (
        <NextHostButton isNextHost={isNextHost} onMakeHost={onMakeHost} compact />
      )}
    </li>
  );
}

export function ParticipantsPanel({
  seats,
  capacity,
  canDesignate,
  onMakeHost,
  onClose,
}: {
  seats: SeatView[];
  capacity: number;
  canDesignate: boolean;
  onMakeHost: (userId: string) => void;
  onClose: () => void;
}) {
  const openSeats = capacity - seats.length;

  return (
    <section
      aria-label="Participants"
      className="flex max-h-[calc(100vh-100px)] w-[min(320px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-white/8 bg-black/80 text-white backdrop-blur-md"
    >
      <header className="flex items-center justify-between border-b border-white/8 px-3.5 py-3">
        <div>
          <span className="text-sm font-extrabold">Participants</span>
          <span className="ml-1.5 text-xs font-bold text-white/55 tabular-nums">
            {seats.length} of {capacity} seats
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer text-xs font-bold text-white/60 hover:text-white"
        >
          Close
        </button>
      </header>
      <ul className="overflow-y-auto p-1.5">
        {[...seats].sort(listOrder).map((view) => (
          <ParticipantRow
            key={view.member.user_id}
            view={view}
            canDesignate={canDesignate}
            onMakeHost={() => onMakeHost(view.member.user_id)}
          />
        ))}
      </ul>
      <footer className="border-t border-white/8 px-3.5 py-2.5 text-xs font-bold text-white/50">
        {openSeats === 0 ? 'Room is full' : `${openSeats} open seat${openSeats === 1 ? '' : 's'}`}
      </footer>
    </section>
  );
}
