"use client";

import { useEffect, useRef } from "react";

export type AsciiFlowProps = {
  maskImage: string;
  palette?: { background: string; foreground: string };
  intensity?: number;
  className?: string;
};
const defaultPalette = { background: "#0a0a0a", foreground: "#fbca04" };
const ramp = "  .,:;-=+*x%#@";

/** A bounded, advected scalar field selects prebuilt density rows. The hot loop
 * reuses all buffers and strings, with exactly one fillText call per row. */
export default function AsciiFlow({ maskImage, palette = defaultPalette, intensity = 1, className }: AsciiFlowProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !ctx) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const image = new Image();
    let alive = true, ready = false, visible = false, frame = 0;
    let width = 0, height = 0, cols = 0, rows = 0, cw = 0, ch = 0;
    let mask = new Float32Array(0), field = new Float32Array(0), next = new Float32Array(0);
    let rowFrames: string[][] = [];
    let px = -1000, py = -1000, energy = 0, last = 0, time = 0;
    function draw(ms: number) {
      if (!ctx || !canvas || !ready) return;
      const dt = last ? Math.min((ms - last) / 1000, 0.04) : 1 / 60;
      last = ms;
      time += dt;
      ctx.fillStyle = palette.background;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = palette.foreground;
      energy *= Math.exp(-dt * 3.5);
      for (let y = 0; y < rows; y++) {
        let phase = 0;
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          // Divergence-free velocity: curl of sin(y/7+t) + cos(x/11-t).
          const vx = Math.cos(y / 7 + time * 0.35);
          const vy = Math.sin(x / 11 - time * 0.3);
          const sx = Math.max(0, Math.min(cols - 1.001, x - vx * dt * 7));
          const sy = Math.max(0, Math.min(rows - 1.001, y - vy * dt * 7));
          const ix = Math.floor(sx), iy = Math.floor(sy), ax = sx - ix, ay = sy - iy;
          const j = iy * cols + ix;
          const advected = (field[j] * (1 - ax) + field[j + 1] * ax) * (1 - ay) +
            (field[j + cols] * (1 - ax) + field[j + cols + 1] * ax) * ay;
          const dx = x - px, dy = (y - py) * ch / cw;
          const disturbance = energy * Math.exp(-(dx * dx + dy * dy) / 90);
          const source = 0.5 + 0.5 * Math.sin(x * 0.17 + y * 0.23 - time * 1.8);
          next[i] = advected * 0.97 + source * 0.03 + disturbance * dt * 4;
          phase += next[i];
        }
        const index = Math.floor((time * 12 + phase / cols * 32) % 128);
        ctx.fillText(rowFrames[y][index], 0, y * ch);
      }
      const swap = field; field = next; next = swap;
    }
    function loop(ms: number) {
      draw(ms);
      frame = requestAnimationFrame(loop);
    }
    function schedule() {
      cancelAnimationFrame(frame);
      last = 0;
      if (ready && visible && !document.hidden && !reduced.matches) frame = requestAnimationFrame(loop);
      else if (ready && reduced.matches) draw(0);
    }
    function resize() {
      if (!canvas || !ctx || !ready) return;
      const rect = canvas.getBoundingClientRect();
      width = rect.width; height = rect.height;
      if (!width || !height) return;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.max(2, Math.min(112, Math.ceil(width / 6.3)));
      rows = Math.max(2, Math.min(90, Math.ceil(height / 10.5)));
      cw = width / cols; ch = cw / 0.6;
      rows = Math.max(2, Math.min(90, Math.ceil(height / ch)));
      ctx.font = `${ch}px monospace`;
      ctx.textBaseline = "top";
      // Sample the SVG once per geometry, never in the animation loop.
      const offscreen = document.createElement("canvas");
      offscreen.width = cols; offscreen.height = rows;
      const context = offscreen.getContext("2d");
      if (!context) return;
      const logoWidth = width * (width < height ? 1.52 : 1.12);
      const logoHeight = logoWidth * 70 / 160;
      context.drawImage(image, -width * 0.19 / cw, (height * 0.5 - logoHeight * 0.5) / ch, logoWidth / cw, logoHeight / ch);
      const pixels = context.getImageData(0, 0, cols, rows).data;
      mask = new Float32Array(cols * rows); field = new Float32Array(cols * rows); next = new Float32Array(cols * rows);

      for (let i = 0; i < mask.length; i++) { mask[i] = pixels[i * 4 + 3] / 255; field[i] = 0.5 + 0.5 * Math.sin(i * 0.71); }
      // Prebuild 128 density phases per row; no strings or arrays in draw().
      rowFrames = Array.from({ length: rows }, (_, y) =>
        Array.from({ length: 128 }, (_, phase) => {
          let text = "";
          for (let x = 0; x < cols; x++) {
            const k = mask[y * cols + x];
            const wave = 0.5 + 0.5 * Math.sin(x * 0.17 + y * 0.23 - phase * Math.PI / 64);
            const density = Math.min(1, k * (0.68 + wave * 0.3) +
              (1 - k) * Math.max(0, wave - 0.48) * 0.65 * Math.max(0, intensity));
            text += ramp[Math.floor(density * (ramp.length - 1))];
          }
          return text;
        }));
      last = 0;
      draw(0); schedule();
    }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); });
    observer.observe(canvas);
    const resizer = new ResizeObserver(resize); resizer.observe(canvas);
    const pointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      px = (event.clientX - rect.left) / cw; py = (event.clientY - rect.top) / ch;
      energy = reduced.matches ? 0 : Math.min(2, Math.max(0, intensity));
    };
    canvas.addEventListener("pointermove", pointer, { passive: true });
    canvas.addEventListener("pointerdown", pointer, { passive: true });
    document.addEventListener("visibilitychange", schedule);
    reduced.addEventListener("change", schedule);
    image.onload = () => { if (alive) { ready = true; resize(); } };
    image.src = maskImage;
    return () => {
      alive = false; cancelAnimationFrame(frame); observer.disconnect(); resizer.disconnect();
      canvas.removeEventListener("pointermove", pointer); canvas.removeEventListener("pointerdown", pointer);
      document.removeEventListener("visibilitychange", schedule); reduced.removeEventListener("change", schedule);
    };
  }, [maskImage, palette, intensity]);
  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
