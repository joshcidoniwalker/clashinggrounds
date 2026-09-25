'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CreateRoomModal } from '@/components/CreateRoomModal';
import { RoomCard } from '@/components/RoomCard';
import { TopBar } from '@/components/TopBar';
import { useAuthUser } from '@/hooks/useAuthUser';
import { ApiError } from '@/lib/api';
import { clearToken } from '@/lib/auth';
import { browseRooms, createRoom, joinRoom, type RoomSummary } from '@/lib/gameApi';

export default function RoomsPage() {
  const router = useRouter();
  const user = useAuthUser();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    browseRooms().then(setRooms);
  }, [user]);

  function handleLogout() {
    clearToken();
    router.push('/');
  }

  async function handleCreate(name: string, capacity: number) {
    if (!user) return;
    setCreating(true);
    setCreateError(null);
    try {
      const room = await createRoom(user.token, name, capacity);
      router.push(`/rooms/${room.id}`);
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Something went wrong');
      setCreating(false);
    }
  }

  async function handleJoin(roomId: string) {
    if (!user) return;
    setJoiningId(roomId);
    try {
      await joinRoom(user.token, roomId);
      router.push(`/rooms/${roomId}`);
    } catch {
      setJoiningId(null);
    }
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0F0F12]">
      <TopBar username={user.username} onLogout={handleLogout} />

      <div className="px-12 pt-10 pb-20">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-foreground">Rooms</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-full bg-accent px-6.5 py-3 text-sm font-extrabold text-white"
          >
            + Create Room
          </button>
        </div>

        <div className="grid grid-cols-4 gap-6">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              joining={joiningId === room.id}
              onJoin={() => handleJoin(room.id)}
            />
          ))}
        </div>

        {rooms.length === 0 && <p className="text-sm text-[#9A9AA5]">No rooms yet — create one.</p>}
      </div>

      {showCreate && (
        <CreateRoomModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
          creating={creating}
          error={createError}
        />
      )}
    </div>
  );
}
