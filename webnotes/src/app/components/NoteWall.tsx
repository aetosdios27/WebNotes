"use client";
import { useEffect, useRef, useState } from "react";
import type { Note, Folder } from "@/lib/storage/types";
import { Plus } from "lucide-react";
import { NoteMeta, NoteMiniature } from "./NoteSummary";

export default function NoteWall({
  notes,
  folders,
  openNote,
  createNote,
  filter,
  onFilterChange,
}: {
  filter: string;
  onFilterChange: (filter: string) => void;
  notes: Note[];
  folders: Folder[];
  openNote: (id: string) => void;
  createNote: (folderId?: string) => void;
}) {
  const [limit, setLimit] = useState(48);
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
    <section className="note-wall" aria-label="Home">
      <div className="wall-tabs">
        <div role="tablist" aria-label="Filter notes">
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
              {tab.name}
              {tab.count > 0 && (
                <span className="tab-count">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          className="new-note"
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
          <button
            className="note-card"
            key={note.id}
            onClick={() => openNote(note.id)}
          >
            {note.isPinned && <span className="pin-mark" aria-label="Pinned" />}
            <strong>{note.title || "Untitled"}</strong>
            <NoteMiniature content={note.content} />
            <footer>
              <NoteMeta note={note} folders={folders} />
            </footer>
          </button>
        ))}
      </div>
      {!filtered.length && (
        <div className="wall-empty">
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
