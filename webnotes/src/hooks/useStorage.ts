// src/hooks/useStorage.ts
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { storage } from '@/lib/storage';
import type { Note, Folder, UserSettings, SyncStatus } from '@/lib/storage/types';
import { useSession } from 'next-auth/react';

export function useStorage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'dark',
    fontSize: 'medium',
    showLineNumbers: false,
    syncStatus: 'syncing',
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
      
      console.log('Loaded notes:', loadedNotes.length);
      console.log('Loaded folders:', loadedFolders.length);
      
      setNotes(loadedNotes);
      setFolders(loadedFolders);
      setSettings(loadedSettings);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== 'loading' && status !== lastStatus.current) {
      console.log(`Auth status changed to: ${status}. Reloading all data.`);
      lastStatus.current = status;
      loadData();
    } else if (status !== 'loading' && isLoading) {
      console.log("Initial load, session resolved. Loading data.");
      loadData();
    }
  }, [status, loadData, isLoading]);

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

  // FIXED: Simplified - no sorting for simple updates
  const updateNoteLocally = useCallback((id: string, data: Partial<Note>) => {
    setNotes(prev => {
      const updated = prev.map(note => {
        if (note.id === id) {
          return { ...note, ...data, updatedAt: new Date() };
        }
        return note;
      });
      
      // Only sort if we're updating pin status
      if (data.isPinned !== undefined) {
        return updated.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          
          if (a.isPinned && b.isPinned) {
            const aTime = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
            const bTime = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
            return bTime - aTime;
          }
          
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
      }
      
      return updated;
    });
  }, []);

  const togglePin = useCallback(async (id: string) => {
    const updatedNote = await storage.togglePin(id);
    setNotes(prev => {
      const updated = prev.map(note => note.id === id ? updatedNote : note);
      
      // Re-sort to move pinned notes to top
      return updated.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        
        if (a.isPinned && b.isPinned) {
          const aTime = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
          const bTime = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
          return bTime - aTime;
        }
        
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    });
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

  const derivedSyncStatus = useMemo<SyncStatus>(() => {
    if (status === 'loading') return 'syncing';
    if (status === 'authenticated') return 'synced';
    return 'unsynced';
  }, [status]);

  return {
    notes,
    folders,
    settings: { ...settings, syncStatus: derivedSyncStatus },
    isLoading,
    createNote,
    updateNote,
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