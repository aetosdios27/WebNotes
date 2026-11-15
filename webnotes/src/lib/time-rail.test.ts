import { describe, it, expect } from "vitest";
import { groupByTime } from "./time-sections";
import { buildRailYears, restBase, fisheyeHeights, rebaseOrigin, computeLayout } from "./time-rail";

// helper to build sections
function mkNotes(spec: { y: number; m: number; n: number }[]) {
  const notes: any[] = [];
  let i = 0;
  for (const s of spec) for (let k = 0; k < s.n; k++) notes.push({ id: `n${i++}`, updatedAt: new Date(s.y, s.m - 1, 15) });
  return notes;
}

describe("time-rail bucketing", () => {
  it("leaves out years with no notes", () => {
    const notes = mkNotes([{ y: 2026, m: 1, n: 2 }, { y: 2024, m: 3, n: 1 }]);
    const sections = groupByTime(notes, { now: new Date(2026, 0, 20) });
    const years = buildRailYears(sections);
    expect(years.map(y => y.year)).toEqual([2026, 2024]);
  });
  it("one row per year with notes", () => {
    const notes = mkNotes([{ y: 2026, m: 1, n: 1 }]);
    const sections = groupByTime(notes, { now: new Date(2026, 0, 20) });
    const years = buildRailYears(sections);
    expect(years).toHaveLength(1);
    expect(years[0].count).toBe(1);
  });
});

describe("fisheye heights", () => {
  it("peak row about 20", () => {
    const h = fisheyeHeights(5, 10, 4.5);
    const peak = Math.max(...h);
    expect(peak).toBeGreaterThan(18);
    expect(peak).toBeLessThanOrEqual(20);
  });
});

describe("exit re-basing", () => {
  it("computes origin", () => {
    expect(rebaseOrigin(100, 10, 2, -0.02, 5)).toBe(100 - 10 - (2 - 0.02) * 5);
  });
});
