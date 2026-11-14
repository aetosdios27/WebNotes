import { describe, expect, test } from "bun:test";
import { middleTruncate } from "./middle-truncate";

const width = (n: number) => (text: string) => text.length <= n;

describe("middle truncation of folder names", () => {
  test("leaves a name that fits untouched", () => {
    expect(middleTruncate("Recipes", width(20))).toBe("Recipes");
  });

  test("keeps near-duplicate names distinguishable", () => {
    const before = "University applications — reference letters before";
    const after = "University applications — reference letters after";
    const a = middleTruncate(before, width(28));
    const b = middleTruncate(after, width(28));
    expect(a).not.toBe(b);
    expect(a).toContain(" … ");
    expect(a.endsWith("before")).toBe(true);
    expect(b.endsWith("after")).toBe(true);
    expect(a.startsWith("University")).toBe(true);
    expect(a.length).toBeLessThanOrEqual(28);
  });

  test("fills the space it is given", () => {
    const name = "A".repeat(60);
    const short = middleTruncate(name, width(30));
    expect(short.length).toBeLessThanOrEqual(30);
    expect(short.length).toBeGreaterThanOrEqual(28);
  });

  test("still returns something for a very narrow space", () => {
    expect(middleTruncate("Home renovation notes", width(1))).toBe("…");
    expect(middleTruncate("ABCD", width(3)).length).toBeLessThanOrEqual(3);
    expect(middleTruncate("ABCD", width(0))).toBe("");
  });
  test("keeps emoji and joined graphemes whole", () => {
    for (const emoji of ["😀", "👨‍👩‍👧‍👦"]) {
      const budget = emoji.length * 6 + 3;
      const short = middleTruncate(emoji.repeat(10), width(budget));
      expect(short.length).toBeLessThanOrEqual(budget);
      expect(short).not.toMatch(/[\uD800-\uDFFF]/u);
      const parts = Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(short), part => part.segment);
      expect(parts.every(part => part === emoji || part === " " || part === "…")).toBe(true);
    }
  });
});
