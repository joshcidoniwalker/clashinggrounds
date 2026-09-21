'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { Member } from '@/lib/gameApi';

type Signal = { description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };

type PeerEntry = {
  pc: RTCPeerConnection;
  // Candidates can arrive before the answer's setRemoteDescription resolves;
  // addIceCandidate throws until a remote description exists, so they wait here.
  pendingCandidates: RTCIceCandidateInit[];
};

export function useVoiceChat({
  socket,
  roomId,
  token,
  userId,
  members,
  iceServers,
}: {
  socket: Socket | null;
  roomId: string;
  token: string;
  userId: string;
  members: Member[];
  iceServers: RTCIceServer[] | null;
}) {
  const [micEnabled, setMicEnabled] = useState(true);
  const [micError, setMicError] = useState<string | null>(null);
  const [peerStates, setPeerStates] = useState<Record<string, RTCPeerConnectionState>>({});
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [micReady, setMicReady] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerEntry>>(new Map());

  useEffect(() => {
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        localStreamRef.current = stream;
        setMicReady(true);
      })
      .catch(() => {
        setMicError('Microphone unavailable — you can hear others, but they cannot hear you.');
      });

    return () => {
      cancelled = true;
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    };
  }, []);

  const emitSignal = useCallback(
    (targetUserId: string, signal: Signal) => {
      socket?.emit('webrtc_signal', {
        token,
        room_id: roomId,
        target_user_id: targetUserId,
        signal,
      });
    },
    [socket, token, roomId],
  );

  const createPeer = useCallback(
    (peerId: string): PeerEntry => {
      const pc = new RTCPeerConnection({ iceServers: iceServers ?? [] });

      localStreamRef.current?.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current as MediaStream);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          emitSignal(peerId, { candidate: event.candidate.toJSON() });
        }
      };

      pc.ontrack = (event) => {
        setRemoteStreams((current) => ({ ...current, [peerId]: event.streams[0] }));
      };

      pc.onconnectionstatechange = () => {
        setPeerStates((current) => ({ ...current, [peerId]: pc.connectionState }));
      };

      const entry: PeerEntry = { pc, pendingCandidates: [] };
      peersRef.current.set(peerId, entry);
      return entry;
    },
    [iceServers, emitSignal],
  );

  const closePeer = useCallback((peerId: string) => {
    const entry = peersRef.current.get(peerId);
    if (!entry) return;

    entry.pc.close();
    peersRef.current.delete(peerId);

    setPeerStates((current) => {
      const next = { ...current };
      delete next[peerId];
      return next;
    });
    setRemoteStreams((current) => {
      const next = { ...current };
      delete next[peerId];
      return next;
    });
  }, []);

  useEffect(() => {
    if (!socket) return;

    async function handleSignal({
      from_user_id: fromUserId,
      signal,
    }: {
      from_user_id: string;
      signal: Signal;
    }) {
      const entry = peersRef.current.get(fromUserId) ?? createPeer(fromUserId);
      const { pc } = entry;

      if (signal.description) {
        await pc.setRemoteDescription(signal.description);

        for (const candidate of entry.pendingCandidates) {
          await pc.addIceCandidate(candidate);
        }
        entry.pendingCandidates = [];

        if (signal.description.type === 'offer') {
          await pc.setLocalDescription(await pc.createAnswer());
          emitSignal(fromUserId, { description: pc.localDescription as RTCSessionDescriptionInit });
        }
      } else if (signal.candidate) {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(signal.candidate);
        } else {
          entry.pendingCandidates.push(signal.candidate);
        }
      }
    }

    socket.on('webrtc_signal', handleSignal);
    return () => {
      socket.off('webrtc_signal', handleSignal);
    };
  }, [socket, createPeer, emitSignal]);

  const peerIdsKey = members
    .map((member) => member.user_id)
    .filter((id) => id !== userId)
    .sort()
    .join(',');

  useEffect(() => {
    if (!socket || !iceServers || !micReady) return;

    const peerIds = peerIdsKey ? peerIdsKey.split(',') : [];

    for (const peerId of peerIds) {
      if (peersRef.current.has(peerId)) continue;

      const { pc } = createPeer(peerId);

      // Both sides create the connection off the same member list, so exactly
      // one of them must offer or the negotiations collide. Lower id offers.
      if (userId < peerId) {
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            emitSignal(peerId, { description: pc.localDescription as RTCSessionDescriptionInit });
          });
      }
    }

    for (const peerId of [...peersRef.current.keys()]) {
      if (!peerIds.includes(peerId)) closePeer(peerId);
    }
  }, [peerIdsKey, socket, iceServers, micReady, userId, createPeer, closePeer, emitSignal]);

  useEffect(() => {
    const peers = peersRef.current;
    return () => {
      peers.forEach((entry) => entry.pc.close());
      peers.clear();
    };
  }, []);

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const next = !micEnabled;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    setMicEnabled(next);
  }, [micEnabled]);

  return { micEnabled, toggleMic, micError, peerStates, remoteStreams };
}
