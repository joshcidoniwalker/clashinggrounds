'use client';

import { useEffect, useRef, useState } from 'react';

const POLL_MS = 100;
const LEVEL_THRESHOLD = 0.04;
// Speech has short gaps between words; holding the ring on briefly stops it
// flickering off mid-sentence.
const HOLD_MS = 350;

type Meter = { source: MediaStreamAudioSourceNode; analyser: AnalyserNode; lastHeard: number };

function levelOf(analyser: AnalyserNode, buffer: Uint8Array<ArrayBuffer>): number {
  analyser.getByteTimeDomainData(buffer);
  let sum = 0;
  for (const sample of buffer) {
    const centred = (sample - 128) / 128;
    sum += centred * centred;
  }
  return Math.sqrt(sum / buffer.length);
}

export function useSpeaking(streams: Record<string, MediaStream>): Set<string> {
  const [speaking, setSpeaking] = useState<Set<string>>(() => new Set());
  const contextRef = useRef<AudioContext | null>(null);
  const metersRef = useRef<Map<string, Meter>>(new Map());

  useEffect(() => {
    const context = contextRef.current ?? new AudioContext();
    contextRef.current = context;
    context.resume();
    const meters = metersRef.current;

    for (const [id, stream] of Object.entries(streams)) {
      if (meters.has(id)) continue;
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      meters.set(id, { source, analyser, lastHeard: 0 });
    }

    for (const [id, meter] of meters) {
      if (streams[id]) continue;
      meter.source.disconnect();
      meters.delete(id);
    }
  }, [streams]);

  useEffect(() => {
    const buffer = new Uint8Array(512);
    const interval = setInterval(() => {
      const now = performance.now();
      const next = new Set<string>();
      for (const [id, meter] of metersRef.current) {
        if (levelOf(meter.analyser, buffer) > LEVEL_THRESHOLD) meter.lastHeard = now;
        if (now - meter.lastHeard < HOLD_MS) next.add(id);
      }
      setSpeaking((current) => (sameMembers(current, next) ? current : next));
    }, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const meters = metersRef.current;
    return () => {
      meters.clear();
      contextRef.current?.close();
      contextRef.current = null;
    };
  }, []);

  return speaking;
}

function sameMembers(a: Set<string>, b: Set<string>): boolean {
  return a.size === b.size && [...a].every((id) => b.has(id));
}
