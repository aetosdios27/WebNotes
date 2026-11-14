"use client";

import { useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";

export default function TitleBar() {
  const [render, setRender] = useState(false);

  useEffect(() => {
    if (isTauri()) setRender(true);
  }, []);

  if (!render) return null;

  const handleMinimize = async () => {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().minimize();
  };

  const handleMaximize = async () => {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().toggleMaximize();
  };

  const handleClose = async () => {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().close();
  };

  return (
    <div
      data-tauri-drag-region
      className="h-10 bg-background border-b border-line flex items-center px-4 select-none"
    >
      {/* spacer to push controls to the right */}
      <div className="flex-1" data-tauri-drag-region />

      {/* window controls */}
      <div className="flex items-center gap-2">
        <button
          data-tauri-no-drag
          onClick={handleMinimize}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-selected hover:text-ink"
          aria-label="Minimize"
        >
          <svg viewBox="0 0 10 10" className="h-2.5 w-2.5"><path d="M2 5h6" stroke="currentColor" strokeWidth="1.2" /></svg>
        </button>
        <button
          data-tauri-no-drag
          onClick={handleMaximize}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-selected hover:text-ink"
          aria-label="Maximize"
        >
          <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="none"><rect x="2" y="2" width="6" height="6" stroke="currentColor" strokeWidth="1.2" /></svg>
        </button>
        <button
          data-tauri-no-drag
          onClick={handleClose}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-destructive hover:text-white"
          aria-label="Close"
        >
          <svg viewBox="0 0 10 10" className="h-2.5 w-2.5"><path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke="currentColor" strokeWidth="1.2" /></svg>
        </button>
      </div>
    </div>
  );
}
