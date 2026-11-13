"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronsLeft, FolderPlus, FilePlus, Search } from "lucide-react";
import {
  Collapsible,
  CollapsibleTrigger,
} from "@/app/components/ui/collapsible";
import { Button } from "@/app/components/ui/button";
import Brand from "./Brand";
import NoteList from "./NoteList";
import AuthButton from "./AuthButton";
import { CreateFolderModal } from "@/app/components/CreateFolderModal";
import type { Note } from "@/lib/storage/types";
import type { FolderWithNotes } from "../page";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";
import type { SyncStatus } from "@/lib/storage/types";

interface SidebarProps {
  notes: Note[];
  folders: FolderWithNotes[];
  activeNoteId: string | null;
  setActiveNoteId: (id: string) => void;
  createNote: (folderId?: string | null) => void;
  deleteNote: (id: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  moveNote: (noteId: string, folderId: string | null) => void;
  createFolder: () => void;
  onDataChange: () => void;
  updateNoteLocally?: (noteId: string, updates: Partial<Note>) => void;
  togglePin: (noteId: string) => Promise<void>;
  syncStatus: SyncStatus;
  onOpenHelp: () => void;
}

export default function Sidebar({
  notes,
  folders,
  activeNoteId,
  setActiveNoteId,
  createNote,
  deleteNote,
  deleteFolder,
  moveNote,
  createFolder: _createFolderProp,
  onDataChange,
  updateNoteLocally,
  togglePin,
  syncStatus,
  onOpenHelp,
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("expandedFolders");
    if (saved) {
      setExpandedFolders(new Set(JSON.parse(saved)));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "expandedFolders",
      JSON.stringify(Array.from(expandedFolders)),
    );
  }, [expandedFolders]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const { notesInFolders, unfiledNotes } = useMemo(() => {
    const notesInFolders = new Map<string, Note[]>();
    const unfiledNotes: Note[] = [];

    notes.forEach((note) => {
      if (note.folderId) {
        const folderNotes = notesInFolders.get(note.folderId) || [];
        folderNotes.push(note);
        notesInFolders.set(note.folderId, folderNotes);
      } else {
        unfiledNotes.push(note);
      }
    });

    notesInFolders.forEach((folderNotes, folderId) => {
      notesInFolders.set(
        folderId,
        folderNotes.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          if (a.isPinned && b.isPinned) {
            const aTime = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
            const bTime = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
            return bTime - aTime;
          }
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        }),
      );
    });

    const sortedUnfiled = unfiledNotes.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      if (a.isPinned && b.isPinned) {
        const aTime = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
        const bTime = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
        return bTime - aTime;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return { notesInFolders, unfiledNotes: sortedUnfiled };
  }, [notes]);

  return (
    <TooltipProvider delayDuration={0}>
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className={`
          relative h-full flex flex-col overflow-hidden
          border-r border-line bg-panel
          transition-all duration-300 ease-out
          ${isOpen ? "w-full md:w-80" : "w-full md:w-[68px]"}
        `}
      >
        {/* HEADER: Fixed Height */}
        <div
          className={`
          relative z-10 px-4 pb-4 pt-5 flex items-center border-b border-line flex-shrink-0
          ${isOpen ? "justify-between" : "justify-center"}
        `}
        >
          {isOpen && (
            <div className="min-w-0">
              <h1 className="truncate text-[1.2rem] font-semibold tracking-[-0.035em] text-ink">
                <Brand />
              </h1>
            </div>
          )}
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex rounded-lg text-muted transition-colors hover:bg-selected hover:text-ink"
            >
              <ChevronsLeft
                className={`h-5 w-5 transition-transform duration-300 ${
                  isOpen ? "" : "rotate-180"
                }`}
              />
            </Button>
          </CollapsibleTrigger>
        </div>

        {/* TOOLBAR: Fixed Height */}
        <div
          className={`
          relative z-10 px-3 pb-3 pt-3 flex-shrink-0
          ${isOpen ? "" : "flex flex-col gap-2"}
        `}
        >
          {isOpen ? (
            <div className="grid grid-cols-4 gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="New note"
                    onClick={() => createNote()}
                    className="h-10 w-full rounded-xl bg-transparent text-muted transition-colors hover:bg-selected hover:text-ink"
                  >
                    <FilePlus size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>New note</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="New folder"
                    onClick={() => setIsFolderModalOpen(true)}
                    className="h-10 w-full rounded-xl bg-transparent text-muted transition-colors hover:bg-selected hover:text-ink"
                  >
                    <FolderPlus size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>New folder</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-full rounded-xl bg-transparent text-muted transition-colors hover:bg-selected hover:text-ink"
                  >
                    <Search aria-label="Search" size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Search</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onOpenHelp}
                    className="h-10 w-full rounded-xl bg-transparent text-muted transition-colors hover:bg-selected hover:text-ink"
                  >
                    <span className="text-base font-semibold">?</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Shortcuts & Math Guide</p>
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    aria-label="New note"
                    onClick={() => createNote()}
                    className="h-11 w-11 rounded-xl border border-line bg-ink p-0 text-background shadow-none transition-colors hover:bg-background"
                  >
                    <FilePlus size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>New note</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="New folder"
                    onClick={() => setIsFolderModalOpen(true)}
                    className="h-10 w-10 rounded-xl border border-line bg-transparent text-muted transition-colors hover:bg-selected hover:text-ink"
                  >
                    <FolderPlus size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>New folder</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl border border-line bg-transparent text-muted transition-colors hover:bg-selected hover:text-ink"
                  >
                    <Search aria-label="Search" size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Search</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onOpenHelp}
                    className="h-10 w-10 rounded-xl border border-line bg-transparent text-muted transition-colors hover:bg-selected hover:text-ink"
                  >
                    <span className="text-base font-semibold">?</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Shortcuts & Math Guide</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>

        {/* LIST: Flexible Height with Scroll */}
        {isOpen && (
          <div className="relative z-10 flex-1 overflow-y-auto min-h-0 px-2 pb-2 custom-scrollbar">
            <NoteList
              folders={folders}
              notesInFolders={notesInFolders}
              unfiledNotes={unfiledNotes}
              activeNoteId={activeNoteId}
              setActiveNoteId={setActiveNoteId}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              moveNote={moveNote}
              onDataChange={onDataChange}
              updateNoteLocally={updateNoteLocally}
              togglePin={togglePin}
              deleteNote={deleteNote}
              deleteFolder={deleteFolder}
            />
          </div>
        )}

        {/* FOOTER: Fixed Height at Bottom */}
        <div className="relative z-10 mt-auto border-t border-line p-3 flex-shrink-0">
          <AuthButton isOpen={isOpen} syncStatus={syncStatus} />
        </div>
      </Collapsible>

      <CreateFolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
      />
    </TooltipProvider>
  );
}
