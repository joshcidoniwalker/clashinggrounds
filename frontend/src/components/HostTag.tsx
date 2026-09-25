export function HostTag({ variant }: { variant: 'host' | 'next' }) {
  return variant === 'host' ? (
    <span className="shrink-0 rounded-full bg-[#FFB020]/15 px-2 py-0.5 text-[10px] font-extrabold tracking-[0.3px] text-[#FFB020] uppercase">
      Host
    </span>
  ) : (
    <span className="shrink-0 rounded-full bg-[#7C5CFF]/15 px-2 py-0.5 text-[10px] font-extrabold tracking-[0.3px] text-[#7C5CFF] uppercase">
      Next Host
    </span>
  );
}
