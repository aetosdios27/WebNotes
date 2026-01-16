"use client";

import { X, Link2, ArrowUpRight } from "lucide-react";
import type { Note } from "@/lib/storage/types";
import { useMemo } from "react";

interface RightSidebarProps {
  activeNote: Note | undefined;
  allNotes: Note[];
  onNavigate: (id: string) => void;
  onClose: () => void;
}

export default function RightSidebar({
  activeNote,
  allNotes,
  onNavigate,
  onClose,
}: RightSidebarProps) {
  // Only calculate backlinks
  const backlinks = useMemo(() => {
    if (!activeNote || !allNotes) return [];
    return allNotes.filter((n) =>
      n.content?.includes(`data-note-id="${activeNote.id}"`)
    );
  }, [activeNote, allNotes]);

  if (!activeNote) return null;

  return (
    <div className="w-full h-full flex flex-col bg-zinc-900/50 border-l border-zinc-800">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-zinc-800 flex-shrink-0">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          Context
        </span>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Backlinks Section */}
        <section>
          <div className="flex items-center gap-2 mb-3 text-sm font-medium text-zinc-400">
            <Link2 size={14} />
            <span>Linked From ({backlinks.length})</span>
          </div>

          {backlinks.length === 0 ? (
            <div className="p-4 rounded-lg border border-dashed border-zinc-800 text-center">
              <p className="text-xs text-zinc-500">
                No notes link to this one yet.
              </p>
              <p className="text-[10px] text-zinc-600 mt-1">
                Type{" "}
                <code className="bg-zinc-800 px-1 rounded">
                  [[{activeNote.title}]]
                </code>{" "}
                in other notes to link here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {backlinks.map((note) => (
                <button
                  key={note.id}
                  onClick={() => onNavigate(note.id)}
                  className="w-full text-left group p-3 rounded-md bg-zinc-900/50 hover:bg-zinc-800 transition-all border border-zinc-800/50 hover:border-zinc-700"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-300 truncate max-w-[180px]">
                      {note.title || "Untitled"}
                    </span>
                    <ArrowUpRight
                      size={12}
                      className="opacity-0 group-hover:opacity-100 text-zinc-500 transition-opacity"
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
