'use client';

import { useState, useEffect, useCallback } from 'react';
import NoteList from './components/NoteList';
import NoteEditor from './components/NoteEditor';
import type { Note } from '@/types';

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    const res = await fetch('/api/notes', { cache: 'no-store' });
    if (!res.ok) return;

    const data = await res.json();
    const notesArray = data.rows || []; 
    setNotes(notesArray);

    if (notesArray.length > 0) {
      setActiveNoteId(notesArray[0].id);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const createNote = async () => {
    const res = await fetch('/api/notes', { method: 'POST' });
    if (res.ok) {
      const newNote: Note = await res.json();
      // Directly add the new note to the state
      setNotes(prevNotes => [newNote, ...prevNotes]);
      setActiveNoteId(newNote.id);
    }
  };

  const deleteNote = async (id: string) => {
    const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    if (res.ok) {
      // Directly remove the note from the state
      const newNotes = notes.filter((note: Note) => note.id !== id);
      setNotes(newNotes);

      if (activeNoteId === id) {
        setActiveNoteId(newNotes.length > 0 ? newNotes[0].id : null);
      }
    }
  };

  const handleNoteUpdate = (updatedNote: Note) => {
    setNotes(prevNotes => 
      prevNotes.map((note) => 
        note.id === updatedNote.id ? updatedNote : note
      ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    );
  };

  const activeNote = notes.find((note: Note) => note.id === activeNoteId);

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
        <NoteEditor activeNote={activeNote} onNoteUpdate={handleNoteUpdate} />
      </div>
    </main>
  );
}