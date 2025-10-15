// src/app/components/NoteEditor.tsx
'use client';

import type { Note } from '@/lib/storage/types';
import { useDebouncedCallback } from 'use-debounce';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Toolbar } from './Toolbar';
import { useEffect, useRef, useState } from 'react';

interface NoteEditorProps {
  activeNote: Note | undefined;
  onNoteUpdate: (note: Note) => void;
  onSavingStatusChange: (isSaving: boolean) => void;
}

export default function NoteEditor({ activeNote, onNoteUpdate, onSavingStatusChange }: NoteEditorProps) {
  const [title, setTitle] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeNote) {
      setTitle(activeNote.title || '');
      if (!activeNote.title && !activeNote.content && titleInputRef.current) {
        setTimeout(() => titleInputRef.current?.focus(), 100);
      }
    }
  }, [activeNote?.id]);

  const debouncedSave = useDebouncedCallback(
    async (noteId: string, newTitle: string, htmlContent: string) => {
      if (!noteId) return;

      onSavingStatusChange(true);
      
      try {
        const finalTitle = newTitle.trim() || htmlContent.substring(0, 50).split('\n')[0] || 'Untitled';
        const updatedNote = { ...activeNote!, title: finalTitle, content: htmlContent, updatedAt: new Date() };
        await onNoteUpdate(updatedNote);
      } catch (error) {
        console.error('Failed to save note:', error);
      } finally {
        onSavingStatusChange(false);
      }
    },
    1500
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (activeNote && editor) {
      debouncedSave(activeNote.id, newTitle, editor.getHTML());
    }
  };

  const editor = useEditor(
    {
      extensions: [StarterKit],
      content: activeNote?.content ?? '',
      editorProps: {
        attributes: {
          class: 'prose prose-invert prose-lg focus:outline-none max-w-none break-words',
        },
      },
      onUpdate: ({ editor }) => {
        if (!activeNote?.id) return;
        debouncedSave(activeNote.id, title, editor.getHTML());
      },
      immediatelyRender: false,
    },
    [activeNote?.id]
  );

  useEffect(() => {
    if (editor && activeNote && editor.getHTML() !== (activeNote.content || '')) {
      editor.commands.setContent(activeNote.content || '', { emitUpdate: false });
    }
  }, [activeNote?.id, activeNote?.content, editor]);

  if (!activeNote) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-black text-zinc-700">
        <p>Select a note to get started, or create a new one.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full bg-black">
      <div className="flex-1 overflow-y-auto px-12 pt-8">
        <div className="inline-block mb-6"> 
          {editor ? <Toolbar editor={editor} /> : <div className="h-10" />}
        </div>
        
        <input
          ref={titleInputRef}
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Untitled"
          className="w-full bg-transparent text-4xl font-bold text-white placeholder-zinc-600 focus:outline-none mb-8 leading-tight break-words"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              editor?.commands.focus();
            }
          }}
        />
        
        <div className="min-h-[500px] editor-wrapper">
          {editor ? (
            <EditorContent editor={editor} />
          ) : (
            <div className="h-40 rounded-md bg-zinc-800/40 animate-pulse" />
          )}
        </div>
      </div>
      
      <style jsx global>{`
        /* Text wrapping fix for Tiptap editor */
        .ProseMirror {
          word-wrap: break-word !important;
          word-break: break-word !important;
          overflow-wrap: break-word !important;
          white-space: pre-wrap !important;
          max-width: 100% !important;
        }
        
        .ProseMirror p {
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
        }
        
        .ProseMirror pre {
          white-space: pre-wrap !important;
          word-wrap: break-word !important;
        }
      `}</style>
    </div>
  );
}