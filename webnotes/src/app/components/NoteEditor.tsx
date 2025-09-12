// src/app/components/NoteEditor.tsx
'use client';

import type { Note } from '@/lib/storage/types'; // Updated import
import { useDebouncedCallback } from 'use-debounce';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Toolbar } from './Toolbar';
import { useState, useEffect } from 'react';

interface NoteEditorProps {
  activeNote: Note | undefined;
  onNoteUpdate: (note: Note) => void;
}

export default function NoteEditor({ activeNote, onNoteUpdate }: NoteEditorProps) {
  const [isSaving, setIsSaving] = useState(false);

  const debouncedSave = useDebouncedCallback(
    async (noteId: string, htmlContent: string, textContent: string) => {
      if (!noteId) return;

      setIsSaving(true);
      
      try {
        // Update note through parent callback
        const updatedNote = await onNoteUpdate({
          ...activeNote!,
          content: htmlContent,
          title: textContent.split('\n')[0].trim() || 'Untitled',
          updatedAt: new Date()
        });
      } catch (error) {
        console.error('Failed to save note:', error);
      } finally {
        setIsSaving(false);
      }
    },
    1000
  );

  const editor = useEditor(
    {
      extensions: [StarterKit],
      content: activeNote?.content ?? '',
      editorProps: {
        attributes: {
          class: 'prose prose-invert prose-lg focus:outline-none max-w-none',
        },
      },
      onUpdate: ({ editor }) => {
        if (!activeNote?.id) return;
        debouncedSave(activeNote.id, editor.getHTML(), editor.getText());
      },
      immediatelyRender: false,
    },
    [activeNote?.id]
  );

  // Show saving indicator
  useEffect(() => {
    if (editor && isSaving) {
      editor.setEditable(false);
      setTimeout(() => {
        if (editor) {
          editor.setEditable(true);
        }
      }, 500);
    }
  }, [isSaving, editor]);

  if (!activeNote) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-black text-zinc-700">
        Select a note to view or create a new one.
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full p-8 bg-black">
      <div className="pb-4 self-start">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white truncate max-w-md">
            {activeNote.title || 'Untitled Note'}
          </h1>
          {isSaving && (
            <div className="flex items-center gap-2 text-yellow-500">
              <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
              <span className="text-sm">Saving...</span>
            </div>
          )}
        </div>
        {editor ? <Toolbar editor={editor} /> : <div className="h-8" />}
      </div>
      <div className="flex-1 h-full overflow-y-auto">
        {editor ? (
          <EditorContent editor={editor} />
        ) : (
          <div className="h-40 rounded-md bg-zinc-800/40 animate-pulse" />
        )}
      </div>
    </div>
  );
}