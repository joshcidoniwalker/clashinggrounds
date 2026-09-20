import type { ReactNode } from 'react';

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0F0F12]">
      <div className="absolute -top-44 left-1/2 h-96 w-[900px] -translate-x-1/2 rounded-full bg-accent opacity-10 blur-3xl" />

      <div className="relative flex w-full max-w-[440px] flex-col gap-4 rounded-3xl border border-[#2C2C34] bg-[#1B1B20] p-10 shadow-2xl">
        <div className="mb-1 flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-accent">
            <span className="font-display text-[19px] font-bold text-white">C</span>
          </div>
          <span className="font-display text-xl font-bold tracking-[0.2px] text-foreground">
            Clashing Grounds
          </span>
        </div>

        {children}
      </div>
    </div>
  );
}
