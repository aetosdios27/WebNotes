/**
 * Serpentine Floyd–Steinberg dithering. Takes luminance in 0–255 and returns
 * one bit per cell (1 = light). Alternating scan direction stops the error
 * from piling up into diagonal worms.
 */
export function floydSteinberg(
  luminance: ArrayLike<number>,
  width: number,
  height: number,
): Uint8Array {
  const error = Float32Array.from(luminance, (value) => value / 255);
  const bits = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const forward = y % 2 === 0;
    const step = forward ? 1 : -1;
    for (let i = 0; i < width; i++) {
      const x = forward ? i : width - 1 - i;
      const index = y * width + x;
      const light = error[index] >= 0.5 ? 1 : 0;
      const residual = error[index] - light;
      bits[index] = light;
      const ahead = x + step;
      const behind = x - step;
      if (ahead >= 0 && ahead < width) error[index + step] += (residual * 7) / 16;
      if (y + 1 < height) {
        const below = index + width;
        if (behind >= 0 && behind < width) error[below - step] += (residual * 3) / 16;
        error[below] += (residual * 5) / 16;
        if (ahead >= 0 && ahead < width) error[below + step] += residual / 16;
      }
    }
  }
  return bits;
}
