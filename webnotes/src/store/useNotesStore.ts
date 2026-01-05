import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { isTauri, TauriDB } from "@/lib/tauri";
import { storage } from "@/lib/storage"; // Fallback for Web
import type {
  Note,
  Folder,
  UserSettings,
  SyncStatus,
} from "@/lib/storage/types";

interface NotesState {
  // --- STATE ---
  notes: Note[];
  folders: Folder[];
  settings: UserSettings;

  // UI State
  activeNoteId: string | null;
  isLoading: boolean;
  syncStatus: SyncStatus;

  // --- ACTIONS ---

  // Lifecycle
  loadData: () => Promise<void>;

  // Notes
  createNote: (data?: Partial<Note>) => Promise<Note>;
  updateNote: (id: string, data: Partial<Note>) => Promise<Note>;
  updateNoteLocally: (id: string, data: Partial<Note>) => void; // For instant typing updates
  deleteNote: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<Note>;
  moveNote: (noteId: string, folderId: string | null) => Promise<void>;
  setActiveNote: (id: string | null) => void;

  // Folders
  createFolder: (data: Partial<Folder>) => Promise<Folder>;
  updateFolder: (id: string, data: Partial<Folder>) => Promise<Folder>;
  deleteFolder: (id: string) => Promise<void>;

  // Settings
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  setSyncStatus: (status: SyncStatus) => void;
}

// Helper: Always keep notes sorted (Pinned top, then Newest)
const sortNotes = (notes: Note[]): Note[] => {
  return [...notes].sort((a, b) => {
    // 1. Pinned logic
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    // 2. Pinned Sort order (Newest pin first)
    if (a.isPinned && b.isPinned) {
      const aTime = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
      const bTime = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
      return bTime - aTime;
    }

    // 3. Normal Sort order (Newest update first)
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
};

export const useNotesStore = create<NotesState>()(
  subscribeWithSelector((set, get) => ({
    // === INITIAL STATE ===
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

    // === LOAD DATA (The "Hydration") ===
    loadData: async () => {
      set({ isLoading: true, syncStatus: "syncing" });

      try {
        if (isTauri) {
          // TIER 1: Desktop Mode (Rust)
          await TauriDB.init();

          const [notes, folders] = await Promise.all([
            TauriDB.getAllNotes(),
            TauriDB.getAllFolders(),
          ]);

          set({
            notes: sortNotes(
              notes.map((n) => ({
                ...n,
                // Rust sends strings, convert to Date objects for UI
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
          // TIER 2: Web Mode (Next.js API)
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

    // === NOTE ACTIONS ===

    createNote: async (data = {}) => {
      const now = new Date();
      // 1. Optimistic Creation
      const newNote: Note = {
        id: crypto.randomUUID(),
        title: data.title ?? "",
        content: data.content ?? "",
        folderId: data.folderId ?? null,
        isPinned: false,
        pinnedAt: null,
        font: null,
        createdAt: now,
        updatedAt: now,
        ...data,
      };

      try {
        // 2. Persist to Backend
        if (isTauri) {
          await TauriDB.saveNote({
            ...newNote,
            createdAt: newNote.createdAt.toISOString(),
            updatedAt: newNote.updatedAt.toISOString(),
          });
        } else {
          await storage.createNote(newNote);
        }

        // 3. Update Store (UI updates instantly)
        set((state) => ({
          notes: sortNotes([newNote, ...state.notes]),
          activeNoteId: newNote.id,
        }));

        return newNote;
      } catch (error) {
        console.error("Failed to create note:", error);
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
        } else {
          await storage.updateNote(id, data);
        }

        set((state) => ({
          notes: sortNotes(
            state.notes.map((n) => (n.id === id ? updatedNote : n))
          ),
        }));

        return updatedNote;
      } catch (error) {
        console.error("Failed to update note:", error);
        throw error;
      }
    },

    updateNoteLocally: (id, data) => {
      // Fast path for typing - avoids sorting overhead on every keystroke
      set((state) => ({
        notes: state.notes.map((n) =>
          n.id === id ? { ...n, ...data, updatedAt: new Date() } : n
        ),
      }));
    },

    deleteNote: async (id) => {
      // 1. Optimistic Delete
      const previousNotes = get().notes;
      set((state) => ({
        notes: state.notes.filter((n) => n.id !== id),
        activeNoteId: state.activeNoteId === id ? null : state.activeNoteId,
      }));

      try {
        if (isTauri) {
          await TauriDB.deleteNote(id);
        } else {
          await storage.deleteNote(id);
        }
      } catch (error) {
        // Rollback if failed
        console.error("Failed to delete note:", error);
        set({ notes: previousNotes });
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

      // Optimistic
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

      // Optimistic Move
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
        // Rollback
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

    // === FOLDER ACTIONS (The Bug Fixers) ===

    createFolder: async (data) => {
      const newFolder: Folder = {
        id: crypto.randomUUID(),
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

        // CRITICAL: Update Global State
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
        // Rollback
        set((state) => ({
          folders: state.folders.map((f) => (f.id === id ? folder : f)),
        }));
        throw error;
      }
    },

    deleteFolder: async (id) => {
      const previousFolders = get().folders;
      const previousNotes = get().notes;

      // Optimistic Delete
      set((state) => ({
        folders: state.folders.filter((f) => f.id !== id),
        // Move notes to "Unfiled" (null) visually immediately
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
        // Rollback
        set({ folders: previousFolders, notes: previousNotes });
        throw error;
      }
    },

    // === SETTINGS ===
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
