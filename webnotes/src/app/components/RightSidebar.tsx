"use client";

import { X, Link2, ArrowUpRight, ExternalLink } from "lucide-react";
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
  // 1. BACKLINKS: Who links TO me?
  const backlinks = useMemo(() => {
    if (!activeNote || !allNotes) return [];
    return allNotes.filter((n) =>
      n.content?.includes(`data-note-id="${activeNote.id}"`)
    );
  }, [activeNote, allNotes]);

  // 2. OUTGOING LINKS: Who do I link TO?
  const outgoingLinks = useMemo(() => {
    if (!activeNote?.content || !allNotes) return [];

    // Extract all UUIDs from data-note-id="..." tags in current content
    const linkRegex = /data-note-id="([^"]+)"/g;
    const linkedIds = new Set<string>();
    let match;

    while ((match = linkRegex.exec(activeNote.content)) !== null) {
      linkedIds.add(match[1]);
    }

    // Return the actual Note objects
    return allNotes.filter((n) => linkedIds.has(n.id));
  }, [activeNote?.content, allNotes]);

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

      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        {/* SECTION 1: LINKED FROM (Backlinks) */}
        <section>
          <div className="flex items-center gap-2 mb-3 text-sm font-medium text-zinc-400">
            <Link2 size={14} />
            <span>Linked From ({backlinks.length})</span>
          </div>

          {backlinks.length === 0 ? (
            <div className="p-3 rounded-lg border border-dashed border-zinc-800 text-center">
              <p className="text-xs text-zinc-500">
                No notes link to this one.
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
                    {/* Arrow pointing IN (Backlink) */}
                    <ArrowUpRight
                      size={12}
                      className="opacity-0 group-hover:opacity-100 text-zinc-500 transition-opacity rotate-180"
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* SECTION 2: LINKS TO (Outgoing) */}
        <section>
          <div className="flex items-center gap-2 mb-3 text-sm font-medium text-zinc-400">
            <ExternalLink size={14} />
            <span>Links To ({outgoingLinks.length})</span>
          </div>

          {outgoingLinks.length === 0 ? (
            <div className="p-3 rounded-lg border border-dashed border-zinc-800 text-center">
              <p className="text-xs text-zinc-500">
                This note has no outgoing links.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {outgoingLinks.map((note) => (
                <button
                  key={note.id}
                  onClick={() => onNavigate(note.id)}
                  className="w-full text-left group p-3 rounded-md bg-zinc-900/50 hover:bg-zinc-800 transition-all border border-zinc-800/50 hover:border-zinc-700"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-300 truncate max-w-[180px]">
                      {note.title || "Untitled"}
                    </span>
                    {/* Arrow pointing OUT (Outgoing) */}
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
