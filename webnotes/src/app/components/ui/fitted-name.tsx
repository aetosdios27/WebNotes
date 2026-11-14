"use client";
import { useLayoutEffect, useRef } from "react";
import { middleTruncate } from "@/lib/middle-truncate";

/** Paints `name` into its own span, shortened in the middle to fit (see
 * middleTruncate), with the filter match marked. The span owns its children, so React never sees them. */
export function FittedName({ name, query = "", className = "row-name" }: { name: string; query?: string; className?: string }) {
  const span = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = span.current;
    if (!el) return;
    const paint = (text: string) => {
      const at = query ? text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase()) : -1;
      if (at < 0) { el.textContent = text; return; }
      const mark = document.createElement("mark");
      mark.textContent = text.slice(at, at + query.length);
      el.replaceChildren(text.slice(0, at), mark, text.slice(at + query.length));
    };
    const fit = () => {
      if (!el.clientWidth) return paint(name);
      paint(middleTruncate(name, (text) => { paint(text); return el.scrollWidth <= el.clientWidth; }));
    };
    fit();
    // Measured before the web font loads, the cut would be off by a few letters.
    let live = true;
    void document.fonts?.ready.then(() => { if (live) fit(); });
    let width = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      fit();
    });
    observer.observe(el);
    return () => {
      live = false;
      observer.disconnect();
    };
  }, [name, query]);
  return <span ref={span} className={className} aria-hidden="true" />;
}

