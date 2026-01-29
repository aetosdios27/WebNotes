// src/store/useNotesStore.ts
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { Effect, Queue, Ref, Fiber } from "effect";
import { isTauri, TauriDB } from "@/lib/tauri";
import { storage } from "@/lib/storage";
import {
  createSyncQueue,
  enqueueCreate,
  enqueueUpdate,
  enqueueDelete,
} from "@/lib/effect/sync-queue";
import { runEffect } from "@/lib/effect/runtime";
import type {
  Note,
  Folder,
  UserSettings,
  SyncStatus,
} from "@/lib/storage/types";
import { v4 as uuidv4 } from "uuid";

// Sync queue state type
interface SyncQueueState {
  queue: Queue.Queue<any>;
  processing: Ref.Ref<boolean>;
  fiber: Fiber.Fiber<never, never> | null;
}

// User type
interface User {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface NotesState {
  notes: Note[];
  folders: Folder[];
  settings: UserSettings;
  activeNoteId: string | null;
  isLoading: boolean;
  syncStatus: SyncStatus;
  isOnline: boolean;
  pendingOperations: number;

  // Auth State
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;

  // Data operations
  loadData: () => Promise<void>;
  createNote: (data?: Partial<Note>) => Promise<Note>;
  updateNote: (id: string, data: Partial<Note>) => Promise<Note>;
  updateNoteLocally: (id: string, data: Partial<Note>) => void;
  deleteNote: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<Note>;
  moveNote: (noteId: string, folderId: string | null) => Promise<void>;
  setActiveNote: (id: string | null) => void;
  createFolder: (data: Partial<Folder>) => Promise<Folder>;
  updateFolder: (id: string, data: Partial<Folder>) => Promise<Folder>;
  deleteFolder: (id: string) => Promise<void>;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  setSyncStatus: (status: SyncStatus) => void;

  // Internal
  _syncQueue: SyncQueueState | null;
  _initSyncQueue: () => Promise<void>;
}

const sortNotes = (notes: Note[]): Note[] => {
  return [...notes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    if (a.isPinned && b.isPinned) {
      const aTime = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
      const bTime = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
      return bTime - aTime;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

export const useNotesStore = create<NotesState>()(
  subscribeWithSelector((set, get) => ({
    notes: [],
    folders: [],
    settings: {
      theme: "dark",
      fontSize: "medium",
      showLineNumbers: false,
      syncStatus: "syncing",
    },
    activeNoteId: null,
    isLoading: true,
    syncStatus: "syncing",
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    pendingOperations: 0,
    user: null,
    _syncQueue: null,

    // Initialize the Effect sync queue
    _initSyncQueue: async () => {
      if (get()._syncQueue) return; // Already initialized
      if (isTauri) return; // Tauri doesn't use the sync queue (yet)

      try {
        const queue = await runEffect(createSyncQueue);
        set({ _syncQueue: queue });

        // Listen for online/offline
        if (typeof window !== "undefined") {
          window.addEventListener("online", () => {
            set({ isOnline: true, syncStatus: "syncing" });
          });
          window.addEventListener("offline", () => {
            set({ isOnline: false, syncStatus: "unsynced" });
          });
        }

        console.log("[Effect] Sync queue initialized");
      } catch (error) {
        console.error("[Effect] Failed to initialize sync queue:", error);
      }
    },

    setUser: (user) => {
      set({ user });
      if (typeof window !== "undefined" && isTauri) {
        localStorage.setItem("webnotes_user", JSON.stringify(user));
      }
    },

    logout: () => {
      set({ user: null });
      if (typeof window !== "undefined" && isTauri) {
        localStorage.removeItem("webnotes_user");
      }
    },

    loadData: async () => {
      set({ isLoading: true, syncStatus: "syncing" });

      // Initialize sync queue for web
      await get()._initSyncQueue();

      try {
        if (isTauri) {
          // Restore User
          if (typeof window !== "undefined") {
            const savedUser = localStorage.getItem("webnotes_user");
            if (savedUser) set({ user: JSON.parse(savedUser) });
          }

          await TauriDB.init();
          const [notes, folders] = await Promise.all([
            TauriDB.getAllNotes(),
            TauriDB.getAllFolders(),
          ]);
          set({
            notes: sortNotes(
              notes.map((n) => ({
                ...n,
                createdAt: new Date(n.createdAt),
                updatedAt: new Date(n.updatedAt),
                pinnedAt: n.pinnedAt ? new Date(n.pinnedAt) : null,
              })) as Note[]
            ),
            folders: folders.map((f) => ({
              ...f,
              createdAt: new Date(f.createdAt),
            })) as Folder[],
            isLoading: false,
            syncStatus: "synced",
          });
        } else {
          await storage.refreshAuth();
          const [notes, folders, settings] = await Promise.all([
            storage.getNotes(),
            storage.getFolders(),
            storage.getSettings(),
          ]);
          set({
            notes: sortNotes(notes),
            folders,
            settings,
            isLoading: false,
            syncStatus: "synced",
          });
        }
      } catch (error) {
        console.error("Failed to load data:", error);
        set({ isLoading: false, syncStatus: "unsynced" });
      }
    },

    createNote: async (data = {}) => {
      const now = new Date();
      const newNote: Note = {
        ...data,
        id: data.id || uuidv4(),
        title: data.title ?? "",
        content: data.content ?? "",
        folderId: data.folderId ?? null,
        isPinned: data.isPinned ?? false,
        pinnedAt: data.pinnedAt ?? null,
        font: data.font ?? null,
        createdAt: data.createdAt || now,
        updatedAt: data.updatedAt || now,
      };

      // Optimistic update
      set((state) => ({
        notes: sortNotes([newNote, ...state.notes]),
        activeNoteId: newNote.id,
        pendingOperations: state.pendingOperations + 1,
      }));

      try {
        if (isTauri) {
          await TauriDB.saveNote({
            ...newNote,
            createdAt: newNote.createdAt.toISOString(),
            updatedAt: newNote.updatedAt.toISOString(),
          });
          set((state) => ({ pendingOperations: state.pendingOperations - 1 }));
        } else {
          const { _syncQueue, isOnline } = get();

          if (isOnline) {
            // Online: Save directly
            await storage.createNote(newNote);
            set((state) => ({
              pendingOperations: state.pendingOperations - 1,
              syncStatus: "synced",
            }));
          } else if (_syncQueue) {
            // Offline: Queue for later
            await runEffect(enqueueCreate(_syncQueue, newNote));
            set({ syncStatus: "unsynced" });
          }
        }

        return newNote;
      } catch (error: unknown) {
        console.error("Failed to create note:", error);
        // Rollback optimistic update
        set((state) => ({
          notes: state.notes.filter((n) => n.id !== newNote.id),
          pendingOperations: state.pendingOperations - 1,
          syncStatus: "unsynced",
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

      // Optimistic update
      set((state) => ({
        notes:
          data.isPinned !== undefined
            ? sortNotes(state.notes.map((n) => (n.id === id ? updatedNote : n)))
            : state.notes.map((n) => (n.id === id ? updatedNote : n)),
        pendingOperations: state.pendingOperations + 1,
      }));

      try {
        if (isTauri) {
          await TauriDB.saveNote({
            ...updatedNote,
            createdAt:
              updatedNote.createdAt instanceof Date
                ? updatedNote.createdAt.toISOString()
                : updatedNote.createdAt,
            updatedAt: updatedNote.updatedAt.toISOString(),
          });
          set((state) => ({ pendingOperations: state.pendingOperations - 1 }));
        } else {
          const { _syncQueue, isOnline } = get();

          if (isOnline) {
            await storage.updateNote(id, data);
            set((state) => ({
              pendingOperations: state.pendingOperations - 1,
              syncStatus: "synced",
            }));
          } else if (_syncQueue) {
            await runEffect(enqueueUpdate(_syncQueue, id, data));
            set({ syncStatus: "unsynced" });
          }
        }

        return updatedNote;
      } catch (error) {
        console.error("Failed to update note:", error);
        // Rollback
        set((state) => ({
          notes: state.notes.map((n) => (n.id === id ? note : n)),
          pendingOperations: state.pendingOperations - 1,
          syncStatus: "unsynced",
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

      // Optimistic update
      set((state) => ({
        notes: state.notes.filter((n) => n.id !== id),
        activeNoteId: state.activeNoteId === id ? null : state.activeNoteId,
        pendingOperations: state.pendingOperations + 1,
      }));

      try {
        if (isTauri) {
          await TauriDB.deleteNote(id);
          set((state) => ({ pendingOperations: state.pendingOperations - 1 }));
        } else {
          const { _syncQueue, isOnline } = get();

          if (isOnline) {
            await storage.deleteNote(id);
            set((state) => ({
              pendingOperations: state.pendingOperations - 1,
              syncStatus: "synced",
            }));
          } else if (_syncQueue) {
            await runEffect(enqueueDelete(_syncQueue, id));
            set({ syncStatus: "unsynced" });
          }
        }
      } catch (error) {
        console.error("Failed to delete note:", error);
        set({
          notes: previousNotes,
          pendingOperations: get().pendingOperations - 1,
          syncStatus: "unsynced",
        });
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

      // Optimistic update
      set((state) => ({
        notes: sortNotes(
          state.notes.map((n) => (n.id === id ? updatedNote : n))
        ),
      }));

      try {
        if (isTauri) {
          await TauriDB.saveNote({
            ...updatedNote,
            createdAt: updatedNote.createdAt.toISOString(),
            updatedAt: updatedNote.updatedAt.toISOString(),
          });
        } else {
          await storage.togglePin(id);
        }
        return updatedNote;
      } catch (error) {
        // Rollback
        set((state) => ({
          notes: sortNotes(state.notes.map((n) => (n.id === id ? note : n))),
        }));
        throw error;
      }
    },

    moveNote: async (noteId, folderId) => {
      const note = get().notes.find((n) => n.id === noteId);
      if (!note) return;

      const originalFolderId = note.folderId;

      // Optimistic update
      set((state) => ({
        notes: state.notes.map((n) =>
          n.id === noteId ? { ...n, folderId } : n
        ),
      }));

      try {
        if (isTauri) {
          await TauriDB.saveNote({
            ...note,
            folderId,
            createdAt: note.createdAt.toISOString(),
            updatedAt: new Date().toISOString(),
          });
        } else {
          await storage.updateNote(noteId, { folderId });
        }
      } catch (error) {
        console.error("Move failed, rolling back");
        set((state) => ({
          notes: state.notes.map((n) =>
            n.id === noteId ? { ...n, folderId: originalFolderId } : n
          ),
        }));
        throw error;
      }
    },

    setActiveNote: (id) => set({ activeNoteId: id }),

    createFolder: async (data) => {
      const newFolder: Folder = {
        id: uuidv4(),
        name: data.name || "New Folder",
        createdAt: new Date(),
      };

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
          folders: [newFolder, ...state.folders],
        }));

        return newFolder;
      } catch (error) {
        console.error("Failed to create folder:", error);
        throw error;
      }
    },

    updateFolder: async (id, data) => {
      const folder = get().folders.find((f) => f.id === id);
      if (!folder) throw new Error("Folder not found");

      const updatedFolder = { ...folder, ...data };

      set((state) => ({
        folders: state.folders.map((f) => (f.id === id ? updatedFolder : f)),
      }));

      try {
        if (isTauri) {
          await TauriDB.saveFolder({
            ...updatedFolder,
            createdAt: updatedFolder.createdAt.toISOString(),
          });
        } else {
          await storage.updateFolder(id, data);
        }
        return updatedFolder;
      } catch (error) {
        set((state) => ({
          folders: state.folders.map((f) => (f.id === id ? folder : f)),
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
      }));

      try {
        if (isTauri) {
          await TauriDB.deleteFolder(id);
        } else {
          await storage.deleteFolder(id);
        }
      } catch (error) {
        set({ folders: previousFolders, notes: previousNotes });
        throw error;
      }
    },

    updateSettings: async (newSettings) => {
      set((state) => ({
        settings: { ...state.settings, ...newSettings },
      }));

      if (!isTauri) {
        await storage.updateSettings(newSettings);
      }
    },

    setSyncStatus: (status) => set({ syncStatus: status }),
  }))
);
