'use client';

import { useState, useEffect, useCallback } from 'react'; // Import useCallback
import NoteList from './components/NoteList';
import NoteEditor from './components/NoteEditor';
import type { Note } from '@/types';

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  // Wrap fetchNotes in useCallback
  const fetchNotes = useCallback(async () => {
    const res = await fetch('/api/notes');
    const data: Note[] = await res.json();
    setNotes(data);
    if (data.length > 0 && !activeNoteId) {
      setActiveNoteId(data[0].id);
    }
  }, [activeNoteId]); // Add activeNoteId as a dependency

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]); // Add fetchNotes to the dependency array

  const createNote = async () => {
    const res = await fetch('/api/notes', { method: 'POST' });
    const newNote: Note = await res.json();
    await fetchNotes();
    setActiveNoteId(newNote.id);
  };

  const deleteNote = async (id: string) => {
    await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    const newNotes = notes.filter(note => note.id !== id);
    setNotes(newNotes);

    if (activeNoteId === id) {
      setActiveNoteId(newNotes.length > 0 ? newNotes[0].id : null);
    }
  };

  const activeNote = notes.find((note) => note.id === activeNoteId);

  return (
    <main className="flex w-screen h-screen">
      <div className="w-1/4 h-full flex flex-col bg-zinc-900 border-r border-zinc-800">
        <div className="p-4 flex justify-between items-center border-b border-zinc-800 flex-shrink-0">
          <h1 className="text-xl font-bold text-zinc-200">WebNotes</h1>
          <button 
            onClick={createNote} 
            className="px-3 py-1 bg-yellow-400 text-zinc-800 font-semibold rounded-lg hover:bg-yellow-500 transition-colors"
          >
            + New
          </button>
        </div>
        <NoteList 
          notes={notes} 
          activeNoteId={activeNoteId} 
          setActiveNoteId={setActiveNoteId}
          deleteNote={deleteNote}
        />
      </div>
      <div className="flex-1 h-full">
        <NoteEditor activeNote={activeNote} />
      </div>
    </main>
  );
}