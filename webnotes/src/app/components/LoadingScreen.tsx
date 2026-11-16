import type { CSSProperties } from "react";
import { tideCells, TIDE_PERIOD_MS } from "@/lib/tide";

const CELLS = tideCells(52, 12);

/**
 * The logo in monospace glyphs with a slow wave moving through it. It is plain
 * markup animated in CSS, so it is on screen from the first paint, before any
 * script has run: most loads end before the page hydrates.
 */
export default function LoadingScreen() {
  return (
    <div role="status" aria-live="polite" className="loading-screen">
      <pre aria-hidden="true" className="tide">
        {CELLS.map((row, y) => (
          <span key={y}>
            {row.map((cell, x) =>
              cell ? (
                <b key={x} style={{ "--tide-delay": `${Math.round((cell.phase - 1) * TIDE_PERIOD_MS)}ms` } as CSSProperties}>
                  {cell.heavy}
                  <i>{cell.thin}</i>
                </b>
              ) : " ",
            )}
            {"\n"}
          </span>
        ))}
      </pre>
      <p>Loading notes</p>
    </div>
  );
}
