"use client";

import { useEffect, useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { useSession, signIn, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Share,
  MoreHorizontal,
} from "lucide-react";
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
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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
  const { resolvedTheme, setTheme } = useTheme();
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
    async (note: Note) => {
      try {
        await updateNote(note.id, {
          title: note.title,
          content: note.content,
          font: note.font,
          isPinned: note.isPinned,
          pinnedAt: note.pinnedAt,
          folderId: note.folderId,
        });
      } catch {
        toast.error("Failed to update note");
      }
    },
    [updateNote],
  );
  function authenticate() {
    if (isTauri) void open("https://web-notes-lyart.vercel.app/auth/desktop");
    else void signIn("google");
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
        switching ||
        !(event.target instanceof HTMLElement) ||
        event.target.closest(
          'input, textarea, [contenteditable="true"], [role="dialog"], [role="menu"]',
        )
      )
        return;
      if (
        (!activeNoteId &&
          event.key.toLowerCase() === "n" &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.altKey) ||
        ((event.metaKey || event.ctrlKey) && event.key === "e")
      ) {
        event.preventDefault();
        void newNote();
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
  }, [activeNoteId, newNote, newFolder, switching]);
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
          <Search size={16} />
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
              <span className="save-state" role="status">
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
                    Copy note
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void downloadNote()}>
                    Download text
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void copyNote(true)}>
                    Copy as Markdown
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void downloadNote(true)}>
                    Download Markdown
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger aria-label="More" className="bar-icon">
              <MoreHorizontal size={19} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.slice(0, -1).map((action) => (
                <DropdownMenuItem key={action.label} onClick={action.run}>
                  {action.label}
                </DropdownMenuItem>
              ))}
              {activeNote && (
                <>
                  <DropdownMenuCheckboxItem
                    checked={isReadingMode}
                    onCheckedChange={setIsReadingMode}
                  >
                    Reading mode
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuRadioGroup
                    value={activeNote.font || "sans"}
                    onValueChange={(font) => {
                      void updateNote(activeNote.id, { font }).catch(() =>
                        toast.error("Failed to change font"),
                      );
                    }}
                    aria-label="Note font"
                  >
                    <DropdownMenuRadioItem value="sans">
                      Sans
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="serif">
                      Serif
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="mono">
                      Mono
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuItem onClick={() => setInfo((value) => !value)}>
                    Note information & history
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      void moveNote(activeNote.id, null).catch(() =>
                        toast.error("Failed to move note"),
                      );
                    }}
                  >
                    Move to All notes
                  </DropdownMenuItem>
                  {folders.map((folder) => (
                    <DropdownMenuItem
                      key={folder.id}
                      onClick={() => {
                        void moveNote(activeNote.id, folder.id).catch(() =>
                          toast.error("Failed to move note"),
                        );
                      }}
                    >
                      Move to {folder.name}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
              <DropdownMenuItem
                onClick={() =>
                  setTheme(resolvedTheme === "dark" ? "light" : "dark")
                }
              >
                Use {resolvedTheme === "dark" ? "light" : "dark"} theme
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setHelp(true)}>
                Help & shortcuts
              </DropdownMenuItem>
              {account && (
                <DropdownMenuItem onClick={leave}>Sign out</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            className={account ? "account-avatar" : "sign-in"}
            aria-label={
              account ? `Sign out ${account.name || "account"}` : "Sign in"
            }
            onClick={account ? leave : authenticate}
          >
            {account
              ? (account.name || account.email || "A").slice(0, 1).toUpperCase()
              : "Sign in"}
          </button>
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
