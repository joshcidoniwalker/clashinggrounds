'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { decodeToken, getToken } from '@/lib/auth';

// The landing page is for visitors; someone already signed in belongs in the
// room browser. The token lives in localStorage, so this can only run client-side.
export function RedirectIfSignedIn() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (token && decodeToken(token)) router.replace('/rooms');
  }, [router]);

  return null;
}
