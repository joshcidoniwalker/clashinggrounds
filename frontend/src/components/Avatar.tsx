import { avatarColorFor } from '@/lib/avatarColor';

// Placeholder until the character system (Phase 6) renders real characters —
// every seat, list row and popover goes through this one component.
export function Avatar({
  userId,
  username,
  size,
}: {
  userId: string;
  username: string;
  size: number;
}) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-display font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: avatarColorFor(userId),
      }}
    >
      {username[0]?.toUpperCase()}
    </div>
  );
}
