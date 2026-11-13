"use client";
import * as React from "react";
import { useRender } from "@base-ui/react/use-render";

/** Compatibility for existing asChild callers, composed by Base UI. */
export const Slot = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ children, ...props }, ref) => {
  return useRender({
    render: React.isValidElement(children) ? children : undefined,
    ref,
    props,
  });
});
Slot.displayName = "Slot";
