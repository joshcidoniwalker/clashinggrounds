export function PeopleIcon({ size = 13, color = '#9A9AA5' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="9" cy="8" r="3" />
      <path d="M2 20c0-3.3 3-5 7-5s7 1.7 7 5" />
      <circle cx="17" cy="8" r="2.4" />
      <path d="M16 15.2c2.7.3 4 1.6 4 4.3" />
    </svg>
  );
}

export function CrownIcon({
  variant,
  className,
}: {
  variant: 'host' | 'next';
  className?: string;
}) {
  const fill = variant === 'host' ? '#FFB020' : 'rgba(124,92,255,0.25)';
  const stroke = variant === 'host' ? '#8A5A00' : '#7C5CFF';
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden>
      <path
        d="M2 14 L3.5 4 L8.5 8.5 L12 1.5 L15.5 8.5 L20.5 4 L22 14 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MicOffIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#FF3B30"
      strokeWidth="2.6"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M9 9v2a3 3 0 0 0 5 2.2M15 9.3V5a3 3 0 0 0-5.7-1.3" />
      <path d="M19 11a7 7 0 0 1-1.1 3.7M5 11a7 7 0 0 0 11 5.7M12 18v3M3 3l18 18" />
    </svg>
  );
}

export function AlertIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#FF3B30"
      strokeWidth="3"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M12 5v9M12 19v.5" />
    </svg>
  );
}
