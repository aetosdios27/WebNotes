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
 * The field is dot-grid paper: a dot on a regular lattice, quiet next to the
 * mark (`calm` 0) and fully present far from it (`calm` 1). A slow diagonal
 * wave lifts a band of dots to colons as it passes.
 */
export function fieldGlyph(column: number, row: number, seconds: number, calm: number) {
  if (calm < 0.35 || column % 3 !== 0 || row % 2 !== 0) return " ";
  const wave = Math.sin((column * 0.5 + row) * 0.12 - seconds * 0.8);
  return wave > 0.92 ? ":" : ".";
}
