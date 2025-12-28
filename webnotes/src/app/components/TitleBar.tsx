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
      className="h-10 bg-black border-b border-zinc-800 flex items-center px-4 select-none"
    >
      {/* spacer to push controls to the right */}
      <div className="flex-1" data-tauri-drag-region />

      {/* window controls */}
      <div className="flex items-center gap-2">
        <button
          data-tauri-no-drag
          onClick={handleMinimize}
          className="w-3 h-3 rounded-full bg-[#4A4533] hover:bg-[#FFBD2E] transition-colors"
          aria-label="Minimize"
        />
        <button
          data-tauri-no-drag
          onClick={handleMaximize}
          className="w-3 h-3 rounded-full bg-[#354535] hover:bg-[#28C840] transition-colors"
          aria-label="Maximize"
        />
        <button
          data-tauri-no-drag
          onClick={handleClose}
          className="w-3 h-3 rounded-full bg-[#4A3535] hover:bg-[#FF5F57] transition-colors"
          aria-label="Close"
        />
      </div>
    </div>
  );
}
