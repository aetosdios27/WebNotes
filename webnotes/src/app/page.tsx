// src/app/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Sidebar from '@/app/components/Sidebar';
import dynamic from 'next/dynamic';
import { NoteListSkeleton } from '@/app/components/NoteListSkeleton';
import { toast } from 'sonner';
import { useStorage } from '@/hooks/useStorage';
import type { Note, Folder } from '@/lib/storage/types'; // Import from storage types

// Updated FolderWithNotes type to match storage types
export type FolderWithNotes = Omit<Folder, 'notes'> & { 
  notes: Note[] 
};

const NoteEditor = dynamic(() => import('@/app/components/NoteEditor'), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center h-full bg-black text-zinc-700">Loading Editor...</div>,
});

export default function Home() {
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  
  // Use the new storage hook
  const {
    notes,
    folders,
    settings,
    isLoading,
    createNote: storageCreateNote,
    updateNote: storageUpdateNote,
    deleteNote: storageDeleteNote,
    createFolder: storageCreateFolder,
    deleteFolder: storageDeleteFolder,
    refresh,
  } = useStorage();

  // Transform folders to include their notes
  const foldersWithNotes = useMemo<FolderWithNotes[]>(() => {
    return folders.map(folder => ({
      ...folder,
      notes: notes.filter(note => note.folderId === folder.id)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    }));
  }, [folders, notes]);

  // Set initial active note
  useEffect(() => {
    if (!activeNoteId && notes.length > 0) {
      const unfiledNotes = notes.filter(n => !n.folderId);
      setActiveNoteId(unfiledNotes[0]?.id || notes[0]?.id || null);
    }
  }, [notes, activeNoteId]);

  const createNote = useCallback(async (folderId?: string | null) => {
    try {
      const newNote = await storageCreateNote({
        title: 'New Note',
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
      await storageDeleteNote(id);
      
      // Update active note if we deleted the current one
      if (activeNoteId === id) {
        const remainingNotes = notes.filter(n => n.id !== id);
        setActiveNoteId(remainingNotes.length > 0 ? remainingNotes[0].id : null);
      }
      
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