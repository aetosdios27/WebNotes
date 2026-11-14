/** Contain the full 160 × 70 mark in the central 60% of either dimension. */
export function logoBounds(width: number, height: number, fraction: 0.36 | 0.6 = 0.6) {
  const logoWidth = Math.min(width * fraction, height * fraction * 160 / 70);
  const logoHeight = logoWidth * 70 / 160;
  return { x: (width - logoWidth) / 2, y: (height - logoHeight) / 2, width: logoWidth, height: logoHeight };
}
