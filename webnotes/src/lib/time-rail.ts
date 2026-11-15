import { monthKey, type MonthKey, type Section } from "./time-sections";

export type RailMonth = { key: MonthKey; month: number; count: number };
export type RailYear = { year: number; months: RailMonth[]; count: number };

export const PEAK = 20;
export const SIGMA = 2.6;
export const MONTH_HEIGHT = 15;
export const DWELL_MS = 200;
export const LERP = 0.2;

/** Build rail data from wall sections: one row per year that has notes. */
export function buildRailYears(sections: readonly Section<unknown>[]): RailYear[] {
  const byMonth = new Map<MonthKey, number>();
  for (const section of sections) {
    if (section.kind === "pinned") continue;
    for (const note of section.notes) {
      const k = monthKey(new Date((note as { updatedAt: Date | string | number }).updatedAt));
      byMonth.set(k, (byMonth.get(k) ?? 0) + 1);
    }
  }
  // months not present in sections? section.months tracks months; but counting via notes is enough.
  // Ensure months that have notes but maybe not counted? already.
  const years: RailYear[] = [];
  const monthKeys = [...byMonth.keys()].sort((a, b) => (a > b ? -1 : 1));
  for (const key of monthKeys) {
    const [year, month] = key.split("-").map(Number);
    if (years.at(-1)?.year !== year) years.push({ year, months: [], count: 0 });
    const y = years.at(-1)!;
    y.months.push({ key, month, count: byMonth.get(key)! });
    y.count += byMonth.get(key)!;
  }
  // months newest first already due to sort; but ensure within year desc
  for (const y of years) y.months.sort((a, b) => b.month - a.month);
  return years;
}

export function restBase(N: number, H: number): number {
  if (N <= 0) return 0;
  return Math.min(26, (H * 0.62) / N);
}

export function restTopOffset(N: number, H: number, base: number): number {
  return (H - base * N) / 2;
}

export type LayoutInput = {
  N: number;
  H: number;
  py: number | null;
  origin: number;
  expandedIndex: number | null;
  expandedMonthCount: number;
  anchor: number;
};

export type LayoutResult = {
  h: number[];
  top: number[];
  u: number | null;
  base: number;
  restTop: number;
  extra: number;
};

export function computeLayout(input: LayoutInput): LayoutResult {
  const { N, H, py, origin, expandedIndex, anchor } = input;
  const base = restBase(N, H);
  const restTop = restTopOffset(N, H, base);
  const h = new Array(N).fill(base);
  let u: number | null = null;
  if (py != null) {
    u = expandedIndex != null ? expandedIndex + 0.5 : Math.max(0, Math.min(N - 0.001, (py - origin - restTop) / base));
    for (let i = 0; i < N; i++) {
      h[i] = base + Math.max(0, PEAK - base) * Math.exp(-(((i + 0.5 - u) / SIGMA) ** 2));
    }
  }
  const extra = expandedIndex != null ? input.expandedMonthCount * MONTH_HEIGHT + 8 : 0;
  // extra needs month count; caller passes via expandedExtra maybe. We'll instead compute in component.
  const acc: number[] = [];
  let a = 0;
  for (let i = 0; i < N; i++) {
    acc.push(a);
    a += h[i] + (i === expandedIndex ? extra : 0);
  }
  let off: number;
  if (u == null) off = restTop;
  else if (expandedIndex != null) off = anchor - acc[expandedIndex];
  else {
    const k = Math.floor(u);
    off = py! - (acc[k] + (u - k) * h[k]);
  }
  const top = new Array(N);
  for (let i = 0; i < N; i++) top[i] = off + acc[i];
  return { h, top, u, base, restTop, extra };
}

export function rebaseOrigin(py: number, restTop: number, index: number, offset: number, base: number): number {
  return py - restTop - (index + offset) * base;
}

/** Fisheye heights for given base, N, pointer u. */
export function fisheyeHeights(base: number, N: number, u: number, peak = PEAK, sigma = SIGMA): number[] {
  const h = new Array(N).fill(base);
  for (let i = 0; i < N; i++) h[i] = base + Math.max(0, peak - base) * Math.exp(-(((i + 0.5 - u) / sigma) ** 2));
  return h;
}
