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
    syncStatus: 'unsynced',
  });
  const [isLoading, setIsLoading] = useState(true);
  
  const { data: session, status } = useSession();
  const hasInitiallyLoaded = useRef(false);
  const lastSessionId = useRef<string | null>(null);
  const isLoadingRef = useRef(false);

  // Load data from storage
  const loadData = useCallback(async () => {
    // Prevent multiple simultaneous loads
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    
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
      isLoadingRef.current = false;
    }
  }, []); // No dependencies to prevent recreating

  // Initial load - only once
  useEffect(() => {
    if (!hasInitiallyLoaded.current) {
      hasInitiallyLoaded.current = true;
      loadData();
    }
  }, []); // Empty deps, only run once

  // Only refresh when session actually changes (login/logout)
  useEffect(() => {
    if (status === 'loading') return;
    
    const currentSessionId = session?.user?.id || null;
    
    // Only refresh if session actually changed
    if (lastSessionId.current !== null && lastSessionId.current !== currentSessionId) {
      console.log('Session changed, refreshing data...');
      storage.refreshAuth().then(() => {
        loadData();
      });
    }
    
    lastSessionId.current = currentSessionId;
  }, [session?.user?.id, status]); // Remove loadData from deps

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

  // Determine sync status based on session - memoize to prevent loops
  const syncStatus = session?.user ? 'synced' : 'unsynced';
  useEffect(() => {
    setSettings(prev => ({ ...prev, syncStatus }));
  }, [syncStatus]);

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