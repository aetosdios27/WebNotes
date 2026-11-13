"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Search, X } from "lucide-react";
import type { Note, Folder } from "@/lib/storage/types";
import { NoteMeta, noteText } from "./NoteSummary";

export type SwitcherAction = { label: string; run: () => void };
export default function NoteSwitcher({
  open,
  onOpenChange,
  notes,
  folders,
  openNote,
  createNote,
  actions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: Note[];
  folders: Folder[];
  openNote: (id: string) => void;
  createNote: (title: string) => void;
  actions: SwitcherAction[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("recent");
  const [index, setIndex] = useState(0);
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
  const matchingActions = actions.filter((action) =>
    action.label.toLowerCase().includes(query.toLowerCase()),
  );
  const highlighted = results[index];
  useEffect(() => {
    if (!open) {
      setQuery("");
      setFilter("recent");
      setIndex(0);
    }
  }, [open]);
  useEffect(() => {
    selected.current?.scrollIntoView({ block: "nearest" });
  }, [index]);
  function choose() {
    if (highlighted) openNote(highlighted.id);
    else matchingActions[index - results.length]?.run();
    onOpenChange(false);
  }
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="switcher-veil" />
        <Dialog.Popup
          className="note-switcher"
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              createNote(query.trim());
              onOpenChange(false);
              return;
            }
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              const count = results.length + matchingActions.length;
              setIndex((i) =>
                Math.max(
                  0,
                  Math.min(count - 1, i + (event.key === "ArrowDown" ? 1 : -1)),
                ),
              );
            }
            if (
              event.key === "Enter" &&
              event.target instanceof HTMLInputElement
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
              aria-activedescendant={
                highlighted ? `result-${highlighted.id}` : undefined
              }
            />
            <Dialog.Close aria-label="Close switcher">
              <X size={17} />
            </Dialog.Close>
          </div>
          <div className="switcher-chips">
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
                {f.name}
              </button>
            ))}
          </div>
          <div className="switcher-columns">
            <div className="switcher-results" id="note-results">
              <div role="listbox" aria-label="Notes">
                {results.map((note, i) => (
                  <button
                    ref={i === index ? selected : undefined}
                    role="option"
                    aria-selected={i === index}
                    id={`result-${note.id}`}
                    key={note.id}
                    onFocus={() => setIndex(i)}
                    onMouseEnter={() => setIndex(i)}
                    onClick={() => {
                      openNote(note.id);
                      onOpenChange(false);
                    }}
                  >
                    <strong>{note.title || "Untitled"}</strong>
                    <p>{noteText(note.content) || "Empty note"}</p>
                  </button>
                ))}
              </div>
              {!results.length && (
                <p className="no-results">
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
                    ref={index === results.length + i ? selected : undefined}
                    key={action.label}
                    data-selected={index === results.length + i}
                    onMouseEnter={() => setIndex(results.length + i)}
                    onFocus={() => setIndex(results.length + i)}
                    onClick={() => {
                      action.run();
                      onOpenChange(false);
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
            <aside className="switcher-preview" aria-label="Note preview">
              {highlighted ? (
                <>
                  <h2>{highlighted.title || "Untitled"}</h2>
                  <div className="preview-meta">
                    <NoteMeta note={highlighted} folders={folders} />
                  </div>
                  <p>{noteText(highlighted.content) || "Empty note"}</p>
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
            <span>{results.length} notes</span>
          </footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
