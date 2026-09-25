export function CategoryPill({ name }: { name: string }) {
  return (
    <span className="w-fit rounded-full bg-[#232329] px-2.5 py-0.5 text-[11px] font-bold text-[#9A9AA5]">
      {name}
    </span>
  );
}
