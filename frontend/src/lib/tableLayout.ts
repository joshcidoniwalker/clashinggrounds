export const SEAT_DIAMETER = 72;

const TABLE_WIDTH_RATIO = 0.8;
const TABLE_HEIGHT_RATIO = 0.56;
// Negative pulls seats in over the table's rim rather than leaving a gap.
const SEAT_GAP = -30;
const NAME_PLATE_HALF_WIDTH = 55;
const SIDE_CLEARANCE = NAME_PLATE_HALF_WIDTH + 8;
const MIN_HALF_SIZE = 40;

export type SeatPoint = { x: number; y: number; angle: number };

export type TableLayout = {
  table: { left: number; top: number; width: number; height: number };
  seats: SeatPoint[];
};

type OutlineVertex = SeatPoint;

function arc(cx: number, cy: number, r: number, from: number, to: number): OutlineVertex[] {
  const steps = 24;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const angle = from + ((to - from) * i) / steps;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), angle };
  });
}

// Traced clockwise on screen from bottom centre, so seat 0 of the returned
// points is always the bottom-centre chair. Angles are the outward normal,
// kept monotonic (up to 2.5π) so interpolating along a straight edge never
// sweeps through the wrong direction.
function pillOutline(halfWidth: number, halfHeight: number): OutlineVertex[] {
  const r = Math.min(halfWidth, halfHeight);
  const sx = halfWidth - r;
  const sy = halfHeight - r;
  const PI = Math.PI;
  return [
    { x: 0, y: halfHeight, angle: PI / 2 },
    ...arc(-sx, sy, r, PI / 2, PI),
    ...arc(-sx, -sy, r, PI, 1.5 * PI),
    ...arc(sx, -sy, r, 1.5 * PI, 2 * PI),
    ...arc(sx, sy, r, 2 * PI, 2.5 * PI),
    { x: 0, y: halfHeight, angle: 2.5 * PI },
  ];
}

function evenlySpaced(outline: OutlineVertex[], count: number): SeatPoint[] {
  const cumulative = [0];
  for (let i = 1; i < outline.length; i++) {
    const a = outline[i - 1];
    const b = outline[i];
    cumulative.push(cumulative[i - 1] + Math.hypot(b.x - a.x, b.y - a.y));
  }
  const total = cumulative[cumulative.length - 1];

  let segment = 1;
  return Array.from({ length: count }, (_, k) => {
    const target = (k / count) * total;
    while (cumulative[segment] < target) segment++;
    const a = outline[segment - 1];
    const b = outline[segment];
    const span = cumulative[segment] - cumulative[segment - 1];
    const t = span === 0 ? 0 : (target - cumulative[segment - 1]) / span;
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      angle: a.angle + (b.angle - a.angle) * t,
    };
  });
}

export function tableLayout(width: number, height: number, capacity: number): TableLayout {
  const ringOffset = SEAT_GAP + SEAT_DIAMETER / 2;
  // On narrow screens the ratio alone would push side seats (and their name
  // plates) off the edge, so the table also shrinks to keep them on screen.
  const maxHalfWidth = width / 2 - ringOffset - SIDE_CLEARANCE;
  const halfWidth = Math.max(
    MIN_HALF_SIZE,
    Math.min((width * TABLE_WIDTH_RATIO) / 2, maxHalfWidth),
  );
  const halfHeight = (height * TABLE_HEIGHT_RATIO) / 2;
  const cx = width / 2;
  const cy = height / 2;

  const seats = evenlySpaced(
    pillOutline(halfWidth + ringOffset, halfHeight + ringOffset),
    capacity,
  ).map((p) => ({ x: cx + p.x, y: cy + p.y, angle: p.angle }));

  return {
    table: {
      left: cx - halfWidth,
      top: cy - halfHeight,
      width: halfWidth * 2,
      height: halfHeight * 2,
    },
    seats,
  };
}

// Every client draws its own seat at bottom centre (position 0); the rest keep
// the server's seat order, so neighbours agree on who sits beside whom.
export function positionOfSeat(seat: number, viewerSeat: number, capacity: number): number {
  return (seat - viewerSeat + capacity) % capacity;
}
