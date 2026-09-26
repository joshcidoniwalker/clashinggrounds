'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { HostTag } from '@/components/HostTag';
import { NextHostButton } from '@/components/NextHostButton';
import { RowAction } from '@/components/RowAction';
import type { SeatView } from '@/components/Seat';
import { VoiceStatus } from '@/components/VoiceStatus';
import { SEAT_DIAMETER, type SeatPoint } from '@/lib/tableLayout';

const EDGE_MARGIN = 8;

export function SeatPopover({
  view,
  point,
  stage,
  canManage,
  onMakeHost,
  onMoveToAudience,
}: {
  view: SeatView;
  point: SeatPoint;
  stage: { width: number; height: number };
  canManage: boolean;
  onMakeHost: () => void;
  onMoveToAudience: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const { member, isSelf, isHost, isNextHost, voice, speaking } = view;

  // Opens beside the seat, on the side facing the table's centre, then gets
  // clamped inside the stage — which needs the popover's rendered size.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const { offsetWidth: width, offsetHeight: height } = element;
    const offset = SEAT_DIAMETER / 2 + 14;
    let left = point.x < stage.width / 2 ? point.x + offset : point.x - offset - width;
    if (left < EDGE_MARGIN || left + width > stage.width - EDGE_MARGIN) {
      left = point.x - width / 2;
    }
    left = Math.min(stage.width - width - EDGE_MARGIN, Math.max(EDGE_MARGIN, left));
    const top = Math.min(
      stage.height - height - EDGE_MARGIN,
      Math.max(EDGE_MARGIN, point.y - height / 2),
    );
    setPosition((current) =>
      current?.left === left && current.top === top ? current : { left, top },
    );
  }, [point, stage, view, canManage]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={member.username}
      onClick={(event) => event.stopPropagation()}
      className="absolute z-20 flex w-[230px] flex-col gap-3 rounded-2xl border border-[#2C2C34] bg-[#1B1B20] p-3.5 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.7)]"
      style={{
        left: position?.left ?? 0,
        top: position?.top ?? 0,
        visibility: position ? 'visible' : 'hidden',
      }}
    >
      <div className="flex items-center gap-2.5">
        <Avatar userId={member.user_id} username={member.username} size={38} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[15px] font-extrabold break-words text-foreground">
            {member.username}
          </span>
          <VoiceStatus voice={voice} speaking={speaking} />
        </div>
      </div>

      {(isHost || isNextHost) && (
        <div className="flex gap-1.5">
          <HostTag variant={isHost ? 'host' : 'next'} />
        </div>
      )}

      {isSelf && <p className="text-xs text-[#9A9AA5]">This is you.</p>}
      {canManage && !isSelf && (
        <div className="flex flex-wrap gap-2">
          <NextHostButton isNextHost={isNextHost} onMakeHost={onMakeHost} />
          <RowAction label="Move to audience" onClick={onMoveToAudience} />
        </div>
      )}
      {isSelf && <RowAction label="Leave table" onClick={onMoveToAudience} />}
    </div>
  );
}
