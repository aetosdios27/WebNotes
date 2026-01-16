"use client";

import { useEffect, useMemo, useCallback, useState, useRef } from "react";
import { useNotesStore } from "@/store/useNotesStore";
import Sidebar from "@/app/components/Sidebar";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import type { Note, Folder } from "@/lib/storage/types";
import { Button } from "@/app/components/ui/button";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CommandPalette from "@/app/components/CommandPalette";
import LoadingScreen from "@/app/components/LoadingScreen";
import { HelpModal } from "@/app/components/HelpModal";
import RightSidebar from "@/app/components/RightSidebar";
import { isTauri } from "@/lib/tauri"; // Import isTauri check

// Type definition helpers...
export type FolderWithNotes = Omit<Folder, "notes"> & {
  notes: Note[];
};

const NoteEditor = dynamic(() => import("@/app/components/NoteEditor"), {
  ssr: false,
  loading: () => null,
});

export default function Home() {
  // --- ZUSTAND STATE SELECTION ---
  const {
    notes,
    folders,
    activeNoteId,
    isLoading,
    syncStatus,
    loadData,
    createNote,
    updateNote,
    updateNoteLocally,
    deleteNote,
    togglePin,
    moveNote,
    setActiveNote,
    createFolder,
    deleteFolder,
  } = useNotesStore();

  const [isSaving, setIsSaving] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [showExtendedMessage, setShowExtendedMessage] = useState(false);

  // 1. Load Data on Mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 2. Apply Windows Drag-Drop Fix (Tauri Only or Global safe)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // This prevents the "Red Cross" on Windows by forcing the browser to accept drops
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "move";
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
    };

    // Apply global listener
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, []);

  // Loading Screen Logic
  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), 2800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) setShowExtendedMessage(true);
    }, 3500);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Mobile Sidebar logic
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (window.innerWidth < 768 && showMobileSidebar) {
        if (
          sidebarRef.current &&
          !sidebarRef.current.contains(event.target as Node)
        ) {
          setShowMobileSidebar(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMobileSidebar]);

  // Memoized Folder Structure
  const foldersWithNotes = useMemo<FolderWithNotes[]>(() => {
    return folders.map((folder) => ({
      ...folder,
      notes: notes
        .filter((note) => note.folderId === folder.id)
        .sort((a, b) => {
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
    }));
  }, [folders, notes]);

  // WRAPPER HANDLERS (To add Toast notifications)

  const handleCreateNote = useCallback(
    async (
      folderId?: string | null,
      title?: string,
      specificId?: string
    ): Promise<string | null> => {
      try {
        // Zustand createNote returns Promise<Note>
        const note = await createNote({
          id: specificId,
          folderId,
          title: title || "",
        });

        setShowMobileSidebar(false);
        // Only show toast if it's a direct user action (no specific ID passed)
        if (!specificId) {
          toast.success(title ? `Created "${title}"` : "Note created");
        }
        return note.id; // Return ID string
      } catch (error) {
        toast.error("Failed to create note");
        return null;
      }
    },
    [createNote]
  );

  const handleCreateNoteFromLink = useCallback(
    async (title: string, id?: string): Promise<string | null> => {
      const newId = id || crypto.randomUUID();
      handleCreateNote(null, title, newId).catch((err) => console.error(err));
      return newId;
    },
    [handleCreateNote]
  );

  const handleDeleteNote = useCallback(
    async (id: string) => {
      try {
        await deleteNote(id);
        toast.success("Note deleted");
      } catch {
        toast.error("Failed to delete note");
      }
    },
    [deleteNote]
  );

  const handleDeleteFolder = useCallback(
    async (id: string) => {
      try {
        await deleteFolder(id);
        toast.success("Folder deleted");
      } catch {
        toast.error("Failed to delete folder");
      }
    },
    [deleteFolder]
  );

  const handleCreateFolder = useCallback(async () => {
    const name = prompt("Enter folder name:");
    if (name) {
      try {
        await createFolder({ name });
        toast.success("Folder created");
      } catch {
        toast.error("Failed to create folder");
      }
    }
  }, [createFolder]);

  const handleNoteUpdate = useCallback(
    async (updatedNote: Note) => {
      try {
        await updateNote(updatedNote.id, {
          title: updatedNote.title,
          content: updatedNote.content,
          font: updatedNote.font,
          isPinned: updatedNote.isPinned,
          pinnedAt: updatedNote.pinnedAt,
          folderId: updatedNote.folderId,
        });
      } catch {
        toast.error("Failed to update note");
      }
    },
    [updateNote]
  );

  const handleTogglePin = useCallback(
    async (noteId: string) => {
      try {
        await togglePin(noteId);
      } catch {
        toast.error("Failed to toggle pin");
      }
    },
    [togglePin]
  );

  const handleMoveNote = useCallback(
    async (noteId: string, folderId: string | null) => {
      try {
        await moveNote(noteId, folderId);
        toast.success("Note moved");
      } catch {
        toast.error("Failed to move note");
      }
    },
    [moveNote]
  );

  useEffect(() => {
    const handleGlobalKeyboard = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isEditing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true" ||
        target.closest(".ProseMirror");

      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setIsHelpOpen((prev) => !prev);
        return;
      }

      if (isEditing) return;

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && e.key === "e" && !e.shiftKey) {
        e.preventDefault();
        handleCreateNote();
        return;
      }

      if (modKey && e.shiftKey && e.key === "F") {
        e.preventDefault();
        handleCreateFolder();
        return;
      }
    };

    window.addEventListener("keydown", handleGlobalKeyboard);
    return () => window.removeEventListener("keydown", handleGlobalKeyboard);
  }, [handleCreateNote, handleCreateFolder]);

  const handleSetActiveNoteForMobile = useCallback(
    (noteId: string | null) => {
      setActiveNote(noteId);
      if (window.innerWidth < 768) {
        setShowMobileSidebar(false);
      }
    },
    [setActiveNote]
  );

  const showLoading = !minTimeElapsed || isLoading;
  const activeNote = notes.find((n) => n.id === activeNoteId);
  const combinedStatus = isSaving ? "syncing" : syncStatus;

  if (showLoading) {
    return <LoadingScreen isExtended={showExtendedMessage} />;
  }

  return (
    <main className="flex w-screen h-screen overflow-hidden">
      <AnimatePresence>
        {showMobileSidebar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setShowMobileSidebar(false)}
          />
        )}
      </AnimatePresence>

      <div className="hidden md:block">
        <Sidebar
          notes={notes}
          folders={foldersWithNotes}
          activeNoteId={activeNoteId}
          setActiveNoteId={setActiveNote}
          createNote={handleCreateNote}
          deleteNote={handleDeleteNote}
          deleteFolder={handleDeleteFolder}
          moveNote={handleMoveNote}
          createFolder={handleCreateFolder}
          onDataChange={loadData}
          updateNoteLocally={updateNoteLocally}
          togglePin={handleTogglePin}
          syncStatus={combinedStatus}
          onOpenHelp={() => setIsHelpOpen(true)}
        />
      </div>

      <AnimatePresence>
        {showMobileSidebar && (
          <motion.div
            ref={sidebarRef}
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed md:hidden inset-y-0 left-0 z-50 w-80"
          >
            <Sidebar
              notes={notes}
              folders={foldersWithNotes}
              activeNoteId={activeNoteId}
              setActiveNoteId={handleSetActiveNoteForMobile}
              createNote={handleCreateNote}
              deleteNote={handleDeleteNote}
              deleteFolder={handleDeleteFolder}
              moveNote={handleMoveNote}
              createFolder={handleCreateFolder}
              onDataChange={loadData}
              updateNoteLocally={updateNoteLocally}
              togglePin={handleTogglePin}
              syncStatus={combinedStatus}
              onOpenHelp={() => setIsHelpOpen(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content + Right Sidebar Wrapper */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Area */}
        <div className="flex-1 h-full flex flex-col min-w-0">
          <div className="md:hidden border-b border-zinc-800 bg-zinc-900 flex items-center px-3 py-2.5 gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMobileSidebar(!showMobileSidebar)}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800 h-9 w-9"
            >
              {showMobileSidebar ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
            {activeNote && (
              <h2 className="text-sm font-medium text-zinc-200 truncate">
                {activeNote.title || "Untitled Note"}
              </h2>
            )}
          </div>

          <div className="flex-1 overflow-hidden">
            <NoteEditor
              activeNote={activeNote}
              allNotes={notes}
              onNoteUpdate={handleNoteUpdate}
              onSavingStatusChange={setIsSaving}
              onDeleteNote={handleDeleteNote}
              onNavigateNote={setActiveNote}
              onCreateNote={handleCreateNoteFromLink}
              isRightSidebarOpen={showRightSidebar}
              onToggleRightSidebar={() =>
                setShowRightSidebar(!showRightSidebar)
              }
            />
          </div>
        </div>

        {/* Right Sidebar (Backlinks/Context) */}
        <AnimatePresence mode="wait">
          {showRightSidebar && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="border-l border-zinc-800 bg-zinc-900/50 flex-shrink-0 h-full overflow-hidden"
            >
              <div className="w-[300px] h-full">
                <RightSidebar
                  activeNote={activeNote}
                  allNotes={notes}
                  onNavigate={setActiveNote}
                  onClose={() => setShowRightSidebar(false)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <CommandPalette
        notes={notes}
        folders={folders}
        activeNoteId={activeNoteId}
        setActiveNoteId={setActiveNote}
        createNote={handleCreateNote}
        createFolder={handleCreateFolder}
        deleteNote={handleDeleteNote}
        togglePin={handleTogglePin}
      />

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </main>
  );
}
