"use client";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { Note, Folder } from "@/lib/storage/types";
import { motionTiming } from "./ui/motion-tokens";
import type { NoteMenuActions } from "./NoteActionsMenu";
import WallSections from "./WallSections";
import { PanelLeftOpen, Plus } from "lucide-react";
import { RollingText } from "./ui/rolling-text";

let entrancePlayed = false;
let savedWall = { filter: "all", top: 0 };

export default function NoteWall({
  menuActions,
  activeNoteId,
  isReadingMode,
  notes,
  folders,
  openNote,
  createNote,
  filter,
  onOpenFolders,
}: {
  menuActions: NoteMenuActions;
  activeNoteId: string | null;
  isReadingMode: boolean;
  filter: string;
  notes: Note[];
  folders: Folder[];
  openNote: (id: string) => void;
  createNote: (folderId?: string) => void;
  onOpenFolders?: () => void;
}) {
  const wall = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (wall.current) wall.current.scrollTop = savedWall.filter === filter ? savedWall.top : 0;
  }, [filter]);
  useEffect(() => {
    const element = wall.current;
    if (!element) return;
    const remember = () => { savedWall = { filter, top: element.scrollTop }; };
    element.addEventListener("scroll", remember, { passive: true });
    return () => element.removeEventListener("scroll", remember);
  }, [filter]);
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
  const filtered = useMemo(() => notes.filter(note => filter === "all" ||
    (filter === "pinned" ? note.isPinned : note.folderId === filter)), [notes, filter]);
  const scopeName =
    filter === "all"
      ? "All notes"
      : filter === "pinned"
        ? "Pinned"
        : (folders.find((f) => f.id === filter)?.name ?? "All notes");
  return (
    <section ref={wall} className="note-wall" aria-label="Home">
      <header className="wall-header">
        <div className="wall-heading">
          {onOpenFolders && (
            <button
              type="button"
              className="wall-folders-button"
              aria-label="Open folders"
              title="Open folders"
              onClick={onOpenFolders}
            >
              <PanelLeftOpen aria-hidden="true" />
            </button>
          )}
          <h1 title={scopeName}>{scopeName}</h1>
          <button
            className="new-note button-primary"
            onClick={() =>
              createNote(
                filter !== "all" && filter !== "pinned" ? filter : undefined,
              )
            }
          >
            <Plus size={15} />
            New note
          </button>
        </div>
        <p className="wall-subline">
          <RollingText value={filtered.length} />{" "}
          {filtered.length === 1 ? "note" : "notes"}
        </p>
      </header>
      <WallSections key={filter} notes={filtered} filter={filter} folders={folders}
        menuActions={menuActions} activeNoteId={activeNoteId} isReadingMode={isReadingMode}
        openNote={openNote}
        createNote={() => createNote(filter !== "all" && filter !== "pinned" ? filter : undefined)} />
    </section>
  );
}
