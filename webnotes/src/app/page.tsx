// src/app/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/app/components/Sidebar';
import dynamic from 'next/dynamic';
import type { Note, Folder } from '@prisma/client';
import { NoteListSkeleton } from '@/app/components/NoteListSkeleton';
import { toast } from 'sonner';

export type FolderWithNotes = Folder & { notes: Note[] };

const NoteEditor = dynamic(() => import('@/app/components/NoteEditor'), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center h-full bg-black text-zinc-700">Loading Editor...</div>,
});

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<FolderWithNotes[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [unfiledNotesRes, foldersRes] = await Promise.all([
        fetch('/api/notes?folderId=null'),
        fetch('/api/folders'),
      ]);
      if (!unfiledNotesRes.ok || !foldersRes.ok) throw new Error('Failed to fetch data');
      
      const unfiledNotesArray: Note[] = await unfiledNotesRes.json();
      const { folders: foldersArray }: { folders: FolderWithNotes[] } = await foldersRes.json();
      
      const notesFromFolders = foldersArray.flatMap(folder => folder.notes);
      const allNotes = [...unfiledNotesArray, ...notesFromFolders];

      setFolders(foldersArray);
      setNotes(allNotes);

      if (isLoading && allNotes.length > 0 && activeNoteId === null) {
        setActiveNoteId(allNotes.find(n => !n.folderId)?.id || allNotes[0].id);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load data. Please refresh.");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, activeNoteId]);

  useEffect(() => {
    fetchData();
  }, []);

  // Optimistic create note
  const createNote = useCallback(async (folderId?: string) => {
    // Create temporary note with a temporary ID
    const tempId = `temp-${Date.now()}`;
    const tempNote: Note = {
      id: tempId,
      title: 'New Note',
      content: '',
      userId: 'temp',
      folderId: folderId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Immediately update UI
    setNotes(prev => [tempNote, ...prev]);
    if (folderId) {
      setFolders(prev => prev.map(folder => 
        folder.id === folderId 
          ? { ...folder, notes: [tempNote, ...folder.notes] }
          : folder
      ));
    }
    setActiveNoteId(tempId);

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      });
      
      if (res.ok) {
        const newNote: Note = await res.json();
        
        // Replace temp note with real note
        setNotes(prev => prev.map(n => n.id === tempId ? newNote : n));
        if (folderId) {
          setFolders(prev => prev.map(folder => 
            folder.id === folderId 
              ? { ...folder, notes: folder.notes.map(n => n.id === tempId ? newNote : n) }
              : folder
          ));
        }
        setActiveNoteId(newNote.id);
      } else {
        throw new Error('Failed to create note');
      }
    } catch (error) {
      // Rollback on error
      setNotes(prev => prev.filter(n => n.id !== tempId));
      if (folderId) {
        setFolders(prev => prev.map(folder => 
          folder.id === folderId 
            ? { ...folder, notes: folder.notes.filter(n => n.id !== tempId) }
            : folder
        ));
      }
      toast.error('Failed to create note');
    }
  }, []);

  // Optimistic delete note
  const deleteNote = useCallback(async (id: string) => {
    // Find the note to delete
    const noteToDelete = notes.find(n => n.id === id);
    if (!noteToDelete) return;

    // Immediately remove from UI
    setNotes(prev => prev.filter(n => n.id !== id));
    if (noteToDelete.folderId) {
      setFolders(prev => prev.map(folder => 
        folder.id === noteToDelete.folderId 
          ? { ...folder, notes: folder.notes.filter(n => n.id !== id) }
          : folder
      ));
    }

    // Update active note if needed
    if (activeNoteId === id) {
      const remainingNotes = notes.filter(n => n.id !== id);
      setActiveNoteId(remainingNotes.length > 0 ? remainingNotes[0].id : null);
    }

    try {
      const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
    } catch (error) {
      // Rollback on error
      setNotes(prev => [...prev, noteToDelete].sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ));
      if (noteToDelete.folderId) {
        setFolders(prev => prev.map(folder => 
          folder.id === noteToDelete.folderId 
            ? { ...folder, notes: [...folder.notes, noteToDelete].sort((a, b) => 
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
              )}
            : folder
        ));
      }
      toast.error('Failed to delete note');
    }
  }, [notes, activeNoteId]);

  // Optimistic move note
  const moveNote = useCallback(async (noteId: string, targetFolderId: string | null) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const oldFolderId = note.folderId;
    if (oldFolderId === targetFolderId) return; // No change needed

    // Immediately update UI
    const updatedNote = { ...note, folderId: targetFolderId };
    setNotes(prev => prev.map(n => n.id === noteId ? updatedNote : n));

    // Update folders
    setFolders(prev => prev.map(folder => {
      if (folder.id === oldFolderId) {
        // Remove from old folder
        return { ...folder, notes: folder.notes.filter(n => n.id !== noteId) };
      } else if (folder.id === targetFolderId) {
        // Add to new folder
        return { ...folder, notes: [updatedNote, ...folder.notes] };
      }
      return folder;
    }));

    try {
      const res = await fetch(`/api/notes/${noteId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: targetFolderId }),
      });
      
      if (!res.ok) throw new Error('Failed to move');
    } catch (error) {
      // Rollback on error
      setNotes(prev => prev.map(n => n.id === noteId ? note : n));
      setFolders(prev => prev.map(folder => {
        if (folder.id === oldFolderId) {
          return { ...folder, notes: [...folder.notes, note] };
        } else if (folder.id === targetFolderId) {
          return { ...folder, notes: folder.notes.filter(n => n.id !== noteId) };
        }
        return folder;
      }));
      toast.error('Failed to move note');
    }
  }, [notes]);

  // Handle note content updates from editor
  const handleNoteUpdate = useCallback((updatedNote: Note) => {
    setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
    
    // Also update in folders if it's in one
    if (updatedNote.folderId) {
      setFolders(prev => prev.map(folder => 
        folder.id === updatedNote.folderId
          ? { ...folder, notes: folder.notes.map(n => n.id === updatedNote.id ? updatedNote : n) }
          : folder
      ));
    }
  }, []);

  const activeNote = notes.find((note) => note.id === activeNoteId);

  return (
    <main className="flex w-screen h-screen">
      {isLoading ? (
        <div className="w-80 h-full bg-zinc-900 border-r border-zinc-800">
          <NoteListSkeleton />
        </div>
      ) : (
        <Sidebar
          notes={notes}
          folders={folders}
          activeNoteId={activeNoteId}
          setActiveNoteId={setActiveNoteId}
          createNote={createNote}
          deleteNote={deleteNote}
          moveNote={moveNote}
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