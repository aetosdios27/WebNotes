import { describe, expect, test } from "bun:test";
import { groupByTime } from "./time-sections";
import { buildRailYears, computeLayout, fisheye, rebaseOrigin, restFocus, restGeometry, tickLength, PEAK, MONTH_HEIGHT } from "./time-rail";

const now = new Date(2026, 10, 14, 12);
const note = (id: string, updatedAt: Date, isPinned = false) => ({ id, updatedAt, isPinned });
const rail = (notes: ReturnType<typeof note>[]) => buildRailYears(groupByTime(notes, { now }));
const view = { top: 0, height: 600 };

describe("rail years", () => {
  test("is absent when there is only one month to move between", () => {
    expect(rail([note("a", new Date(2026, 10, 14, 9)), note("b", new Date(2026, 10, 2)), note("p", new Date(2020, 0, 1), true)])).toEqual([]);
  });

  test("lists only years and months that have notes, newest first, with counts", () => {
    expect(rail([
      note("today", new Date(2026, 10, 14, 9)),
      note("sep-a", new Date(2026, 8, 1)),
      note("sep-b", new Date(2026, 8, 3)),
      note("old", new Date(1990, 11, 31)),
    ])).toEqual([
      { year: 2026, count: 3, months: [{ key: "2026-11", month: 11, count: 1 }, { key: "2026-09", month: 9, count: 2 }] },
      { year: 1990, count: 1, months: [{ key: "1990-12", month: 12, count: 1 }] },
    ]);
  });

  test("tick length grows with the square root of the count", () => {
    expect(tickLength(1, 100)).toBe(5);
    expect(tickLength(25, 100)).toBe(10);
    expect(tickLength(100, 100)).toBe(16);
  });
});

describe("layout", () => {
  test("rest rows are centred in the visible slice and capped at 26px", () => {
    expect(restGeometry(3, view)).toEqual({ base: 26, restTop: 261 });
    const many = restGeometry(100, { top: 40, height: 500 });
    expect(many.base).toBeCloseTo(3.1);
    expect(many.restTop).toBeCloseTo(40 + 95);
  });

  test("the fisheye peaks at the focused row and falls off on both sides", () => {
    const heights = fisheye(4, 20, 10.5);
    expect(heights[10]).toBeCloseTo(PEAK);
    expect(heights[7]).toBeLessThan(heights[9]);
    expect(heights[0]).toBeCloseTo(4);
  });

  test("the hovered row stays under the pointer", () => {
    const pointer = 300;
    const layout = computeLayout({ rows: 100, view, pointer, origin: 0, expanded: null, expandedMonths: 0, anchor: 0 });
    const row = Math.floor(layout.focus!);
    expect(layout.tops[row]).toBeLessThanOrEqual(pointer);
    expect(layout.tops[row] + layout.heights[row]).toBeGreaterThan(pointer);
  });

  test("an expanded year keeps its label anchored and pushes later years down by its months", () => {
    const layout = computeLayout({ rows: 100, view, pointer: 300, origin: 0, expanded: 40, expandedMonths: 12, anchor: 290 });
    expect(layout.tops[40]).toBe(290);
    expect(layout.monthsHeight).toBe(12 * MONTH_HEIGHT + 8);
    expect(layout.tops[41]).toBeCloseTo(290 + layout.heights[40] + layout.monthsHeight);
  });

  test("leaving a year downward continues the sweep at the next year, not decades later", () => {
    const { base, restTop } = restGeometry(100, view);
    const pointer = 480;
    const origin = rebaseOrigin(pointer, restTop, base, 40, "down");
    expect(Math.floor(restFocus(pointer, origin, 100, view))).toBe(41);
    const up = rebaseOrigin(200, restTop, base, 40, "up");
    expect(Math.floor(restFocus(200, up, 100, view))).toBe(39);
  });
});
