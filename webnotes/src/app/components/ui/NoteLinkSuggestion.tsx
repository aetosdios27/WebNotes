"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { FileText } from "lucide-react";

export interface NoteLinkItem {
  id: string;
  title: string;
}

interface Props {
  items: NoteLinkItem[];
  command: (item: { id: string; label: string }) => void;
  query: string;
  onClose?: () => void;
}

export const NoteLinkSuggestion = forwardRef((props: Props, ref) => {
  const { items, command, query, onClose } = props;
  const [selected, setSelected] = useState(0);

  useEffect(() => setSelected(0), [items]);

  const select = (index: number) => {
    const item = items[index];
    if (item) {
      command({ id: item.id, label: item.title });
    }
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      // 1. Navigation (only if items exist)
      if (items.length > 0) {
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setSelected((s) => (s <= 0 ? items.length - 1 : s - 1));
          return true;
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSelected((s) => (s >= items.length - 1 ? 0 : s + 1));
          return true;
        }
        if (event.key === "Enter" || event.key === "Tab") {
          event.preventDefault();
          event.stopPropagation();
          select(selected);
          return true;
        }
      }
      // 2. Empty List Handling
      else {
        if (event.key === "Enter") {
          // If list is empty, Enter should just insert a newline
          // We return FALSE to let Tiptap handle the event normally
          if (onClose) onClose();
          return false;
        }
      }

      // 3. Space Handling
      if (event.key === " " && items.length === 0) {
        // If list is empty and user types space, let them keep typing normally
        if (onClose) onClose();
        return false;
      }

      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 min-w-[200px] text-xs text-zinc-500 shadow-xl">
        No notes found matching "{query}"
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden min-w-[200px] max-h-[280px] overflow-y-auto shadow-xl">
      <div className="text-[10px] uppercase tracking-wider text-zinc-600 px-2 py-1.5 border-b border-zinc-800 font-semibold bg-zinc-900/90 backdrop-blur sticky top-0">
        Link Note
      </div>
      {items.map((item, i) => (
        <button
          key={item.id}
          onClick={() => select(i)}
          onMouseEnter={() => setSelected(i)}
          className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${
            i === selected
              ? "bg-zinc-800 text-white"
              : "text-zinc-400 hover:bg-zinc-800/50"
          }`}
        >
          <FileText size={14} className="flex-shrink-0 opacity-70" />
          <span className="truncate">{item.title || "Untitled"}</span>
        </button>
      ))}
    </div>
  );
});

NoteLinkSuggestion.displayName = "NoteLinkSuggestion";
