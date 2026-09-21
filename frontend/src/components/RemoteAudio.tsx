'use client';

import { useEffect, useRef } from 'react';

export function RemoteAudio({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLAudioElement>(null);

  // srcObject holds a live object, so it can't be set through a JSX attribute.
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);

  return <audio ref={ref} autoPlay />;
}
