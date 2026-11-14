"use client";

import { useEffect, useRef } from "react";
import { logoBox, logoGlyph, fieldGlyph } from "./ascii-logo";

/** The WebNotes mark, in the same 160 × 70 space as Brand.tsx. */
const MARK = ["M0 1H35V34L97 0V34L33 69H0Z", "M98 34L160 0V34L98 69Z"];
/** Glyphs a disturbed cell flickers through while it is in motion. */
const MOTION = "/\\|-_~=+<>";

const REACH = 50; // σ of the cursor's influence, in CSS px
const PUSH = 7000; // radial push away from the cursor
const DRAG = 8; // how strongly cells follow the cursor's own motion
const SPRING = 120; // pull back to the cell's home: high, so it snaps
const FRICTION = 15; // just under critical damping: a hint of bounce, no wobble
const MAX_OFFSET = 44;

/**
 * The logo drawn in monospace glyphs over a quiet drifting field. The cursor
 * pushes and smears nearby glyphs like a fluid; springs return them home.
 * Colours come from `--art-ink`, `--art-paper` and `--art-accent`.
 */
export default function AsciiLogo({
  theme,
  className,
}: {
  /** Changing this re-reads the colour tokens. */
  theme?: string;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)");
    let alive = true;
    let frame = 0;
    let visible = true;

    // Grid state, rebuilt on resize.
    let width = 0;
    let height = 0;
    let cellWidth = 8;
    let cellHeight = 14;
    let columns = 0;
    let rows = 0;
    let font = "";
    let home = new Float32Array(0); // x, y per cell
    let offset = new Float32Array(0);
    let velocity = new Float32Array(0);
    let coverage = new Float32Array(0); // share of the cell inside the mark
    let light = new Float32Array(0); // top-left lighting, 0.72–1
    let calm = new Float32Array(0); // 0 near the logo, 1 far away
    let colours = { ink: "#262822", paper: "#efeee8", accent: "#d9a400" };

    const pointer = { x: -1e4, y: -1e4, vx: 0, vy: 0, at: 0 };
    let time = 0;
    let last = 0;

    function build() {
      if (!canvas || !context) return;
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      if (!width || !height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const style = getComputedStyle(canvas);
      colours = {
        ink: style.getPropertyValue("--art-ink").trim() || colours.ink,
        paper: style.getPropertyValue("--art-paper").trim() || colours.paper,
        accent: style.getPropertyValue("--art-accent").trim() || colours.accent,
      };
      const family =
        getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim() ||
        "ui-monospace, monospace";
      const size = Math.max(10, Math.min(14, width / 58));
      font = `700 ${size}px ${family}`;
      context.font = font;
      cellWidth = context.measureText("M").width;
      cellHeight = Math.round(size * 1.18);
      columns = Math.ceil(width / cellWidth);
      rows = Math.ceil(height / cellHeight);
      const count = columns * rows;

      // Rasterise the mark once, then average its coverage inside each cell.
      const box = logoBox(width, height);
      const mask = document.createElement("canvas");
      mask.width = Math.ceil(width);
      mask.height = Math.ceil(height);
      const painter = mask.getContext("2d", { willReadFrequently: true });
      if (!painter) return;
      painter.translate(box.x, box.y);
      painter.scale(box.width / 160, box.height / 70);
      for (const path of MARK) painter.fill(new Path2D(path));
      const alpha = painter.getImageData(0, 0, mask.width, mask.height).data;

      home = new Float32Array(count * 2);
      offset = new Float32Array(count * 2);
      velocity = new Float32Array(count * 2);
      coverage = new Float32Array(count);
      light = new Float32Array(count);
      calm = new Float32Array(count);
      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          const i = row * columns + column;
          const x = column * cellWidth;
          const y = row * cellHeight;
          home[i * 2] = x;
          home[i * 2 + 1] = y;
          let sum = 0;
          let samples = 0;
          const x1 = Math.min(mask.width, Math.ceil(x + cellWidth));
          const y1 = Math.min(mask.height, Math.ceil(y + cellHeight));
          for (let py = Math.floor(y); py < y1; py += 2)
            for (let px = Math.floor(x); px < x1; px += 2) {
              sum += alpha[(py * mask.width + px) * 4 + 3];
              samples++;
            }
          coverage[i] = samples ? sum / samples / 255 : 0;
          // Light from the top left gives the mark a lit face and a shaded one.
          const u = (x + cellWidth / 2 - box.x) / box.width;
          const v = (y + cellHeight / 2 - box.y) / box.height;
          light[i] = 1 - 0.28 * Math.min(1, Math.max(0, u * 0.6 + v * 0.4));
          const dx = Math.max(0, Math.abs(x + cellWidth / 2 - (box.x + box.width / 2)) - box.width / 2);
          const dy = Math.max(0, Math.abs(y + cellHeight / 2 - (box.y + box.height / 2)) - box.height / 2);
          calm[i] = Math.min(1, Math.hypot(dx, dy) / (cellWidth * 7));
        }
      }
      draw(0);
    }

    function step(dt: number) {
      const idle = performance.now() - pointer.at > 120;
      if (idle) {
        pointer.vx *= Math.exp(-dt * 12);
        pointer.vy *= Math.exp(-dt * 12);
      }
      const reach2 = 2 * REACH * REACH;
      const damping = Math.exp(-FRICTION * dt);
      for (let i = 0; i < coverage.length; i++) {
        const k = i * 2;
        const cx = home[k] + offset[k] + cellWidth / 2;
        const cy = home[k + 1] + offset[k + 1] + cellHeight / 2;
        const dx = cx - pointer.x;
        const dy = cy - pointer.y;
        const d2 = dx * dx + dy * dy;
        let ax = -SPRING * offset[k];
        let ay = -SPRING * offset[k + 1];
        if (d2 < reach2 * 4) {
          const influence = Math.exp(-d2 / reach2);
          const distance = Math.sqrt(d2) || 1;
          ax += influence * (PUSH * (dx / distance) + DRAG * pointer.vx);
          ay += influence * (PUSH * (dy / distance) + DRAG * pointer.vy);
        }
        velocity[k] = (velocity[k] + ax * dt) * damping;
        velocity[k + 1] = (velocity[k + 1] + ay * dt) * damping;
        offset[k] += velocity[k] * dt;
        offset[k + 1] += velocity[k + 1] * dt;
        const magnitude = Math.hypot(offset[k], offset[k + 1]);
        if (magnitude > MAX_OFFSET) {
          offset[k] *= MAX_OFFSET / magnitude;
          offset[k + 1] *= MAX_OFFSET / magnitude;
        }
      }
    }

    function draw(seconds: number) {
      if (!context) return;
      context.fillStyle = colours.paper;
      context.fillRect(0, 0, width, height);
      context.font = font;
      context.textBaseline = "top";

      // The field: faint, slow, and quiet near the mark.
      context.globalAlpha = 0.3;
      context.fillStyle = colours.ink;
      for (let i = 0; i < coverage.length; i++) {
        if (coverage[i] >= 0.08) continue;
        const column = i % columns;
        const row = (i / columns) | 0;
        const glyph = fieldGlyph(column, row, seconds, calm[i]);
        if (glyph !== " ") context.fillText(glyph, home[i * 2] + offset[i * 2], home[i * 2 + 1] + offset[i * 2 + 1]);
      }

      // The mark, with moving cells flickering through motion glyphs.
      for (let i = 0; i < coverage.length; i++) {
        if (coverage[i] < 0.08) continue;
        const k = i * 2;
        const moving = Math.abs(offset[k]) + Math.abs(offset[k + 1]);
        const glyph = moving > 5
          ? MOTION[(i + ((seconds * 18) | 0)) % MOTION.length]
          : logoGlyph(coverage[i]);
        // Lighting lives in the ink's opacity, so the face stays one glyph.
        context.globalAlpha = moving > 3 ? 1 : light[i];
        context.fillStyle = moving > 3 ? colours.accent : colours.ink;
        context.fillText(glyph, home[k] + offset[k], home[k + 1] + offset[k + 1]);
      }
      context.globalAlpha = 1;
    }

    function loop(now: number) {
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      time += dt;
      step(dt);
      draw(time);
      frame = requestAnimationFrame(loop);
    }

    function schedule() {
      cancelAnimationFrame(frame);
      last = 0;
      if (!alive || !width) return;
      if (still.matches) draw(0);
      else if (visible && !document.hidden) frame = requestAnimationFrame(loop);
    }

    function move(event: PointerEvent) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const now = performance.now();
      const elapsed = Math.max(8, now - pointer.at) / 1000;
      if (pointer.x > -1e3) {
        // Smoothed cursor velocity, so a flick smears and a hover only parts.
        pointer.vx = pointer.vx * 0.6 + ((x - pointer.x) / elapsed) * 0.4;
        pointer.vy = pointer.vy * 0.6 + ((y - pointer.y) / elapsed) * 0.4;
      }
      pointer.x = x;
      pointer.y = y;
      pointer.at = now;
    }
    function leave() {
      pointer.x = -1e4;
      pointer.y = -1e4;
      pointer.vx = 0;
      pointer.vy = 0;
    }

    const resizer = new ResizeObserver(() => {
      build();
      schedule();
    });
    const watcher = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      schedule();
    });
    canvas.addEventListener("pointermove", move, { passive: true });
    canvas.addEventListener("pointerdown", move, { passive: true });
    canvas.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", schedule);
    still.addEventListener("change", schedule);
    void document.fonts.ready.then(() => {
      if (!alive) return;
      build();
      canvas.dataset.ready = "true";
      resizer.observe(canvas);
      watcher.observe(canvas);
      schedule();
    });

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      resizer.disconnect();
      watcher.disconnect();
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerdown", move);
      canvas.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", schedule);
      still.removeEventListener("change", schedule);
    };
  }, [theme]);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
