"use client";

import { useEffect } from "react";

/** Shared press response for native buttons, toolbar toggles and selectable rows. */
export function PressFeedback() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let pressed: HTMLElement | null = null;
    const release = () => {
      pressed?.removeAttribute("data-press-feedback");
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
      element.setAttribute("data-press-feedback", "");
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
