"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Separator as Primitive } from "@base-ui/react/separator";
export const Separator = React.forwardRef<
  React.ComponentRef<typeof Primitive>,
  Omit<React.ComponentPropsWithoutRef<typeof Primitive>, "className"> & {
    className?: string;
  } & { decorative?: boolean }
>(
  (
    { className, decorative = true, orientation = "horizontal", ...props },
    ref,
  ) => (
    <Primitive
      ref={ref}
      className={cn("shrink-0 bg-line", className)}
      orientation={orientation}
      role={decorative ? "none" : "separator"}
      style={
        orientation === "horizontal"
          ? { height: 1, width: "100%" }
          : { width: 1, height: "100%" }
      }
      {...props}
    />
  ),
);
