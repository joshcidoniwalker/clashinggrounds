'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CategoryFilter } from '@/components/CategoryFilter';
import { CategoryPill } from '@/components/CategoryPill';
import { PeopleIcon } from '@/components/icons';
import { useRoomCategories } from '@/hooks/useRoomCategories';
import { browseRooms, type RoomSummary } from '@/lib/gameApi';

const THUMBNAIL =
  'relative block aspect-[16/10] w-full overflow-hidden rounded-[14px] bg-[radial-gradient(120%_140%_at_30%_20%,rgba(47,214,117,0.22),rgba(20,20,24,0.95)_65%)]';
const OVERLAY =
  'absolute inset-0 flex translate-y-1.5 items-center justify-center bg-[#0A0A0C]/55 opacity-0 transition duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100';

function RoomTile({ room }: { room: RoomSummary }) {
  const full = room.member_count >= room.capacity;

  return (
    <div>
      {full ? (
        <div className={`group ${THUMBNAIL}`}>
          <div className={OVERLAY}>
            <span className="rounded-full bg-[#4A4A52] px-7.5 py-2.5 text-sm font-extrabold text-white/70">
              Full
            </span>
          </div>
        </div>
      ) : (
        // Visitors have no account yet, so joining starts at signup.
        <Link href="/signup" aria-label={`Join ${room.name}`} className={`group ${THUMBNAIL}`}>
          <div className={OVERLAY}>
            <span className="rounded-full bg-accent px-7.5 py-2.5 text-sm font-extrabold text-white">
              Join
            </span>
          </div>
        </Link>
      )}
      <div className="mt-3 flex flex-col gap-1.5">
        <CategoryPill name={room.category.name} />
        <span className="truncate text-base font-semibold text-foreground">{room.name}</span>
        <div className="flex items-center gap-1.5">
          <PeopleIcon size={14} />
          <span className="text-[13px] text-[#9A9AA5] tabular-nums">
            {room.member_count}/{room.capacity} members
          </span>
        </div>
      </div>
    </div>
  );
}

function RoomGrid({ rooms, filterName }: { rooms: RoomSummary[]; filterName?: string }) {
  if (rooms.length === 0) {
    return (
      <p className="text-sm text-[#9A9AA5]">
        {filterName ? `No ${filterName} rooms are open right now.` : 'No rooms are open right now.'}{' '}
        <Link href="/signup" className="font-extrabold text-accent hover:text-[#58E497]">
          Sign up and start one.
        </Link>
      </p>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-6 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
      {rooms.map((room) => (
        <RoomTile key={room.id} room={room} />
      ))}
    </div>
  );
}

export function ExploreRooms() {
  const [rooms, setRooms] = useState<RoomSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const { categories } = useRoomCategories();
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    // Switching filters quickly can land responses out of order; only the
    // latest filter's response may update the list.
    let stale = false;
    browseRooms(filter)
      .then((result) => {
        if (!stale) setRooms(result);
      })
      .catch(() => {
        if (!stale) setFailed(true);
      });
    return () => {
      stale = true;
    };
  }, [filter]);

  if (failed) {
    return <p className="text-sm text-[#6E6E78]">Rooms couldn’t be loaded right now.</p>;
  }
  if (!rooms) return null;

  return (
    <>
      {categories && (
        <CategoryFilter categories={categories} selected={filter} onSelect={setFilter} />
      )}
      <RoomGrid rooms={rooms} filterName={categories?.find((c) => c.slug === filter)?.name} />
    </>
  );
}
