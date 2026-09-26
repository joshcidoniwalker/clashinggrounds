'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { ChatPanel } from '@/components/ChatPanel';
import { ParticipantsPanel } from '@/components/ParticipantsPanel';
import { RemoteAudio } from '@/components/RemoteAudio';
import { RoomHeader } from '@/components/RoomHeader';
import { RoomTable } from '@/components/RoomTable';
import { isSeated, type SeatView } from '@/components/Seat';
import { Toast } from '@/components/Toast';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useSpeaking } from '@/hooks/useSpeaking';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import {
  GAME_API_URL,
  addSpeaker,
  designateSuccessor,
  getIceServers,
  getRoom,
  leaveRoom,
  moveToAudience,
  type ChatMessage,
  type RoomDetail,
} from '@/lib/gameApi';
import { seatVoiceFor } from '@/lib/seatVoice';

const NO_MEMBERS: RoomDetail['members'] = [];

type SidePanel = 'chat' | 'participants' | null;

// Clicking the table or pressing Esc dismisses the participants list the way
// it would a menu, but leaves chat alone — chat is meant to stay up.
function closingParticipants(current: SidePanel): SidePanel {
  return current === 'participants' ? null : current;
}

type SelfState = { seated: boolean; isHost: boolean };

function selfStateIn(room: RoomDetail, userId: string): SelfState | null {
  const self = room.members.find((member) => member.user_id === userId);
  if (!self) return null;
  return { seated: self.seat !== null, isHost: room.host_id === userId };
}

function toastFor(previous: SelfState, next: SelfState, movedSelf: boolean): string | null {
  if (previous.seated !== next.seated) {
    if (movedSelf) return null;
    return next.seated ? "You've been added to the table" : 'The host moved you to the audience';
  }
  if (!previous.isHost && next.isHost && !next.seated) return "You're now the host";
  return null;
}

// Audience members have no seat of their own to put at bottom centre, so the
// table is oriented around the host's seat instead, or left unrotated.
function viewerSeatIn(room: RoomDetail, userId: string): number {
  const seatOf = (id: string) => room.members.find((member) => member.user_id === id)?.seat;
  return seatOf(userId) ?? seatOf(room.host_id) ?? 0;
}

export default function RoomViewPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const user = useAuthUser();
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [iceServers, setIceServers] = useState<RTCIceServer[] | null>(null);
  const [sidePanel, setSidePanel] = useState<SidePanel>('chat');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const selfStateRef = useRef<SelfState | null>(null);
  // Set while this client's own Leave table / Take a seat is in flight, so the
  // resulting role change isn't announced as something the host did.
  const movingSelfRef = useRef(false);

  const applyRoom = useCallback(
    (next: RoomDetail) => {
      setRoom(next);
      if (!user) return;

      const nextSelf = selfStateIn(next, user.userId);
      const previous = selfStateRef.current;
      selfStateRef.current = nextSelf;
      if (!previous || !nextSelf) return;

      const message = toastFor(previous, nextSelf, movingSelfRef.current);
      if (previous.seated !== nextSelf.seated) movingSelfRef.current = false;
      if (message) setToast(message);
    },
    [user],
  );
  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!user) return;
    getIceServers(user.token).then(setIceServers);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    getRoom(user.token, params.id).then(applyRoom);

    const socket: Socket = io(GAME_API_URL);
    socketRef.current = socket;

    // Re-emitted on every reconnect, not just the first connect, so a dropped
    // socket rejoins the broadcast group and re-fetches the chat buffer. The
    // socket is only handed to the voice mesh once connected, so signaling
    // never fires into a socket the server hasn't placed in the room yet.
    socket.on('connect', () => {
      socket.emit('join_room', { token: user.token, room_id: params.id });
      setSocket(socket);
    });
    socket.on('disconnect', () => setSocket(null));
    socket.on('room_updated', applyRoom);
    socket.on('room_closed', () => router.push('/rooms'));
    socket.on('chat_history', (history: ChatMessage[]) => setMessages(history));
    socket.on('chat_message', (message: ChatMessage) => {
      setMessages((current) => [...current, message]);
    });
    socket.on('error', (data: { error: string }) => setChatError(data.error));

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [user, params.id, router, applyRoom]);

  const { isSpeaker, micEnabled, toggleMic, micError, peerStates, remoteStreams, localStream } =
    useVoiceChat({
      socket,
      roomId: params.id,
      token: user?.token ?? '',
      userId: user?.userId ?? '',
      members: room?.members ?? NO_MEMBERS,
      iceServers,
    });

  const selfMuted = !micEnabled || micError !== null;

  useEffect(() => {
    if (!socket || !user || !isSpeaker) return;
    socket.emit('set_muted', { token: user.token, room_id: params.id, muted: selfMuted });
  }, [socket, user, params.id, isSpeaker, selfMuted]);

  const audioStreams = useMemo(
    () => (user && localStream ? { ...remoteStreams, [user.userId]: localStream } : remoteStreams),
    [remoteStreams, localStream, user],
  );
  const speaking = useSpeaking(audioStreams);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setSelectedId(null);
      setSidePanel(closingParticipants);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function dismissOverlays() {
    setSelectedId(null);
    setSidePanel(closingParticipants);
  }

  function togglePanel(panel: Exclude<SidePanel, null>) {
    setSelectedId(null);
    setSidePanel((current) => (current === panel ? null : panel));
  }

  async function handleLeave() {
    if (!user) return;
    await leaveRoom(user.token, params.id);
    router.push('/rooms');
  }

  async function handleMakeHost(targetUserId: string) {
    if (!user) return;
    applyRoom(await designateSuccessor(user.token, params.id, targetUserId));
  }

  async function handleAddToTable(targetUserId: string) {
    if (!user) return;
    movingSelfRef.current = targetUserId === user.userId;
    applyRoom(await addSpeaker(user.token, params.id, targetUserId));
  }

  async function handleMoveToAudience(targetUserId: string) {
    if (!user) return;
    setSelectedId(null);
    movingSelfRef.current = targetUserId === user.userId;
    applyRoom(await moveToAudience(user.token, params.id, targetUserId));
  }

  function handleSend(body: string) {
    if (!user) return;
    setChatError(null);
    socketRef.current?.emit('send_message', {
      token: user.token,
      room_id: params.id,
      body,
    });
  }

  if (!user || !room) {
    return null;
  }

  const seats: SeatView[] = room.members.map((member) => {
    const isSelf = member.user_id === user.userId;
    return {
      member,
      isSelf,
      isHost: member.user_id === room.host_id,
      isNextHost: member.user_id === room.designated_successor_id,
      voice: seatVoiceFor({
        isSelf,
        selfMuted,
        micUnavailable: micError !== null,
        muted: member.muted,
        peerState: peerStates[member.user_id],
      }),
      speaking: speaking.has(member.user_id),
    };
  });
  const speakers = seats.filter(isSeated);
  const audience = seats.filter((view) => !isSeated(view));
  const isHost = room.host_id === user.userId;

  return (
    <div className="relative h-screen overflow-hidden bg-background">
      <RoomTable
        capacity={room.capacity}
        viewerSeat={viewerSeatIn(room, user.userId)}
        seats={speakers}
        selectedId={selectedId}
        canManage={isHost}
        onSelect={(userId) => setSelectedId((current) => (current === userId ? null : userId))}
        onDismiss={dismissOverlays}
        onMakeHost={handleMakeHost}
        onMoveToAudience={handleMoveToAudience}
      />

      <RoomHeader
        name={room.name}
        isSpeaker={isSpeaker}
        isHost={isHost}
        tableFull={speakers.length >= room.capacity}
        micEnabled={micEnabled}
        chatOpen={sidePanel === 'chat'}
        participantsOpen={sidePanel === 'participants'}
        onLeave={handleLeave}
        onLeaveTable={() => handleMoveToAudience(user.userId)}
        onTakeSeat={() => handleAddToTable(user.userId)}
        onToggleMic={toggleMic}
        onToggleChat={() => togglePanel('chat')}
        onToggleParticipants={() => togglePanel('participants')}
      />

      <div className="absolute top-[76px] right-4 z-20 max-sm:top-[112px]">
        {sidePanel === 'chat' && (
          <ChatPanel
            messages={messages}
            currentUserId={user.userId}
            error={chatError}
            onSend={handleSend}
            onHide={() => setSidePanel(null)}
          />
        )}
        {sidePanel === 'participants' && (
          <ParticipantsPanel
            speakers={speakers}
            audience={audience}
            capacity={room.capacity}
            canManage={isHost}
            onMakeHost={handleMakeHost}
            onAddToTable={handleAddToTable}
            onMoveToAudience={handleMoveToAudience}
            onClose={() => setSidePanel(null)}
          />
        )}
      </div>

      {micError && (
        <p className="absolute bottom-4 left-4 z-20 max-w-[min(360px,calc(100vw-32px))] rounded-xl bg-black/70 px-3.5 py-2.5 text-sm text-red-400">
          {micError}
        </p>
      )}

      {toast && <Toast message={toast} onDone={dismissToast} />}

      {Object.entries(remoteStreams).map(([peerId, stream]) => (
        <RemoteAudio key={peerId} stream={stream} />
      ))}
    </div>
  );
}
