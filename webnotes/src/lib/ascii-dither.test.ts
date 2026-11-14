import { expect, test } from "bun:test";
import { orderedDot } from "../app/components/ascii/scene";

test("ordered flat tones have exact coverage and repeat without random speckle", () => {
  for (const density of [0, 0.25, 0.5, 0.75, 1]) {
    let dots = 0;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const dot = orderedDot(x, y, density);
      dots += Number(dot);
      expect(orderedDot(x + 8, y + 8, density)).toBe(dot);
    }
    expect(dots).toBe(density * 64);
  }
});
