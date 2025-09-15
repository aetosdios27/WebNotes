// src/hooks/useStorage.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { storage } from '@/lib/storage';
import type { Note, Folder, UserSettings } from '@/lib/storage/types';
import { useSession } from 'next-auth/react';

export function useStorage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'dark',
    fontSize: 'medium',
    showLineNumbers: false,
    syncStatus: 'syncing', // Start with syncing
  });
  const [isLoading, setIsLoading] = useState(true);
  
  const { data: session, status } = useSession();
  const lastStatus = useRef(status);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Refresh auth state inside the adapter BEFORE loading data
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
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // THE FIX: This is the ONLY data loading effect.
  // It waits for the session to be resolved, then loads data ONCE.
  // It will re-run ONLY if the user logs in or logs out.
  useEffect(() => {
    // We only want to trigger a full reload when the auth status *changes*.
    if (status !== 'loading' && status !== lastStatus.current) {
      console.log(`Auth status changed to: ${status}. Reloading all data.`);
      lastStatus.current = status;
      loadData();
    } else if (status !== 'loading' && isLoading) {
      // This handles the very first initial load of the app.
      console.log("Initial load, session resolved. Loading data.");
      loadData();
    }
  }, [status, loadData, isLoading]);


  // --- All the action functions below are now much simpler ---

  const createNote = useCallback(async (note: Partial<Note>) => {
    const newNote = await storage.createNote(note);
    setNotes(prev => [newNote, ...prev]);
    return newNote;
  }, []);

  const updateNote = useCallback(async (id: string, data: Partial<Note>) => {
    const updatedNote = await storage.updateNote(id, data);
    setNotes(prev => prev.map(note => note.id === id ? updatedNote : note));
    return updatedNote;
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    await storage.deleteNote(id);
    setNotes(prev => prev.filter(note => note.id !== id));
  }, []);

  const createFolder = useCallback(async (folder: Partial<Folder>) => {
    const newFolder = await storage.createFolder(folder);
    setFolders(prev => [newFolder, ...prev]);
    return newFolder;
  }, []);

  const updateFolder = useCallback(async (id: string, data: Partial<Folder>) => {
    const updatedFolder = await storage.updateFolder(id, data);
    setFolders(prev => prev.map(folder => folder.id === id ? updatedFolder : folder));
    return updatedFolder;
  }, []);

  const deleteFolder = useCallback(async (id: string) => {
    await storage.deleteFolder(id);
    setFolders(prev => prev.filter(folder => folder.id !== id));
    setNotes(prev => prev.map(note => 
      note.folderId === id ? { ...note, folderId: null } : note
    ));
  }, []);
  
  const updateSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
    const { syncStatus, ...persistentSettings } = newSettings;
    await storage.updateSettings(persistentSettings);
    setSettings(prev => ({ ...prev, ...persistentSettings }));
  }, []);

  const derivedSyncStatus: UserSettings['syncStatus'] = 
    status === 'loading' ? 'syncing' :
    status === 'authenticated' ? 'synced' : 'unsynced';

  return {
    notes,
    folders,
    settings: { ...settings, syncStatus: derivedSyncStatus },
    isLoading,
    createNote,
    updateNote,
    deleteNote,
    createFolder,
    updateFolder,
    deleteFolder,
    updateSettings,
    refresh: loadData,
  };
}