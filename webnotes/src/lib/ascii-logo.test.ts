import { describe, expect, test } from "bun:test";
import { fieldGlyph, fieldPresence, logoBox, logoGlyph, markDistance } from "../app/signin/ascii-logo";

describe("ASCII sign-in mark", () => {
  test("is always contained whole, with a margin, at any panel size", () => {
    for (const [width, height] of [
      [720, 900],
      [960, 1080],
      [390, 236],
      [1200, 400],
      [320, 180],
    ]) {
      const box = logoBox(width, height);
      expect(box.x).toBeGreaterThan(0);
      expect(box.y).toBeGreaterThan(0);
      expect(box.x + box.width).toBeLessThan(width);
      expect(box.y + box.height).toBeLessThan(height);
      expect(box.width / box.height).toBeCloseTo(160 / 70, 5);
    }
  });

  test("edges are soft glyphs and the face is one dense glyph", () => {
    expect(logoGlyph(0)).toBe(" ");
    expect(logoGlyph(0.2)).toBe(".");
    expect(logoGlyph(0.9)).toBe("@");
    expect(logoGlyph(1)).toBe("@");
  });

  test("the field stays empty right next to the mark", () => {
    for (let column = 0; column < 40; column++)
      for (let row = 0; row < 20; row++)
        expect(fieldGlyph(column, row, 3.7, 0)).toBe(" ");
  });

  test("the clearing follows the mark's shape, not its bounding box", () => {
    // A diagonal stroke from top-left to bottom-right on a 20x20 grid.
    const columns = 20;
    const rows = 20;
    const covered = Array.from({ length: columns * rows }, (_, i) => i % columns === Math.floor(i / columns));
    const distance = markDistance(covered, columns, rows, 8, 14);
    // Beside the stroke: close. In the bounding box's empty corner: far.
    expect(distance[5 * columns + 6]).toBeLessThanOrEqual(8);
    expect(distance[0 * columns + 19]).toBeGreaterThan(14 * 4);
    expect(fieldPresence(distance[5 * columns + 6], 14)).toBe(0);
    expect(fieldPresence(distance[0 * columns + 19], 14)).toBe(1);
  });
});
