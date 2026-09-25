export function NextHostButton({
  isNextHost,
  onMakeHost,
  compact = false,
}: {
  isNextHost: boolean;
  onMakeHost: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onMakeHost}
      disabled={isNextHost}
      className={`shrink-0 cursor-pointer rounded-full border font-extrabold disabled:cursor-default ${
        compact ? 'px-2.5 py-1.25 text-[11px]' : 'px-3.5 py-2 text-[13px]'
      } ${isNextHost ? 'border-[#7C5CFF] text-[#7C5CFF]' : 'border-white/20 text-foreground'}`}
    >
      {isNextHost ? 'Next Host ✓' : 'Set as Next Host'}
    </button>
  );
}
