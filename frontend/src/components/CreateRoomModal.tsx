'use client';

import { useState } from 'react';

const MIN_CAPACITY = 2;
const MAX_CAPACITY = 12;

export function CreateRoomModal({
  onClose,
  onCreate,
  creating,
  error,
}: {
  onClose: () => void;
  onCreate: (name: string, capacity: number) => void;
  creating: boolean;
  error: string | null;
}) {
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState(8);

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/80">
      <div className="flex w-[440px] flex-col gap-5 rounded-3xl border border-[#2C2C34] bg-[#1B1B20] p-9 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-foreground">Create a Room</h2>
          <button onClick={onClose} className="text-lg font-bold text-[#9A9AA5]">
            ×
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="room-name"
            className="text-xs font-bold tracking-[0.6px] text-[#9A9AA5] uppercase"
          >
            Room Name
          </label>
          <input
            id="room-name"
            type="text"
            placeholder="Late Night Lounge"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-[#34343D] bg-[#232329] px-4 py-3 text-[15px] text-foreground outline-none focus:border-accent focus:ring-3 focus:ring-accent/25"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold tracking-[0.6px] text-[#9A9AA5] uppercase">
            Capacity
          </label>
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => setCapacity((c) => Math.max(MIN_CAPACITY, c - 1))}
              className="h-10 w-10 rounded-xl border border-[#34343D] bg-[#232329] text-lg font-bold text-foreground"
            >
              −
            </button>
            <span className="min-w-8 text-center font-display text-lg font-bold text-foreground">
              {capacity}
            </span>
            <button
              type="button"
              onClick={() => setCapacity((c) => Math.min(MAX_CAPACITY, c + 1))}
              className="h-10 w-10 rounded-xl border border-[#34343D] bg-[#232329] text-lg font-bold text-foreground"
            >
              +
            </button>
            <span className="text-xs text-[#6E6E78]">max {MAX_CAPACITY}</span>
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="mt-2 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-[#34343D] py-3.5 font-extrabold text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={() => onCreate(name, capacity)}
            disabled={creating || name.trim().length === 0}
            className="flex-1 rounded-full bg-accent py-3.5 font-extrabold text-white disabled:opacity-60"
          >
            {creating ? 'Creating…' : 'Create Room'}
          </button>
        </div>
      </div>
    </div>
  );
}
