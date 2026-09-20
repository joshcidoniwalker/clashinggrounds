'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearToken, getToken, getUsernameFromToken } from '@/lib/auth';

function readUsername(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const token = getToken();
  return token ? getUsernameFromToken(token) : null;
}

export default function HomePage() {
  const router = useRouter();
  const [username] = useState<string | null>(readUsername);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
    }
  }, [router]);

  function handleLogout() {
    clearToken();
    router.push('/login');
  }

  if (!username) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0F0F12] text-foreground">
      <p className="text-lg">
        Logged in as <span className="font-bold text-accent">{username}</span>
      </p>
      <p className="text-sm text-[#9A9AA5]">The room browser lands here once Phase 2 is built.</p>
      <button
        onClick={handleLogout}
        className="mt-2 rounded-full border border-[#34343D] px-6 py-2.5 text-sm font-bold hover:bg-[#1B1B20]"
      >
        Log Out
      </button>
    </div>
  );
}
