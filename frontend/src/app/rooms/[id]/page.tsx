'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { ChatPanel } from '@/components/ChatPanel';
import { ParticipantsPanel } from '@/components/ParticipantsPanel';
import { RemoteAudio } from '@/components/RemoteAudio';
import { RoomHeader } from '@/components/RoomHeader';
import { RoomTable } from '@/components/RoomTable';
import type { SeatView } from '@/components/Seat';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useSpeaking } from '@/hooks/useSpeaking';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import {
  GAME_API_URL,
  designateSuccessor,
  getIceServers,
  getRoom,
  leaveRoom,
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
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) return;
    getIceServers(user.token).then(setIceServers);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    getRoom(user.token, params.id).then(setRoom);

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
    socket.on('room_updated', (data: RoomDetail) => setRoom(data));
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
  }, [user, params.id, router]);

  const { micEnabled, toggleMic, micError, peerStates, remoteStreams, localStream } = useVoiceChat({
    socket,
    roomId: params.id,
    token: user?.token ?? '',
    userId: user?.userId ?? '',
    members: room?.members ?? NO_MEMBERS,
    iceServers,
  });

  const selfMuted = !micEnabled || micError !== null;

  useEffect(() => {
    if (!socket || !user) return;
    socket.emit('set_muted', { token: user.token, room_id: params.id, muted: selfMuted });
  }, [socket, user, params.id, selfMuted]);

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
    const updated = await designateSuccessor(user.token, params.id, targetUserId);
    setRoom(updated);
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
        muted: member.muted,
        peerState: peerStates[member.user_id],
      }),
      speaking: speaking.has(member.user_id),
    };
  });
  const viewerSeat = room.members.find((member) => member.user_id === user.userId)?.seat ?? 0;
  const isHost = room.host_id === user.userId;

  return (
    <div className="relative h-screen overflow-hidden bg-background">
      <RoomTable
        capacity={room.capacity}
        viewerSeat={viewerSeat}
        seats={seats}
        selectedId={selectedId}
        canDesignate={isHost}
        onSelect={(userId) => setSelectedId((current) => (current === userId ? null : userId))}
        onDismiss={dismissOverlays}
        onMakeHost={handleMakeHost}
      />

      <RoomHeader
        name={room.name}
        memberCount={room.members.length}
        capacity={room.capacity}
        micEnabled={micEnabled}
        chatOpen={sidePanel === 'chat'}
        participantsOpen={sidePanel === 'participants'}
        onLeave={handleLeave}
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
            seats={seats}
            capacity={room.capacity}
            canDesignate={isHost}
            onMakeHost={handleMakeHost}
            onClose={() => setSidePanel(null)}
          />
        )}
      </div>

      {micError && (
        <p className="absolute bottom-4 left-4 z-20 max-w-[min(360px,calc(100vw-32px))] rounded-xl bg-black/70 px-3.5 py-2.5 text-sm text-red-400">
          {micError}
        </p>
      )}

      {Object.entries(remoteStreams).map(([peerId, stream]) => (
        <RemoteAudio key={peerId} stream={stream} />
      ))}
    </div>
  );
}
