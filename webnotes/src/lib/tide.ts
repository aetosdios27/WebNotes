/** The loading screen's logo: monospace glyphs whose weight follows a wave moving through the mark. */

/** Light to heavy. Index 0 is blank and is never drawn inside the mark. */
const RAMP = " .:-=+*#%@";

/** The WebNotes mark as polygons, in the same 160 × 70 space as Brand.tsx. */
const MARK: [number, number][][] = [
  [[0, 1], [35, 1], [35, 34], [97, 0], [97, 34], [33, 69], [0, 69]],
  [[98, 34], [160, 0], [160, 34], [98, 69]],
];
const SAMPLES = 4;
/** One full pass of the wave. */
export const TIDE_PERIOD_MS = 2400;

function inside(polygon: [number, number][], x: number, y: number) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

export interface TideCell {
  /** Glyph at the wave's crest. */
  heavy: string;
  /** Glyph in the wave's trough. */
  thin: string;
  /** Where this cell sits in the wave's cycle, 0 to 1. The wave travels down and to the right. */
  phase: number;
}

const glyph = (weight: number) => RAMP[Math.max(1, Math.min(RAMP.length - 1, Math.round(weight * (RAMP.length - 1))))];

/** The mark on a grid of monospace cells; null where a cell is outside it. */
export function tideCells(columns: number, rows: number): (TideCell | null)[][] {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, column) => {
      let hits = 0;
      for (let sy = 0; sy < SAMPLES; sy++)
        for (let sx = 0; sx < SAMPLES; sx++) {
          const x = ((column + (sx + 0.5) / SAMPLES) / columns) * 160;
          const y = ((row + (sy + 0.5) / SAMPLES) / rows) * 70;
          if (MARK.some(polygon => inside(polygon, x, y))) hits++;
        }
      const coverage = hits / (SAMPLES * SAMPLES);
      if (coverage <= 0.06) return null;
      const turns = (column * 0.16 + row * 0.42) / (2 * Math.PI);
      return { heavy: glyph(coverage), thin: glyph(coverage * 0.38), phase: turns - Math.floor(turns) };
    }),
  );
}
