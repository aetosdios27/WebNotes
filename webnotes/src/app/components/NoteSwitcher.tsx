"use client";
import { RollingText } from "./ui/rolling-text";
import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { SlidingIndicator } from "./ui/sliding-indicator";
import { ActionIcon } from "./ui/action-icon";
import {
  Search,
  X,
  FileText,
  FileSearch,
  Files,
  Pin,
  Folder as FolderIcon,
} from "lucide-react";
import type { Note, Folder } from "@/lib/storage/types";
import { FittedName } from "./ui/fitted-name";
import { NoteMeta, NoteMiniature, noteText } from "./NoteSummary";

const MAX_FOLDERS = 6;
export type SwitcherAction = { label: string; run: () => void };
export default function NoteSwitcher({
  open,
  onOpenChange,
  notes,
  folders,
  openNote,
  openFolder,
  createNote,
  actions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: Note[];
  folders: Folder[];
  openNote: (id: string) => void;
  openFolder: (id: string) => void;
  createNote: (title: string) => void;
  actions: SwitcherAction[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("recent");
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const selected = useRef<HTMLButtonElement>(null);
  const results = useMemo(
    () =>
      notes
        .filter(
          (note) =>
            (filter === "recent" ||
              (filter === "pinned"
                ? note.isPinned
                : note.folderId === filter)) &&
            `${note.title} ${noteText(note.content)}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
        .slice(0, 100),
    [notes, filter, query],
  );
  const needle = query.trim().toLowerCase();
  // Folders lead when the query names one; selecting one opens it on the wall.
  const folderMatches =
    needle && filter === "recent"
      ? folders.filter((f) => f.name.toLowerCase().includes(needle))
      : [];
  const folderResults = folderMatches.slice(0, MAX_FOLDERS);
  const matchingActions = actions.filter((action) =>
    action.label.toLowerCase().includes(query.toLowerCase()),
  );
  const offset = folderResults.length;
  const count = offset + results.length + matchingActions.length;
  const activeIndex = Math.min(index, Math.max(0, count - 1));
  const highlightedFolder = folderResults[activeIndex];
  const highlighted = results[activeIndex - offset];
  const activeId = highlightedFolder
    ? `folder-${highlightedFolder.id}`
    : highlighted
      ? `result-${highlighted.id}`
      : count
        ? `action-${activeIndex - offset - results.length}`
        : undefined;
  const folderCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const note of notes)
      if (note.folderId) counts.set(note.folderId, (counts.get(note.folderId) ?? 0) + 1);
    return counts;
  }, [notes]);
  const folderCount = (id: string) => folderCounts.get(id) ?? 0;
  useEffect(() => {
    if (!open) {
      setQuery("");
      setFilter("recent");
      setIndex(0);
    }
  }, [open]);
  useEffect(() => {
    selected.current?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, query, filter]);
  function close() {
    input.current?.blur();
    onOpenChange(false);
  }
  function choose() {
    if (highlightedFolder) openFolder(highlightedFolder.id);
    else if (highlighted) openNote(highlighted.id);
    else matchingActions[activeIndex - offset - results.length]?.run();
    close();
  }
  return (
    <Dialog.Root open={open} onOpenChange={(next) => {
      if (!next) input.current?.blur();
      onOpenChange(next);
    }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="switcher-veil" />
        <Dialog.Popup
          finalFocus={false}
          className="note-switcher"
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              createNote(query.trim());
              close();
              return;
            }
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              input.current?.focus();
              setIndex(() =>
                Math.max(
                  0,
                  Math.min(
                    count - 1,
                    activeIndex + (event.key === "ArrowDown" ? 1 : -1),
                  ),
                ),
              );
            }
            // Chips and Close keep their own Enter; only the input and options choose.
            const target = event.target as HTMLElement;
            if (
              event.key === "Enter" &&
              (target === input.current || target.closest('[role="option"]'))
            ) {
              event.preventDefault();
              choose();
            }
          }}
        >
          <Dialog.Title className="sr-only">Switch notes</Dialog.Title>
          <Dialog.Description className="sr-only">
            Search notes, preview a result, or run an action. Use arrow keys and
            Enter to open.
          </Dialog.Description>
          <div className="switcher-search">
            <Search size={20} />
            <input
              ref={input}
              aria-label="Search or jump to a note"
              placeholder="Search or jump to a note"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setIndex(0);
              }}
              autoFocus
              role="combobox"
              aria-expanded={open}
              aria-autocomplete="list"
              aria-controls="note-results"
              aria-activedescendant={activeId}
            />
            <Dialog.Close aria-label="Close switcher">
              <X size={17} />
            </Dialog.Close>
          </div>
          <div className="switcher-chips">
            <SlidingIndicator value={filter} />
            {[
              { id: "recent", name: "Recent" },
              { id: "pinned", name: "Pinned" },
              ...folders,
            ].map((f) => (
              <button
                key={f.id}
                aria-pressed={filter === f.id}
                onClick={() => {
                  setFilter(f.id);
                  setIndex(0);
                }}
              >
                {f.id === "recent" ? (
                  <Files aria-hidden="true" />
                ) : f.id === "pinned" ? (
                  <Pin aria-hidden="true" />
                ) : (
                  <FolderIcon aria-hidden="true" />
                )}
                {f.name}
              </button>
            ))}
          </div>
          <div className="switcher-columns">
            <div
              className="switcher-results"
              id="note-results"
              role="listbox"
              aria-label="Folders, notes and actions"
            >
              <SlidingIndicator value={`${activeIndex}:${query}:${filter}`} />
              {folderResults.length > 0 && (
                <div role="group" aria-label="Folders" className="switcher-folders">
                  <h3>
                    Folders
                    <span>
                      {folderMatches.length > folderResults.length
                        ? `${folderResults.length} of ${folderMatches.length}`
                        : folderMatches.length}{" "}
                      found · newest first
                    </span>
                  </h3>
                  {folderResults.map((folder, i) => (
                    <button
                      ref={i === activeIndex ? selected : undefined}
                      role="option"
                      aria-selected={i === activeIndex}
                      id={`folder-${folder.id}`}
                      key={folder.id}
                      title={folder.name}
                      onFocus={() => setIndex(i)}
                      onMouseEnter={() => {
                        setIndex(i);
                        input.current?.focus();
                      }}
                      onClick={() => {
                        openFolder(folder.id);
                        close();
                      }}
                    >
                      <FolderIcon className="result-icon" aria-hidden="true" />
                      <strong>
                        <FittedName name={folder.name} query={needle} className="fitted-name" />
                        <span className="sr-only">{folder.name}</span>
                      </strong>
                      <p>
                        {folderCount(folder.id)}{" "}
                        {folderCount(folder.id) === 1 ? "note" : "notes"}
                      </p>
                    </button>
                  ))}
                </div>
              )}
              <div role="group" aria-label="Notes">
                {results.map((note, n) => {
                  const i = offset + n;
                  return (
                  <button
                    ref={i === activeIndex ? selected : undefined}
                    role="option"
                    aria-selected={i === activeIndex}
                    id={`result-${note.id}`}
                    key={note.id}
                    onFocus={() => setIndex(i)}
                    onMouseEnter={() => {
                      setIndex(i);
                      input.current?.focus();
                    }}
                    onClick={() => {
                      openNote(note.id);
                      close();
                    }}
                  >
                    <FileText className="result-icon" aria-hidden="true" />
                    <strong>{note.title || "Untitled"}</strong>
                    <p>{noteText(note.content) || "Empty note"}</p>
                  </button>
                  );
                })}
              </div>
              {!results.length && !folderResults.length && (
                <p className="no-results">
                  <FileSearch className="empty-icon" aria-hidden="true" />
                  No matching notes. ⌘↵ creates “{query || "Untitled"}”.
                </p>
              )}
              <div
                className="switcher-actions"
                role="group"
                aria-label="Actions"
              >
                <h3>Actions</h3>
                {matchingActions.map((action, i) => (
                  <button
                    ref={
                      activeIndex === offset + results.length + i ? selected : undefined
                    }
                    role="option"
                    aria-selected={activeIndex === offset + results.length + i}
                    id={`action-${i}`}
                    key={action.label}
                    data-selected={activeIndex === offset + results.length + i}
                    onMouseEnter={() => {
                      setIndex(offset + results.length + i);
                      input.current?.focus();
                    }}
                    onFocus={() => setIndex(offset + results.length + i)}
                    onClick={() => {
                      action.run();
                      close();
                    }}
                  >
                    <ActionIcon label={action.label} />
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
            <aside className="switcher-preview" aria-label="Note preview">
              {highlightedFolder ? (
                <>
                  <h2>{highlightedFolder.name}</h2>
                  <div className="preview-meta">
                    <FolderIcon aria-hidden="true" />
                    {folderCount(highlightedFolder.id)}{" "}
                    {folderCount(highlightedFolder.id) === 1 ? "note" : "notes"} · ↵ opens the folder
                  </div>
                  <ul className="preview-folder-notes">
                    {notes
                      .filter((n) => n.folderId === highlightedFolder.id)
                      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
                      .slice(0, 6)
                      .map((n) => <li key={n.id}>{n.title || "Untitled"}</li>)}
                  </ul>
                </>
              ) : highlighted ? (
                <>
                  <h2>{highlighted.title || "Untitled"}</h2>
                  <div className="preview-meta">
                    <NoteMeta note={highlighted} folders={folders} preview />
                  </div>
                  <NoteMiniature content={highlighted.content} />
                </>
              ) : (
                <p>Select a note to preview it.</p>
              )}
            </aside>
          </div>
          <footer className="switcher-footer">
            <span>↑↓ Move</span>
            <span>↵ Open</span>
            <span>⌘↵ New note</span>
            <span>
              <RollingText value={results.length} fast /> notes
            </span>
          </footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
