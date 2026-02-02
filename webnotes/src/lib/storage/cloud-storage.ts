import { trpcVanilla } from "@/lib/trpc/client";
import type { Note, Folder, UserSettings } from "./types";

export class CloudStorageAdapter {
  async init() {
    // No init needed
  }

  // ==========================================================================
  // NOTES
  // ==========================================================================

  async getNotes(): Promise<Note[]> {
    const notes = await trpcVanilla.notes.list.query();

    return notes.map((n) => ({
      ...n,
      pinnedAt: n.pinnedAt ?? null,
      font: n.font ?? null,
      folderId: n.folderId ?? null,
    }));
  }

  async createNote(data: Partial<Note>): Promise<Note> {
    const note = await trpcVanilla.notes.create.mutate({
      id: data.id, // ✅ FIX: Send the ID
      title: data.title ?? "",
      content: data.content ?? "",
      folderId: data.folderId,
    });

    return {
      ...note,
      pinnedAt: note.pinnedAt ?? null,
      font: note.font ?? null,
      folderId: note.folderId ?? null,
    };
  }

  async updateNote(id: string, data: Partial<Note>): Promise<Note> {
    const note = await trpcVanilla.notes.update.mutate({
      id,
      htmlContent: data.content,
      textContent: data.title,
      font: data.font,
      isPinned: data.isPinned,
      pinnedAt: data.pinnedAt,
      folderId: data.folderId,
    });

    if (!note) throw new Error("Note not found");

    return {
      ...note,
      pinnedAt: note.pinnedAt ?? null,
      font: note.font ?? null,
      folderId: note.folderId ?? null,
    };
  }

  async deleteNote(id: string): Promise<void> {
    await trpcVanilla.notes.delete.mutate({ id });
  }

  async togglePin(id: string): Promise<Note> {
    const note = await trpcVanilla.notes.togglePin.mutate({ id });

    return {
      ...note,
      pinnedAt: note.pinnedAt ?? null,
      font: note.font ?? null,
      folderId: note.folderId ?? null,
    };
  }

  async moveNote(noteId: string, folderId: string | null): Promise<void> {
    await trpcVanilla.notes.move.mutate({
      id: noteId,
      folderId,
    });
  }

  // ==========================================================================
  // FOLDERS
  // ==========================================================================

  async getFolders(): Promise<Folder[]> {
    const folders = await trpcVanilla.folders.list.query();

    return folders.map((f) => ({
      id: f.id,
      name: f.name,
      createdAt: f.createdAt,
    }));
  }

  async createFolder(data: Partial<Folder>): Promise<Folder> {
    const folder = await trpcVanilla.folders.create.mutate({
      id: data.id, // ✅ FIX: Send the ID
      name: data.name ?? "New Folder",
    });

    return {
      id: folder.id,
      name: folder.name,
      createdAt: folder.createdAt,
    };
  }

  async updateFolder(id: string, data: Partial<Folder>): Promise<Folder> {
    await trpcVanilla.folders.rename.mutate({
      id,
      newName: data.name ?? "Untitled",
    });

    return {
      id,
      name: data.name ?? "Untitled",
      createdAt: new Date(),
    };
  }

  async deleteFolder(id: string): Promise<void> {
    await trpcVanilla.folders.delete.mutate({ id });
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

  async refreshAuth() {
    // Handled by next-auth
  }

  private defaultSettings(): UserSettings {
    return {
      theme: "dark",
      fontSize: "medium",
      showLineNumbers: false,
      syncStatus: "synced",
    };
  }
}
