import { PeopleIcon } from '@/components/icons';
import { RoomName } from '@/components/RoomName';

const BUTTON =
  'shrink-0 cursor-pointer rounded-full border px-5.5 py-2.5 text-sm font-extrabold max-sm:px-3 max-sm:py-2 max-sm:text-[13px]';
const QUIET = 'border-[#34343D] bg-[#0F0F12]/75 text-foreground';
const ACTIVE = 'border-accent bg-[#0F0F12]/75 text-accent';

export function RoomHeader({
  name,
  memberCount,
  capacity,
  micEnabled,
  chatOpen,
  participantsOpen,
  onLeave,
  onToggleMic,
  onToggleChat,
  onToggleParticipants,
}: {
  name: string;
  memberCount: number;
  capacity: number;
  micEnabled: boolean;
  chatOpen: boolean;
  participantsOpen: boolean;
  onLeave: () => void;
  onToggleMic: () => void;
  onToggleChat: () => void;
  onToggleParticipants: () => void;
}) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-8 pt-5 pb-2 max-sm:grid-cols-2 max-sm:px-4 max-sm:pt-3.5 *:pointer-events-auto">
      <div>
        <button type="button" onClick={onLeave} className={`${BUTTON} ${QUIET}`}>
          ← Leave<span className="max-sm:hidden"> Room</span>
        </button>
      </div>

      <div className="flex justify-center max-sm:col-span-2 max-sm:row-start-2">
        <RoomName name={name} />
      </div>

      <div className="flex items-center gap-2.5 justify-self-end max-sm:gap-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleParticipants();
          }}
          aria-label={`Participants, ${memberCount} of ${capacity} seats taken`}
          aria-expanded={participantsOpen}
          className={`${BUTTON} flex items-center gap-1.75 tabular-nums ${participantsOpen ? ACTIVE : QUIET}`}
        >
          <PeopleIcon size={16} color="currentColor" />
          {memberCount}/{capacity}
        </button>
        <button
          type="button"
          onClick={onToggleMic}
          aria-pressed={!micEnabled}
          className={`${BUTTON} ${micEnabled ? QUIET : 'border-[#FF3B30] bg-[#FF3B30] text-white'}`}
        >
          {micEnabled ? 'Mute' : 'Unmute'}
        </button>
        <button
          type="button"
          onClick={onToggleChat}
          aria-pressed={chatOpen}
          className={`${BUTTON} ${chatOpen ? ACTIVE : QUIET}`}
        >
          <span className="max-sm:hidden">{chatOpen ? 'Hide ' : 'Show '}</span>Chat
        </button>
      </div>
    </header>
  );
}
