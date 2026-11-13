"use client";

import { animate } from "framer-motion";
import { useEffect } from "react";

/** Shared press response for native buttons, toolbar toggles and selectable rows. */
export function PressFeedback() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let pressed: HTMLElement | null = null;
    const release = () => {
      if (pressed)
        animate(
          pressed,
          { scale: 1 },
          { type: "spring", stiffness: 900, damping: 60 },
        );
      pressed = null;
    };
    const press = (target: EventTarget | null) => {
      if (reduced.matches || !(target instanceof Element)) return;
      const element = target.closest<HTMLElement>(
        'button, [data-pressable], [role="menuitem"], [cmdk-item]',
      );
      if (
        !element ||
        element.matches(':disabled, [aria-disabled="true"], [data-disabled]')
      )
        return;
      release();
      pressed = element;
      animate(
        element,
        { scale: 0.97 },
        { type: "spring", stiffness: 900, damping: 60 },
      );
    };
    const down = (event: PointerEvent) => {
      if (event.button === 0) press(event.target);
    };
    const keydown = (event: KeyboardEvent) => {
      if (
        !event.repeat &&
        (event.key === "Enter" || event.key === " ") &&
        event.target instanceof Element &&
        event.target.matches('button, [role="button"]')
      )
        press(event.target);
    };
    const keyup = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") release();
    };
    document.addEventListener("pointerdown", down);
    document.addEventListener("pointerup", release);
    document.addEventListener("pointercancel", release);
    document.addEventListener("keydown", keydown);
    document.addEventListener("keyup", keyup);
    window.addEventListener("blur", release);
    return () => {
      release();
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("pointerup", release);
      document.removeEventListener("pointercancel", release);
      document.removeEventListener("keydown", keydown);
      document.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", release);
    };
  }, []);
  return null;
}
