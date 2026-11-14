"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Tabs as Primitive } from "@base-ui/react/tabs";
export const Tabs = Primitive.Root;
export const TabsList = React.forwardRef<
  React.ComponentRef<typeof Primitive.List>,
  Omit<React.ComponentPropsWithoutRef<typeof Primitive.List>, "className"> & {
    className?: string;
  }
>(({ className, children, ...props }, ref) => (
  <Primitive.List
    ref={ref}
    className={cn(
      "depth-tabs inline-flex items-center gap-1 rounded-lg bg-panel p-1 text-muted",
      className,
    )}
    {...props}
  >
    <Primitive.Indicator className="depth-tab-indicator" />
    {children}
  </Primitive.List>
));
export const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof Primitive.Tab>,
  Omit<React.ComponentPropsWithoutRef<typeof Primitive.Tab>, "className"> & {
    className?: string;
  }
>(({ className, ...props }, ref) => (
  <Primitive.Tab
    ref={ref}
    className={cn(
      "rounded-md px-3 py-1 text-sm  data-[active]:text-ink",
      className,
    )}
    {...props}
  />
));
export const TabsContent = React.forwardRef<
  React.ComponentRef<typeof Primitive.Panel>,
  Omit<React.ComponentPropsWithoutRef<typeof Primitive.Panel>, "className"> & {
    className?: string;
  }
>(({ className, ...props }, ref) => (
  <Primitive.Panel
    ref={ref}
    className={cn("mt-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ink/30", className)}
    {...props}
  />
));
