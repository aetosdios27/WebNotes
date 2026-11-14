"use client";

import "./rolling-text.css";
import Scritto from "@scritto/react";
import { useLayoutEffect, useRef, useState } from "react";
import { motionTiming } from "./motion-tokens";

const countFormat = new Intl.NumberFormat("en-US");

export function RollingText({
  value,
  fast = false,
  reserve,
}: {
  value: string | number;
  fast?: boolean;
  reserve?: string;
}) {
  const text = typeof value === "number" ? countFormat.format(value) : value;
  const host = useRef<HTMLSpanElement>(null);
  const lastUpdate = useRef(0);
  const [display, setDisplay] = useState({ text, animated: false });
  const [transition, setTransition] = useState({
    duration: fast ? 180 : 240,
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
  });

  useLayoutEffect(() => {
    if (host.current) {
      const timing = motionTiming(host.current, "normal");
      setTransition({
        duration: fast ? 180 : timing.duration,
        easing: timing.easing,
      });
    }
  }, [fast]);

  useLayoutEffect(() => {
    if (text === display.text) return;
    const now = performance.now();
    // Include the library's per-glyph stagger. An instant update also clears old ghosts.
    const animated = now - lastUpdate.current > transition.duration * 2;
    lastUpdate.current = now;
    setDisplay({ text, animated });
  }, [text, display.text, transition.duration]);

  return (
    <span
      ref={host}
      className={`rolling-text${typeof value === "number" ? " rolling-count" : ""}`}
    >
      {reserve && (
        <span className="rolling-reserve" aria-hidden="true">
          {reserve}
        </span>
      )}
      <Scritto
        value={display.text}
        animated={display.animated}
        trend={0}
        transition={transition}
        edgeFade="auto"
      />
    </span>
  );
}
