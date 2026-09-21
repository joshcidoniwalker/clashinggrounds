'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { ChatPanel } from '@/components/ChatPanel';
import { MemberRow } from '@/components/MemberRow';
import { TopBar } from '@/components/TopBar';
import { useAuthUser } from '@/hooks/useAuthUser';
import { clearToken } from '@/lib/auth';
import {
  GAME_API_URL,
  designateSuccessor,
  getRoom,
  leaveRoom,
  type ChatMessage,
  type RoomDetail,
} from '@/lib/gameApi';

export default function RoomViewPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const user = useAuthUser();
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) return;

    getRoom(user.token, params.id).then(setRoom);

    const socket: Socket = io(GAME_API_URL);
    socketRef.current = socket;

    // Re-emitted on every reconnect, not just the first connect, so a dropped
    // socket rejoins the broadcast group and re-fetches the chat buffer.
    socket.on('connect', () => {
      socket.emit('join_room', { token: user.token, room_id: params.id });
    });
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
    };
  }, [user, params.id, router]);

  function handleLogout() {
    clearToken();
    router.push('/login');
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

  return (
    <div className="min-h-screen bg-[#0F0F12]">
      <TopBar username={user.username} onLogout={handleLogout} />

      <div className="flex justify-center px-12 pt-11 pb-10">
        <div className="flex w-full max-w-[1040px] flex-col gap-7">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1.5">
              <h1 className="font-display text-2xl font-bold text-foreground">{room.name}</h1>
              <span className="text-sm text-[#9A9AA5]">
                {room.members.length}/{room.capacity} members
              </span>
            </div>
            <button
              onClick={handleLeave}
              className="rounded-full border border-[#34343D] px-5.5 py-2.5 text-sm font-extrabold text-foreground"
            >
              Leave Room
            </button>
          </div>

          <div className="flex items-start gap-6">
            <div className="flex flex-1 flex-col gap-2.5">
              {room.members.map((member) => (
                <MemberRow
                  key={member.user_id}
                  member={member}
                  isHost={member.user_id === room.host_id}
                  isDesignatedSuccessor={member.user_id === room.designated_successor_id}
                  showMakeHost={room.host_id === user.userId && member.user_id !== user.userId}
                  onMakeHost={() => handleMakeHost(member.user_id)}
                />
              ))}
            </div>

            <div className="w-[400px] shrink-0">
              <ChatPanel
                messages={messages}
                currentUserId={user.userId}
                error={chatError}
                onSend={handleSend}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
