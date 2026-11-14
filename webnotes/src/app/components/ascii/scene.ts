const smoothstep = (low: number, high: number, value: number) => {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
};

/** Low-frequency ridges and haze, with broad quiet masses instead of grain. */
export function terrainDensity(x: number, y: number) {
  const ridge = 0.43 + Math.sin(x * 4.5 + 0.6) * 0.09 + Math.cos(x * 8) * 0.025;
  const foreground = smoothstep(ridge - 0.12, ridge + 0.2, y);
  const haze = Math.exp(-((x - 0.18) ** 2 / 0.16 + (y - 0.17) ** 2 / 0.06));
  const valley = Math.exp(-((x - 0.76) ** 2 / 0.045 + (y - 0.7) ** 2 / 0.12));
  const tone = 0.48 + foreground * 0.46 - haze * 0.43 - valley * 0.22;
  return Math.max(0.02, Math.min(0.98, tone));
}

// Every threshold occurs exactly once, so flat tones have stable coverage.
const bayer8 = [
   0, 48, 12, 60,  3, 51, 15, 63,
  32, 16, 44, 28, 35, 19, 47, 31,
   8, 56,  4, 52, 11, 59,  7, 55,
  40, 24, 36, 20, 43, 27, 39, 23,
   2, 50, 14, 62,  1, 49, 13, 61,
  34, 18, 46, 30, 33, 17, 45, 29,
  10, 58,  6, 54,  9, 57,  5, 53,
  42, 26, 38, 22, 41, 25, 37, 21,
];
export function orderedDot(x: number, y: number, density: number) {
  return density > (bayer8[(y & 7) * 8 + (x & 7)] + 0.5) / 64;
}
