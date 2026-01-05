import { invoke } from "@tauri-apps/api/core";

// Detect if we are running in the Desktop App
// Note: Tauri v2 usually uses __TAURI_INTERNALS__
export const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export type TauriNote = {
  id: string;
  title: string;
  content: string;
  folder_id?: string | null;
  is_pinned: boolean;
  updated_at: string;
  created_at: string;
};

export type TauriFolder = {
  id: string;
  name: string;
  created_at: string;
};

// --- THIS INTERFACE WAS MISSING THE DELETE METHODS ---
interface TauriBridge {
  init: () => Promise<void>;
  getAllNotes: () => Promise<any[]>;
  getAllFolders: () => Promise<any[]>;
  saveNote: (note: any) => Promise<void>;
  saveFolder: (folder: any) => Promise<void>;
  // 👇 THESE LINES WERE MISSING causing error ts(2339)
  deleteNote: (id: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  search: (query: string) => Promise<any[]>;
}

export const TauriDB: TauriBridge = {
  // 1. Initialize
  async init() {
    if (!isTauri) return;
    try {
      await invoke("init_db");
    } catch (e) {
      console.error("DB Init Failed:", e);
    }
  },

  // 2. Notes
  async getAllNotes() {
    if (!isTauri) return [];

    const rawData = await invoke<TauriNote[]>("get_all_notes");

    return rawData.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      folderId: n.folder_id || null,
      isPinned: n.is_pinned,
      updatedAt: n.updated_at,
      createdAt: n.created_at,
      pinnedAt: null,
    }));
  },

  async saveNote(note: any) {
    if (!isTauri) return;

    const rustNote = {
      id: note.id,
      title: note.title,
      content: note.content || "",
      folder_id: note.folderId || null,
      is_pinned: note.isPinned,
      updated_at: note.updatedAt,
      created_at: note.createdAt,
    };

    await invoke("save_note", { note: rustNote });
  },

  // 👇 IMPLEMENTATION ADDED
  async deleteNote(id: string) {
    if (!isTauri) return;
    await invoke("delete_note", { id });
  },

  // 3. Folders
  async getAllFolders() {
    if (!isTauri) return [];

    const rawData = await invoke<TauriFolder[]>("get_all_folders");

    return rawData.map((f) => ({
      id: f.id,
      name: f.name,
      createdAt: f.created_at,
    }));
  },

  async saveFolder(folder: any) {
    if (!isTauri) return;

    const rustFolder = {
      id: folder.id,
      name: folder.name,
      created_at: folder.createdAt,
    };

    await invoke("save_folder", { folder: rustFolder });
  },

  // 👇 IMPLEMENTATION ADDED
  async deleteFolder(id: string) {
    if (!isTauri) return;
    await invoke("delete_folder", { id });
  },

  // 4. Search
  async search(query: string) {
    if (!isTauri) return [];

    const rawData = await invoke<TauriNote[]>("search_notes", { query });

    return rawData.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      folderId: n.folder_id || null,
      isPinned: n.is_pinned,
      updatedAt: n.updated_at,
      createdAt: n.created_at,
      pinnedAt: null,
    }));
  },
};
