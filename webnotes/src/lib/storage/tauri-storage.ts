import { TauriDB, type TauriNote, type TauriFolder } from "@/lib/tauri";
import type { Note, Folder, UserSettings } from "./types";

export class TauriStorageAdapter {
  async init(): Promise<void> {
    await TauriDB.init();
  }

  // ==========================================================================
  // NOTES
  // ==========================================================================

  async getNotes(): Promise<Note[]> {
    const notes = await TauriDB.getAllNotes();
    return notes.map((n) => this.tauriNoteToNote(n));
  }

  async getNote(id: string): Promise<Note | null> {
    const note = await TauriDB.getNote(id);
    return note ? this.tauriNoteToNote(note) : null;
  }

  async createNote(data: Partial<Note>): Promise<Note> {
    const now = new Date();
    const note: Note = {
      id: data.id ?? crypto.randomUUID(),
      title: data.title ?? "",
      content: data.content ?? "",
      folderId: data.folderId ?? null,
      isPinned: data.isPinned ?? false,
      pinnedAt: data.pinnedAt ?? null,
      font: data.font ?? null,
      createdAt: data.createdAt ?? now,
      updatedAt: data.updatedAt ?? now,
    };

    await TauriDB.saveNote(this.noteToTauriNote(note));
    return note;
  }

  async updateNote(id: string, data: Partial<Note>): Promise<Note> {
    const current = await this.getNote(id);
    if (!current) {
      throw new Error(`Note not found: ${id}`);
    }

    const updated: Note = {
      ...current,
      ...data,
      updatedAt: new Date(),
    };

    await TauriDB.saveNote(this.noteToTauriNote(updated));
    return updated;
  }

  async deleteNote(id: string): Promise<void> {
    await TauriDB.deleteNote(id);
  }

  async togglePin(id: string): Promise<Note> {
    const tauriNote = await TauriDB.togglePin(id);
    return this.tauriNoteToNote(tauriNote);
  }

  async searchNotes(query: string): Promise<Note[]> {
    const notes = await TauriDB.searchNotes(query);
    return notes.map((n) => this.tauriNoteToNote(n));
  }

  // ==========================================================================
  // FOLDERS
  // ==========================================================================

  async getFolders(): Promise<Folder[]> {
    const folders = await TauriDB.getAllFolders();
    return folders.map((f) => this.tauriFolderToFolder(f));
  }

  async createFolder(data: Partial<Folder>): Promise<Folder> {
    const folder: Folder = {
      id: data.id ?? crypto.randomUUID(),
      name: data.name ?? "New Folder",
      createdAt: data.createdAt ?? new Date(),
    };

    await TauriDB.saveFolder(this.folderToTauriFolder(folder));
    return folder;
  }

  async updateFolder(id: string, data: Partial<Folder>): Promise<Folder> {
    const folders = await this.getFolders();
    const current = folders.find((f) => f.id === id);
    if (!current) {
      throw new Error(`Folder not found: ${id}`);
    }

    const updated: Folder = {
      ...current,
      ...data,
    };

    await TauriDB.saveFolder(this.folderToTauriFolder(updated));
    return updated;
  }

  async deleteFolder(id: string): Promise<void> {
    await TauriDB.deleteFolder(id);
  }

  // ==========================================================================
  // SETTINGS
  // ==========================================================================

  async getSettings(): Promise<UserSettings> {
    if (typeof window === "undefined") {
      return this.defaultSettings();
    }

    try {
      const stored = localStorage.getItem("webnotes_settings");
      if (stored) {
        return { ...this.defaultSettings(), ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
    }

    return this.defaultSettings();
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<void> {
    if (typeof window === "undefined") return;

    try {
      const current = await this.getSettings();
      const updated = { ...current, ...settings };
      localStorage.setItem("webnotes_settings", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
  }

  private defaultSettings(): UserSettings {
    return {
      theme: "dark",
      fontSize: "medium",
      showLineNumbers: false,
      syncStatus: "synced",
    };
  }

  // ==========================================================================
  // CONVERTERS
  // ==========================================================================

  private tauriNoteToNote(n: TauriNote): Note {
    return {
      id: n.id,
      title: n.title,
      content: n.content,
      folderId: n.folderId,
      isPinned: n.isPinned,
      pinnedAt: n.pinnedAt ? new Date(n.pinnedAt) : null,
      font: n.font,
      createdAt: new Date(n.createdAt),
      updatedAt: new Date(n.updatedAt),
    };
  }

  private noteToTauriNote(n: Note): TauriNote {
    return {
      id: n.id,
      title: n.title ?? "",
      content: n.content ?? "",
      folderId: n.folderId ?? null,
      isPinned: n.isPinned ?? false,
      pinnedAt: n.pinnedAt?.toISOString() ?? null,
      font: n.font ?? null,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    };
  }

  private tauriFolderToFolder(f: TauriFolder): Folder {
    return {
      id: f.id,
      name: f.name,
      createdAt: new Date(f.createdAt),
    };
  }

  private folderToTauriFolder(f: Folder): TauriFolder {
    return {
      id: f.id,
      name: f.name,
      createdAt: f.createdAt.toISOString(),
    };
  }
}
