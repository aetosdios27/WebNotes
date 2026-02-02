import { invoke } from "@tauri-apps/api/core";

// Types matching Rust structs
export interface TauriNote {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  isPinned: boolean;
  pinnedAt: string | null;
  font: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface TauriFolder {
  id: string;
  name: string;
  createdAt: string;
}

// Check if running in Tauri
export const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

// Database operations
export const TauriDB = {
  async init(): Promise<void> {
    if (!isTauri) return;
    await invoke<string>("init_db");
  },

  async saveNote(note: TauriNote): Promise<void> {
    if (!isTauri) return;
    await invoke("save_note", { note });
  },

  async getAllNotes(): Promise<TauriNote[]> {
    if (!isTauri) return [];
    return await invoke<TauriNote[]>("get_all_notes");
  },

  async getNote(id: string): Promise<TauriNote | null> {
    if (!isTauri) return null;
    return await invoke<TauriNote | null>("get_note", { id });
  },

  async deleteNote(id: string): Promise<void> {
    if (!isTauri) return;
    await invoke("delete_note", { id });
  },

  async togglePin(id: string): Promise<TauriNote> {
    if (!isTauri) throw new Error("Not in Tauri environment");
    return await invoke<TauriNote>("toggle_pin", { id });
  },

  async saveFolder(folder: TauriFolder): Promise<void> {
    if (!isTauri) return;
    await invoke("save_folder", { folder });
  },

  async getAllFolders(): Promise<TauriFolder[]> {
    if (!isTauri) return [];
    return await invoke<TauriFolder[]>("get_all_folders");
  },

  async deleteFolder(id: string): Promise<void> {
    if (!isTauri) return;
    await invoke("delete_folder", { id });
  },

  async searchNotes(query: string): Promise<TauriNote[]> {
    if (!isTauri) return [];
    return await invoke<TauriNote[]>("search_notes", { query });
  },
};
