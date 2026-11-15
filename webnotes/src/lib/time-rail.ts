import { monthKey, type MonthKey, type Section } from "./time-sections";

export type RailMonth = { key: MonthKey; month: number; count: number };
export type RailYear = { year: number; months: RailMonth[]; count: number };

export const PEAK = 20;
export const SIGMA = 2.6;
export const MONTH_HEIGHT = 15;
export const DWELL_MS = 200;
export const LERP = 0.2;
const MAX_ROW = 26;
const REST_SHARE = 0.62;

/** One row per year that has notes, newest first; absent when there is only one month to move between. */
export function buildRailYears(sections: readonly Section<{ updatedAt: Date | string | number }>[]): RailYear[] {
  const byMonth = new Map<MonthKey, number>();
  for (const section of sections) {
    if (section.kind === "pinned") continue;
    for (const note of section.notes) {
      const key = monthKey(new Date(note.updatedAt));
      byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
    }
  }
  if (byMonth.size < 2) return [];
  const years: RailYear[] = [];
  for (const key of [...byMonth.keys()].sort().reverse()) {
    const [year, month] = key.split("-").map(Number);
    if (years.at(-1)?.year !== year) years.push({ year, months: [], count: 0 });
    const count = byMonth.get(key)!;
    const row = years.at(-1)!;
    row.months.push({ key, month, count });
    row.count += count;
  }
  return years;
}

export const tickLength = (count: number, max: number) => 4 + Math.round(12 * Math.sqrt(count / Math.max(1, max)));

/** The visible slice of the rail, in rail coordinates. */
export type Viewport = { top: number; height: number };

export type LayoutInput = {
  rows: number;
  view: Viewport;
  /** Pointer y in rail coordinates, or null when the rail is at rest. */
  pointer: number | null;
  /** Shift applied to the rest mapping after leaving an expanded year, so the sweep continues without a jump. */
  origin: number;
  expanded: number | null;
  expandedMonths: number;
  /** Where the expanded year's row top stays pinned. */
  anchor: number;
};

export type Layout = {
  heights: number[];
  tops: number[];
  /** Continuous row index under the pointer, or null at rest. */
  focus: number | null;
  base: number;
  restTop: number;
  monthsHeight: number;
};

export function restGeometry(rows: number, view: Viewport) {
  const base = rows ? Math.min(MAX_ROW, (view.height * REST_SHARE) / rows) : 0;
  return { base, restTop: view.top + (view.height - base * rows) / 2 };
}

export function fisheye(base: number, rows: number, focus: number): number[] {
  return Array.from({ length: rows }, (_, i) => base + Math.max(0, PEAK - base) * Math.exp(-(((i + 0.5 - focus) / SIGMA) ** 2)));
}

/** Rows the pointer maps to through the rest layout, independent of the magnified display. */
export function restFocus(pointer: number, origin: number, rows: number, view: Viewport): number {
  const { base, restTop } = restGeometry(rows, view);
  return Math.max(0, Math.min(rows - 0.001, (pointer - origin - restTop) / base));
}

export function computeLayout({ rows, view, pointer, origin, expanded, expandedMonths, anchor }: LayoutInput): Layout {
  const { base, restTop } = restGeometry(rows, view);
  const focus = pointer == null ? null : expanded != null ? expanded + 0.5 : restFocus(pointer, origin, rows, view);
  const heights = focus == null ? new Array<number>(rows).fill(base) : fisheye(base, rows, focus);
  const monthsHeight = expanded != null ? expandedMonths * MONTH_HEIGHT + 8 : 0;
  const offsets: number[] = [];
  let sum = 0;
  for (let i = 0; i < rows; i++) {
    offsets.push(sum);
    sum += heights[i] + (i === expanded ? monthsHeight : 0);
  }
  let start = restTop;
  if (focus != null && expanded != null) start = anchor - offsets[expanded];
  else if (focus != null) {
    const row = Math.floor(focus);
    start = pointer! - (offsets[row] + (focus - row) * heights[row]);
  }
  return { heights, tops: offsets.map(offset => start + offset), focus, base, restTop, monthsHeight };
}

/**
 * Origin that maps the pointer onto the row next to the year being left, so collapsing a
 * year continues the sweep at its neighbour instead of jumping by the collapsed months.
 */
export function rebaseOrigin(pointer: number, restTop: number, base: number, row: number, direction: "up" | "down"): number {
  return pointer - restTop - (row + (direction === "up" ? -0.02 : 1.02)) * base;
}
