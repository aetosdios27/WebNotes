const mix = (a: number, b: number, t: number) => a + (b - a) * t;
function hash(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
function noise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y);
  let fx = x - ix, fy = y - iy;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  return mix(mix(hash(ix, iy), hash(ix + 1, iy), fx), mix(hash(ix, iy + 1), hash(ix + 1, iy + 1), fx), fy);
}
function fbm(x: number, y: number) {
  let value = 0, amplitude = 0.5;
  for (let octave = 0; octave < 6; octave++) {
    value += noise(x, y) * amplitude;
    x = x * 2.03 + 17.1; y = y * 2.03 + 9.2; amplitude *= 0.5;
  }
  return value;
}

/** Static terrain, cloud and fibre luminance. Evaluated only when size changes. */
export function terrainDensity(x: number, y: number) {
  const warp = fbm(x * 3, y * 3);
  const detail = fbm(x * 22 + warp * 4, y * 19);
  const clouds = Math.max(0, Math.min(1, (fbm(x * 5, y * 4) - 0.25) * 2.8));
  let tone = 0.025 + clouds * 0.6;
  // Successive ridgelines separate the distant haze from the textured foreground.
  for (let ridge = 0; ridge < 4; ridge++) {
    const horizon = 0.27 + ridge * 0.145 + fbm(x * (3 + ridge) + ridge * 21, ridge * 7) * 0.19;
    const edge = Math.max(0, Math.min(1, (y - horizon) * 65));
    const erosion = Math.abs(Math.sin((x * 9 + warp * 3 + y * 2) * Math.PI));
    const mountain = 0.28 + ridge * 0.15 + (detail - 0.25) * 0.52 + erosion * 0.06;
    tone = mix(tone, mountain, edge);
  }
  const riverCenter = 0.48 + Math.sin(y * 8 + warp * 0.8) * (y * 0.16);
  const riverWidth = Math.max(0, y - 0.39) * 0.075;
  const river = Math.max(0, Math.min(1, (riverWidth - Math.abs(x - riverCenter)) * 150));
  tone = mix(tone, 0.12 + detail * 0.23, river);
  const fibre = noise(x * 280, y * 170) - 0.5;
  return Math.max(0, Math.min(1, tone + fibre * 0.16));
}
