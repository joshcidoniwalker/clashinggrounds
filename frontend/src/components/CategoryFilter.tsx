import type { RoomCategory } from '@/lib/api';

function FilterChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={
        selected
          ? 'rounded-full bg-accent px-4 py-2 text-[13px] font-extrabold text-white'
          : 'rounded-full border border-[#34343D] bg-[#1B1B20] px-4 py-2 text-[13px] font-bold text-[#9A9AA5] hover:text-foreground'
      }
    >
      {label}
    </button>
  );
}

export function CategoryFilter({
  categories,
  selected,
  onSelect,
}: {
  categories: RoomCategory[];
  selected: string | null;
  onSelect: (slug: string | null) => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      <FilterChip label="All" selected={selected === null} onClick={() => onSelect(null)} />
      {categories.map((category) => (
        <FilterChip
          key={category.slug}
          label={category.name}
          selected={selected === category.slug}
          onClick={() => onSelect(category.slug)}
        />
      ))}
    </div>
  );
}
