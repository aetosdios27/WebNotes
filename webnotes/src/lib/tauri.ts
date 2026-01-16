import { invoke } from "@tauri-apps/api/core";

// Detect if we are running in the Desktop App
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

interface TauriBridge {
  init: () => Promise<void>;
  getAllNotes: () => Promise<any[]>;
  getAllFolders: () => Promise<any[]>;
  saveNote: (note: any) => Promise<void>;
  saveFolder: (folder: any) => Promise<void>;
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

    // Rust returns data with snake_case (from DB) but we annotated struct with camelCase
    // WAIT: If we annotated struct with camelCase, Rust returns camelCase JSON.
    // Let's assume Rust returns camelCase now.

    const rawData = await invoke<any[]>("get_all_notes");

    return rawData.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      // Handle both cases just to be safe during migration
      folderId: n.folderId || n.folder_id || null,
      isPinned: n.isPinned || n.is_pinned || false,
      updatedAt: n.updatedAt || n.updated_at,
      createdAt: n.createdAt || n.created_at,
      pinnedAt: null,
    }));
  },

  async saveNote(note: any) {
    if (!isTauri) return;

    // Send camelCase (Rust struct expects this now)
    const notePayload = {
      id: note.id,
      title: note.title,
      content: note.content || "",
      folderId: note.folderId || null,
      isPinned: note.isPinned || false,
      updatedAt: note.updatedAt,
      createdAt: note.createdAt,
    };

    await invoke("save_note", { note: notePayload });
  },

  async deleteNote(id: string) {
    if (!isTauri) return;
    await invoke("delete_note", { id });
  },

  // 3. Folders
  async getAllFolders() {
    if (!isTauri) return [];

    const rawData = await invoke<any[]>("get_all_folders");

    return rawData.map((f) => ({
      id: f.id,
      name: f.name,
      createdAt: f.createdAt || f.created_at,
    }));
  },

  async saveFolder(folder: any) {
    if (!isTauri) return;

    const folderPayload = {
      id: folder.id,
      name: folder.name,
      createdAt: folder.createdAt,
    };

    await invoke("save_folder", { folder: folderPayload });
  },

  async deleteFolder(id: string) {
    if (!isTauri) return;
    await invoke("delete_folder", { id });
  },

  // 4. Search
  async search(query: string) {
    if (!isTauri) return [];

    const rawData = await invoke<any[]>("search_notes", { query });

    return rawData.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      folderId: n.folderId || n.folder_id || null,
      isPinned: n.isPinned || n.is_pinned || false,
      updatedAt: n.updatedAt || n.updated_at,
      createdAt: n.createdAt || n.created_at,
      pinnedAt: null,
    }));
  },
};
