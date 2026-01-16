import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { isTauri, TauriDB } from "@/lib/tauri";
import { storage } from "@/lib/storage";
import type {
  Note,
  Folder,
  UserSettings,
  SyncStatus,
} from "@/lib/storage/types";

interface NotesState {
  notes: Note[];
  folders: Folder[];
  settings: UserSettings;
  activeNoteId: string | null;
  isLoading: boolean;
  syncStatus: SyncStatus;
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
}

// Helper: Stable Sort (Pinned top, then Created Date)
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

    // 3. STABLE SORT: Created Date (Newest First)
    // This ensures notes don't jump around while editing
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

    loadData: async () => {
      set({ isLoading: true, syncStatus: "syncing" });

      try {
        if (isTauri) {
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
      // Allow specific ID for optimistic linking
      const newNote: Note = {
        id: data.id || crypto.randomUUID(),
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
        if (isTauri) {
          await TauriDB.saveNote({
            ...newNote,
            createdAt: newNote.createdAt.toISOString(),
            updatedAt: newNote.updatedAt.toISOString(),
          });
        } else {
          await storage.createNote(newNote);
        }

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
          // IMPORTANT: If pinning changes, re-sort.
          // If just editing content, DO NOT re-sort (keep position stable).
          notes:
            data.isPinned !== undefined
              ? sortNotes(
                  state.notes.map((n) => (n.id === id ? updatedNote : n))
                )
              : state.notes.map((n) => (n.id === id ? updatedNote : n)),
        }));

        return updatedNote;
      } catch (error) {
        console.error("Failed to update note:", error);
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
