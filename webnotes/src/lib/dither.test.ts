import { describe, expect, it } from "bun:test";
import { floydSteinberg } from "./dither";

const lightShare = (bits: Uint8Array) =>
  bits.reduce((sum, bit) => sum + bit, 0) / bits.length;

describe("floydSteinberg", () => {
  it("keeps pure black and pure white solid", () => {
    expect(lightShare(floydSteinberg(new Array(64).fill(0), 8, 8))).toBe(0);
    expect(lightShare(floydSteinberg(new Array(64).fill(255), 8, 8))).toBe(1);
  });

  it("preserves the average tone of a flat grey", () => {
    for (const grey of [32, 96, 128, 192, 224]) {
      const bits = floydSteinberg(new Array(64 * 64).fill(grey), 64, 64);
      expect(lightShare(bits)).toBeCloseTo(grey / 255, 1);
    }
  });

  it("renders a gradient as rising coverage from left to right", () => {
    const width = 96;
    const height = 32;
    const ramp = Array.from({ length: width * height }, (_, i) =>
      Math.round(((i % width) / (width - 1)) * 255),
    );
    const bits = floydSteinberg(ramp, width, height);
    const column = (from: number, to: number) => {
      let lit = 0;
      for (let y = 0; y < height; y++)
        for (let x = from; x < to; x++) lit += bits[y * width + x];
      return lit / ((to - from) * height);
    };
    expect(column(0, 32)).toBeLessThan(column(32, 64));
    expect(column(32, 64)).toBeLessThan(column(64, 96));
  });
});
