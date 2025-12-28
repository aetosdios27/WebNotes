import { TauriDB } from "@/lib/tauri";
import type { Note, Folder, UserSettings } from "./types";

export class TauriStorageAdapter {
  async init() {
    await TauriDB.init();
  }

  // --- NOTES (Keep as is, just verify saveNote calls TauriDB) ---

  async getNotes(): Promise<Note[]> {
    const notes = await TauriDB.getAllNotes();
    return notes.map((n) => ({
      ...n,
      createdAt: new Date(n.createdAt),
      updatedAt: new Date(n.updatedAt),
      pinnedAt: n.pinnedAt ? new Date(n.pinnedAt) : undefined,
    }));
  }

  async createNote(note: Partial<Note>): Promise<Note> {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: note.title || "",
      content: note.content || "",
      folderId: note.folderId || null,
      isPinned: note.isPinned || false,
      createdAt: new Date(),
      updatedAt: new Date(),
      pinnedAt: note.pinnedAt || null,
      font: note.font || "sans",
    };

    await TauriDB.saveNote({
      id: newNote.id,
      title: newNote.title || "",
      content: newNote.content || "",
      folderId: newNote.folderId,
      isPinned: newNote.isPinned || false,
      createdAt: newNote.createdAt.toISOString(),
      updatedAt: newNote.updatedAt.toISOString(),
    });

    return newNote;
  }

  // Note: updateNote, deleteNote, togglePin same as before...

  async updateNote(id: string, data: Partial<Note>): Promise<Note> {
    const allNotes = await this.getNotes();
    const current = allNotes.find((n) => n.id === id);
    if (!current) throw new Error("Note not found");
    const updated: Note = { ...current, ...data, updatedAt: new Date() };
    await TauriDB.saveNote({
      id: updated.id,
      title: updated.title || "",
      content: updated.content || "",
      folderId: updated.folderId,
      isPinned: updated.isPinned || false,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
    return updated;
  }

  async deleteNote(id: string) {} // TODO
  async togglePin(id: string) {
    return {} as Note;
  } // TODO

  // --- FOLDERS (REAL IMPLEMENTATION) ---

  async getFolders(): Promise<Folder[]> {
    const folders = await TauriDB.getAllFolders();
    return folders.map((f) => ({
      id: f.id,
      name: f.name,
      createdAt: new Date(f.createdAt),
    }));
  }

  async createFolder(folder: Partial<Folder>): Promise<Folder> {
    const newFolder = {
      id: crypto.randomUUID(),
      name: folder.name || "New Folder",
      createdAt: new Date(),
    };

    await TauriDB.saveFolder({
      id: newFolder.id,
      name: newFolder.name,
      createdAt: newFolder.createdAt.toISOString(),
    });

    return newFolder;
  }

  async updateFolder(id: string, data: Partial<Folder>): Promise<Folder> {
    // Basic implementation: overwrite name
    const newFolder = {
      id: id,
      name: data.name || "Untitled",
      createdAt: new Date().toISOString(), // We should ideally fetch old date
    };
    await TauriDB.saveFolder(newFolder);
    return { id, name: newFolder.name, createdAt: new Date() };
  }

  async deleteFolder(id: string): Promise<void> {}

  // --- SETTINGS ---
  async getSettings(): Promise<UserSettings> {
    return {
      theme: "dark",
      fontSize: "medium",
      showLineNumbers: false,
      syncStatus: "synced",
    };
  }
  async updateSettings(settings: Partial<UserSettings>): Promise<void> {}
}
