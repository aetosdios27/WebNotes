// src/hooks/useStorage.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
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
    syncStatus: 'unsynced',
  });
  const [isLoading, setIsLoading] = useState(true);
  
  const { data: session, status } = useSession();

  // Load data from storage
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
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

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh auth status when session changes
  useEffect(() => {
    if (status !== 'loading') {
      storage.refreshAuth().then(() => {
        loadData(); // Reload data after auth change
      });
    }
  }, [session, status, loadData]);

  // Note operations
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

  // Folder operations
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
    // Also update notes that were in this folder
    setNotes(prev => prev.map(note => 
      note.folderId === id ? { ...note, folderId: null } : note
    ));
  }, []);

  // Settings operations
  const updateSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
    await storage.updateSettings(newSettings);
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Determine sync status based on session
  useEffect(() => {
    if (session?.user) {
      updateSettings({ syncStatus: 'synced' });
    } else {
      updateSettings({ syncStatus: 'unsynced' });
    }
  }, [session, updateSettings]);

  return {
    notes,
    folders,
    settings,
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