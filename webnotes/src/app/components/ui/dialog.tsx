"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Dialog as Primitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
export const Dialog = Primitive.Root;
export const DialogPortal = Primitive.Portal;
export function DialogTrigger({
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
export function DialogClose({
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
export const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof Primitive.Backdrop>,
  Omit<
    React.ComponentPropsWithoutRef<typeof Primitive.Backdrop>,
    "className"
  > & { className?: string }
>(({ className, ...props }, ref) => (
  <Primitive.Backdrop
    data-depth="backdrop"
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/50", className)}
    {...props}
  />
));
export const DialogContent = React.forwardRef<
  React.ComponentRef<typeof Primitive.Popup>,
  Omit<React.ComponentPropsWithoutRef<typeof Primitive.Popup>, "className"> & {
    className?: string;
  }
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <Primitive.Popup
      data-depth="modal"
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-lg rounded-xl z-50 grid gap-4 border border-line bg-popover text-ink p-6 shadow-lg",
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
  </DialogPortal>
));
export function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-2", className)} {...props} />;
}
export function DialogFooter({
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
export const DialogTitle = React.forwardRef<
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
export const DialogDescription = React.forwardRef<
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
