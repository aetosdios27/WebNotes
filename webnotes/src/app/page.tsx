"use client";

import { useEffect, useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { useSession, signOut } from "next-auth/react";
import {
  Copy,
  Download,
  LogIn,
  FileText,
  Check,
  CloudUpload,
  CloudOff,
  ChevronLeft,
  ChevronRight,
  Search,
  Share,
  MoreHorizontal,
} from "lucide-react";
import NoteActionsMenu, {
  type NoteMenuActions,
} from "./components/NoteActionsMenu";
import ThemeToggle from "./components/ThemeToggle";
import AccountMenu from "./components/AccountMenu";
import { ActionIcon } from "./components/ui/action-icon";
import { toast } from "sonner";
import { useNotesStore } from "@/store/useNotesStore";
import type { Note } from "@/lib/storage/types";
import { isTauri } from "@/lib/tauri";
import { open } from "@tauri-apps/plugin-shell";
import LoadingScreen from "./components/LoadingScreen";
import { HelpModal } from "./components/HelpModal";
import { ErrorBoundary } from "./components/ErrorBoundary";
import NoteWall from "./components/NoteWall";
import NoteSwitcher from "./components/NoteSwitcher";
import { noteMarkdown } from "@/lib/note-markdown";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "./components/ui/alert-dialog";
import { noteText } from "./components/NoteSummary";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "./components/ui/dropdown-menu";

const NoteEditor = dynamic(() => import("./components/NoteEditor"), {
  ssr: false,
});
const VersionPreview = dynamic(() => import("./components/VersionPreview"), {
  ssr: false,
});

export default function Home() {
  const {
    notes,
    folders,
    activeNoteId,
    isLoading,
    syncStatus,
    isOnline,
    pendingOperations,
    user,
    logout,
    loadData,
    createNote,
    updateNote,
    updateNoteLocally,
    deleteNote,
    togglePin,
    setActiveNote,
    createFolder,
    updateFolder,
    deleteFolder,
    moveNote,
  } = useNotesStore();
  const { data: session } = useSession();
  const account = isTauri ? user : session?.user;
  const [isSaving, setIsSaving] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [help, setHelp] = useState(false);
  const [wallFilter, setWallFilter] = useState("all");
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [isReadingMode, setIsReadingMode] = useState(false);
  const selectedFolder = !activeNoteId
    ? folders.find((f) => f.id === wallFilter)
    : undefined;
  const [info, setInfo] = useState(false);
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null);
  const [history, setHistory] = useState<(string | null)[]>([null]);
  const [cursor, setCursor] = useState(0);
  const activeNote = notes.find((n) => n.id === activeNoteId);
  useEffect(() => {
    void loadData();
  }, [loadData]);

  const navigate = useCallback(
    (id: string | null) => {
      setActiveNote(id);
      setPreviewVersionId(null);
      setHistory((previous) => [...previous.slice(0, cursor + 1), id]);
      setCursor(cursor + 1);
    },
    [cursor, setActiveNote],
  );
  function travel(step: number) {
    const next = cursor + step;
    setCursor(next);
    const id = history[next];
    setActiveNote(id && notes.some((n) => n.id === id) ? id : null);
    setPreviewVersionId(null);
  }
  const newNote = useCallback(
    async (title = "", folderId?: string | null, id?: string) => {
      try {
        const note = await createNote({
          title,
          folderId,
          ...(id ? { id } : {}),
        });
        navigate(note.id);
        return note.id;
      } catch {
        toast.error("Failed to create note");
        return null;
      }
    },
    [createNote, navigate],
  );
  const removeNote = useCallback(
    async (id: string) => {
      try {
        await deleteNote(id);
        setPreviewVersionId(null);
        toast.success("Note deleted");
      } catch {
        toast.error("Failed to delete note");
      }
    },
    [deleteNote],
  );
  const pinNote = useCallback(
    async (id: string) => {
      try {
        await togglePin(id);
      } catch {
        toast.error("Failed to pin note");
      }
    },
    [togglePin],
  );
  const newFolder = useCallback(async () => {
    const name = prompt("Folder name");
    if (!name?.trim()) return;
    try {
      await createFolder({ name: name.trim() });
    } catch {
      toast.error("Failed to create folder");
    }
  }, [createFolder]);
  const update = useCallback(
    async (id: string, changes: Partial<Note>) => {
      try {
        await updateNote(id, changes);
      } catch {
        toast.error("Failed to update note");
      }
    },
    [updateNote],
  );
  function authenticate() {
    if (isTauri) void open("https://web-notes-lyart.vercel.app/auth/desktop");
    else window.location.assign("/signin");
  }
  function leave() {
    if (isTauri) logout();
    else void signOut();
  }
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSwitching((value) => !value);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "/") {
        event.preventDefault();
        setHelp((value) => !value);
        return;
      }
      if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "h"
      ) {
        event.preventDefault();
        navigate(null);
      }
      if (
        switching ||
        !(event.target instanceof HTMLElement) ||
        event.target.closest(
          'input, textarea, [contenteditable="true"], [role="dialog"], [role="menu"]',
        )
      )
        return;
      if (
        (event.key.toLowerCase() === "n" &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.altKey) ||
        ((event.metaKey || event.ctrlKey) && event.key === "e")
      ) {
        event.preventDefault();
        void newNote();
      }
      if (event.key === "?" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setHelp((value) => !value);
      }
      if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.key === "F"
      ) {
        event.preventDefault();
        void newFolder();
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [newNote, newFolder, switching, navigate]);
  const actions = [
    {
      label: "New note",
      run: () => {
        void newNote();
      },
    },
    {
      label: "New folder",
      run: () => {
        void newFolder();
      },
    },
    { label: "Home", run: () => navigate(null) },
    ...(selectedFolder
      ? [
          {
            label: "Rename folder",
            run: () => {
              const name = prompt("Folder name", selectedFolder.name);
              if (name?.trim())
                void updateFolder(selectedFolder.id, {
                  name: name.trim(),
                }).catch(() => toast.error("Failed to rename folder"));
            },
          },
          {
            label: "Delete folder",
            run: () => setFolderToDelete(selectedFolder.id),
          },
        ]
      : []),
    ...(activeNote
      ? [
          {
            label: activeNote.isPinned ? "Unpin note" : "Pin note",
            run: () => {
              void pinNote(activeNote.id);
            },
          },
          {
            label: "Delete note",
            run: () => {
              void removeNote(activeNote.id);
            },
          },
        ]
      : []),
    {
      label: account ? "Sign out" : "Sign in",
      run: account ? leave : authenticate,
    },
  ];
  const menuActions: NoteMenuActions = {
    createNote: () => {
      void newNote();
    },
    createFolder: () => {
      void newFolder();
    },
    help: () => setHelp(true),
    pin: (id) => {
      void pinNote(id);
    },
    remove: (id) => {
      void removeNote(id);
    },
    move: (id, folderId) => {
      void moveNote(id, folderId).catch(() =>
        toast.error("Failed to move note"),
      );
    },
    font: (id, font) => {
      void updateNote(id, { font }).catch(() =>
        toast.error("Failed to change font"),
      );
    },
    reading: (id, checked) => {
      if (id !== activeNoteId) navigate(id);
      setIsReadingMode(checked);
    },
    information: (id) => {
      if (id !== activeNoteId) navigate(id);
      setInfo(true);
    },
  };
  async function copyNote(markdown = false) {
    if (!activeNote) return;
    try {
      await navigator.clipboard.writeText(
        markdown
          ? await noteMarkdown(activeNote)
          : `${activeNote.title || "Untitled"}\n\n${noteText(activeNote.content)}`,
      );
      toast.success("Note copied");
    } catch {
      toast.error("Could not copy note");
    }
  }
  async function downloadNote(markdown = false) {
    if (!activeNote) return;
    const url = URL.createObjectURL(
      new Blob(
        [
          markdown
            ? await noteMarkdown(activeNote)
            : `${activeNote.title || "Untitled"}\n\n${noteText(activeNote.content)}`,
        ],
        { type: markdown ? "text/markdown" : "text/plain" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeNote.title || "Untitled"}.${markdown ? "md" : "txt"}`;
    link.click();
    URL.revokeObjectURL(url);
  }
  if (isLoading) return <LoadingScreen />;
  return (
    <main className={`notes-window ${activeNote ? "writing" : "home"}`}>
      <header className="window-bar">
        <div className="window-left">
          <button
            className="home-mark"
            aria-label="Home"
            onClick={() => navigate(null)}
          >
            <svg viewBox="0 0 160 70" aria-hidden="true">
              <path d="M0 1H35V34L97 0V34L33 69H0Z" />
              <path d="M98 34L160 0V34L98 69Z" />
            </svg>
          </button>
          <button
            className="history-button"
            aria-label="Back"
            disabled={cursor === 0}
            onClick={() => travel(-1)}
          >
            <ChevronLeft size={19} />
          </button>
          <button
            className="history-button"
            aria-label="Forward"
            disabled={cursor === history.length - 1}
            onClick={() => travel(1)}
          >
            <ChevronRight size={19} />
          </button>
        </div>
        <button
          className="title-pill"
          aria-label="Switch notes"
          onClick={() => setSwitching(true)}
        >
          {activeNote ? <FileText /> : <Search />}
          <span>
            {activeNote
              ? activeNote.title || "Untitled"
              : `Search ${notes.length} notes`}
          </span>
          <kbd>⌘K</kbd>
        </button>
        <div className="window-right">
          {activeNote && (
            <>
              <span
                key={`${isOnline}:${isSaving}:${syncStatus}:${pendingOperations > 0}`}
                className="save-state"
                role="status"
              >
                {!isOnline || syncStatus === "unsynced" ? (
                  <CloudOff aria-hidden="true" />
                ) : isSaving ||
                  pendingOperations > 0 ||
                  syncStatus === "syncing" ? (
                  <CloudUpload aria-hidden="true" />
                ) : (
                  <Check aria-hidden="true" />
                )}
                {!isOnline
                  ? "Offline"
                  : isSaving ||
                      syncStatus === "syncing" ||
                      pendingOperations > 0
                    ? "Saving"
                    : syncStatus === "unsynced"
                      ? "Unsaved"
                      : "Saved"}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Share note"
                  className="bar-icon"
                >
                  <Share size={18} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      void copyNote();
                    }}
                  >
                    <Copy aria-hidden="true" />
                    Copy note
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void downloadNote()}>
                    <Download aria-hidden="true" />
                    Download text
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void copyNote(true)}>
                    <Copy aria-hidden="true" />
                    Copy as Markdown
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void downloadNote(true)}>
                    <Download aria-hidden="true" />
                    Download Markdown
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          <ThemeToggle />
          <NoteActionsMenu
            trigger={
              <button aria-label="More" className="bar-icon">
                <MoreHorizontal />
              </button>
            }
            note={activeNote}
            folders={folders}
            reading={isReadingMode}
            actions={menuActions}
            folderActions={
              selectedFolder &&
              actions
                .filter(
                  (action) =>
                    action.label.endsWith("folder") &&
                    !action.label.startsWith("New"),
                )
                .map((action) => (
                  <DropdownMenuItem
                    className="note-menu-item"
                    key={action.label}
                    onClick={action.run}
                  >
                    <ActionIcon label={action.label} />
                    {action.label}
                  </DropdownMenuItem>
                ))
            }
          />
          {account ? (
            <AccountMenu account={account} onSignOut={leave} />
          ) : (
            <button className="sign-in" onClick={authenticate}>
              <LogIn aria-hidden="true" />
              <span>Sign in</span>
            </button>
          )}
        </div>
      </header>
      <div className="window-content">
        {activeNote ? (
          previewVersionId ? (
            <VersionPreview
              versionId={previewVersionId}
              currentNote={activeNote}
              onClose={() => setPreviewVersionId(null)}
              onRestore={(note) => {
                updateNoteLocally(note.id, {
                  title: note.title,
                  content: note.content,
                  updatedAt: new Date(note.updatedAt),
                });
                setPreviewVersionId(null);
              }}
            />
          ) : (
            <ErrorBoundary>
              <NoteEditor
                isReadingMode={isReadingMode}
                onToggleReadingMode={() => setIsReadingMode((value) => !value)}
                activeNote={activeNote}
                allNotes={notes}
                onNoteUpdate={update}
                onSavingStatusChange={setIsSaving}
                onDeleteNote={removeNote}
                onNavigateNote={navigate}
                onCreateNote={(title, id) => newNote(title, null, id)}
                isRightSidebarOpen={info}
                onToggleRightSidebar={() => setInfo((value) => !value)}
                onPreviewVersion={setPreviewVersionId}
              />
            </ErrorBoundary>
          )
        ) : (
          <NoteWall
            menuActions={menuActions}
            activeNoteId={activeNoteId}
            isReadingMode={isReadingMode}
            filter={wallFilter}
            onFilterChange={setWallFilter}
            notes={notes}
            folders={folders}
            openNote={navigate}
            createNote={(folderId) => {
              void newNote("", folderId);
            }}
          />
        )}
      </div>
      <NoteSwitcher
        open={switching}
        onOpenChange={setSwitching}
        notes={notes}
        folders={folders}
        openNote={navigate}
        createNote={(title) => {
          void newNote(title);
        }}
        actions={actions}
      />
      <AlertDialog
        open={folderToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setFolderToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Delete folder?</AlertDialogTitle>
          <AlertDialogDescription>
            Delete “{folders.find((f) => f.id === folderToDelete)?.name}”? Its
            notes will remain in All notes.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (folderToDelete)
                  void deleteFolder(folderToDelete)
                    .then(() => setWallFilter("all"))
                    .catch(() => toast.error("Failed to delete folder"));
              }}
            >
              Delete folder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <HelpModal isOpen={help} onClose={() => setHelp(false)} />
    </main>
  );
}
