'use client';

import { useEffect } from 'react';

const DURATION_MS = 4000;

export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const timeout = setTimeout(onDone, DURATION_MS);
    return () => clearTimeout(timeout);
  }, [message, onDone]);

  return (
    <div
      role="status"
      className="pointer-events-none absolute bottom-6 left-1/2 z-40 max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-full border border-[#2C2C34] bg-[#1B1B20] px-5 py-2.5 text-sm font-extrabold text-foreground shadow-[0_20px_40px_-10px_rgba(0,0,0,0.7)]"
    >
      {message}
    </div>
  );
}
