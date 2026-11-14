import { describe, expect, test } from "bun:test";
import { fieldGlyph, logoBox, logoGlyph } from "../app/signin/ascii-logo";

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
});
