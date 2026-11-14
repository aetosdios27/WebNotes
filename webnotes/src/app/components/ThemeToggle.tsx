"use client";
import { useLayoutEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { motionTiming } from "./ui/motion-tokens";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const symbols = useRef<HTMLSpanElement>(null);
  const previousTheme = useRef(resolvedTheme);
  const dark = resolvedTheme === "dark";
  const label = `Switch to ${dark ? "light" : "dark"} theme`;
  useLayoutEffect(() => {
    const previous = previousTheme.current;
    previousTheme.current = resolvedTheme;
    if (!previous || previous === resolvedTheme || !symbols.current) return;
    const element = symbols.current;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // next-themes suppresses CSS transitions during theme changes; animate only the icons.
    const animations = Array.from(element.querySelectorAll("svg")).map(
      (icon) => {
        const entering = icon.classList.contains(
          dark ? "theme-moon" : "theme-sun",
        );
        return icon.animate(
          [
            {
              opacity: entering ? 0 : 1,
              ...(!reduced && {
                transform: `rotate(${entering ? -45 : 0}deg)`,
              }),
            },
            {
              opacity: entering ? 1 : 0,
              ...(!reduced && { transform: `rotate(${entering ? 0 : 45}deg)` }),
            },
          ],
          motionTiming(element, "normal"),
        );
      },
    );
    return () => animations.forEach((animation) => animation.cancel());
  }, [resolvedTheme, dark]);
  return (
    <Tooltip>
      <TooltipTrigger
        className="bar-icon theme-toggle"
        aria-label={label}
        onClick={() => setTheme(dark ? "light" : "dark")}
      >
        <span
          ref={symbols}
          className="theme-symbols"
          data-dark={dark}
          aria-hidden="true"
        >
          <Sun className="theme-sun" />
          <Moon className="theme-moon" />
        </span>
      </TooltipTrigger>
      <TooltipContent role="tooltip" side="bottom" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
