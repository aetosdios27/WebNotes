"use client";

import { useState, useMemo, useEffect } from "react";
import {
  X,
  Link2,
  ArrowUpRight,
  ExternalLink,
  AlignLeft,
  History,
} from "lucide-react";
import type { Note } from "@/lib/storage/types";
import { Editor } from "@tiptap/react";
import { VersionList } from "@/app/components/VersionList"; // <-- Import

interface RightSidebarProps {
  activeNote: Note | undefined;
  allNotes: Note[];
  editor: Editor | null;
  onNavigate: (id: string) => void;
  onClose: () => void;
  onPreviewVersion?: (versionId: string) => void; // <-- Add prop
}

export default function RightSidebar({
  activeNote,
  allNotes,
  editor,
  onNavigate,
  onClose,
  onPreviewVersion,
}: RightSidebarProps) {
  const [tab, setTab] = useState<"info" | "outline" | "history">("info");
  const [headings, setHeadings] = useState<
    { id: string; text: string; level: number; pos: number }[]
  >([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);

  // ... (Link Logic & Outline Logic remain the same) ...
  // Paste your existing logic for backlinks/outgoingLinks/headings here
  // I omitted it to save space, but DO NOT delete it.

  // --- 1. LINK LOGIC (Info Tab) ---
  const backlinks = useMemo(() => {
    if (!activeNote || !allNotes) return [];
    return allNotes.filter((n) =>
      n.content?.includes(`data-note-id="${activeNote.id}"`)
    );
  }, [activeNote, allNotes]);

  const outgoingLinks = useMemo(() => {
    if (!activeNote?.content || !allNotes) return [];
    const linkRegex = /data-note-id="([^"]+)"/g;
    const linkedIds = new Set<string>();
    let match;
    while ((match = linkRegex.exec(activeNote.content)) !== null) {
      linkedIds.add(match[1]);
    }
    return allNotes.filter((n) => linkedIds.has(n.id));
  }, [activeNote?.content, allNotes]);

  // --- 2. OUTLINE LOGIC (ToC Tab) ---
  useEffect(() => {
    if (!editor || tab !== "outline") return;

    const updateHeadings = () => {
      const newHeadings: typeof headings = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "heading") {
          newHeadings.push({
            id: node.attrs["data-id"] || `heading-${pos}`,
            text: node.textContent,
            level: node.attrs.level,
            pos,
          });
        }
      });
      setHeadings((prev) => {
        if (
          prev.length === newHeadings.length &&
          prev.every(
            (h, i) =>
              h.text === newHeadings[i].text && h.id === newHeadings[i].id
          )
        ) {
          return prev;
        }
        return newHeadings;
      });
    };

    updateHeadings();

    editor.on("transaction", updateHeadings);
    editor.on("update", updateHeadings);

    return () => {
      editor.off("transaction", updateHeadings);
      editor.off("update", updateHeadings);
    };
  }, [editor, tab]);

  // Scroll Spy
  useEffect(() => {
    if (tab !== "outline" || !editor) return;

    const scrollContainer = document.querySelector(".editor-scroll-container");
    if (!scrollContainer) return;

    const handleScroll = () => {
      const containerRect = scrollContainer.getBoundingClientRect();
      const targetY = containerRect.top + 100;
      let currentId = null;

      for (const h of headings) {
        const el = document.querySelector(`[data-id="${h.id}"]`);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= targetY) {
            currentId = h.id;
          } else {
            break;
          }
        }
      }
      setActiveHeadingId(currentId);
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [headings, tab, editor]);

  const handleJump = (pos: number) => {
    if (!editor) return;
    editor.chain().setTextSelection(pos).scrollIntoView().run();
  };

  if (!activeNote) return null;

  return (
    <div className="w-full h-full flex flex-col bg-zinc-900/50 border-l border-zinc-800">
      {/* HEADER + TABS */}
      <div className="h-12 flex items-center justify-between px-3 border-b border-zinc-800 flex-shrink-0">
        <div className="flex bg-zinc-800/50 p-0.5 rounded-lg border border-zinc-800/50">
          <button
            onClick={() => setTab("info")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
              tab === "info"
                ? "bg-zinc-700 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
            title="Links & Connections"
          >
            <Link2 size={13} />
          </button>
          <button
            onClick={() => setTab("outline")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
              tab === "outline"
                ? "bg-zinc-700 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
            title="Table of Contents"
          >
            <AlignLeft size={13} />
          </button>
          <button
            onClick={() => setTab("history")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
              tab === "history"
                ? "bg-zinc-700 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
            title="Version History"
          >
            <History size={13} />
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {tab === "info" && (
          <div className="space-y-8">
            {/* LINKED FROM */}
            <section>
              <div className="flex items-center gap-2 mb-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                <ArrowUpRight size={12} className="rotate-180 text-blue-400" />
                Incoming ({backlinks.length})
              </div>
              {backlinks.length === 0 ? (
                <div className="p-3 border border-dashed border-zinc-800 rounded text-center">
                  <p className="text-xs text-zinc-600">No incoming links.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {backlinks.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => onNavigate(note.id)}
                      className="w-full text-left group px-3 py-2 rounded-md hover:bg-zinc-800/80 transition-colors text-sm text-zinc-300 truncate border border-transparent hover:border-zinc-700"
                    >
                      {note.title || "Untitled"}
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* OUTGOING LINKS */}
            <section>
              <div className="flex items-center gap-2 mb-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                <ExternalLink size={12} className="text-yellow-500" />
                Outgoing ({outgoingLinks.length})
              </div>
              {outgoingLinks.length === 0 ? (
                <div className="p-3 border border-dashed border-zinc-800 rounded text-center">
                  <p className="text-xs text-zinc-600">No outgoing links.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {outgoingLinks.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => onNavigate(note.id)}
                      className="w-full text-left group px-3 py-2 rounded-md hover:bg-zinc-800/80 transition-colors text-sm text-zinc-300 truncate border border-transparent hover:border-zinc-700"
                    >
                      {note.title || "Untitled"}
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === "outline" && (
          <div className="flex flex-col relative">
            {headings.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs text-zinc-500">No headings found.</p>
                <p className="text-[10px] text-zinc-600 mt-1">
                  Use H1, H2, H3 to generate an outline.
                </p>
              </div>
            ) : (
              headings.map((h, index) => {
                const isActive = activeHeadingId === h.id;
                const indentLevel = h.level - 1;
                const paddingLeft = indentLevel * 16 + 12;

                return (
                  <button
                    key={`${h.id}-${index}`}
                    onClick={() => handleJump(h.pos)}
                    className={`
                      relative w-full text-left py-1.5 pr-2 rounded-md text-sm transition-all truncate group flex items-center
                      ${
                        isActive
                          ? "text-yellow-500 font-medium bg-yellow-500/5"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                      }
                    `}
                    style={{ paddingLeft: `${paddingLeft}px` }}
                  >
                    {indentLevel > 0 && (
                      <>
                        <div
                          className="absolute w-px bg-zinc-800 top-0 bottom-1/2"
                          style={{ left: `${(indentLevel - 1) * 16 + 12}px` }}
                        />
                        <div
                          className="absolute h-px bg-zinc-800 w-2.5 top-1/2"
                          style={{ left: `${(indentLevel - 1) * 16 + 12}px` }}
                        />
                      </>
                    )}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-yellow-500 rounded-r-full" />
                    )}
                    <span className="truncate">
                      {h.text || "Untitled Section"}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}

        {tab === "history" && onPreviewVersion && (
          <VersionList noteId={activeNote.id} onPreview={onPreviewVersion} />
        )}
      </div>
    </div>
  );
}
