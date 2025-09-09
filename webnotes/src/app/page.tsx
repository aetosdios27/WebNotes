// src/app/page.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import dynamic from 'next/dynamic';
import type { Note, Folder } from '@prisma/client';
import { NoteListSkeleton } from './components/NoteListSkeleton';
import { toast } from 'sonner';

// Define a new type for a Folder that includes its notes
export type FolderWithNotes = Folder & { notes: Note[] };

const NoteEditor = dynamic(() => import('./components/NoteEditor'), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center h-full bg-black text-zinc-700">Loading Editor...</div>,
});

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [unfiledNotes, setUnfiledNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<FolderWithNotes[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [unfiledNotesRes, foldersRes] = await Promise.all([
        fetch('/api/notes?folderId=null'), // Fetch only unfiled notes
        fetch('/api/folders'),             // Fetch folders with their notes included
      ]);
      if (!unfiledNotesRes.ok || !foldersRes.ok) throw new Error('Failed to fetch data');
      
      const unfiledNotesArray: Note[] = await unfiledNotesRes.json();
      const { folders: foldersArray } = await foldersRes.json();
      
      setUnfiledNotes(unfiledNotesArray);
      setFolders(foldersArray);

      if (unfiledNotesArray.length > 0 && activeNoteId === null) {
        setActiveNoteId(unfiledNotesArray[0].id);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load data. Please refresh.");
    } finally {
      setIsLoading(false);
    }
  }, [activeNoteId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Optimistic updates no longer require complex local state management.
  // We just refetch the source of truth from the server.
  const handleDataChange = () => {
    fetchData();
  };

  const activeNote = [...unfiledNotes, ...folders.flatMap(f => f.notes)].find(
    (note) => note.id === activeNoteId
  );

  return (
    <main className="flex w-screen h-screen">
      {isLoading ? (
        <div className="w-80 h-full bg-zinc-900 border-r border-zinc-800">
          <NoteListSkeleton />
        </div>
      ) : (
        <Sidebar
          unfiledNotes={unfiledNotes}
          folders={folders}
          activeNoteId={activeNoteId}
          setActiveNoteId={setActiveNoteId}
          onDataChange={handleDataChange} // Pass a single function for all mutations
        />
      )}
      <div className="flex-1 h-full">
        <NoteEditor 
          activeNote={activeNote} 
          onNoteUpdate={(updatedNote) => {
            // No need for a separate handler, just refetch for consistency
            handleDataChange();
          }} 
        />
      </div>
    </main>
  );
}