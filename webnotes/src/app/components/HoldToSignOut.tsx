"use client";

import { useEffect, useRef, useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { LogOut } from "lucide-react";

/** How long Sign out must be held, in ms. */
const HOLD_MS = 900;

/**
 * Signing out is held, not clicked: pointer or Enter/Space starts a fill
 * across the row, and only a completed hold signs out. A timer decides
 * completion; the fill only shows progress.
 */
export function HoldToSignOut({
  onSignOut,
  label = "Sign out",
  menu = false,
  disabled = false,
}: {
  onSignOut: () => void;
  label?: string;
  menu?: boolean;
  disabled?: boolean;
}) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const start = () => {
    window.clearTimeout(timer.current);
    setHolding(true);
    timer.current = window.setTimeout(() => {
      setHolding(false);
      onSignOut();
    }, HOLD_MS);
  };
  const stop = () => {
    window.clearTimeout(timer.current);
    setHolding(false);
  };
  const Component = menu ? Menu.Item : "button";
  return (
    <Component
      className="note-menu-item hold-action"
      {...(menu ? { closeOnClick: false } : { type: "button" as const })}
      disabled={disabled}
      data-holding={holding || undefined}
      style={{ ["--hold-duration" as string]: `${HOLD_MS}ms` }}
      aria-description="Press and hold for 0.9 seconds to confirm"
      onClick={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        if (event.button === 0) start();
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        if (!event.repeat) start();
      }}
      onKeyUp={(event) => {
        if (event.key === "Enter" || event.key === " ") stop();
      }}
      onBlur={stop}
    >
      <LogOut aria-hidden="true" />
      {label}
      <span className="hold-hint" aria-hidden="true">
        Hold
      </span>
    </Component>
  );
}
