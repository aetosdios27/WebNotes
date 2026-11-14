/** Pure layout and glyph rules for the ASCII sign-in mark. */

const ASPECT = 160 / 70;

/**
 * The mark is contained in the middle of the panel: never wider than 58% of
 * it, never taller than 40%, so it is always seen whole.
 */
export function logoBox(width: number, height: number) {
  const logoWidth = Math.min(width * 0.58, height * 0.4 * ASPECT);
  const logoHeight = logoWidth / ASPECT;
  return {
    x: (width - logoWidth) / 2,
    y: (height - logoHeight) / 2,
    width: logoWidth,
    height: logoHeight,
  };
}

/**
 * Coverage (0–1) to a glyph: soft glyphs trace the edges, one dense glyph
 * fills the face, so the mark reads solid instead of banded.
 */
export function logoGlyph(coverage: number) {
  if (coverage < 0.08) return " ";
  if (coverage < 0.3) return ".";
  if (coverage < 0.5) return ":";
  if (coverage < 0.7) return "=";
  if (coverage < 0.88) return "#";
  return "@";
}

/**
 * Distance in CSS px from every cell to the nearest cell the mark covers,
 * measured on the cell grid (two-pass chamfer). The field's clearing then
 * follows the mark's slanted silhouette instead of its bounding box.
 */
export function markDistance(
  covered: ArrayLike<boolean>,
  columns: number,
  rows: number,
  cellWidth: number,
  cellHeight: number,
) {
  const far = 1e9;
  const diagonal = Math.hypot(cellWidth, cellHeight);
  const d = new Float32Array(columns * rows);
  for (let i = 0; i < d.length; i++) d[i] = covered[i] ? 0 : far;
  const relax = (i: number, j: number, cost: number) => {
    if (d[j] + cost < d[i]) d[i] = d[j] + cost;
  };
  for (let row = 0; row < rows; row++)
    for (let column = 0; column < columns; column++) {
      const i = row * columns + column;
      if (column > 0) relax(i, i - 1, cellWidth);
      if (row > 0) {
        relax(i, i - columns, cellHeight);
        if (column > 0) relax(i, i - columns - 1, diagonal);
        if (column < columns - 1) relax(i, i - columns + 1, diagonal);
      }
    }
  for (let row = rows - 1; row >= 0; row--)
    for (let column = columns - 1; column >= 0; column--) {
      const i = row * columns + column;
      if (column < columns - 1) relax(i, i + 1, cellWidth);
      if (row < rows - 1) {
        relax(i, i + columns, cellHeight);
        if (column < columns - 1) relax(i, i + columns + 1, diagonal);
        if (column > 0) relax(i, i + columns - 1, diagonal);
      }
    }
  return d;
}

/** How present the field is at a distance from the mark: 0 hugging it, 1 a few cells out. */
export function fieldPresence(distance: number, cellHeight: number) {
  const t = Math.min(1, Math.max(0, (distance - cellHeight) / (cellHeight * 3)));
  return t * t * (3 - 2 * t);
}

/**
 * The field is dot-grid paper: a dot on a regular lattice, absent where
 * `presence` is 0 (right against the mark). A slow diagonal wave lifts a band
 * of dots to colons as it passes.
 */
export function fieldGlyph(column: number, row: number, seconds: number, presence: number) {
  if (presence <= 0 || column % 3 !== 0 || row % 2 !== 0) return " ";
  const wave = Math.sin((column * 0.5 + row) * 0.12 - seconds * 0.8);
  return wave > 0.92 ? ":" : ".";
}
