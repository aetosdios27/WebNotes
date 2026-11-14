import { expect, test } from "bun:test";
import { logoBounds } from "../app/components/ascii/geometry";

test("the complete ASCII mark stays centered with at least 20% margin on every edge", () => {
  for (const [width, height] of [[720, 900], [720, 600], [390, 190], [320, 190], [1440, 190], [160, 900]]) {
    for (const fraction of [0.36, 0.6] satisfies (0.36 | 0.6)[]) {
      const box = logoBounds(width, height, fraction);
      expect(box.x).toBeGreaterThanOrEqual(width * 0.2 - 0.001);
      expect(box.y).toBeGreaterThanOrEqual(height * 0.2 - 0.001);
      expect(box.x + box.width).toBeLessThanOrEqual(width * 0.8 + 0.001);
      expect(box.y + box.height).toBeLessThanOrEqual(height * 0.8 + 0.001);
      expect(box.x + box.width / 2).toBeCloseTo(width / 2);
      expect(box.y + box.height / 2).toBeCloseTo(height / 2);
      expect(box.width / box.height).toBeCloseTo(160 / 70);
    }
  }
});
