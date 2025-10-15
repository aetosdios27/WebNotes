// src/app/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Sidebar from '@/app/components/Sidebar';
import dynamic from 'next/dynamic';
import { NoteListSkeleton } from '@/app/components/NoteListSkeleton';
import { toast } from 'sonner';
import { useStorage } from '@/hooks/useStorage';
import type { Note, Folder } from '@/lib/storage/types';

export type FolderWithNotes = Omit<Folder, 'notes'> & { 
  notes: Note[] 
};

const NoteEditor = dynamic(() => import('@/app/components/NoteEditor'), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center h-full bg-black text-zinc-700">Loading Editor...</div>,
});

export default function Home() {
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const {
    notes,
    folders,
    settings,
    isLoading,
    createNote: storageCreateNote,
    updateNote: storageUpdateNote,
    updateNoteLocally,
    togglePin: storageTogglePin, // NEW: Get togglePin
    deleteNote: storageDeleteNote,
    createFolder: storageCreateFolder,
    refresh,
  } = useStorage();

  const foldersWithNotes = useMemo<FolderWithNotes[]>(() => {
    return folders.map(folder => ({
      ...folder,
      notes: notes.filter(note => note.folderId === folder.id)
        .sort((a, b) => {
          // Pinned notes first
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          
          // If both pinned, sort by pinnedAt
          if (a.isPinned && b.isPinned) {
            const aTime = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
            const bTime = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
            return bTime - aTime;
          }
          
          // Otherwise sort by updatedAt
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        })
    }));
  }, [folders, notes]);

  const createNote = useCallback(async (folderId?: string | null) => {
    try {
      const newNote = await storageCreateNote({ title: '', content: '', folderId });
      setActiveNoteId(newNote.id);
      toast.success('Note created');
    } catch (error) {
      toast.error('Failed to create note');
    }
  }, [storageCreateNote]);

  const deleteNote = useCallback(async (id: string) => {
    try {
      if (activeNoteId === id) setActiveNoteId(null);
      await storageDeleteNote(id);
      toast.success('Note deleted');
    } catch (error) {
      toast.error('Failed to delete note');
    }
  }, [storageDeleteNote, activeNoteId]);

  const moveNote = useCallback(async (noteId: string, folderId: string | null) => {
    try {
      await storageUpdateNote(noteId, { folderId });
      toast.success('Note moved');
    } catch (error) {
      toast.error('Failed to move note');
    }
  }, [storageUpdateNote]);

  const createFolder = useCallback(async () => {
    const folderName = prompt('Enter folder name:');
    if (folderName) {
      try {
        await storageCreateFolder({ name: folderName });
        toast.success('Folder created');
      } catch (error) {
        toast.error('Failed to create folder');
      }
    }
  }, [storageCreateFolder]);

  const handleNoteUpdate = useCallback(async (updatedNote: Note) => {
    try {
      await storageUpdateNote(updatedNote.id, {
        title: updatedNote.title,
        content: updatedNote.content,
      });
    } catch (error) {
      toast.error('Failed to update note');
    }
  }, [storageUpdateNote]);

  // NEW: Toggle pin handler
  const togglePin = useCallback(async (noteId: string) => {
    try {
      await storageTogglePin(noteId);
    } catch (error) {
      console.error('Failed to toggle pin:', error);
      throw error; // Re-throw so NoteList can handle rollback
    }
  }, [storageTogglePin]);

  const activeNote = notes.find(n => n.id === activeNoteId);

  const combinedStatus = useMemo(() => {
    if (isSaving) return 'syncing';
    return settings.syncStatus;
  }, [isSaving, settings.syncStatus]);

  return (
    <main className="flex w-screen h-screen">
      {isLoading ? (
        <div className="w-80 h-full bg-zinc-900 border-r border-zinc-800">
          <NoteListSkeleton />
        </div>
      ) : (
        <Sidebar
          notes={notes}
          folders={foldersWithNotes}
          activeNoteId={activeNoteId}
          setActiveNoteId={setActiveNoteId}
          createNote={createNote}
          deleteNote={deleteNote}
          moveNote={moveNote}
          createFolder={createFolder}
          onDataChange={refresh}
          updateNoteLocally={updateNoteLocally}
          togglePin={togglePin} // NEW: Pass togglePin
          syncStatus={combinedStatus}
        />
      )}
      <div className="flex-1 h-full">
        <NoteEditor 
          activeNote={activeNote} 
          onNoteUpdate={handleNoteUpdate} 
          onSavingStatusChange={setIsSaving}
        />
      </div>
    </main>
  );
}