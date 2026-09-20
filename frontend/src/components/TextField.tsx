import type { InputHTMLAttributes } from 'react';

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function TextField({ label, id, ...inputProps }: TextFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-xs font-bold tracking-[0.6px] text-[#9A9AA5] uppercase">
        {label}
      </label>
      <input
        id={id}
        className="w-full rounded-xl border border-[#34343D] bg-[#232329] px-4 py-3 text-[15px] text-foreground placeholder-[#6E6E78] outline-none focus:border-accent focus:ring-3 focus:ring-accent/25"
        {...inputProps}
      />
    </div>
  );
}
