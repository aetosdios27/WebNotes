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
      const [foldersRes, unfiledNotesRes] = await Promise.all([
        fetch('/api/folders'),
        fetch('/api/notes?folderId=null'),
      ]);
      if (!foldersRes.ok || !unfiledNotesRes.ok) throw new Error('Failed to fetch data');
      
      const { folders: foldersArray } = await foldersRes.json();
      const unfiledNotesArray = await unfiledNotesRes.json();
      
      const notesFromFolders = foldersArray.flatMap((f: FolderWithNotes) => f.notes);
      setNotes([...unfiledNotesArray, ...notesFromFolders]);
      setFolders(foldersArray);

      if (isLoading && (unfiledNotesArray.length > 0 || notesFromFolders.length > 0)) {
        setActiveNoteId(unfiledNotesArray[0]?.id || foldersArray[0]?.notes[0]?.id || null);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load data.");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handleDataChange = useCallback(() => { 
    fetchData(); 
  }, [fetchData]);

  const createNote = async (folderId?: string | null) => {
    const res = await fetch('/api/notes', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId }) 
    });
    if (res.ok) {
      const newNote: Note = await res.json();
      setNotes(prev => [newNote, ...prev]);
      setActiveNoteId(newNote.id);
      // Refetch in the background to get updated folder counts
      fetch('/api/folders').then(res => res.json()).then(data => setFolders(data.folders));
    } else {
      toast.error("Failed to create note.");
    }
  };

  

  const moveNote = async (noteId: string, folderId: string | null) => {
    const originalNotes = [...notes];
    const updatedNotes = notes.map(n => n.id === noteId ? { ...n, folderId } : n);
    setNotes(updatedNotes);
    try {
      const res = await fetch(`/api/notes/${noteId}/move`, { 
        method: 'PATCH', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({ folderId }) 
      });
      if (!res.ok) throw new Error();
      handleDataChange();
    } catch {
      setNotes(originalNotes);
      toast.error("Couldn't move note.");
    }
  };

  const createFolder = async () => {
  const res = await fetch('/api/folders', { 
    method: 'POST', 
    headers: {'Content-Type': 'application/json'}, 
    body: JSON.stringify({ name: 'New Folder' }) // Create with a default name
  });
    
    if (res.ok) {
      const { folder } = await res.json(); // Destructure the folder object
      handleDataChange();
      // Return the newly created folder object
      return folder;
    }
    return null;
  };

  const handleNoteUpdate = (updatedNote: Note) => {
    setNotes(prev => prev
      .map(n => n.id === updatedNote.id ? updatedNote : n)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    );
  };

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
          folders={folders}
          activeNoteId={activeNoteId}
          setActiveNoteId={setActiveNoteId}
          createNote={createNote}
          moveNote={moveNote}
          createFolder={createFolder}
          onDataChange={handleDataChange} // Added this line
        />
      )}
      <div className="flex-1 h-full">
        <NoteEditor activeNote={activeNote} onNoteUpdate={handleNoteUpdate} />
      </div>
    </main>
  );
}
