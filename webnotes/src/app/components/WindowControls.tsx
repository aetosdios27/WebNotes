"use client";

import { isTauri } from "@/lib/tauri";

export default function WindowControls() {
  if (!isTauri) return null;

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
    <div className="window-controls">
      <button data-tauri-no-drag onClick={handleMinimize} className="window-control" aria-label="Minimize">
        <svg viewBox="0 0 10 10" className="window-glyph"><path d="M2 5h6" stroke="currentColor" strokeWidth="1.2" /></svg>
      </button>
      <button data-tauri-no-drag onClick={handleMaximize} className="window-control" aria-label="Maximize">
        <svg viewBox="0 0 10 10" className="window-glyph" fill="none"><rect x="2" y="2" width="6" height="6" stroke="currentColor" strokeWidth="1.2" /></svg>
      </button>
      <button data-tauri-no-drag onClick={handleClose} className="window-control window-control-close" aria-label="Close">
        <svg viewBox="0 0 10 10" className="window-glyph"><path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke="currentColor" strokeWidth="1.2" /></svg>
      </button>
    </div>
  );
}
