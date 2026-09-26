export function RowAction({
  label,
  onClick,
  disabled = false,
  compact = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`shrink-0 cursor-pointer rounded-full border border-white/20 font-extrabold text-foreground disabled:cursor-default disabled:opacity-40 ${
        compact ? 'px-2.5 py-1.25 text-[11px]' : 'px-3.5 py-2 text-[13px]'
      }`}
    >
      {label}
    </button>
  );
}
