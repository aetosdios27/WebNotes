'use client';
import { useEffect, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce'; // Import useDebouncedCallback
import type { Note } from '@/types';

interface NoteEditorProps {
  activeNote: Note | undefined;
  onNoteUpdate: (note: Note) => void;
}

export default function NoteEditor({ activeNote, onNoteUpdate }: NoteEditorProps) {
  const [text, setText] = useState<string>('');

  // Use useDebouncedCallback for more control
  const debouncedSave = useDebouncedCallback(async (content: string) => {
    if (!activeNote) return;

    const res = await fetch(`/api/notes/${activeNote.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    if (res.ok) {
      const updatedNote: Note = await res.json();
      onNoteUpdate(updatedNote);
    }
  }, 1000); // 1 second debounce

  useEffect(() => {
    if (activeNote) {
      // When the active note changes, cancel any pending saves
      // from the previous note and set the new text.
      debouncedSave.cancel();
      setText(activeNote.content);
    } else {
      setText('');
    }
  }, [activeNote, debouncedSave]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    debouncedSave(e.target.value);
  };
  
  if (!activeNote) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-black text-zinc-700">
        Select a note to view or create a new one.
      </div>
    );
  }

  return (
    <div className="flex-1 h-full p-8 bg-black">
      <textarea
        key={activeNote.id}
        value={text}
        onChange={handleTextChange} // Use the new handler
        className="w-full h-full text-lg resize-none focus:outline-none bg-transparent text-zinc-100"
        placeholder="Start writing..."
      />
    </div>
  );
}