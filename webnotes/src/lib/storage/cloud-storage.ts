// src/lib/storage/cloud-storage.ts
import { trpcVanilla } from "@/lib/trpc/client";
import type { Note, Folder, UserSettings } from "./types";

export class CloudStorageAdapter {
  // Notes
  async getNotes(): Promise<Note[]> {
    const notes = await trpcVanilla.notes.list.query();

    // Transform dates (superjson handles this, but ensure consistency)
    return notes.map((note) => ({
      ...note,
      createdAt: new Date(note.createdAt),
      updatedAt: new Date(note.updatedAt),
      pinnedAt: note.pinnedAt ? new Date(note.pinnedAt) : null,
    })) as Note[];
  }

  async createNote(note: Partial<Note>): Promise<Note> {
    const created = await trpcVanilla.notes.create.mutate({
      title: note.title ?? "",
      content: note.content ?? "",
      folderId: note.folderId ?? null,
    });

    return {
      ...created,
      createdAt: new Date(created.createdAt),
      updatedAt: new Date(created.updatedAt),
      pinnedAt: created.pinnedAt ? new Date(created.pinnedAt) : null,
    } as Note;
  }

  async updateNote(id: string, data: Partial<Note>): Promise<Note> {
    // Check if we're only updating folderId (moving)
    if (data.folderId !== undefined && !data.content && !data.title) {
      const moved = await trpcVanilla.notes.move.mutate({
        id,
        folderId: data.folderId,
      });

      return {
        ...moved,
        createdAt: new Date(moved.createdAt),
        updatedAt: new Date(moved.updatedAt),
        pinnedAt: moved.pinnedAt ? new Date(moved.pinnedAt) : null,
      } as Note;
    }

    // Content/title update
    const updated = await trpcVanilla.notes.update.mutate({
      id,
      htmlContent: data.content,
      textContent: data.title,
      font: data.font,
      isPinned: data.isPinned,
      pinnedAt: data.pinnedAt,
      folderId: data.folderId,
    });

    if (!updated) {
      throw new Error("Note not found");
    }

    return {
      ...updated,
      createdAt: new Date(updated.createdAt),
      updatedAt: new Date(updated.updatedAt),
      pinnedAt: updated.pinnedAt ? new Date(updated.pinnedAt) : null,
    } as Note;
  }

  async deleteNote(id: string): Promise<void> {
    await trpcVanilla.notes.delete.mutate({ id });
  }

  async togglePin(id: string): Promise<Note> {
    const toggled = await trpcVanilla.notes.togglePin.mutate({ id });

    return {
      ...toggled,
      createdAt: new Date(toggled.createdAt),
      updatedAt: new Date(toggled.updatedAt),
      pinnedAt: toggled.pinnedAt ? new Date(toggled.pinnedAt) : null,
    } as Note;
  }

  // Folders
  async getFolders(): Promise<Folder[]> {
    const folders = await trpcVanilla.folders.list.query();

    return folders.map((folder) => ({
      ...folder,
      createdAt: new Date(folder.createdAt),
    })) as Folder[];
  }

  async createFolder(folder: Partial<Folder>): Promise<Folder> {
    const created = await trpcVanilla.folders.create.mutate({
      name: folder.name ?? "New Folder",
    });

    return {
      ...created,
      createdAt: new Date(created.createdAt),
    } as Folder;
  }

  async updateFolder(id: string, data: Partial<Folder>): Promise<Folder> {
    if (!data.name) {
      throw new Error("Folder name is required");
    }

    await trpcVanilla.folders.rename.mutate({
      id,
      newName: data.name,
    });

    // Rename only returns success, fetch the folder
    // For now, return a constructed object
    return {
      id,
      name: data.name,
      createdAt: new Date(),
    } as Folder;
  }

  async deleteFolder(id: string): Promise<void> {
    await trpcVanilla.folders.delete.mutate({ id });
  }

  // Settings (unchanged - not yet in tRPC)
  async getSettings(): Promise<UserSettings> {
    return {
      theme: "dark",
      fontSize: "medium",
      showLineNumbers: false,
      syncStatus: "synced",
    };
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<void> {
    console.log("Settings update not implemented yet:", settings);
  }
}
