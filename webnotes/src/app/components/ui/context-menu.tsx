"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { ContextMenu as Primitive } from "@base-ui/react/context-menu";
import { Check, ChevronRight, Circle } from "lucide-react";
export const ContextMenu = Primitive.Root;
export const ContextMenuPortal = Primitive.Portal;
export const ContextMenuGroup = Primitive.Group;
export const ContextMenuSub = Primitive.SubmenuRoot;
export const ContextMenuRadioGroup = Primitive.RadioGroup;
export function ContextMenuTrigger({
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
export const ContextMenuContent = React.forwardRef<
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
      side = "bottom",
      align = "start",
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
            "min-w-32 max-h-[var(--available-height)] overflow-y-auto rounded-lg border border-line bg-popover p-1 text-ink shadow-lg outline-none",
            className,
          )}
          {...props}
        />
      </Primitive.Positioner>
    </Primitive.Portal>
  ),
);
export const ContextMenuSubContent = React.forwardRef<
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
      side = "right",
      align = "start",
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
            "min-w-32 max-h-[var(--available-height)] overflow-y-auto rounded-lg border border-line bg-popover p-1 text-ink shadow-lg outline-none",
            className,
          )}
          {...props}
        />
      </Primitive.Positioner>
    </Primitive.Portal>
  ),
);
export const ContextMenuItem = React.forwardRef<
  React.ComponentRef<typeof Primitive.Item>,
  Omit<React.ComponentPropsWithoutRef<typeof Primitive.Item>, "className"> & {
    className?: string;
  } & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <Primitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-selected data-[disabled]:opacity-50 data-[disabled]:pointer-events-none [&_svg]:size-4",
      className,
    )}
    style={inset ? { paddingLeft: 32 } : undefined}
    {...props}
  />
));
export const ContextMenuSubTrigger = React.forwardRef<
  React.ComponentRef<typeof Primitive.SubmenuTrigger>,
  Omit<
    React.ComponentPropsWithoutRef<typeof Primitive.SubmenuTrigger>,
    "className"
  > & { className?: string } & { inset?: boolean }
>(({ className, inset, children, ...props }, ref) => (
  <Primitive.SubmenuTrigger
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-selected data-[disabled]:opacity-50 data-[disabled]:pointer-events-none [&_svg]:size-4",
      inset && "pl-8",
      className,
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto size-4" />
  </Primitive.SubmenuTrigger>
));
export const ContextMenuCheckboxItem = React.forwardRef<
  React.ComponentRef<typeof Primitive.CheckboxItem>,
  Omit<
    React.ComponentPropsWithoutRef<typeof Primitive.CheckboxItem>,
    "className"
  > & { className?: string }
>(({ className, children, ...props }, ref) => (
  <Primitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-selected data-[disabled]:opacity-50 data-[disabled]:pointer-events-none [&_svg]:size-4 pl-8",
      className,
    )}
    {...props}
  >
    <Primitive.CheckboxItemIndicator className="absolute left-2">
      <Check className="size-3" />
    </Primitive.CheckboxItemIndicator>
    {children}
  </Primitive.CheckboxItem>
));
export const ContextMenuRadioItem = React.forwardRef<
  React.ComponentRef<typeof Primitive.RadioItem>,
  Omit<
    React.ComponentPropsWithoutRef<typeof Primitive.RadioItem>,
    "className"
  > & { className?: string }
>(({ className, children, ...props }, ref) => (
  <Primitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-selected data-[disabled]:opacity-50 data-[disabled]:pointer-events-none [&_svg]:size-4 pl-8",
      className,
    )}
    {...props}
  >
    <Primitive.RadioItemIndicator className="absolute left-2">
      <Circle className="size-3" />
    </Primitive.RadioItemIndicator>
    {children}
  </Primitive.RadioItem>
));
export const ContextMenuLabel = React.forwardRef<
  React.ComponentRef<typeof Primitive.GroupLabel>,
  Omit<
    React.ComponentPropsWithoutRef<typeof Primitive.GroupLabel>,
    "className"
  > & { className?: string } & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <Primitive.GroupLabel
    ref={ref}
    className={cn("px-2 py-1.5 text-xs text-muted", className)}
    style={inset ? { paddingLeft: 32 } : undefined}
    {...props}
  />
));
export const ContextMenuSeparator = React.forwardRef<
  React.ComponentRef<typeof Primitive.Separator>,
  Omit<
    React.ComponentPropsWithoutRef<typeof Primitive.Separator>,
    "className"
  > & { className?: string }
>(({ className, ...props }, ref) => (
  <Primitive.Separator
    ref={ref}
    className={cn("my-1 h-px bg-line", className)}
    {...props}
  />
));
export function ContextMenuShortcut({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("ml-auto text-xs text-muted", className)} {...props} />
  );
}
