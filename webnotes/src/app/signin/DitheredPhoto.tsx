"use client";

import { useEffect, useRef } from "react";
import { floydSteinberg } from "@/lib/dither";

/** Each dot is exactly this many CSS pixels, at any panel size. */
const CELL = 2;
/** Coarse-to-fine passes for the reveal: the print develops into focus. */
const DEVELOP = [16, 8, 4, CELL];
const STEP_MS = 110;

/**
 * Dithers a grayscale photograph live at the panel's own size, so dots stay
 * square and never get resampled into moiré. Colours come from the
 * `--art-ink` and `--art-paper` custom properties on the canvas.
 */
export default function DitheredPhoto({
  src,
  focus = [0.5, 0.5],
  theme,
  className,
}: {
  src: string;
  /** Point of the photo kept in view when the panel crops it (0–1). */
  focus?: [number, number];
  /** Changing this re-reads the colour tokens. */
  theme?: string;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const image = new Image();
    const timers: number[] = [];
    let alive = true;
    let developed = false;

    const parse = (value: string) => {
      const probe = document.createElement("canvas").getContext("2d")!;
      probe.fillStyle = value;
      probe.fillRect(0, 0, 1, 1);
      return probe.getImageData(0, 0, 1, 1).data;
    };

    function render(cell: number) {
      if (!canvas || !context || !image.naturalWidth) return;
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;
      // Snap each dot to whole device pixels: at a 1.6× display a 2px dot
      // would otherwise alternate 3 and 4 pixels wide and read as noise.
      const ratio = Math.min(window.devicePixelRatio || 1, 3);
      const devicePixels = Math.max(1, Math.round(cell * ratio));
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      const columns = Math.ceil(canvas.width / devicePixels);
      const rows = Math.ceil(canvas.height / devicePixels);

      // Cover-crop the photo around its focal point, sampled at cell size.
      const sample = document.createElement("canvas");
      sample.width = columns;
      sample.height = rows;
      const sampler = sample.getContext("2d", { willReadFrequently: true });
      if (!sampler) return;
      const scale = Math.max(columns / image.naturalWidth, rows / image.naturalHeight);
      const drawnWidth = image.naturalWidth * scale;
      const drawnHeight = image.naturalHeight * scale;
      const offsetX = Math.min(0, Math.max(columns - drawnWidth, columns / 2 - drawnWidth * focus[0]));
      const offsetY = Math.min(0, Math.max(rows - drawnHeight, rows / 2 - drawnHeight * focus[1]));
      sampler.imageSmoothingQuality = "high";
      sampler.drawImage(image, offsetX, offsetY, drawnWidth, drawnHeight);
      const pixels = sampler.getImageData(0, 0, columns, rows);
      const luminance = new Uint8ClampedArray(columns * rows);
      for (let i = 0; i < luminance.length; i++) luminance[i] = pixels.data[i * 4];

      const bits = floydSteinberg(luminance, columns, rows);
      const style = getComputedStyle(canvas);
      const ink = parse(style.getPropertyValue("--art-ink").trim() || "#2c2e29");
      const paper = parse(style.getPropertyValue("--art-paper").trim() || "#eeede7");
      for (let i = 0; i < bits.length; i++) {
        const colour = bits[i] ? paper : ink;
        pixels.data[i * 4] = colour[0];
        pixels.data[i * 4 + 1] = colour[1];
        pixels.data[i * 4 + 2] = colour[2];
        pixels.data[i * 4 + 3] = 255;
      }
      sampler.putImageData(pixels, 0, 0);

      context.imageSmoothingEnabled = false;
      context.drawImage(sample, 0, 0, columns * devicePixels, rows * devicePixels);
      canvas.dataset.ready = "true";
    }

    function develop() {
      timers.forEach(clearTimeout);
      const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (developed || still) {
        render(CELL);
        developed = true;
        return;
      }
      DEVELOP.forEach((cell, step) =>
        timers.push(
          window.setTimeout(() => {
            if (!alive) return;
            render(cell);
            if (cell === CELL) developed = true;
          }, step * STEP_MS),
        ),
      );
    }

    let pending = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => developed && render(CELL));
    });
    image.onload = () => {
      if (!alive) return;
      develop();
      observer.observe(canvas);
    };
    image.src = src;
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      cancelAnimationFrame(pending);
      observer.disconnect();
    };
  }, [src, focus, theme]);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
