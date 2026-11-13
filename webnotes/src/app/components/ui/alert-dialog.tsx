"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertDialog as Primitive } from "@base-ui/react/alert-dialog";
import { X } from "lucide-react";
export const AlertDialog = Primitive.Root;
export const AlertDialogPortal = Primitive.Portal;
export function AlertDialogTrigger({
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
export const AlertDialogOverlay = React.forwardRef<
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
export const AlertDialogContent = React.forwardRef<
  React.ComponentRef<typeof Primitive.Popup>,
  Omit<React.ComponentPropsWithoutRef<typeof Primitive.Popup>, "className"> & {
    className?: string;
  }
>(({ className, children, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <Primitive.Popup
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-lg rounded-xl z-50 grid gap-4 border border-line bg-popover text-ink p-6 shadow-lg",
        className,
      )}
      {...props}
    >
      {children}
    </Primitive.Popup>
  </AlertDialogPortal>
));
export function AlertDialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-2", className)} {...props} />;
}
export function AlertDialogFooter({
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
export const AlertDialogTitle = React.forwardRef<
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
export const AlertDialogDescription = React.forwardRef<
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
export const AlertDialogAction = React.forwardRef<
  React.ComponentRef<typeof Primitive.Close>,
  Omit<React.ComponentPropsWithoutRef<typeof Primitive.Close>, "className"> & {
    className?: string;
  }
>(({ className, ...props }, ref) => (
  <Primitive.Close
    ref={ref}
    className={cn(
      "rounded-md bg-ink text-background px-4 py-2 text-sm font-medium",
      className,
    )}
    {...props}
  />
));
export const AlertDialogCancel = React.forwardRef<
  React.ComponentRef<typeof Primitive.Close>,
  Omit<React.ComponentPropsWithoutRef<typeof Primitive.Close>, "className"> & {
    className?: string;
  }
>(({ className, ...props }, ref) => (
  <Primitive.Close
    ref={ref}
    className={cn(
      "rounded-md border border-line bg-panel text-ink px-4 py-2 text-sm",
      className,
    )}
    {...props}
  />
));
