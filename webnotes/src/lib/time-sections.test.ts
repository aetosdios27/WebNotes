// Local-time boundaries, checked in a zone with a DST change inside the fixtures.
process.env.TZ = "America/Los_Angeles";
import { describe, expect, test } from "bun:test";

test("runs in the fixture zone", () => {
  expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("America/Los_Angeles");
  expect(new Date(2026, 9, 31).getTimezoneOffset()).not.toBe(new Date(2026, 10, 2).getTimezoneOffset());
});
import {
  BATCH, cardSize, foldedCount, groupByTime, limitToReach, loadedSections,
  sectionForMonth, sectionMonth, PINNED_ROWS,
} from "./time-sections";

type N = { id: string; updatedAt: Date; isPinned?: boolean };
const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min);
const note = (id: string, updatedAt: Date, isPinned = false): N => ({ id, updatedAt, isPinned });
const shape = (notes: N[], now: Date, pinFirst = true) =>
  groupByTime(notes, { now, pinFirst }).map(s => [s.key, s.notes.map(n => n.id)]);

// Saturday 14 November 2026, as in the mockups.
const now = at(2026, 11, 14, 10, 0);

describe("section boundaries", () => {
  test("midnight separates Today from Yesterday in local time", () => {
    expect(shape([
      note("today-start", at(2026, 11, 14, 0, 0)),
      note("yesterday-end", at(2026, 11, 13, 23, 59)),
      note("yesterday-start", at(2026, 11, 13, 0, 0)),
      note("before", at(2026, 11, 12, 23, 59)),
    ], now)).toEqual([
      ["today", ["today-start"]],
      ["yesterday", ["yesterday-end", "yesterday-start"]],
      ["week", ["before"]],
    ]);
  });

  test("This week starts on Monday", () => {
    expect(shape([
      note("monday", at(2026, 11, 9, 0, 0)),
      note("sunday", at(2026, 11, 8, 23, 59)),
    ], now)).toEqual([["week", ["monday"]], ["2026-11", ["sunday"]]]);
  });

  test("on Monday, yesterday is last week's Sunday and This week is empty", () => {
    const monday = at(2026, 11, 16, 9);
    expect(shape([
      note("sunday", at(2026, 11, 15, 8)),
      note("saturday", at(2026, 11, 14, 8)),
    ], monday)).toEqual([["yesterday", ["sunday"]], ["2026-11", ["saturday"]]]);
  });

  test("a DST day still ends at local midnight", () => {
    // 1 November 2026 is 25 hours long in Los Angeles.
    const monday = at(2026, 11, 2, 0, 30);
    expect(shape([
      note("sunday-first-minute", at(2026, 11, 1, 0, 0)),
      note("saturday-last-minute", at(2026, 10, 31, 23, 59)),
    ], monday)).toEqual([["yesterday", ["sunday-first-minute"]], ["2026-10", ["saturday-last-minute"]]]);
  });

  test("months change on the first, and a week can span two months", () => {
    const tuesday = at(2026, 12, 1, 9);
    const sections = groupByTime([
      note("dec", at(2026, 12, 1, 8)),
      note("nov-30", at(2026, 11, 30, 8)),
      note("nov-29", at(2026, 11, 29, 8)),
      note("nov-1", at(2026, 11, 1, 0, 0)),
      note("oct-31", at(2026, 10, 31, 23, 59)),
    ], { now: tuesday });
    expect(sections.map(s => [s.key, s.notes.map(n => n.id)])).toEqual([
      ["today", ["dec"]],
      ["yesterday", ["nov-30"]],
      ["2026-11", ["nov-29", "nov-1"]],
      ["2026-10", ["oct-31"]],
    ]);
    const wednesday = at(2026, 12, 2, 9);
    const week = groupByTime([note("dec-1", at(2026, 12, 1, 8)), note("mon-nov-30", at(2026, 11, 30, 8))], { now: wednesday });
    expect(week.map(s => [s.key, s.months])).toEqual([["yesterday", ["2026-12"]], ["week", ["2026-11"]]]);
  });

  test("an edit from a clock ahead of this one reads as Today", () => {
    expect(shape([note("future", at(2026, 11, 20))], now)).toEqual([["today", ["future"]]]);
  });

  test("the same month in different years stays separate", () => {
    expect(shape([note("a", at(2025, 10, 3)), note("b", at(2024, 10, 3))], now))
      .toEqual([["2025-10", ["a"]], ["2024-10", ["b"]]]);
  });
});

describe("ordering", () => {
  test("pinned first in pin order, then newest edit first within each section", () => {
    const notes = [
      note("pin-recent-pin-old-edit", at(2025, 1, 1), true),
      note("pin-old-pin-new-edit", at(2026, 11, 14, 9), true),
      note("older", at(2026, 11, 14, 7)),
      note("newer", at(2026, 11, 14, 9)),
      note("oct-a", at(2026, 10, 2)),
      note("oct-b", at(2026, 10, 20)),
    ];
    expect(shape(notes, now)).toEqual([
      ["pinned", ["pin-recent-pin-old-edit", "pin-old-pin-new-edit"]],
      ["today", ["newer", "older"]],
      ["2026-10", ["oct-b", "oct-a"]],
    ]);
  });

  test("the Pinned filter dates pinned notes instead of repeating a Pinned section", () => {
    expect(shape([note("p", at(2026, 11, 14, 9), true), note("q", at(2026, 9, 1), true)], now, false))
      .toEqual([["today", ["p"]], ["2026-09", ["q"]]]);
  });

  test("accepts serialized dates", () => {
    const sections = groupByTime([{ id: "s", updatedAt: at(2026, 11, 14, 9).toISOString() }], { now });
    expect(sections[0].key).toBe("today");
  });
});

describe("month jumps", () => {
  test("jumps to the first section with that month and highlights a section's newest month", () => {
    const sections = groupByTime([
      note("dec", at(2026, 12, 2, 8)),
      note("nov-30", at(2026, 11, 30, 8)),
      note("nov-2", at(2026, 11, 2)),
    ], { now: at(2026, 12, 2, 9) });
    expect(sectionForMonth(sections, "2026-11")?.key).toBe("week");
    expect(sectionForMonth(sections, "2026-12")?.key).toBe("today");
    expect(sectionForMonth(sections, "2020-01")).toBeUndefined();
    expect(sectionMonth(sections[1])).toBe("2026-11");
  });
});

describe("loading in batches", () => {
  const notes = [
    note("pin", at(2020, 1, 1), true),
    ...Array.from({ length: 60 }, (_, i) => note(`nov-${i}`, at(2026, 11, 8, 12, 0 - i))),
    ...Array.from({ length: 100 }, (_, i) => note(`oct-${i}`, at(2026, 10, 20, 12, 0 - i))),
    ...Array.from({ length: 10 }, (_, i) => note(`jan-${i}`, at(2025, 1, 20, 12, 0 - i))),
  ];
  const sections = groupByTime(notes, { now });

  test("cuts dated notes at the limit, never Pinned", () => {
    const loaded = loadedSections(sections, BATCH);
    expect(loaded.map(s => [s.key, s.notes.length])).toEqual([["pinned", 1], ["2026-11", 48]]);
    expect(loadedSections(sections, 96).map(s => [s.key, s.notes.length])).toEqual([["pinned", 1], ["2026-11", 60], ["2026-10", 36]]);
  });

  test("sections stay whole and in order as more load", () => {
    const all = loadedSections(sections, 10_000).flatMap(s => s.notes.map(n => n.id));
    for (let limit = BATCH; limit < 200; limit += BATCH) {
      const ids = loadedSections(sections, limit).flatMap(s => s.notes.map(n => n.id));
      expect(ids).toEqual(all.slice(0, ids.length));
    }
  });

  test("jumping to an unloaded month loads up to its first batch", () => {
    expect(limitToReach(sections, "2025-01", BATCH)).toBe(192); // 160 before + 10, in batches
    expect(loadedSections(sections, 192).at(-1)?.notes.length).toBe(10);
    expect(limitToReach(sections, "2026-11", 96)).toBe(96);
    expect(limitToReach(sections, "missing", 48)).toBe(48);
  });
});

test("pinned folds to a fixed number of rows", () => {
  expect(PINNED_ROWS).toBe(2);
  expect(foldedCount(31, 4)).toBe(8);
  expect(foldedCount(5, 4)).toBe(5);
  expect(foldedCount(31, 1)).toBe(2);
  expect(foldedCount(31, 0)).toBe(2);
});

test("card size steps by content length", () => {
  expect(cardSize(0, 0)).toBe("short");
  expect(cardSize(80, 0)).toBe("medium");
  expect(cardSize(10, 150)).toBe("medium");
  expect(cardSize(10, 211)).toBe("long");
});
