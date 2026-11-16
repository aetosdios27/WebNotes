import { describe, expect, test } from "bun:test";
import { tideCells } from "./tide";

const cells = tideCells(52, 12);
const picture = cells.map(row => row.map(cell => cell?.heavy ?? " ").join(""));

describe("tide", () => {
  test("draws the mark: a solid left column, a gap between the two shapes, an empty top-left notch", () => {
    expect(picture).toHaveLength(12);
    expect(picture.every(row => row.length === 52)).toBe(true);
    // The first shape's upright is solid from top to bottom.
    expect(picture.slice(1, 11).every(row => row.slice(0, 10).trim().length === 10)).toBe(true);
    // Above the first diagonal, right of the upright, is empty in the top row.
    expect(picture[0].slice(13, 26).trim()).toBe("");
    // The bottom right corner is outside both shapes.
    expect(picture[11].slice(40).trim()).toBe("");
  });

  test("a cell is lighter in the trough than at the crest, and never blank", () => {
    const ramp = " .:-=+*#%@";
    for (const cell of cells.flat()) {
      if (!cell) continue;
      expect(cell.thin).not.toBe(" ");
      expect(ramp.indexOf(cell.thin)).toBeLessThanOrEqual(ramp.indexOf(cell.heavy));
    }
    expect(cells[5][3]).toMatchObject({ heavy: "@", thin: "-" });
  });

  test("the wave travels down and to the right", () => {
    const phase = (row: number, column: number) => cells[row][column]!.phase;
    expect(phase(5, 1)).toBeGreaterThan(phase(5, 0));
    expect(phase(6, 0)).toBeGreaterThan(phase(5, 0));
    for (const cell of cells.flat()) if (cell) { expect(cell.phase).toBeGreaterThanOrEqual(0); expect(cell.phase).toBeLessThan(1); }
  });
});
