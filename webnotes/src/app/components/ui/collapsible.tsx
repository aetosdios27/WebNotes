"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Collapsible as Primitive } from "@base-ui/react/collapsible";
export const Collapsible = Primitive.Root;
export const CollapsibleContent = Primitive.Panel;
export function CollapsibleTrigger({
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
