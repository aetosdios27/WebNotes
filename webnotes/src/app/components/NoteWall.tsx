"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Note, Folder } from "@/lib/storage/types";
import { motionTiming } from "./ui/motion-tokens";
import { SlidingIndicator } from "./ui/sliding-indicator";
import {
  Plus,
  Files,
  Pin,
  Folder as FolderIcon,
} from "lucide-react";
import type { NoteMenuActions } from "./NoteActionsMenu";
import { RollingText } from "./ui/rolling-text";
import { whenCurrent } from "@/lib/edit-guard";
import WallSections from "./WallSections";

function FolderTabInput({ name, folders, id, save, cancel }: {
  name: string; folders: Folder[]; id: string;
  save: (name: string) => Promise<void>; cancel: () => void;
}) {
  const [value, setValue] = useState(name);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const finished = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    input.current?.focus();
    input.current?.select();
    input.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, []);
  useEffect(() => () => { mounted.current = false; }, []);
  async function commit(blur = false) {
    if (finished.current) return;
    const trimmed = value.trim();
    if (!trimmed && blur) { finished.current = true; cancel(); return; }
    if (!trimmed || trimmed.length > 60) { setError("Use 1–60 characters"); return; }
    if (folders.some(f => f.id !== id && f.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase())) {
      setError("A folder with this name already exists"); return;
    }
    finished.current = true;
    setSaving(true);
    // A slow save must not close a newer editor or discard its draft.
    await whenCurrent(
      () => save(trimmed),
      () => mounted.current,
      () => cancel(),
      () => { finished.current = false; setSaving(false); setError("Could not save folder. Try again."); },
    );
  }
  return <div className="folder-tab-edit">
    <div className="folder-tab-field" data-invalid={Boolean(error)}>
      <FolderIcon size={15} aria-hidden="true" />
      <input ref={input} aria-label={id === "new" ? "New folder name" : "Rename folder"}
        aria-invalid={Boolean(error)} aria-describedby={error ? "folder-name-error" : undefined}
        value={value} disabled={saving} placeholder="Folder name"
        style={{ width: `${Math.min(60, Math.max(14, value.length + 1))}ch` }}
        onChange={e => { setValue(e.target.value); setError(""); }}
        onBlur={() => void commit(true)}
        onKeyDown={e => {
          if (e.nativeEvent.isComposing) return;
          if (e.key === "Enter") { e.preventDefault(); void commit(); }
          if (e.key === "Escape") { e.preventDefault(); finished.current = true; cancel(); }
        }} />
    </div>
    {error && <span id="folder-name-error" role="alert" className="folder-name-error">{error}</span>}
  </div>;
}

let entrancePlayed = false;

// The wall unmounts while a note is open. Loaded counts live in WallSections.
let savedWall = { filter: "all", top: 0 };

export default function NoteWall({
  folderEditing,
  onFolderEditingChange,
  saveFolder,
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
  folderEditing: string | null;
  onFolderEditingChange: (id: string | null) => void;
  saveFolder: (id: string, name: string) => Promise<void>;
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
  const wall = useRef<HTMLElement>(null);
  const tablist = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });
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
    const row = tablist.current;
    if (!row) return;
    const measure = () =>
      setEdges({
        start: row.scrollLeft > 1,
        end: row.scrollWidth - row.clientWidth - row.scrollLeft > 1,
      });
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    row.addEventListener("scroll", measure, { passive: true });
    measure();
    return () => {
      observer.disconnect();
      row.removeEventListener("scroll", measure);
    };
  }, [folders, notes]);
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
  const filtered = useMemo(() => notes.filter(
    (note) =>
      filter === "all" ||
      (filter === "pinned" ? note.isPinned : note.folderId === filter),
  ), [notes, filter]);
  const tabs = [
    { id: "all", name: "All notes", count: notes.length },
    {
      id: "pinned",
      name: "Pinned",
      count: notes.filter((n) => n.isPinned).length,
    },
    ...(folderEditing === "new" ? [{ id: "new", name: "", count: 0 }] : []),
    ...folders.map((f) => ({
      id: f.id,
      name: f.name,
      count: notes.filter((n) => n.folderId === f.id).length,
    })),
  ];
  return (
    <section ref={wall} className="note-wall" aria-label="Home">
      <div className="wall-tabs">
        <div
          className="wall-tab-mask"
          data-fade-start={edges.start}
          data-fade-end={edges.end}
        >
          <div ref={tablist} role="tablist" aria-label="Filter notes">
            <SlidingIndicator value={filter} />
            {tabs.map((tab) => folderEditing === tab.id ? (
              <FolderTabInput key={tab.id} id={tab.id} name={tab.name} folders={folders}
                save={name => saveFolder(tab.id, name)} cancel={() => onFolderEditingChange(null)} />
            ) : (
              <button
                role="tab"
                aria-selected={filter === tab.id}
                key={tab.id}
                title={tab.name}
                onDoubleClick={() => { if (folders.some(f => f.id === tab.id)) onFolderEditingChange(tab.id); }}
                onClick={() => onFilterChange(tab.id)}
              >
                {tab.id === "all" ? (
                  <Files aria-hidden="true" />
                ) : tab.id === "pinned" ? (
                  <Pin aria-hidden="true" />
                ) : (
                  <FolderIcon aria-hidden="true" />
                )}
                <span className="tab-label" title={tab.name}>
                  {tab.name}
                </span>
                {tab.count > 0 && (
                  <span className="tab-count">
                    <RollingText value={tab.count} />
                  </span>
                )}
              </button>
            ))}
          </div>
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
      <WallSections
        key={filter}
        notes={filtered}
        filter={filter}
        folders={folders}
        menuActions={menuActions}
        activeNoteId={activeNoteId}
        isReadingMode={isReadingMode}
        openNote={openNote}
        createNote={() => createNote(filter !== "all" && filter !== "pinned" ? filter : undefined)}
      />
    </section>
  );
}
