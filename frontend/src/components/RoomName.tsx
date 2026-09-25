'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { useElementSize } from '@/hooks/useElementSize';

export function RoomName({ name }: { name: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const size = useElementSize(ref);
  const [truncated, setTruncated] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (element) setTruncated(element.scrollWidth > element.clientWidth);
  }, [name, size]);

  return (
    <div className="group relative min-w-0">
      <h1
        ref={ref}
        tabIndex={truncated ? 0 : undefined}
        aria-describedby={truncated ? 'room-name-full' : undefined}
        className="max-w-[440px] truncate text-center font-title text-2xl font-extrabold text-foreground [text-shadow:0_2px_10px_rgba(0,0,0,0.9)] max-sm:max-w-full max-sm:text-lg"
      >
        {name}
      </h1>
      {truncated && (
        <span
          id="room-name-full"
          role="tooltip"
          className="pointer-events-none absolute top-[calc(100%+8px)] left-1/2 z-40 hidden w-max max-w-[min(480px,calc(100vw-32px))] -translate-x-1/2 rounded-xl border border-[#2C2C34] bg-[#1B1B20] px-3 py-2 text-center text-sm font-bold text-foreground shadow-[0_12px_30px_-8px_rgba(0,0,0,0.7)] group-focus-within:block group-hover:block"
        >
          {name}
        </span>
      )}
    </div>
  );
}
