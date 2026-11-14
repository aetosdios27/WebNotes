"use client";

import { motionTiming } from "./motion-tokens";
import { useLayoutEffect, useRef } from "react";

/** One background moves; text and hit targets stay still. */
export function SlidingIndicator({ value }: { value: string | number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const indicator = ref.current;
    const parent = indicator?.parentElement;
    if (!indicator || !parent) return;
    let animation: Animation | undefined;
    const place = () => {
      const selected = parent.querySelector<HTMLElement>(
        '[aria-selected="true"], [aria-pressed="true"], [data-active]',
      );
      if (!selected) {
        indicator.style.opacity = "0";
        delete indicator.dataset.position;
        return;
      }
      const next = `left:${selected.offsetLeft}px;top:${selected.offsetTop}px;width:${selected.offsetWidth}px;height:${selected.offsetHeight}px;opacity:1`;
      if (indicator.dataset.position === next) return;
      indicator.dataset.position = next;
      const before = indicator.getBoundingClientRect();
      indicator.style.cssText = next;
      const after = indicator.getBoundingClientRect();
      animation?.cancel();
      if (
        before.width &&
        !matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        animation = indicator.animate(
          [
            {
              transform: `translate(${before.x - after.x}px, ${before.y - after.y}px) scale(${before.width / after.width}, ${before.height / after.height})`,
            },
            { transform: "none" },
          ],
          {
            ...motionTiming(parent, "normal"),
          },
        );
      }
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(parent);
    return () => {
      observer.disconnect();
      animation?.cancel();
    };
  }, [value]);
  return <span ref={ref} className="sliding-indicator" aria-hidden="true" />;
}
