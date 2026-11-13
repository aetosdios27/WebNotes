"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar as Primitive } from "@base-ui/react/avatar";
export const Avatar = React.forwardRef<
  React.ComponentRef<typeof Primitive.Root>,
  Omit<React.ComponentPropsWithoutRef<typeof Primitive.Root>, "className"> & {
    className?: string;
  }
>(({ className, ...props }, ref) => (
  <Primitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className,
    )}
    {...props}
  />
));
export const AvatarImage = React.forwardRef<
  React.ComponentRef<typeof Primitive.Image>,
  Omit<React.ComponentPropsWithoutRef<typeof Primitive.Image>, "className"> & {
    className?: string;
  }
>(({ className, ...props }, ref) => (
  <Primitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
));
export const AvatarFallback = React.forwardRef<
  React.ComponentRef<typeof Primitive.Fallback>,
  Omit<
    React.ComponentPropsWithoutRef<typeof Primitive.Fallback>,
    "className"
  > & { className?: string }
>(({ className, ...props }, ref) => (
  <Primitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-selected text-ink",
      className,
    )}
    {...props}
  />
));
