"use client";

import { useMemo } from "react";
import { Link2, ArrowUpRight } from "lucide-react";
import type { Note } from "@/lib/storage/types";

interface Props {
  currentNoteId: string;
  allNotes: Note[];
  onNavigate: (id: string) => void;
}

export function Backlinks({ currentNoteId, allNotes, onNavigate }: Props) {
  const backlinks = useMemo(() => {
    // Comprehensive guards
    if (!currentNoteId) return [];
    if (!allNotes) return [];
    if (!Array.isArray(allNotes)) return [];

    return allNotes.filter((note) => {
      // Skip if no note
      if (!note) return false;

      // Skip self
      if (note.id === currentNoteId) return false;

      // Skip if no content
      if (!note.content) return false;
      if (typeof note.content !== "string") return false;

      // Check if content contains a link to current note
      // Look for data-note-id="currentNoteId"
      return note.content.includes(`data-note-id="${currentNoteId}"`);
    });
  }, [currentNoteId, allNotes]);

  // Don't render if no backlinks
  if (backlinks.length === 0) return null;

  return (
    <div className="border-t border-line mt-12 pt-6 pb-8">
      <button className="flex items-center gap-2 text-xs text-muted  tracking-normal font-semibold mb-4 hover:text-muted transition-colors">
        <Link2 size={12} />
        <span>Linked from ({backlinks.length})</span>
      </button>

      <div className="flex flex-wrap gap-2">
        {backlinks.map((note) => (
          <button
            key={note.id}
            onClick={() => onNavigate(note.id)}
            className="group flex items-center gap-1.5 px-3 py-1.5 bg-panel hover:bg-selected border border-line hover:border-line rounded-md text-sm text-muted hover:text-ink transition-all duration-150"
          >
            <span className="truncate max-w-[180px]">
              {note.title || "Untitled"}
            </span>
            <ArrowUpRight
              size={12}
              className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
