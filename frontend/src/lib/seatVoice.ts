export type SeatVoice =
  'micOn' | 'noMic' | 'connected' | 'connecting' | 'reconnecting' | 'failed' | 'muted';

export const SEAT_VOICE_LABELS: Record<SeatVoice, { text: string; color: string }> = {
  micOn: { text: 'Mic on', color: '#2FD675' },
  noMic: { text: 'Mic unavailable', color: '#FF3B30' },
  connected: { text: 'Connected', color: '#2FD675' },
  connecting: { text: 'Connecting…', color: '#FFB020' },
  reconnecting: { text: 'Reconnecting…', color: '#FFB020' },
  failed: { text: 'Voice failed', color: '#FF3B30' },
  muted: { text: 'Muted', color: '#FF3B30' },
};

// A broken connection outranks mute: a muted peer you can't reach at all is
// the more useful thing to know.
export function seatVoiceFor({
  isSelf,
  selfMuted,
  micUnavailable,
  muted,
  peerState,
}: {
  isSelf: boolean;
  selfMuted: boolean;
  micUnavailable: boolean;
  muted: boolean;
  peerState: RTCPeerConnectionState | undefined;
}): SeatVoice {
  if (isSelf && micUnavailable) return 'noMic';
  if (isSelf) return selfMuted ? 'muted' : 'micOn';
  if (peerState === 'failed' || peerState === 'closed') return 'failed';
  if (peerState === 'disconnected') return 'reconnecting';
  if (peerState !== 'connected') return 'connecting';
  return muted ? 'muted' : 'connected';
}
