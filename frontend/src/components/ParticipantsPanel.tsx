import type { ReactNode } from 'react';
import { Avatar } from '@/components/Avatar';
import { HostTag } from '@/components/HostTag';
import { NextHostButton } from '@/components/NextHostButton';
import { RowAction } from '@/components/RowAction';
import type { SeatedView, SeatView } from '@/components/Seat';
import { VoiceStatus } from '@/components/VoiceStatus';

function speakerOrder(a: SeatedView, b: SeatedView): number {
  return (
    Number(b.isHost) - Number(a.isHost) ||
    Number(b.isSelf) - Number(a.isSelf) ||
    a.member.seat - b.member.seat
  );
}

function audienceOrder(a: SeatView, b: SeatView): number {
  return a.member.username.localeCompare(b.member.username);
}

function ParticipantRow({
  view,
  showVoice,
  actions,
}: {
  view: SeatView;
  showVoice: boolean;
  actions: ReactNode;
}) {
  const { member, isSelf, isHost, isNextHost, voice, speaking } = view;

  return (
    <li className="flex items-center gap-2.5 rounded-xl p-2 hover:bg-white/5">
      <div
        className={`shrink-0 rounded-full ${showVoice && speaking ? 'shadow-[0_0_0_2px_#000,0_0_0_4px_#2FD675]' : ''}`}
      >
        <Avatar userId={member.user_id} username={member.username} size={34} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-1.5 text-sm font-extrabold">
          <span className="truncate">{member.username}</span>
          {isSelf && <span className="font-bold text-white/50">(you)</span>}
          {(isHost || isNextHost) && <HostTag variant={isHost ? 'host' : 'next'} />}
        </div>
        {showVoice && <VoiceStatus voice={voice} speaking={speaking} />}
        {actions && <div className="flex flex-wrap items-center gap-1.5">{actions}</div>}
      </div>
    </li>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="px-2 pt-2 pb-1 text-xs font-bold tracking-[0.6px] text-white/55 uppercase tabular-nums">
      {children}
    </h3>
  );
}

function NoFreeSeats() {
  return <span className="text-[11px] font-bold text-white/50">No free seats</span>;
}

export function ParticipantsPanel({
  speakers,
  audience,
  capacity,
  canManage,
  onMakeHost,
  onAddToTable,
  onMoveToAudience,
  onClose,
}: {
  speakers: SeatedView[];
  audience: SeatView[];
  capacity: number;
  canManage: boolean;
  onMakeHost: (userId: string) => void;
  onAddToTable: (userId: string) => void;
  onMoveToAudience: (userId: string) => void;
  onClose: () => void;
}) {
  const tableFull = speakers.length >= capacity;

  function speakerActions({ member, isSelf, isNextHost }: SeatView) {
    if (!canManage || isSelf) return null;
    return (
      <>
        <NextHostButton
          isNextHost={isNextHost}
          onMakeHost={() => onMakeHost(member.user_id)}
          compact
        />
        <RowAction
          label="Move to audience"
          onClick={() => onMoveToAudience(member.user_id)}
          compact
        />
      </>
    );
  }

  function audienceActions({ member, isSelf, isNextHost }: SeatView) {
    if (!canManage) return null;
    return (
      <>
        <RowAction
          label={isSelf ? 'Take a seat' : 'Add to table'}
          onClick={() => onAddToTable(member.user_id)}
          disabled={tableFull}
          compact
        />
        {!isSelf && (
          <NextHostButton
            isNextHost={isNextHost}
            onMakeHost={() => onMakeHost(member.user_id)}
            compact
          />
        )}
        {tableFull && <NoFreeSeats />}
      </>
    );
  }

  return (
    <section
      aria-label="Participants"
      className="flex max-h-[calc(100vh-100px)] w-[min(320px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-white/8 bg-black/80 text-white backdrop-blur-md"
    >
      <header className="flex items-center justify-between border-b border-white/8 px-3.5 py-3">
        <span className="text-sm font-extrabold">Participants</span>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer text-xs font-bold text-white/60 hover:text-white"
        >
          Close
        </button>
      </header>
      <div className="overflow-y-auto p-1.5">
        <SectionHeading>
          Speakers {speakers.length}/{capacity}
        </SectionHeading>
        <ul>
          {[...speakers].sort(speakerOrder).map((view) => (
            <ParticipantRow
              key={view.member.user_id}
              view={view}
              showVoice
              actions={speakerActions(view)}
            />
          ))}
        </ul>
        <SectionHeading>Audience {audience.length}</SectionHeading>
        <ul>
          {[...audience].sort(audienceOrder).map((view) => (
            <ParticipantRow
              key={view.member.user_id}
              view={view}
              showVoice={false}
              actions={audienceActions(view)}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
