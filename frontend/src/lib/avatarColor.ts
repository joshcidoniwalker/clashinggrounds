const PALETTE = ['#7C5CFF', '#FF7A45', '#FFB020', '#2FD675', '#FF3B30', '#3B9EFF'];

export function avatarColorFor(userId: string): string {
  const hash = [...userId].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return PALETTE[hash % PALETTE.length];
}
