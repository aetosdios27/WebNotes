"use client";

import {
  useEffect,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "../../../lib/utils";

export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div aria-hidden="true" className={cn("skeleton", className)} {...props} />
  );
}

// Reserve the content's frame immediately, but keep fast local reads invisible.
export function LoadingRegion({
  pending,
  skeleton,
  children,
  className,
  label = "Loading",
}: {
  pending: boolean;
  skeleton: ReactNode;
  children?: ReactNode;
  className?: string;
  label?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [previousPending, setPreviousPending] = useState(pending);
  if (previousPending !== pending) {
    setPreviousPending(pending);
    if (pending) setVisible(false);
  }
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(timer);
  }, [pending]);
  return (
    <div className={cn("loading-region", className)} aria-busy={pending}>
      {pending && (
        <span className="sr-only" role="status">
          {label}
        </span>
      )}
      <div
        className="loading-placeholder"
        data-visible={visible && pending}
        aria-hidden="true"
      >
        {skeleton}
      </div>
      <div className="loading-content" data-visible={!pending}>
        {!pending && children}
      </div>
    </div>
  );
}
