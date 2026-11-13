"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Dialog as Primitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
export const Sheet = Primitive.Root;
export const SheetPortal = Primitive.Portal;
export function SheetTrigger({
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
export function SheetClose({
  asChild,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof Primitive.Close> & {
  asChild?: boolean;
}) {
  return (
    <Primitive.Close
      {...props}
      {...(asChild && React.isValidElement(children)
        ? { render: children }
        : { children })}
    />
  );
}
export const SheetOverlay = React.forwardRef<
  React.ComponentRef<typeof Primitive.Backdrop>,
  Omit<
    React.ComponentPropsWithoutRef<typeof Primitive.Backdrop>,
    "className"
  > & { className?: string }
>(({ className, ...props }, ref) => (
  <Primitive.Backdrop
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/50", className)}
    {...props}
  />
));
const sides = {
  left: "inset-y-0 left-0 w-3/4 sm:max-w-sm",
  right: "inset-y-0 right-0 w-3/4 sm:max-w-sm",
  top: "inset-x-0 top-0",
  bottom: "inset-x-0 bottom-0",
};
export const SheetContent = React.forwardRef<
  React.ComponentRef<typeof Primitive.Popup>,
  Omit<React.ComponentPropsWithoutRef<typeof Primitive.Popup>, "className"> & {
    className?: string;
  } & { side?: "left" | "right" | "top" | "bottom" }
>(({ className, side = "right", children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <Primitive.Popup
      ref={ref}
      className={cn(
        "fixed z-50 grid gap-4 border border-line bg-popover text-ink p-6 shadow-lg",
        sides[side],
        className,
      )}
      {...props}
    >
      {children}
      <Primitive.Close
        aria-label="Close"
        className="absolute right-4 top-4 rounded p-1 text-muted hover:bg-selected hover:text-ink"
      >
        <X size={16} />
      </Primitive.Close>
    </Primitive.Popup>
  </SheetPortal>
));
export function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-2", className)} {...props} />;
}
export function SheetFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}
export const SheetTitle = React.forwardRef<
  React.ComponentRef<typeof Primitive.Title>,
  Omit<React.ComponentPropsWithoutRef<typeof Primitive.Title>, "className"> & {
    className?: string;
  }
>(({ className, ...props }, ref) => (
  <Primitive.Title
    ref={ref}
    className={cn("text-lg font-bold tracking-[-0.035em] text-ink", className)}
    {...props}
  />
));
export const SheetDescription = React.forwardRef<
  React.ComponentRef<typeof Primitive.Description>,
  Omit<
    React.ComponentPropsWithoutRef<typeof Primitive.Description>,
    "className"
  > & { className?: string }
>(({ className, ...props }, ref) => (
  <Primitive.Description
    ref={ref}
    className={cn("text-sm text-muted", className)}
    {...props}
  />
));
