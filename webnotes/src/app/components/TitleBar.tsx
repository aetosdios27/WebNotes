"use client";

import { useEffect, useState } from "react";

export default function TitleBar() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // Check if we're in Tauri
    setIsDesktop(typeof window !== "undefined" && "__TAURI__" in window);
  }, []);

  if (!isDesktop) return null;

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
      className="h-10 bg-black border-b border-zinc-800 flex items-center justify-between px-4 select-none"
    >
      {/* Left side - App name */}
      <div className="flex items-center gap-2" data-tauri-drag-region>
        <span className="text-sm font-medium text-white">WebNotes</span>
      </div>

      {/* Right side - Window controls */}
      <div className="flex items-center gap-2">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="w-3 h-3 rounded-full bg-[#4A3535] hover:bg-[#FF5F57] transition-colors duration-150"
          aria-label="Close"
        />

        {/* Minimize button */}
        <button
          onClick={handleMinimize}
          className="w-3 h-3 rounded-full bg-[#4A4533] hover:bg-[#FFBD2E] transition-colors duration-150"
          aria-label="Minimize"
        />

        {/* Maximize button */}
        <button
          onClick={handleMaximize}
          className="w-3 h-3 rounded-full bg-[#354535] hover:bg-[#28C840] transition-colors duration-150"
          aria-label="Maximize"
        />
      </div>
    </div>
  );
}
