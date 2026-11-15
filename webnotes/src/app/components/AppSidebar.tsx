"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Files,
  Folder as FolderIcon,
  LogIn,
  Pin,
  Search,
  SquarePen,
} from "lucide-react";
import type { Folder, Note } from "@/lib/storage/types";
import FolderRail, { PHONE_QUERY } from "./FolderRail";
import AccountMenu from "./AccountMenu";
import ThemeToggle from "./ThemeToggle";
import { RollingText } from "./ui/rolling-text";

type Account = ComponentProps<typeof AccountMenu>["account"];

function Mark() {
  return (
    <svg viewBox="0 0 160 70" aria-hidden="true">
      <path d="M0 1H35V34L97 0V34L33 69H0Z" />
      <path d="M98 34L160 0V34L98 69Z" />
    </svg>
  );
}

export type SidebarProps = {
  notes: Note[];
  filter: string;
  onFilterChange: (filter: string) => void;
  sheetOpen: boolean;
  onSheetOpenChange: (open: boolean) => void;
  folderEditing: string | null;
  onFolderEditingChange: (id: string | null) => void;
  saveFolder: (id: string, name: string) => Promise<void>;
  onDeleteFolder: (id: string) => void;
  folders: Folder[];
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  phone: boolean;
  onHome: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  onSearch: () => void;
  onNewNote: () => void;
  account?: Account;
  onSignIn: () => void;
  onSignOut: () => void;
  onHelp: () => void;
};

export default function AppSidebar({
  notes,
  filter,
  onFilterChange,
  sheetOpen,
  onSheetOpenChange,
  folderEditing,
  onFolderEditingChange,
  saveFolder,
  onDeleteFolder,
  folders,
  collapsed,
  onCollapsedChange,
  phone,
  onHome,
  canGoBack,
  canGoForward,
  onSearch,
  onNewNote,
  account,
  onSignIn,
  onSignOut,
  onHelp,
}: SidebarProps) {
  // The rail filter is the one focus target "/" jumps to.
  const railFilter = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey || event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest?.('input, textarea, select, [contenteditable="true"], [role="dialog"], [role="menu"]')) return;
      event.preventDefault();
      if (matchMedia(PHONE_QUERY).matches) { onSheetOpenChange(true); return; }
      if (collapsed) onCollapsedChange(false);
      requestAnimationFrame(() => railFilter.current?.focus());
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [collapsed, onCollapsedChange, onSheetOpenChange]);
  const activeFolder = folders.find((f) => f.id === filter);
  const initial = activeFolder ? (Array.from(activeFolder.name.trim())[0] ?? "·").toUpperCase() : "";
  const scopeButton = (id: "all" | "pinned", label: string, icon: React.ReactNode) => (
    <button
      type="button"
      className="library-row"
      aria-label={label}
      title={label}
      data-active={filter === id || undefined}
      aria-current={filter === id ? "true" : undefined}
      onClick={() => onFilterChange(id)}
    >
      {icon}
    </button>
  );
  // At phone width the sheet is the whole sidebar; the rail chrome is not rendered.
  if (phone)
    return (
      <FolderRail
        notes={notes}
        folders={folders}
        filter={filter}
        onFilterChange={onFilterChange}
        sheetOpen={sheetOpen}
        onSheetOpenChange={onSheetOpenChange}
        folderEditing={folderEditing}
        onFolderEditingChange={onFolderEditingChange}
        saveFolder={saveFolder}
        onDeleteFolder={onDeleteFolder}
        collapsed={false}
        onExpand={() => {}}
        filterInput={railFilter}
      />
    );
  return (
    <aside className="app-sidebar" data-collapsed={collapsed || undefined} aria-label="Sidebar">
      {collapsed ? (
        <div className="strip">
          <button type="button" className="strip-mark" onClick={onHome} aria-label="Home" title="Home">
            <Mark />
          </button>
          <span className="strip-sep" aria-hidden="true" />
          <button type="button" className="bar-icon" onClick={onSearch} aria-label="Search notes" title="Search notes (⌘K)">
            <Search aria-hidden="true" />
          </button>
          <button type="button" className="bar-icon new-note-ib" onClick={onNewNote} aria-label="New note" title="New note (N)">
            <SquarePen aria-hidden="true" />
          </button>
          <span className="strip-sep" aria-hidden="true" />
          {scopeButton("all", "All notes", <Files aria-hidden="true" />)}
          {scopeButton("pinned", "Pinned", <Pin aria-hidden="true" />)}
          {activeFolder && (
            <button
              type="button"
              className="library-row"
              aria-label={activeFolder.name}
              title={activeFolder.name}
              data-active
              aria-current="true"
              onClick={() => onFilterChange(activeFolder.id)}
            >
              <FolderIcon aria-hidden="true" />
              <span className="strip-initial" aria-hidden="true">{initial}</span>
            </button>
          )}
          <button
            type="button"
            className="bar-icon"
            onClick={() => onCollapsedChange(false)}
            aria-label="Expand sidebar"
            title="Expand sidebar (⌘\)"
          >
            <ChevronRight aria-hidden="true" />
          </button>
          <span className="strip-flex" aria-hidden="true" />
          <ThemeToggle />
          {account ? (
            <AccountMenu account={account} onSignOut={onSignOut} />
          ) : (
            <button type="button" className="sign-in" onClick={onSignIn} aria-label="Sign in">
              <LogIn aria-hidden="true" />
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="side-top">
            <button type="button" className="brand" onClick={onHome} aria-label="Home" title="Home">
              <Mark />
              <span>WebNotes</span>
            </button>
            <button
              type="button"
              className="bar-icon history-button"
              aria-label="Back"
              title="Back"
              disabled={!canGoBack}
              onClick={() => window.history.back()}
            >
              <ChevronLeft size={17} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="bar-icon history-button"
              aria-label="Forward"
              title="Forward"
              disabled={!canGoForward}
              onClick={() => window.history.forward()}
            >
              <ChevronRight size={17} aria-hidden="true" />
            </button>
          </div>
          <div className="search-row">
            <button type="button" className="search-field" onClick={onSearch} aria-label="Search notes">
              <Search size={15} aria-hidden="true" />
              <span>
                Search <RollingText value={notes.length} /> notes
              </span>
              <kbd aria-hidden="true">⌘K</kbd>
            </button>
            <button
              type="button"
              className="bar-icon new-note-ib"
              onClick={onNewNote}
              aria-label="New note"
              title="New note (N)"
            >
              <SquarePen aria-hidden="true" />
            </button>
          </div>
          <FolderRail
            notes={notes}
            folders={folders}
            filter={filter}
            onFilterChange={onFilterChange}
            sheetOpen={sheetOpen}
            onSheetOpenChange={onSheetOpenChange}
            folderEditing={folderEditing}
            onFolderEditingChange={onFolderEditingChange}
            saveFolder={saveFolder}
            onDeleteFolder={onDeleteFolder}
            collapsed={collapsed}
            onExpand={() => onCollapsedChange(false)}
            filterInput={railFilter}
          />
          <div className="side-foot">
            {account ? (
              <AccountMenu account={account} onSignOut={onSignOut} />
            ) : (
              <button type="button" className="sign-in" onClick={onSignIn}>
                <LogIn aria-hidden="true" />
                <span>Sign in</span>
              </button>
            )}
            <button
              type="button"
              className="bar-icon"
              onClick={onHelp}
              aria-label="Help and shortcuts"
              title="Help & shortcuts (?)"
            >
              <CircleHelp aria-hidden="true" />
            </button>
            <ThemeToggle />
          </div>
        </>
      )}
    </aside>
  );
}
