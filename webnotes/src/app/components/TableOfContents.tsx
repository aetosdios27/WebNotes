'use client';

import { useEffect, useState, useRef } from 'react';
import type { Editor } from '@tiptap/react';

interface TableOfContentsProps {
  editor: Editor | null;
}

interface HeadingData {
  pos: number;
  text: string;
  level: number;
  topPercent: number;
}

export function TableOfContents({ editor }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<HeadingData[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [railHeight, setRailHeight] = useState<number>(0);
  const isUpdating = useRef(false);

  // 1. Calculate Headings & Positions
  const calculateHeadings = () => {
    if (!editor || isUpdating.current) return;
    
    const scrollContainer = document.querySelector('.editor-scroll-container');
    if (!scrollContainer) return;

    const totalHeight = scrollContainer.scrollHeight || 1;
    const viewportHeight = window.innerHeight;

    const calculatedHeight = Math.min(viewportHeight * 0.6, totalHeight * 0.15);
    setRailHeight(calculatedHeight);
    
    const newHeadings: HeadingData[] = [];
    
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        const domNode = editor.view.nodeDOM(pos);
        
        // FIX: Strict check for HTMLElement
        if (domNode && domNode instanceof HTMLElement) {
          const percent = (domNode.offsetTop / totalHeight) * 100;

          newHeadings.push({
            pos,
            text: node.textContent,
            level: node.attrs.level,
            topPercent: Math.min(100, Math.max(0, percent))
          });
        }
      }
    });

    setHeadings(newHeadings);
  };

  // 2. Listeners
  useEffect(() => {
    if (!editor) return;

    editor.on('update', calculateHeadings);
    window.addEventListener('resize', calculateHeadings);

    const scrollContainer = document.querySelector('.editor-scroll-container');
    let resizeObserver: ResizeObserver | null = null;
    
    if (scrollContainer) {
      resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => requestAnimationFrame(calculateHeadings));
      });
      resizeObserver.observe(scrollContainer);
    }
    
    setTimeout(calculateHeadings, 100);

    return () => {
      editor.off('update', calculateHeadings);
      window.removeEventListener('resize', calculateHeadings);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [editor]);

  // 3. Scroll Spy
  useEffect(() => {
    const scrollContainer = document.querySelector('.editor-scroll-container');
    if (!scrollContainer) return;

    const handleScroll = () => {
      const containerRect = scrollContainer.getBoundingClientRect();
      const targetY = containerRect.top + 100;

      let closestIndex = 0;
      let minDistance = Infinity;

      headings.forEach((h, index) => {
        const domNode = editor?.view.nodeDOM(h.pos);
        
        // FIX: Strict check for HTMLElement before calling getBoundingClientRect
        if (!domNode || !(domNode instanceof HTMLElement)) return;

        const rect = domNode.getBoundingClientRect();
        const distance = Math.abs(rect.top - targetY);

        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });
      
      setActiveIndex(closestIndex);
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [headings, editor]);

  const handleJump = (pos: number) => {
    if (!editor) return;
    editor.chain().setTextSelection(pos).scrollIntoView().run();
  };

  if (!editor || headings.length === 0) return null;

  return (
    <div className="hidden xl:block fixed right-6 top-1/2 -translate-y-1/2 z-50 w-16 group pointer-events-none">
      
      {/* RIGHT: The Minimap Rail */}
      <div 
        className="absolute right-0 top-1/2 -translate-y-1/2 w-full pointer-events-auto transition-[height] duration-300"
        style={{ height: `${Math.max(100, railHeight)}px` }}
      >
        {headings.map((heading, index) => {
          const isActive = activeIndex === index;
          
          const baseWidth = heading.level === 1 ? 'w-3' : heading.level === 2 ? 'w-2' : 'w-1.5';
          const activeWidth = 'w-5';

          return (
            <button
              key={heading.pos}
              onClick={(e) => {
                e.preventDefault();
                handleJump(heading.pos);
              }}
              style={{ top: `${heading.topPercent}%` }}
              className="absolute right-0 flex justify-end items-center h-2 -mt-1 group/item cursor-pointer w-full transition-all"
            >
              <div 
                className={`
                  rounded-full transition-all duration-200 ease-out
                  ${isActive ? activeWidth : baseWidth}
                  ${isActive 
                    ? 'h-1 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] opacity-100' 
                    : 'h-[2px] bg-zinc-600 group-hover/item:bg-zinc-400 opacity-40'
                  }
                `}
              />
            </button>
          );
        })}
      </div>

      {/* LEFT: Pop-up TOC Card */}
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
                key={`toc-${heading.pos}`}
                onClick={() => handleJump(heading.pos)}
                className={`
                  text-xs text-left py-1.5 pr-2 rounded transition-colors truncate
                  ${isActive 
                    ? 'text-white font-medium bg-white/10' 
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                  }
                `}
                style={{ 
                  paddingLeft: `${(heading.level - 1) * 12 + 12}px` 
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