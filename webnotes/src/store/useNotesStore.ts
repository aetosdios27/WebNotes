// src/store/useNotesStore.ts
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { isTauri, TauriDB, type TauriNote } from "@/lib/tauri";
import { storage } from "@/lib/storage";
import type {
  Note,
  Folder,
  UserSettings,
  SyncStatus,
} from "@/lib/storage/types";
import { v4 as uuidv4 } from "uuid";

// =============================================================================
// TYPES
// =============================================================================

interface User {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

const SYNC_STATUS = {
  SYNCED: "synced",
  SYNCING: "syncing",
  UNSYNCED: "unsynced",
} as const;

interface NotesState {
  // Data
  notes: Note[];
  folders: Folder[];
  settings: UserSettings;
  activeNoteId: string | null;

  // UI State
  isLoading: boolean;
  syncStatus: SyncStatus;
  isOnline: boolean;
  pendingOperations: number;

  // Auth
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;

  // Note Operations
  loadData: () => Promise<void>;
  createNote: (data?: Partial<Note>) => Promise<Note>;
  updateNote: (id: string, data: Partial<Note>) => Promise<Note>;
  updateNoteLocally: (id: string, data: Partial<Note>) => void;
  deleteNote: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<Note>;
  moveNote: (noteId: string, folderId: string | null) => Promise<void>;
  setActiveNote: (id: string | null) => void;

  // Folder Operations
  createFolder: (data: Partial<Folder>) => Promise<Folder>;
  updateFolder: (id: string, data: Partial<Folder>) => Promise<Folder>;
  deleteFolder: (id: string) => Promise<void>;

  // Settings
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  setSyncStatus: (status: SyncStatus) => void;

  // Internal
  _loadingPromise: Promise<void> | null;
  _cleanup: (() => void) | null;
  _initListeners: () => void;
  _destroyListeners: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

const sortNotes = (notes: Note[]): Note[] => {
  return [...notes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    if (a.isPinned && b.isPinned) {
      const aTime = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
      const bTime = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
      return bTime - aTime;
    }

    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
};

// Helper to convert Note to TauriNote format
const toTauriNote = (note: Note): TauriNote => ({
  id: note.id,
  title: note.title ?? "",
  content: note.content ?? "",
  folderId: note.folderId ?? null,
  isPinned: note.isPinned ?? false,
  pinnedAt:
    note.pinnedAt?.toISOString?.() ??
    (typeof note.pinnedAt === "string" ? note.pinnedAt : null),
  font: note.font ?? null,
  createdAt:
    note.createdAt instanceof Date
      ? note.createdAt.toISOString()
      : note.createdAt,
  updatedAt:
    note.updatedAt instanceof Date
      ? note.updatedAt.toISOString()
      : note.updatedAt,
});

// Helper to convert TauriNote to Note format
const fromTauriNote = (n: TauriNote): Note => ({
  id: n.id,
  title: n.title,
  content: n.content,
  folderId: n.folderId,
  isPinned: n.isPinned,
  pinnedAt: n.pinnedAt ? new Date(n.pinnedAt) : null,
  font: n.font,
  createdAt: new Date(n.createdAt),
  updatedAt: new Date(n.updatedAt),
});

// =============================================================================
// STORE
// =============================================================================

export const useNotesStore = create<NotesState>()(
  subscribeWithSelector((set, get) => ({
    // =========================================================================
    // INITIAL STATE
    // =========================================================================
    notes: [],
    folders: [],
    settings: {
      theme: "dark",
      fontSize: "medium",
      showLineNumbers: false,
      syncStatus: "synced",
    },
    activeNoteId: null,
    isLoading: true,
    syncStatus: "synced",
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    pendingOperations: 0,
    user: null,
    _loadingPromise: null,
    _cleanup: null,

    // =========================================================================
    // LISTENER MANAGEMENT
    // =========================================================================
    _initListeners: () => {
      if (typeof window === "undefined") return;
      if (get()._cleanup) return;

      const handleOnline = () => {
        set({ isOnline: true, syncStatus: SYNC_STATUS.SYNCED });
      };

      const handleOffline = () => {
        set({ isOnline: false, syncStatus: SYNC_STATUS.UNSYNCED });
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      set({
        _cleanup: () => {
          window.removeEventListener("online", handleOnline);
          window.removeEventListener("offline", handleOffline);
        },
      });
    },

    _destroyListeners: () => {
      const cleanup = get()._cleanup;
      if (cleanup) {
        cleanup();
        set({ _cleanup: null });
      }
    },

    // =========================================================================
    // AUTH
    // =========================================================================
    setUser: (user) => {
      set({ user });
      if (typeof window !== "undefined" && isTauri) {
        if (user) {
          localStorage.setItem("webnotes_user", JSON.stringify(user));
        } else {
          localStorage.removeItem("webnotes_user");
        }
      }
    },

    logout: () => {
      get()._destroyListeners();
      set({
        user: null,
        notes: [],
        folders: [],
        activeNoteId: null,
      });
      if (typeof window !== "undefined" && isTauri) {
        localStorage.removeItem("webnotes_user");
      }
    },

    // =========================================================================
    // LOAD DATA
    // =========================================================================
    loadData: async () => {
      const existingPromise = get()._loadingPromise;
      if (existingPromise) {
        return existingPromise;
      }

      const loadPromise = (async () => {
        set({ isLoading: true, syncStatus: SYNC_STATUS.SYNCING });
        get()._initListeners();

        try {
          if (isTauri) {
            if (typeof window !== "undefined") {
              const savedUser = localStorage.getItem("webnotes_user");
              if (savedUser) {
                try {
                  set({ user: JSON.parse(savedUser) });
                } catch (e) {
                  console.error("Failed to parse saved user:", e);
                }
              }
            }

            await TauriDB.init();
            const [tauriNotes, tauriFolders] = await Promise.all([
              TauriDB.getAllNotes(),
              TauriDB.getAllFolders(),
            ]);

            set({
              notes: sortNotes(tauriNotes.map(fromTauriNote)),
              folders: tauriFolders.map((f) => ({
                id: f.id,
                name: f.name,
                createdAt: new Date(f.createdAt),
              })),
              isLoading: false,
              syncStatus: SYNC_STATUS.SYNCED,
            });
          } else {
            await storage.refreshAuth?.();
            const [notes, folders, settings] = await Promise.all([
              storage.getNotes(),
              storage.getFolders(),
              storage.getSettings(),
            ]);

            set({
              notes: sortNotes(notes),
              folders,
              settings: settings ?? get().settings,
              isLoading: false,
              syncStatus: SYNC_STATUS.SYNCED,
            });
          }
        } catch (error) {
          console.error("Failed to load data:", error);
          set({
            isLoading: false,
            syncStatus: SYNC_STATUS.UNSYNCED,
          });
        }
      })();

      set({ _loadingPromise: loadPromise });

      try {
        await loadPromise;
      } finally {
        set({ _loadingPromise: null });
      }
    },

    // =========================================================================
    // NOTE OPERATIONS
    // =========================================================================
    createNote: async (data = {}) => {
      const now = new Date();
      const newNote: Note = {
        id: data.id ?? uuidv4(),
        title: data.title ?? "",
        content: data.content ?? "",
        folderId: data.folderId ?? null,
        isPinned: data.isPinned ?? false,
        pinnedAt: data.pinnedAt ?? null,
        font: data.font ?? null,
        createdAt: data.createdAt ?? now,
        updatedAt: data.updatedAt ?? now,
      };

      set((state) => ({
        notes: sortNotes([newNote, ...state.notes]),
        activeNoteId: newNote.id,
        pendingOperations: state.pendingOperations + 1,
        syncStatus: SYNC_STATUS.SYNCING,
      }));

      try {
        if (isTauri) {
          await TauriDB.saveNote(toTauriNote(newNote));
        } else {
          await storage.createNote(newNote);
        }

        set((state) => ({
          pendingOperations: state.pendingOperations - 1,
          syncStatus:
            state.pendingOperations - 1 === 0
              ? SYNC_STATUS.SYNCED
              : state.syncStatus,
        }));

        return newNote;
      } catch (error) {
        console.error("Failed to create note:", error);
        set((state) => ({
          notes: state.notes.filter((n) => n.id !== newNote.id),
          activeNoteId:
            state.activeNoteId === newNote.id ? null : state.activeNoteId,
          pendingOperations: state.pendingOperations - 1,
          syncStatus: SYNC_STATUS.UNSYNCED,
        }));
        throw error;
      }
    },

    updateNote: async (id, data) => {
      const note = get().notes.find((n) => n.id === id);
      if (!note) throw new Error("Note not found");

      const updatedNote: Note = {
        ...note,
        ...data,
        updatedAt: new Date(),
      };

      set((state) => ({
        notes:
          data.isPinned !== undefined
            ? sortNotes(state.notes.map((n) => (n.id === id ? updatedNote : n)))
            : state.notes.map((n) => (n.id === id ? updatedNote : n)),
        pendingOperations: state.pendingOperations + 1,
        syncStatus: SYNC_STATUS.SYNCING,
      }));

      try {
        if (isTauri) {
          await TauriDB.saveNote(toTauriNote(updatedNote));
        } else {
          await storage.updateNote(id, data);
        }

        set((state) => ({
          pendingOperations: state.pendingOperations - 1,
          syncStatus:
            state.pendingOperations - 1 === 0
              ? SYNC_STATUS.SYNCED
              : state.syncStatus,
        }));

        return updatedNote;
      } catch (error) {
        console.error("Failed to update note:", error);
        set((state) => ({
          notes: state.notes.map((n) => (n.id === id ? note : n)),
          pendingOperations: state.pendingOperations - 1,
          syncStatus: SYNC_STATUS.UNSYNCED,
        }));
        throw error;
      }
    },

    updateNoteLocally: (id, data) => {
      set((state) => ({
        notes: state.notes.map((n) =>
          n.id === id ? { ...n, ...data, updatedAt: new Date() } : n
        ),
      }));
    },

    deleteNote: async (id) => {
      const previousNotes = get().notes;
      const note = previousNotes.find((n) => n.id === id);
      if (!note) return;

      set((state) => ({
        notes: state.notes.filter((n) => n.id !== id),
        activeNoteId: state.activeNoteId === id ? null : state.activeNoteId,
        pendingOperations: state.pendingOperations + 1,
        syncStatus: SYNC_STATUS.SYNCING,
      }));

      try {
        if (isTauri) {
          await TauriDB.deleteNote(id);
        } else {
          await storage.deleteNote(id);
        }

        set((state) => ({
          pendingOperations: state.pendingOperations - 1,
          syncStatus:
            state.pendingOperations - 1 === 0
              ? SYNC_STATUS.SYNCED
              : state.syncStatus,
        }));
      } catch (error) {
        console.error("Failed to delete note:", error);
        set((state) => ({
          notes: previousNotes,
          pendingOperations: state.pendingOperations - 1,
          syncStatus: SYNC_STATUS.UNSYNCED,
        }));
        throw error;
      }
    },

    togglePin: async (id) => {
      const note = get().notes.find((n) => n.id === id);
      if (!note) throw new Error("Note not found");

      const updatedNote: Note = {
        ...note,
        isPinned: !note.isPinned,
        pinnedAt: !note.isPinned ? new Date() : null,
        updatedAt: new Date(),
      };

      set((state) => ({
        notes: sortNotes(
          state.notes.map((n) => (n.id === id ? updatedNote : n))
        ),
        pendingOperations: state.pendingOperations + 1,
        syncStatus: SYNC_STATUS.SYNCING,
      }));

      try {
        if (isTauri) {
          await TauriDB.togglePin(id);
        } else {
          await storage.togglePin(id);
        }

        set((state) => ({
          pendingOperations: state.pendingOperations - 1,
          syncStatus:
            state.pendingOperations - 1 === 0
              ? SYNC_STATUS.SYNCED
              : state.syncStatus,
        }));

        return updatedNote;
      } catch (error) {
        console.error("Failed to toggle pin:", error);
        set((state) => ({
          notes: sortNotes(state.notes.map((n) => (n.id === id ? note : n))),
          pendingOperations: state.pendingOperations - 1,
          syncStatus: SYNC_STATUS.UNSYNCED,
        }));
        throw error;
      }
    },

    moveNote: async (noteId, folderId) => {
      const note = get().notes.find((n) => n.id === noteId);
      if (!note) return;

      const originalFolderId = note.folderId;
      const updatedNote: Note = {
        ...note,
        folderId,
        updatedAt: new Date(),
      };

      set((state) => ({
        notes: state.notes.map((n) => (n.id === noteId ? updatedNote : n)),
        pendingOperations: state.pendingOperations + 1,
        syncStatus: SYNC_STATUS.SYNCING,
      }));

      try {
        if (isTauri) {
          await TauriDB.saveNote(toTauriNote(updatedNote));
        } else {
          await storage.updateNote(noteId, { folderId });
        }

        set((state) => ({
          pendingOperations: state.pendingOperations - 1,
          syncStatus:
            state.pendingOperations - 1 === 0
              ? SYNC_STATUS.SYNCED
              : state.syncStatus,
        }));
      } catch (error) {
        console.error("Failed to move note:", error);
        set((state) => ({
          notes: state.notes.map((n) =>
            n.id === noteId ? { ...n, folderId: originalFolderId } : n
          ),
          pendingOperations: state.pendingOperations - 1,
          syncStatus: SYNC_STATUS.UNSYNCED,
        }));
        throw error;
      }
    },

    setActiveNote: (id) => set({ activeNoteId: id }),

    // =========================================================================
    // FOLDER OPERATIONS
    // =========================================================================
    createFolder: async (data) => {
      const newFolder: Folder = {
        id: data.id ?? uuidv4(),
        name: data.name ?? "New Folder",
        createdAt: data.createdAt ?? new Date(),
      };

      set((state) => ({
        folders: [newFolder, ...state.folders],
        pendingOperations: state.pendingOperations + 1,
        syncStatus: SYNC_STATUS.SYNCING,
      }));

      try {
        if (isTauri) {
          await TauriDB.saveFolder({
            id: newFolder.id,
            name: newFolder.name,
            createdAt: newFolder.createdAt.toISOString(),
          });
        } else {
          await storage.createFolder(newFolder);
        }

        set((state) => ({
          pendingOperations: state.pendingOperations - 1,
          syncStatus:
            state.pendingOperations - 1 === 0
              ? SYNC_STATUS.SYNCED
              : state.syncStatus,
        }));

        return newFolder;
      } catch (error) {
        console.error("Failed to create folder:", error);
        set((state) => ({
          folders: state.folders.filter((f) => f.id !== newFolder.id),
          pendingOperations: state.pendingOperations - 1,
          syncStatus: SYNC_STATUS.UNSYNCED,
        }));
        throw error;
      }
    },

    updateFolder: async (id, data) => {
      const folder = get().folders.find((f) => f.id === id);
      if (!folder) throw new Error("Folder not found");

      const updatedFolder = { ...folder, ...data };

      set((state) => ({
        folders: state.folders.map((f) => (f.id === id ? updatedFolder : f)),
        pendingOperations: state.pendingOperations + 1,
        syncStatus: SYNC_STATUS.SYNCING,
      }));

      try {
        if (isTauri) {
          await TauriDB.saveFolder({
            id: updatedFolder.id,
            name: updatedFolder.name,
            createdAt: updatedFolder.createdAt.toISOString(),
          });
        } else {
          await storage.updateFolder(id, data);
        }

        set((state) => ({
          pendingOperations: state.pendingOperations - 1,
          syncStatus:
            state.pendingOperations - 1 === 0
              ? SYNC_STATUS.SYNCED
              : state.syncStatus,
        }));

        return updatedFolder;
      } catch (error) {
        console.error("Failed to update folder:", error);
        set((state) => ({
          folders: state.folders.map((f) => (f.id === id ? folder : f)),
          pendingOperations: state.pendingOperations - 1,
          syncStatus: SYNC_STATUS.UNSYNCED,
        }));
        throw error;
      }
    },

    deleteFolder: async (id) => {
      const previousFolders = get().folders;
      const previousNotes = get().notes;

      set((state) => ({
        folders: state.folders.filter((f) => f.id !== id),
        notes: state.notes.map((n) =>
          n.folderId === id ? { ...n, folderId: null } : n
        ),
        pendingOperations: state.pendingOperations + 1,
        syncStatus: SYNC_STATUS.SYNCING,
      }));

      try {
        if (isTauri) {
          await TauriDB.deleteFolder(id);
        } else {
          await storage.deleteFolder(id);
        }

        set((state) => ({
          pendingOperations: state.pendingOperations - 1,
          syncStatus:
            state.pendingOperations - 1 === 0
              ? SYNC_STATUS.SYNCED
              : state.syncStatus,
        }));
      } catch (error) {
        console.error("Failed to delete folder:", error);
        set((state) => ({
          folders: previousFolders,
          notes: previousNotes,
          pendingOperations: state.pendingOperations - 1,
          syncStatus: SYNC_STATUS.UNSYNCED,
        }));
        throw error;
      }
    },

    // =========================================================================
    // SETTINGS
    // =========================================================================
    updateSettings: async (newSettings) => {
      const previousSettings = get().settings;

      set((state) => ({
        settings: { ...state.settings, ...newSettings },
      }));

      try {
        if (!isTauri) {
          await storage.updateSettings(newSettings);
        }
      } catch (error) {
        console.error("Failed to update settings:", error);
        set({ settings: previousSettings });
        throw error;
      }
    },

    setSyncStatus: (status) => set({ syncStatus: status }),
  }))
);

// =============================================================================
// CLEANUP EXPORT
// =============================================================================
export const cleanupNotesStore = () => {
  const state = useNotesStore.getState();
  state._destroyListeners();
};
