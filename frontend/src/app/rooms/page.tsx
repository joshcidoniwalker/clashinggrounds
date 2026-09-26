'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CategoryFilter } from '@/components/CategoryFilter';
import { CreateRoomModal } from '@/components/CreateRoomModal';
import { RoomCard } from '@/components/RoomCard';
import { TopBar } from '@/components/TopBar';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useRoomCategories } from '@/hooks/useRoomCategories';
import { ApiError } from '@/lib/api';
import { clearToken } from '@/lib/auth';
import { browseRooms, createRoom, joinRoom, type RoomSummary } from '@/lib/gameApi';

export default function RoomsPage() {
  const router = useRouter();
  const user = useAuthUser();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const { categories } = useRoomCategories();
  const [filter, setFilter] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    // Switching filters quickly can land responses out of order; only the
    // latest filter's response may update the list.
    let stale = false;
    browseRooms(filter).then((result) => {
      if (!stale) setRooms(result);
    });
    return () => {
      stale = true;
    };
  }, [user, filter]);

  function handleLogout() {
    clearToken();
    router.push('/');
  }

  async function handleCreate(name: string, category: string, capacity: number) {
    if (!user) return;
    setCreating(true);
    setCreateError(null);
    try {
      const room = await createRoom(user.token, name, category, capacity);
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

  const filterName = categories?.find((c) => c.slug === filter)?.name;

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

        {categories && (
          <CategoryFilter categories={categories} selected={filter} onSelect={setFilter} />
        )}

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

        {rooms.length === 0 && (
          <p className="text-sm text-[#9A9AA5]">
            {filterName
              ? `No ${filterName} rooms are open right now.`
              : 'No rooms yet — create one.'}
          </p>
        )}
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
