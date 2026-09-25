import { SEAT_VOICE_LABELS, type SeatVoice } from '@/lib/seatVoice';

export function VoiceStatus({ voice, speaking }: { voice: SeatVoice; speaking: boolean }) {
  const label = SEAT_VOICE_LABELS[voice];

  return (
    <span className="flex items-center gap-1.5">
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: label.color }}
        aria-hidden
      />
      <span className="text-[11px] font-bold" style={{ color: label.color }}>
        {label.text}
        {speaking && ' · Speaking'}
      </span>
    </span>
  );
}
