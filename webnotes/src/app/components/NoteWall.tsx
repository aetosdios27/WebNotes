"use client";
import { useEffect, useRef, useState } from "react";
import type { Note, Folder } from "@/lib/storage/types";
import { motionTiming } from "./ui/motion-tokens";
import { SlidingIndicator } from "./ui/sliding-indicator";
import {
  Plus,
  Files,
  Pin,
  Folder as FolderIcon,
  FilePlus2,
} from "lucide-react";
import NoteActionsMenu, { type NoteMenuActions } from "./NoteActionsMenu";
import { NoteMeta, NoteMiniature } from "./NoteSummary";

let entrancePlayed = false;

export default function NoteWall({
  menuActions,
  activeNoteId,
  isReadingMode,
  notes,
  folders,
  openNote,
  createNote,
  filter,
  onFilterChange,
}: {
  menuActions: NoteMenuActions;
  activeNoteId: string | null;
  isReadingMode: boolean;
  filter: string;
  onFilterChange: (filter: string) => void;
  notes: Note[];
  folders: Folder[];
  openNote: (id: string) => void;
  createNote: (folderId?: string) => void;
}) {
  const [limit, setLimit] = useState(48);
  const wall = useRef<HTMLElement>(null);
  useEffect(() => {
    if (entrancePlayed || !notes.length) return;
    entrancePlayed = true;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timing = motionTiming(document.documentElement, "slow");
    wall.current
      ?.querySelectorAll<HTMLElement>(".note-card")
      .forEach((card, i) => {
        card.animate(
          [
            { opacity: 0, transform: "translateY(6px)" },
            { opacity: 1, transform: "none" },
          ],
          {
            ...timing,
            delay: Math.min(i, 8) * 24,
            fill: "backwards",
          },
        );
      });
  }, [notes]);
  const sentinel = useRef<HTMLDivElement>(null);
  const filtered = notes.filter(
    (note) =>
      filter === "all" ||
      (filter === "pinned" ? note.isPinned : note.folderId === filter),
  );
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting))
          setLimit((limit) => limit + 48);
      },
      { rootMargin: "300px" },
    );
    if (sentinel.current) observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [limit, filter]);
  const tabs = [
    { id: "all", name: "All notes", count: notes.length },
    {
      id: "pinned",
      name: "Pinned",
      count: notes.filter((n) => n.isPinned).length,
    },
    ...folders.map((f) => ({
      id: f.id,
      name: f.name,
      count: notes.filter((n) => n.folderId === f.id).length,
    })),
  ];
  return (
    <section ref={wall} className="note-wall" aria-label="Home">
      <div className="wall-tabs">
        <div role="tablist" aria-label="Filter notes">
          <SlidingIndicator value={filter} />
          {tabs.map((tab) => (
            <button
              role="tab"
              aria-selected={filter === tab.id}
              key={tab.id}
              onClick={() => {
                onFilterChange(tab.id);
                setLimit(48);
              }}
            >
              {tab.id === "all" ? (
                <Files aria-hidden="true" />
              ) : tab.id === "pinned" ? (
                <Pin aria-hidden="true" />
              ) : (
                <FolderIcon aria-hidden="true" />
              )}
              {tab.name}
              {tab.count > 0 && <span className="tab-count">{tab.count}</span>}
            </button>
          ))}
        </div>
        <button
          className="new-note button-primary"
          onClick={() =>
            createNote(
              filter !== "all" && filter !== "pinned" ? filter : undefined,
            )
          }
        >
          <Plus size={15} />
          New note<kbd>N</kbd>
        </button>
      </div>
      <div className="note-grid">
        {filtered.slice(0, limit).map((note) => (
          <NoteActionsMenu
            key={note.id}
            context
            note={note}
            folders={folders}
            reading={activeNoteId === note.id && isReadingMode}
            actions={menuActions}
            trigger={
              <button className="note-card" onClick={() => openNote(note.id)}>
                {note.isPinned && (
                  <Pin className="pin-mark" aria-label="Pinned" />
                )}
                <strong>{note.title || "Untitled"}</strong>
                <NoteMiniature content={note.content} />
                <footer>
                  <NoteMeta note={note} folders={folders} />
                </footer>
              </button>
            }
          />
        ))}
      </div>
      {!filtered.length && (
        <div className="wall-empty">
          <FilePlus2 className="empty-icon" aria-hidden="true" />
          No notes here yet.{" "}
          <button
            onClick={() =>
              createNote(
                filter !== "all" && filter !== "pinned" ? filter : undefined,
              )
            }
          >
            Write your first note
          </button>
        </div>
      )}
      {filtered.length > limit && (
        <div ref={sentinel} className="load-notes">
          <button onClick={() => setLimit(limit + 48)}>Load more notes</button>
        </div>
      )}
    </section>
  );
}
