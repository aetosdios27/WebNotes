"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode, type ComponentProps, type RefObject } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { ContextMenu } from "@base-ui/react/context-menu";
import {
  Files,
  Folder as FolderIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Pin,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { Folder, Note } from "@/lib/storage/types";
import { FittedName } from "./ui/fitted-name";
import { whenCurrent } from "@/lib/edit-guard";
import { RollingText } from "./ui/rolling-text";

const COLLAPSED_KEY = "webnotes_rail_collapsed";
/** Below this width the rail becomes a sheet opened from the wall header. */
const PHONE_QUERY = "(max-width: 700px)";

type FolderActions = {
  folders: Folder[];
  folderEditing: string | null;
  onFolderEditingChange: (id: string | null) => void;
  saveFolder: (id: string, name: string) => Promise<void>;
  onDeleteFolder: (id: string) => void;
};

function FolderNameInput({ name, folders, id, save, cancel }: {
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
    input.current?.scrollIntoView({ block: "nearest" });
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
  const errorId = `folder-name-error-${id}`;
  return <div className="folder-name-edit">
    <div className="folder-name-field" data-invalid={Boolean(error)}>
      <FolderIcon aria-hidden="true" />
      <input ref={input} aria-label={id === "new" ? "New folder name" : "Rename folder"}
        aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined}
        value={value} disabled={saving} placeholder="Folder name" maxLength={120}
        onChange={e => { setValue(e.target.value); setError(""); }}
        onBlur={() => void commit(true)}
        onKeyDown={e => {
          if (e.nativeEvent.isComposing) return;
          if (e.key === "Enter") { e.preventDefault(); void commit(); }
          if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); finished.current = true; cancel(); }
        }} />
    </div>
    {error && <span id={errorId} role="alert" className="folder-name-error">{error}</span>}
  </div>;
}

function Row({ id, name, count, icon, active, query = "", onSelect, ...rest }: {
  id: string; name: string; count: number; icon: ReactNode; active: boolean;
  query?: string; onSelect: (id: string) => void;
} & Omit<ComponentProps<"button">, "id" | "onSelect">) {
  const row = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (active) row.current?.scrollIntoView({ block: "nearest" });
  }, [active]);
  return (
    <button
      {...rest}
      ref={row}
      type="button"
      className="library-row"
      data-scope={id}
      data-active={active || undefined}
      aria-current={active ? "true" : undefined}
      title={name}
      onClick={() => onSelect(id)}
    >
      {icon}
      <FittedName name={name} query={query} />
      <span className="sr-only">{name}</span>
      <span className="row-count"><RollingText value={count} /></span>
    </button>
  );
}

function FolderRow({ folder, count, active, query, onSelect, actions }: {
  folder: Folder; count: number; active: boolean; query: string;
  onSelect: (id: string) => void; actions: FolderActions;
}) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger render={
        <Row id={folder.id} name={folder.name} count={count} active={active} query={query}
          icon={<FolderIcon aria-hidden="true" />} onSelect={onSelect}
          onDoubleClick={() => actions.onFolderEditingChange(folder.id)} />
      } />
      <ContextMenu.Portal>
        <ContextMenu.Positioner className="z-[110]">
          <Menu.Popup data-depth="popover" className="note-actions-menu">
            <Menu.Item className="note-menu-item" onClick={() => actions.onFolderEditingChange(folder.id)}>
              <Pencil aria-hidden="true" />Rename folder
            </Menu.Item>
            <Menu.Separator className="note-menu-separator" />
            <Menu.Item className="note-menu-item note-menu-danger" onClick={() => actions.onDeleteFolder(folder.id)}>
              <Trash2 aria-hidden="true" className="text-destructive" />Delete folder
            </Menu.Item>
          </Menu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

/** The library's contents: filter, fixed scopes and folders. The rail and the
 * phone sheet both render it, sharing one filter query. */
function Library({ place, notes, filter, onSelect, query, onQueryChange, filterInput, actions }: {
  place: "rail" | "sheet";
  notes: Note[];
  filter: string;
  onSelect: (id: string) => void;
  query: string;
  onQueryChange: (query: string) => void;
  filterInput?: RefObject<HTMLInputElement | null>;
  actions: FolderActions;
}) {
  const { folders, folderEditing, onFolderEditingChange, saveFolder } = actions;
  const counts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const note of notes) if (note.folderId) counts.set(note.folderId, (counts.get(note.folderId) ?? 0) + 1);
    return counts;
  }, [notes]);
  const pinned = useMemo(() => notes.filter((n) => n.isPinned).length, [notes]);
  const needle = query.trim().toLocaleLowerCase();
  const matches = needle ? folders.filter((f) => f.name.toLocaleLowerCase().includes(needle)) : folders;
  const inputId = `${place}-folder-filter`;
  const edit = (id: string, name: string) => (
    <FolderNameInput key={id} id={id} name={name} folders={folders}
      save={(name) => saveFolder(id, name)} cancel={() => onFolderEditingChange(null)} />
  );
  return (
    <>
      <div className="library-filter">
        <Search aria-hidden="true" />
        <label className="sr-only" htmlFor={inputId}>Filter folders</label>
        <input
          id={inputId}
          ref={filterInput}
          type="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="Filter folders"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Escape") return;
            e.preventDefault();
            if (query) { e.stopPropagation(); onQueryChange(""); }
            else if (place === "rail") e.currentTarget.blur();
          }}
        />
        {query ? (
          <button type="button" className="library-icon-button" aria-label="Clear folder filter"
            onClick={() => { onQueryChange(""); filterInput?.current?.focus(); }}>
            <X aria-hidden="true" />
          </button>
        ) : <kbd aria-hidden="true">/</kbd>}
      </div>
      <div className="library-scopes">
        <Row id="all" name="All notes" count={notes.length} active={filter === "all"}
          icon={<Files aria-hidden="true" />} onSelect={onSelect} />
        <Row id="pinned" name="Pinned" count={pinned} active={filter === "pinned"}
          icon={<Pin aria-hidden="true" />} onSelect={onSelect} />
      </div>
      <div className="library-heading">
        <span role="status">{needle ? `${matches.length} of ${folders.length} folders` : `Folders · ${folders.length}`}</span>
        <span className="library-order">Newest first</span>
        <button type="button" className="library-icon-button" aria-label="New folder" title="New folder"
          onClick={() => onFolderEditingChange("new")}>
          <Plus aria-hidden="true" />
        </button>
      </div>
      <nav className="library-folders" aria-label="Folders, newest first">
        {folderEditing === "new" && edit("new", "")}
        {matches.map((folder) => folderEditing === folder.id ? edit(folder.id, folder.name) : (
          <FolderRow key={folder.id} folder={folder} count={counts.get(folder.id) ?? 0}
            active={filter === folder.id} query={needle} onSelect={onSelect} actions={actions} />
        ))}
        {!matches.length && folderEditing !== "new" && (
          <p className="library-empty">
            {folders.length ? "No folders match. Try another name." : "A folder can wait until you need one."}
          </p>
        )}
      </nav>
    </>
  );
}

function readCollapsed() {
  try { return localStorage.getItem(COLLAPSED_KEY) === "1"; } catch { return false; }
}

export default function FolderRail({ notes, filter, onFilterChange, sheetOpen, onSheetOpenChange, ...actions }: FolderActions & {
  notes: Note[];
  filter: string;
  onFilterChange: (filter: string) => void;
  sheetOpen: boolean;
  onSheetOpenChange: (open: boolean) => void;
}) {
  // The home screen mounts after the store loads, never during SSR.
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [query, setQuery] = useState("");
  const railFilter = useRef<HTMLInputElement>(null);
  const sheetFilter = useRef<HTMLInputElement>(null);
  const compactActive = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (collapsed) compactActive.current?.scrollIntoView({ block: "nearest" });
  }, [collapsed, filter]);
  function collapse(next: boolean) {
    setCollapsed(next);
    try { localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0"); } catch { /* private mode */ }
  }
  const { folderEditing } = actions;
  // Creating or renaming needs the list on screen: open whichever surface shows it.
  useEffect(() => {
    if (folderEditing === null) return;
    setQuery("");
    if (matchMedia(PHONE_QUERY).matches) onSheetOpenChange(true);
    else if (collapsed) collapse(false);
  }, [folderEditing]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey || event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest?.('input, textarea, select, [contenteditable="true"], [role="dialog"], [role="menu"]')) return;
      event.preventDefault();
      if (matchMedia(PHONE_QUERY).matches) { onSheetOpenChange(true); return; }
      if (collapsed) collapse(false);
      requestAnimationFrame(() => railFilter.current?.focus());
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [collapsed, onSheetOpenChange]);
  const select = (id: string) => {
    onFilterChange(id);
    onSheetOpenChange(false);
  };
  return (
    <>
      <aside className="folder-rail" data-collapsed={collapsed || undefined} aria-label="Your library">
        <div className="rail-top">
          <span>Your library</span>
          <button type="button" className="library-icon-button" onClick={() => collapse(!collapsed)}
            aria-label={collapsed ? "Expand library" : "Collapse library"}
            title={collapsed ? "Expand library" : "Collapse library"} aria-expanded={!collapsed}>
            {collapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
          </button>
        </div>
        {collapsed ? (
          <div className="rail-compact">
            <button type="button" className="library-row" aria-label="All notes" title="All notes"
              data-active={filter === "all" || undefined} aria-current={filter === "all" ? "true" : undefined}
              onClick={() => select("all")}><Files aria-hidden="true" /></button>
            <button type="button" className="library-row" aria-label="Pinned" title="Pinned"
              data-active={filter === "pinned" || undefined} aria-current={filter === "pinned" ? "true" : undefined}
              onClick={() => select("pinned")}><Pin aria-hidden="true" /></button>
            <hr />
            <nav className="library-folders" aria-label="Folders, newest first">
              {actions.folders.map(folder => (
                <button key={folder.id} ref={filter === folder.id ? compactActive : undefined}
                  type="button" className="library-row" aria-label={folder.name} title={folder.name}
                  data-active={filter === folder.id || undefined}
                  aria-current={filter === folder.id ? "true" : undefined}
                  onClick={() => select(folder.id)}>
                  <FolderIcon aria-hidden="true" />
                </button>
              ))}
            </nav>
          </div>
        ) : (
          <Library place="rail" notes={notes} filter={filter} onSelect={select} query={query}
            onQueryChange={setQuery} filterInput={railFilter} actions={actions} />
        )}
      </aside>
      <Dialog.Root open={sheetOpen} onOpenChange={(open) => {
        // A name being typed in the sheet leaves with it.
        if (!open && folderEditing !== null) actions.onFolderEditingChange(null);
        onSheetOpenChange(open);
      }}>
        <Dialog.Portal>
          <Dialog.Backdrop className="folder-sheet-veil" data-depth="backdrop" />
          <Dialog.Popup className="folder-sheet" initialFocus={() => matchMedia("(pointer: coarse)").matches || sheetFilter.current}>
            <div className="sheet-top">
              <Dialog.Title className="sheet-title">Folders</Dialog.Title>
              <Dialog.Close className="library-icon-button" aria-label="Close folders">
                <X aria-hidden="true" />
              </Dialog.Close>
            </div>
            <Library place="sheet" notes={notes} filter={filter} onSelect={select} query={query}
              onQueryChange={setQuery} filterInput={sheetFilter} actions={actions} />
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
