"use client";

import { useEffect, useRef } from "react";
import { logoBounds } from "./geometry";
import { terrainDensity } from "./scene";

export type AsciiFlowProps = {
  maskImage: string;
  palette?: { background: string; foreground: string };
  intensity?: number;
  className?: string;
};
const defaultPalette = { background: "#edece5", foreground: "#30332d" };
const ramp = "  .`'\",:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
const padding = 16;

/** Pre-render the detailed tonal base, then advect cached scanlines. All texture
 * sampling and text layout happen at setup, not in the animation loop. */
export default function AsciiFlow({ maskImage, palette = defaultPalette, intensity = 1, className }: AsciiFlowProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !ctx) return;
    canvas.dataset.ready = "false";
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const image = new Image();
    const texture = document.createElement("canvas");
    let alive = true, ready = false, visible = false, presented = false, frame = 0;
    let width = 0, height = 0, dpr = 1, rows = 0, rowHeight = 6;
    let flow = new Float32Array(0);
    let px = -1000, py = -1000, energy = 0, last = 0, time = 0;
    function draw(ms: number) {
      if (!ctx || !canvas || !ready) return;
      const dt = last ? Math.min((ms - last) / 1000, 0.04) : 1 / 60;
      last = ms;
      if (!reduced.matches) time += dt;
      energy *= Math.exp(-dt * 3);
      for (let row = 0; row < rows; row++) {
        const y = row * rowHeight;
        const distance = (y - py) / 36;
        const impulse = energy * Math.exp(-distance * distance) * Math.sin(y * 0.08 + time * 3);
        flow[row] = reduced.matches ? 0 : flow[row] * Math.exp(-dt * 3) + impulse * dt * 12;
        // Curl-like horizontal transport, bounded so the full logo keeps its margin.
        const displacement = reduced.matches ? 0 :
          (Math.sin(y * 0.009 + time * 0.23) + Math.cos(y * 0.017 - time * 0.16)) * 1.4 * intensity;
        const stripHeight = Math.min(rowHeight, height - y);
        ctx.drawImage(texture, (padding + displacement) * dpr, (padding + y) * dpr,
          width * dpr, stripHeight * dpr, 0, y, width, stripHeight);
        if (Math.abs(flow[row]) > 0.05) {
          const left = Math.max(0, px - 64), span = Math.min(128, width - left);
          if (span > 0) ctx.drawImage(texture,
            (padding + left + displacement + flow[row]) * dpr, (padding + y) * dpr,
            span * dpr, stripHeight * dpr, left, y, span, stripHeight);
        }
      }
      // A few warm flecks appear only while a pointer disturbance is settling.
      if (energy > 0.05 && !reduced.matches) {
        ctx.globalAlpha = Math.min(0.8, energy * 0.65);
        ctx.fillStyle = "#fbca04";
        for (let i = 0; i < 6; i++) {
          const angle = i * 2.4 + time * 0.4;
          ctx.fillText("·", px + Math.cos(angle) * (8 + i * 3), py + Math.sin(angle) * (8 + i * 3));
        }
        ctx.globalAlpha = 1;
      }
      if (!presented) { canvas.dataset.ready = "true"; presented = true; }
    }
    function loop(ms: number) { draw(ms); frame = requestAnimationFrame(loop); }
    function schedule() {
      cancelAnimationFrame(frame); last = 0;
      if (ready && visible && !document.hidden && !reduced.matches) frame = requestAnimationFrame(loop);
      else if (ready && reduced.matches) draw(0);
    }
    function resize() {
      if (!canvas || !ctx || !ready) return;
      const rect = canvas.getBoundingClientRect();
      width = rect.width; height = rect.height;
      if (!width || !height) return;
      dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = "9px monospace"; ctx.textBaseline = "top";
      rowHeight = Math.max(6, height / 128, width / 180 / 0.6);
      rows = Math.ceil(height / rowHeight);
      flow = new Float32Array(rows);
      const cellWidth = rowHeight * 0.6;
      const cols = Math.ceil((width + padding * 2) / cellWidth);
      const textureRows = Math.ceil((height + padding * 2) / rowHeight);
      const sample = document.createElement("canvas");
      sample.width = cols; sample.height = textureRows;
      const sampleContext = sample.getContext("2d");
      if (!sampleContext) return;
      const box = logoBounds(width, height, 0.36);
      sampleContext.drawImage(image, (box.x + padding) / cellWidth, (box.y + padding) / rowHeight,
        box.width / cellWidth, box.height / rowHeight);
      const mask = sampleContext.getImageData(0, 0, cols, textureRows).data;
      texture.width = Math.ceil((width + padding * 2) * dpr);
      texture.height = Math.ceil((height + padding * 2) * dpr);
      const paint = texture.getContext("2d", { alpha: false });
      if (!paint) return;
      paint.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint.fillStyle = palette.background; paint.fillRect(0, 0, texture.width, texture.height);
      paint.font = `${rowHeight}px monospace`; paint.textBaseline = "top";
      // A one-bit underprint supplies the continuous tonal range between glyphs.
      // Sample the expensive terrain once per character cell, then dither pixels.
      const densities = new Float32Array(cols * textureRows);
      for (let y = 0; y < textureRows; y++) for (let x = 0; x < cols; x++) {
        const k = mask[(y * cols + x) * 4 + 3] / 255;
        const value = terrainDensity((x * cellWidth - padding) / width, (y * rowHeight - padding) / height);
        densities[y * cols + x] = value * (1 - k * 0.7) + k * 0.025;
      }
      const print = document.createElement("canvas");
      print.width = Math.ceil(width + padding * 2); print.height = Math.ceil(height + padding * 2);
      const printer = print.getContext("2d");
      if (!printer) return;
      printer.fillStyle = palette.background; printer.fillRect(0, 0, 1, 1);
      const paper = printer.getImageData(0, 0, 1, 1).data;
      printer.fillStyle = palette.foreground; printer.fillRect(0, 0, 1, 1);
      const ink = printer.getImageData(0, 0, 1, 1).data;
      const pixels = printer.createImageData(print.width, print.height);
      for (let y = 0; y < print.height; y++) for (let x = 0; x < print.width; x++) {
        const gx = x / cellWidth, gy = y / rowHeight;
        const ix = Math.min(cols - 2, Math.floor(gx)), iy = Math.min(textureRows - 2, Math.floor(gy));
        const ax = Math.min(1, gx - ix), ay = Math.min(1, gy - iy), j = iy * cols + ix;
        const density = (densities[j] * (1 - ax) + densities[j + 1] * ax) * (1 - ay) +
          (densities[j + cols] * (1 - ax) + densities[j + cols + 1] * ax) * ay;
        const seed = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
        const color = seed - Math.floor(seed) < density ? ink : paper;
        const i = (y * print.width + x) * 4;
        pixels.data[i] = color[0]; pixels.data[i + 1] = color[1]; pixels.data[i + 2] = color[2]; pixels.data[i + 3] = 255;
      }
      printer.putImageData(pixels, 0, 0);
      paint.imageSmoothingEnabled = false;
      paint.drawImage(print, 0, 0);
      paint.globalAlpha = 0.18;
      paint.fillStyle = palette.foreground;
      for (let y = 0; y < textureRows; y++) {
        let text = "", inverse = "";
        for (let x = 0; x < cols; x++) {
          const relief = densities[y * cols + x];
          // Inverse glyphs extend the range from paper white to almost solid ink.
          // These fills and strings are setup-only; frames just move the bitmap.
          const inverted = relief > 0.5;
          const level = Math.min(1, (inverted ? 1 - relief : relief) * 2);
          const glyph = ramp[Math.floor(level * (ramp.length - 1))];
          text += inverted ? " " : glyph;
          inverse += inverted ? glyph : " ";
          if (inverted) paint.fillRect(x * cellWidth, y * rowHeight, cellWidth + 0.1, rowHeight + 0.1);
        }
        paint.fillText(text, 0, y * rowHeight);
        paint.fillStyle = palette.background;
        paint.fillText(inverse, 0, y * rowHeight);
        paint.fillStyle = palette.foreground;
      }
      last = 0; draw(0); schedule();
    }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); });
    observer.observe(canvas);
    const resizer = new ResizeObserver(resize); resizer.observe(canvas);
    const pointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      px = event.clientX - rect.left; py = event.clientY - rect.top;
      energy = reduced.matches ? 0 : Math.min(2, Math.max(0, intensity));
    };
    canvas.addEventListener("pointermove", pointer, { passive: true });
    canvas.addEventListener("pointerdown", pointer, { passive: true });
    document.addEventListener("visibilitychange", schedule); reduced.addEventListener("change", schedule);
    image.onload = () => { if (alive) { ready = true; resize(); } }; image.src = maskImage;
    return () => {
      alive = false; cancelAnimationFrame(frame); observer.disconnect(); resizer.disconnect();
      canvas.removeEventListener("pointermove", pointer); canvas.removeEventListener("pointerdown", pointer);
      document.removeEventListener("visibilitychange", schedule); reduced.removeEventListener("change", schedule);
    };
  }, [maskImage, palette, intensity]);
  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
