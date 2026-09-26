'use client';

import { useCallback, useEffect, useState } from 'react';
import { getRoomCategories, type RoomCategory } from '@/lib/api';

export function useRoomCategories() {
  const [categories, setCategories] = useState<RoomCategory[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    getRoomCategories()
      .then(setCategories)
      .catch(() => setFailed(true));
  }, []);

  useEffect(load, [load]);

  function retry() {
    setFailed(false);
    load();
  }

  return { categories, failed, retry };
}
