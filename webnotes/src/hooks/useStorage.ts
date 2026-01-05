"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { storage } from "@/lib/storage";
import type {
  Note,
  Folder,
  UserSettings,
  SyncStatus,
} from "@/lib/storage/types";
import { useSession } from "next-auth/react";

export function useStorage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    theme: "dark",
    fontSize: "medium",
    showLineNumbers: false,
    syncStatus: "syncing",
  });
  const [isLoading, setIsLoading] = useState(true);

  const { status } = useSession();
  const lastStatus = useRef(status);

  const loadData = useCallback(async () => {
    setIsLoading(true);

    try {
      await storage.refreshAuth();

      const [loadedNotes, loadedFolders, loadedSettings] = await Promise.all([
        storage.getNotes(),
        storage.getFolders(),
        storage.getSettings(),
      ]);

      setNotes(loadedNotes);
      setFolders(loadedFolders);
      setSettings(loadedSettings);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "loading" && status !== lastStatus.current) {
      lastStatus.current = status;
      loadData();
    } else if (status !== "loading" && isLoading) {
      loadData();
    }
  }, [status, loadData, isLoading]);

  const createNote = useCallback(async (note: Partial<Note>) => {
    const newNote = await storage.createNote(note);
    setNotes((prev) => [newNote, ...prev]);
    return newNote;
  }, []);

  const updateNote = useCallback(async (id: string, data: Partial<Note>) => {
    const updatedNote = await storage.updateNote(id, data);
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? updatedNote : note))
    );
    return updatedNote;
  }, []);

  /**
   * CTO Implementation: Specialized Move Action
   * Ensures the SQLite bridge receives a valid folderId (string or null).
   */
  const moveNote = useCallback(
    async (noteId: string, folderId: string | null) => {
      const updatedNote = await storage.updateNote(noteId, { folderId });
      setNotes((prev) =>
        prev.map((note) => (note.id === noteId ? updatedNote : note))
      );
      return updatedNote;
    },
    []
  );

  const updateNoteLocally = useCallback((id: string, data: Partial<Note>) => {
    setNotes((prev) => {
      const updated = prev.map((note) => {
        if (note.id === id) {
          return { ...note, ...data, updatedAt: new Date() };
        }
        return note;
      });

      if (data.isPinned !== undefined) {
        return updated.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;

          if (a.isPinned && b.isPinned) {
            const aTime = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
            const bTime = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
            return bTime - aTime;
          }

          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        });
      }

      return updated;
    });
  }, []);

  const togglePin = useCallback(async (id: string) => {
    const updatedNote = await storage.togglePin(id);
    setNotes((prev) => {
      const updated = prev.map((note) => (note.id === id ? updatedNote : note));

      return updated.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;

        if (a.isPinned && b.isPinned) {
          const aTime = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
          const bTime = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
          return bTime - aTime;
        }

        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      });
    });
    return updatedNote;
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    await storage.deleteNote(id);
    setNotes((prev) => prev.filter((note) => note.id !== id));
  }, []);

  const createFolder = useCallback(async (folder: Partial<Folder>) => {
    const newFolder = await storage.createFolder(folder);
    setFolders((prev) => [newFolder, ...prev]);
    return newFolder;
  }, []);

  const updateFolder = useCallback(
    async (id: string, data: Partial<Folder>) => {
      const updatedFolder = await storage.updateFolder(id, data);
      setFolders((prev) =>
        prev.map((folder) => (folder.id === id ? updatedFolder : folder))
      );
      return updatedFolder;
    },
    []
  );

  const deleteFolder = useCallback(async (id: string) => {
    await storage.deleteFolder(id);
    setFolders((prev) => prev.filter((folder) => folder.id !== id));
    setNotes((prev) =>
      prev.map((note) =>
        note.folderId === id ? { ...note, folderId: null } : note
      )
    );
  }, []);

  const updateSettings = useCallback(
    async (newSettings: Partial<UserSettings>) => {
      const { syncStatus, ...persistentSettings } = newSettings;
      await storage.updateSettings(persistentSettings);
      setSettings((prev) => ({ ...prev, ...persistentSettings }));
    },
    []
  );

  /**
   * CTO Implementation: Strict Sync Status Bridge
   * Ensures the string literals match the SyncStatus type exactly.
   */
  const derivedSyncStatus = useMemo<SyncStatus>(() => {
    if (status === "loading") return "syncing" as SyncStatus;
    if (status === "authenticated") return "synced" as SyncStatus;
    return "offline" as SyncStatus;
  }, [status]);

  return {
    notes,
    folders,
    settings: { ...settings, syncStatus: derivedSyncStatus },
    isLoading,
    createNote,
    updateNote,
    moveNote, // 👈 Exported for V2Layout
    updateNoteLocally,
    togglePin,
    deleteNote,
    createFolder,
    updateFolder,
    deleteFolder,
    updateSettings,
    refresh: loadData,
  };
}
