'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { Member } from '@/lib/gameApi';

// What a pair's connection carries: 'duplex' between two speakers, or
// `from:<id>` when only that speaker sends and the other end (audience) only
// listens. Two audience members have no connection at all.
type Link = string;

type Signal = {
  link: Link;
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

type PeerEntry = {
  pc: RTCPeerConnection;
  link: Link;
  // Candidates can arrive before the answer's setRemoteDescription resolves;
  // addIceCandidate throws until a remote description exists, so they wait here.
  pendingCandidates: RTCIceCandidateInit[];
};

function linkBetween(self: Member, peer: Member): Link | null {
  const selfSpeaks = self.seat !== null;
  const peerSpeaks = peer.seat !== null;
  if (selfSpeaks && peerSpeaks) return 'duplex';
  if (selfSpeaks) return `from:${self.user_id}`;
  if (peerSpeaks) return `from:${peer.user_id}`;
  return null;
}

// Both ends derive the link from the same member list, so exactly one of them
// must offer or the negotiations collide: the sender of a one-way link (so the
// listener never has to set up a receive-only transceiver), and the lower id of
// a duplex one.
function isOfferer(link: Link, userId: string, peerId: string): boolean {
  return link === 'duplex' ? userId < peerId : link === `from:${userId}`;
}

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
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const micRequestRef = useRef<Promise<void> | null>(null);
  const peersRef = useRef<Map<string, PeerEntry>>(new Map());
  const signalQueueRef = useRef<Promise<void>>(Promise.resolve());

  const self = members.find((member) => member.user_id === userId);
  const isSpeaker = self !== undefined && self.seat !== null;

  // Memoised so the signal handler can await the same request the role change
  // started: an offer for a duplex link can arrive before this client has
  // rendered its own promotion, and answering it without a mic track would
  // leave the peer unable to hear us.
  const acquireMic = useCallback(() => {
    if (micRequestRef.current) return micRequestRef.current;

    const request: Promise<void> = navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (micRequestRef.current !== request) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);
        setMicEnabled(true);
      })
      .catch(() => {
        if (micRequestRef.current !== request) return;
        setMicError('Microphone unavailable — you can hear others, but they cannot hear you.');
      });
    micRequestRef.current = request;
    return request;
  }, []);

  const releaseMic = useCallback(() => {
    micRequestRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setMicError(null);
    setMicEnabled(true);
  }, []);

  useEffect(() => {
    if (!isSpeaker) return;
    acquireMic();
    return releaseMic;
  }, [isSpeaker, acquireMic, releaseMic]);

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
    (peerId: string, link: Link, offering: boolean): PeerEntry => {
      const pc = new RTCPeerConnection({ iceServers: iceServers ?? [] });

      if (link !== `from:${peerId}`) {
        localStreamRef.current?.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current as MediaStream);
        });
      }
      // A speaker without a mic still has to offer an audio section, or the
      // other speaker's answer has nowhere to put their track.
      if (offering && link === 'duplex' && pc.getTransceivers().length === 0) {
        pc.addTransceiver('audio', { direction: 'recvonly' });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          emitSignal(peerId, { link, candidate: event.candidate.toJSON() });
        }
      };

      pc.ontrack = (event) => {
        setRemoteStreams((current) => ({ ...current, [peerId]: event.streams[0] }));
      };

      pc.onconnectionstatechange = () => {
        setPeerStates((current) => ({ ...current, [peerId]: pc.connectionState }));
      };

      const entry: PeerEntry = { pc, link, pendingCandidates: [] };
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

    // A role change replaces a pair's connection with a fresh one, so a new
    // offer always starts over; answers and candidates only ever belong to the
    // connection already in place and are dropped if the link has moved on.
    async function handleSignal(fromUserId: string, signal: Signal) {
      const isOffer = signal.description?.type === 'offer';
      let entry = peersRef.current.get(fromUserId);

      if (entry && isOffer) {
        closePeer(fromUserId);
        entry = undefined;
      }
      if (!entry) {
        if (!isOffer) return;
        if (signal.link === 'duplex') await acquireMic();
        entry = createPeer(fromUserId, signal.link, false);
      }
      if (entry.link !== signal.link) return;

      const { pc } = entry;
      if (signal.description) {
        await pc.setRemoteDescription(signal.description);

        for (const candidate of entry.pendingCandidates) {
          await pc.addIceCandidate(candidate);
        }
        entry.pendingCandidates = [];

        if (isOffer) {
          await pc.setLocalDescription(await pc.createAnswer());
          emitSignal(fromUserId, {
            link: signal.link,
            description: pc.localDescription as RTCSessionDescriptionInit,
          });
        }
      } else if (signal.candidate) {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(signal.candidate);
        } else {
          entry.pendingCandidates.push(signal.candidate);
        }
      }
    }

    // Handled strictly in arrival order: handleSignal can await the mic, and a
    // candidate overtaking the offer it belongs to would be dropped.
    function enqueueSignal({ from_user_id, signal }: { from_user_id: string; signal: Signal }) {
      signalQueueRef.current = signalQueueRef.current
        .then(() => handleSignal(from_user_id, signal))
        .catch(() => {});
    }

    socket.on('webrtc_signal', enqueueSignal);
    return () => {
      socket.off('webrtc_signal', enqueueSignal);
    };
  }, [socket, createPeer, closePeer, emitSignal, acquireMic]);

  const linksKey = self
    ? members
        .filter((member) => member.user_id !== userId)
        .map((member) => `${member.user_id}=${linkBetween(self, member) ?? ''}`)
        .sort()
        .join(',')
    : '';
  const micSettled = !isSpeaker || localStream !== null || micError !== null;

  useEffect(() => {
    if (!socket) return;

    const links = new Map(
      (linksKey ? linksKey.split(',') : [])
        .map((pair) => pair.split('=') as [string, Link])
        .filter(([, link]) => link !== ''),
    );

    for (const [peerId, entry] of [...peersRef.current]) {
      if (links.get(peerId) !== entry.link) closePeer(peerId);
    }

    if (!iceServers || !micSettled) return;

    for (const [peerId, link] of links) {
      if (peersRef.current.has(peerId) || !isOfferer(link, userId, peerId)) continue;

      const { pc } = createPeer(peerId, link, true);
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          emitSignal(peerId, {
            link,
            description: pc.localDescription as RTCSessionDescriptionInit,
          });
        });
    }
  }, [linksKey, socket, iceServers, micSettled, userId, createPeer, closePeer, emitSignal]);

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

  return { isSpeaker, micEnabled, toggleMic, micError, peerStates, remoteStreams, localStream };
}
