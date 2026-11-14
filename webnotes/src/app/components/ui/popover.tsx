"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Popover as Primitive } from "@base-ui/react/popover";
export const Popover = Primitive.Root;
export function PopoverTrigger({
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
export const PopoverContent = React.forwardRef<
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
      data-depth="popover"
          ref={ref}
          className={cn(
            "rounded-lg border border-line bg-popover text-ink shadow-lg outline-none w-72 p-4",
            className,
          )}
          {...props}
        />
      </Primitive.Positioner>
    </Primitive.Portal>
  ),
);
