'use client';

import { useMemo, useRef } from 'react';
import { EmptyChair, Seat, type SeatView } from '@/components/Seat';
import { SeatPopover } from '@/components/SeatPopover';
import { useElementSize } from '@/hooks/useElementSize';
import { positionOfSeat, tableLayout } from '@/lib/tableLayout';

function Wordmark() {
  return (
    <div className="pointer-events-none flex items-center gap-4.5">
      <div className="flex h-[58px] w-[58px] items-center justify-center rounded-[17px] border-2 border-white/10 font-display text-[28px] font-bold text-white/16">
        C
      </div>
      <span className="font-display text-[34px] font-bold tracking-[-0.5px] whitespace-nowrap text-white/16">
        Clashing Grounds
      </span>
    </div>
  );
}

export function RoomTable({
  capacity,
  viewerSeat,
  seats,
  selectedId,
  canDesignate,
  onSelect,
  onDismiss,
  onMakeHost,
}: {
  capacity: number;
  viewerSeat: number;
  seats: SeatView[];
  selectedId: string | null;
  canDesignate: boolean;
  onSelect: (userId: string) => void;
  onDismiss: () => void;
  onMakeHost: (userId: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const size = useElementSize(ref);
  const layout = useMemo(
    () => size && tableLayout(size.width, size.height, capacity),
    [size, capacity],
  );

  const byPosition = new Map(
    seats.map((view) => [positionOfSeat(view.member.seat, viewerSeat, capacity), view]),
  );
  const selected = seats.find((view) => view.member.user_id === selectedId);

  return (
    <div ref={ref} onClick={onDismiss} className="absolute inset-0 overflow-hidden">
      {size && layout && (
        <>
          <div
            className="absolute flex items-center justify-center rounded-full border-2 border-accent/45 bg-[radial-gradient(closest-side,#1C1F1D,#141417_85%)] shadow-[0_0_40px_-6px_rgba(47,214,117,0.28),inset_0_0_30px_rgba(47,214,117,0.08)]"
            style={layout.table}
          >
            {layout.table.width > 520 && <Wordmark />}
          </div>

          {layout.seats.map((point, position) => {
            const view = byPosition.get(position);
            return view ? (
              <Seat
                key={view.member.user_id}
                view={view}
                point={point}
                selected={view.member.user_id === selectedId}
                onSelect={() => onSelect(view.member.user_id)}
              />
            ) : (
              <EmptyChair key={`empty-${position}`} point={point} />
            );
          })}

          {selected && (
            <SeatPopover
              view={selected}
              point={layout.seats[positionOfSeat(selected.member.seat, viewerSeat, capacity)]}
              stage={size}
              canDesignate={canDesignate && !selected.isSelf}
              onMakeHost={() => onMakeHost(selected.member.user_id)}
            />
          )}
        </>
      )}
    </div>
  );
}
