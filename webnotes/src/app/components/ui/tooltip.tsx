"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Tooltip as Primitive } from "@base-ui/react/tooltip";
export const Tooltip = Primitive.Root;
export function TooltipTrigger({
  asChild,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof Primitive.Trigger> & {
  asChild?: boolean;
}) {
  return (
    <Primitive.Trigger
      {...props}
      {...(asChild && React.isValidElement(children)
        ? { render: children }
        : { children })}
    />
  );
}
export function TooltipProvider({
  delayDuration,
  ...props
}: React.ComponentProps<typeof Primitive.Provider> & {
  delayDuration?: number;
}) {
  return <Primitive.Provider delay={delayDuration} {...props} />;
}
export const TooltipContent = React.forwardRef<
  React.ComponentRef<typeof Primitive.Popup>,
  Omit<React.ComponentPropsWithoutRef<typeof Primitive.Popup>, "className"> & {
    className?: string;
  } & Pick<
      React.ComponentProps<typeof Primitive.Positioner>,
      "side" | "align" | "sideOffset" | "alignOffset"
    >
>(
  (
    {
      className,
      side,
      align = "center",
      sideOffset = 4,
      alignOffset,
      ...props
    },
    ref,
  ) => (
    <Primitive.Portal>
      <Primitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        className="z-50"
      >
        <Primitive.Popup
          ref={ref}
          className={cn(
            "rounded-lg border border-line bg-popover text-ink shadow-lg outline-none px-3 py-1.5 text-xs",
            className,
          )}
          {...props}
        />
      </Primitive.Positioner>
    </Primitive.Portal>
  ),
);
