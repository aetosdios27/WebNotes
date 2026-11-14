"use client";
import Brand from "./Brand";
export default function LoadingScreen() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-background text-ink"
    >
      <Brand className="text-3xl" />
      <p className="text-sm text-muted">Loading notes…</p>
    </div>
  );
}
