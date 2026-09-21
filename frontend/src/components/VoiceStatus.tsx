const LABELS: Record<string, { text: string; color: string }> = {
  connected: { text: 'Connected', color: '#2FD675' },
  connecting: { text: 'Connecting…', color: '#FFB020' },
  new: { text: 'Connecting…', color: '#FFB020' },
  disconnected: { text: 'Reconnecting…', color: '#FFB020' },
  failed: { text: 'Failed', color: '#FF3B30' },
  closed: { text: 'Disconnected', color: '#6E6E78' },
};

export function VoiceStatus({ state }: { state: RTCPeerConnectionState | undefined }) {
  const label = LABELS[state ?? 'new'] ?? LABELS.new;

  return (
    <span className="flex items-center gap-1.5">
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: label.color }}
        aria-hidden
      />
      <span className="text-[11px] font-bold" style={{ color: label.color }}>
        {label.text}
      </span>
    </span>
  );
}
