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
  
  const {
    notes,
    folders,
    settings,
    isLoading,
    createNote: storageCreateNote,
    updateNote: storageUpdateNote,
    deleteNote: storageDeleteNote,
    createFolder: storageCreateFolder,
    refresh,
  } = useStorage();

  const foldersWithNotes = useMemo<FolderWithNotes[]>(() => {
    return folders.map(folder => ({
      ...folder,
      notes: notes.filter(note => note.folderId === folder.id)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    }));
  }, [folders, notes]);

  // THE FIX: The useEffect that auto-selected a note has been REMOVED.
  // The app will now start with activeNoteId as null.

  const createNote = useCallback(async (folderId?: string | null) => {
    try {
      const newNote = await storageCreateNote({
        title: '', // Start with an empty title to force user input
        content: '',
        folderId: folderId || null,
      });
      setActiveNoteId(newNote.id);
      toast.success('Note created');
    } catch (error) {
      toast.error('Failed to create note');
    }
  }, [storageCreateNote]);

  const deleteNote = useCallback(async (id: string) => {
    try {
      if (activeNoteId === id) {
        setActiveNoteId(null);
      }
      await storageDeleteNote(id);
      toast.success('Note deleted');
    } catch (error) {
      toast.error('Failed to delete note');
    }
  }, [storageDeleteNote, activeNoteId, notes]);

  const moveNote = useCallback(async (noteId: string, folderId: string | null) => {
    try {
      await storageUpdateNote(noteId, { folderId });
      toast.success('Note moved');
    } catch (error) {
      toast.error('Failed to move note');
    }
  }, [storageUpdateNote]);

  const createFolder = useCallback(async () => {
    // This should be updated to a custom dialog later
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

  const activeNote = notes.find(n => n.id === activeNoteId);

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
          syncStatus={settings.syncStatus}
        />
      )}
      <div className="flex-1 h-full">
        <NoteEditor 
          activeNote={activeNote} 
          onNoteUpdate={handleNoteUpdate} 
        />
      </div>
    </main>
  );
}