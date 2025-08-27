'use client';
import { useEffect, useState, useCallback } from 'react';
import { useDebounce } from 'use-debounce';
import type { Note } from '@/types';

interface NoteEditorProps {
  activeNote: Note | undefined;
}

export default function NoteEditor({ activeNote }: NoteEditorProps) {
  const [text, setText] = useState<string>('');
  const [debouncedText] = useDebounce(text, 500);

  useEffect(() => {
    if (activeNote) {
      setText(activeNote.content);
    } else {
      setText('');
    }
  }, [activeNote]);

  const saveNote = useCallback(async (content: string) => {
    if (!activeNote) return;

    await fetch(`/api/notes/${activeNote.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
  }, [activeNote]);

  useEffect(() => {
    if (activeNote && debouncedText !== activeNote.content) {
      saveNote(debouncedText);
    }
  }, [debouncedText, activeNote, saveNote]);

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
        value={text}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
        className="w-full h-full text-lg resize-none focus:outline-none bg-transparent text-zinc-100"
        placeholder="Start writing..."
      />
    </div>
  );
}