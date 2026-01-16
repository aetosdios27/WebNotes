"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { Editor } from "@tiptap/react";

interface TableOfContentsProps {
  editor: Editor | null;
}

interface HeadingData {
  id: string;
  pos: number;
  text: string;
  level: number;
  topPercent: number;
}

export function TableOfContents({ editor }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<HeadingData[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [railHeight, setRailHeight] = useState<number>(0);
  const rafRef = useRef<number | null>(null);

  const calculateHeadings = useCallback(() => {
    if (!editor) return;

    // Use querySelector inside the editor wrapper to be safe
    // Or just look for the editor-scroll-container which we know exists in NoteEditor
    const scrollContainer = document.querySelector(".editor-scroll-container");
    if (!scrollContainer) return;

    const totalHeight = scrollContainer.scrollHeight || 1;
    const viewportHeight = window.innerHeight;

    const calculatedHeight = Math.min(viewportHeight * 0.6, totalHeight * 0.15);
    setRailHeight(calculatedHeight);

    const newHeadings: HeadingData[] = [];

    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "heading") {
        // Get the unique ID from the node
        const id = node.attrs["data-id"] || `heading-${pos}`;

        const domNode = editor.view.nodeDOM(pos);

        if (domNode && domNode instanceof HTMLElement) {
          // Calculate offset relative to the scroll container
          // offsetTop returns the distance from the closest positioned ancestor
          // If the container is relative, this is correct.
          const percent = (domNode.offsetTop / totalHeight) * 100;

          newHeadings.push({
            id,
            pos,
            text: node.textContent,
            level: node.attrs.level,
            topPercent: Math.min(100, Math.max(0, percent)),
          });
        }
      }
    });

    setHeadings(newHeadings);
  }, [editor]);

  // Debounced calculation
  const scheduleCalculation = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      requestAnimationFrame(calculateHeadings);
    });
  }, [calculateHeadings]);

  useEffect(() => {
    if (!editor) return;

    editor.on("update", scheduleCalculation);
    editor.on("selectionUpdate", scheduleCalculation);
    window.addEventListener("resize", scheduleCalculation);

    const scrollContainer = document.querySelector(".editor-scroll-container");
    let resizeObserver: ResizeObserver | null = null;

    if (scrollContainer) {
      resizeObserver = new ResizeObserver(scheduleCalculation);
      resizeObserver.observe(scrollContainer);
    }

    // Initial calculation
    setTimeout(calculateHeadings, 100);

    return () => {
      editor.off("update", scheduleCalculation);
      editor.off("selectionUpdate", scheduleCalculation);
      window.removeEventListener("resize", scheduleCalculation);
      if (resizeObserver) resizeObserver.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [editor, scheduleCalculation, calculateHeadings]);

  // Scroll Spy
  useEffect(() => {
    const scrollContainer = document.querySelector(".editor-scroll-container");
    if (!scrollContainer || !editor) return;

    const handleScroll = () => {
      const containerRect = scrollContainer.getBoundingClientRect();
      // Target Y is slightly down from the top of the container
      const targetY = containerRect.top + 100;

      let closestIndex = 0;
      let minDistance = Infinity;

      headings.forEach((h, index) => {
        // Try to find by ID first, then by position
        let domNode: HTMLElement | null = null;

        // Find by data-id attribute
        // Scope it to the editor to avoid potential conflicts
        const nodeById = document.querySelector(`[data-id="${h.id}"]`);
        if (nodeById instanceof HTMLElement) {
          domNode = nodeById;
        } else {
          // Fallback to position-based lookup
          const nodeAtPos = editor.view.nodeDOM(h.pos);
          if (nodeAtPos instanceof HTMLElement) {
            domNode = nodeAtPos;
          }
        }

        if (!domNode) return;

        const rect = domNode.getBoundingClientRect();
        const distance = Math.abs(rect.top - targetY);

        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });

      setActiveIndex(closestIndex);
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [headings, editor]);

  const handleJump = useCallback(
    (heading: HeadingData) => {
      if (!editor) return;

      const nodeById = document.querySelector(`[data-id="${heading.id}"]`);

      if (nodeById instanceof HTMLElement) {
        nodeById.scrollIntoView({ behavior: "smooth", block: "center" });
        editor.chain().setTextSelection(heading.pos).focus().run();
      } else {
        editor.chain().setTextSelection(heading.pos).scrollIntoView().run();
      }
    },
    [editor]
  );

  if (!editor || headings.length === 0) return null;

  return (
    // FIX: Changed 'fixed' to 'absolute' so it stays inside the relative container
    // Changed 'right-6' to 'right-4' to align better
    // Added 'h-full' and 'flex flex-col justify-center' to center the rail vertically in the container
    <div className="hidden xl:flex absolute right-4 top-0 bottom-0 z-50 w-16 group pointer-events-none flex-col justify-center">
      {/* RIGHT: The Minimap Rail */}
      <div
        className="relative w-full pointer-events-auto transition-[height] duration-300"
        style={{ height: `${Math.max(100, railHeight)}px` }}
      >
        {headings.map((heading, index) => {
          const isActive = activeIndex === index;

          const baseWidth =
            heading.level === 1 ? "w-3" : heading.level === 2 ? "w-2" : "w-1.5";
          const activeWidth = "w-5";

          return (
            <button
              key={heading.id}
              onClick={(e) => {
                e.preventDefault();
                handleJump(heading);
              }}
              style={{ top: `${heading.topPercent}%` }}
              className="absolute right-0 flex justify-end items-center h-2 -mt-1 group/item cursor-pointer w-full transition-all"
              title={heading.text || "Untitled"}
            >
              <div
                className={`
                  rounded-full transition-all duration-200 ease-out
                  ${isActive ? activeWidth : baseWidth}
                  ${
                    isActive
                      ? "h-1 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] opacity-100"
                      : "h-[2px] bg-zinc-600 group-hover/item:bg-zinc-400 opacity-40"
                  }
                `}
              />
            </button>
          );
        })}
      </div>

      {/* LEFT: Pop-up TOC Card */}
      {/* This needs 'absolute' to position relative to the rail container */}
      <div
        className={`
          absolute right-10 top-1/2 -translate-y-1/2 max-h-[60vh] w-64
          flex flex-col bg-zinc-950/90 backdrop-blur-md border border-zinc-800 rounded-lg shadow-2xl
          overflow-y-auto custom-scrollbar p-2
          transition-all duration-200 origin-right
          opacity-0 translate-x-4 scale-95 pointer-events-none

          group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto group-hover:scale-100
        `}
      >
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2 px-3 pt-2">
          Table of Contents
        </div>

        <div className="flex flex-col gap-0.5">
          {headings.map((heading, index) => {
            const isActive = activeIndex === index;

            return (
              <button
                key={heading.id}
                onClick={() => handleJump(heading)}
                className={`
                  text-xs text-left py-1.5 pr-2 rounded transition-colors truncate
                  ${
                    isActive
                      ? "text-white font-medium bg-white/10"
                      : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                  }
                `}
                style={{
                  paddingLeft: `${(heading.level - 1) * 12 + 12}px`,
                }}
              >
                {heading.text || "Untitled"}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
