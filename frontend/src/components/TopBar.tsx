export function TopBar({ username, onLogout }: { username: string; onLogout: () => void }) {
  return (
    <nav className="flex w-full items-center justify-between border-b border-[#212127] bg-[#131317] px-12 py-4.5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-accent">
          <span className="font-display text-[15px] font-bold text-white">C</span>
        </div>
        <span className="font-display text-[15px] font-bold text-foreground">Clashing Grounds</span>
      </div>
      <div className="flex items-center gap-4.5">
        <span className="text-[13px] font-bold text-[#9A9AA5]">{username}</span>
        <button onClick={onLogout} className="text-[13px] font-bold text-foreground">
          Log Out
        </button>
      </div>
    </nav>
  );
}
