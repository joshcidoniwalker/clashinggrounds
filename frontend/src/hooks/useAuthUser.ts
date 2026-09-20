'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { decodeToken, getToken, type TokenClaims } from '@/lib/auth';

type AuthUser = TokenClaims & { token: string };

export function useAuthUser() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const token = getToken();
    const claims = token ? decodeToken(token) : null;

    if (!token || !claims) {
      router.replace('/login');
      return;
    }

    // Reading localStorage can't happen during the initial render (it would
    // mismatch the server's render), so this has to live in an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser({ ...claims, token });
  }, [router]);

  return user;
}
