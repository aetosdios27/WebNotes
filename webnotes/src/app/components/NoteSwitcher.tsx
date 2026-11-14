"use client";
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
import { NoteMeta, NoteMiniature, noteText } from "./NoteSummary";

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
  const matchingActions = actions.filter((action) =>
    action.label.toLowerCase().includes(query.toLowerCase()),
  );
  const count = results.length + matchingActions.length;
  const activeIndex = Math.min(index, Math.max(0, count - 1));
  const highlighted = results[activeIndex];
  const activeId = highlighted
    ? `result-${highlighted.id}`
    : count
      ? `action-${activeIndex - results.length}`
      : undefined;
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
    if (highlighted) openNote(highlighted.id);
    else matchingActions[activeIndex - results.length]?.run();
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
              aria-label="Notes and actions"
            >
              <SlidingIndicator value={`${activeIndex}:${query}:${filter}`} />
              <div role="group" aria-label="Notes">
                {results.map((note, i) => (
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
                ))}
              </div>
              {!results.length && (
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
                      activeIndex === results.length + i ? selected : undefined
                    }
                    role="option"
                    aria-selected={activeIndex === results.length + i}
                    id={`action-${i}`}
                    key={action.label}
                    data-selected={activeIndex === results.length + i}
                    onMouseEnter={() => {
                      setIndex(results.length + i);
                      input.current?.focus();
                    }}
                    onFocus={() => setIndex(results.length + i)}
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
              {highlighted ? (
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
            <span>{results.length} notes</span>
          </footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
