'use client';

import type { Note } from '@/lib/storage/types';
import { useDebouncedCallback } from 'use-debounce';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import { SlashCommand } from './SlashCommandExtension';
import { slashCommandSuggestion } from './SlashCommands';
import { Toolbar } from './Toolbar';
import NoteSettings from './NoteSettings';
import { MathInline, MathBlock } from './extensions/math';
import { CodeBlock } from './extensions/CodeBlock'; // 1. Import Custom CodeBlock
import { useEffect, useRef, useState, useCallback } from 'react';
import { TableOfContents } from './TableOfContents';

interface NoteEditorProps {
  activeNote: Note | undefined;
  onNoteUpdate: (note: Note) => void;
  onSavingStatusChange: (isSaving: boolean) => void;
  onDeleteNote?: (noteId: string) => void;
}

export default function NoteEditor({ 
  activeNote, 
  onNoteUpdate, 
  onSavingStatusChange,
  onDeleteNote 
}: NoteEditorProps) {
  const [title, setTitle] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const lastNoteIdRef = useRef<string | null>(null);

  // Track note changes
  useEffect(() => {
    if (activeNote) {
      setTitle(activeNote.title || '');
      
      // Focus title input for new empty notes
      if (!activeNote.title && !activeNote.content && titleInputRef.current) {
        setTimeout(() => titleInputRef.current?.focus(), 100);
      }
    }
  }, [activeNote?.id]);

  // Helper to get markdown from editor
  const getMarkdown = useCallback((editorInstance: any) => {
    if (!editorInstance) return '';
    return editorInstance.storage.markdown?.getMarkdown() || editorInstance.getHTML();
  }, []);

  // Debounced save function
  const debouncedSave = useDebouncedCallback(
    async (noteId: string, newTitle: string, markdownContent: string) => {
      if (!noteId) return;

      onSavingStatusChange(true);
      
      try {
        const finalTitle = newTitle.trim() || markdownContent.substring(0, 50).split('\n')[0] || 'Untitled';
        const updatedNote = { 
          ...activeNote!, 
          title: finalTitle, 
          content: markdownContent, 
          updatedAt: new Date() 
        };
        await onNoteUpdate(updatedNote);
      } catch (error) {
        console.error('Failed to save note:', error);
      } finally {
        onSavingStatusChange(false);
      }
    },
    1500
  );

  // Handle title changes
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (activeNote && editor) {
      debouncedSave(activeNote.id, newTitle, getMarkdown(editor));
    }
  }, [activeNote, debouncedSave, getMarkdown]);

  // Handle delete
  const handleDelete = useCallback(() => {
    if (activeNote && onDeleteNote) {
      onDeleteNote(activeNote.id);
    }
  }, [activeNote, onDeleteNote]);

  // Initialize editor
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3, 4, 5, 6],
          },
          // 2. DISABLE default code block so we can use our custom one
          codeBlock: false,
          code: {
            HTMLAttributes: {
              class: 'bg-zinc-800 text-yellow-400 px-1 py-0.5 rounded text-sm',
            },
          },
          blockquote: {
            HTMLAttributes: {
              class: 'border-l-4 border-yellow-500 pl-4 italic text-zinc-400',
            },
          },
        }),
        Typography,
        Placeholder.configure({
          placeholder: 'Type / for commands, or start writing with markdown...',
        }),
        Markdown.configure({
          html: true,
          transformPastedText: true,
          transformCopiedText: true,
        }),
        SlashCommand.configure({
          suggestion: slashCommandSuggestion,
        }),
        MathInline,
        MathBlock,
        // 3. ADD Custom CodeBlock
        CodeBlock,
      ],
      content: activeNote?.content ?? '',
      editorProps: {
        attributes: {
          class: 'prose prose-invert prose-lg focus:outline-none max-w-none break-words',
        },
      },
      onUpdate: ({ editor: editorInstance }) => {
        if (!activeNote?.id) return;
        const markdown = getMarkdown(editorInstance);
        debouncedSave(activeNote.id, title, markdown);
      },
      immediatelyRender: false,
    },
    [activeNote?.id]
  );

  // Sync content when note changes - fixed for React 19
  useEffect(() => {
    if (!editor || !activeNote) return;
    
    // Only update if we're switching to a different note
    if (lastNoteIdRef.current === activeNote.id) return;
    lastNoteIdRef.current = activeNote.id;

    // Use queueMicrotask to escape React's render cycle
    queueMicrotask(() => {
      if (editor.isDestroyed) return;
      
      const currentContent = getMarkdown(editor);
      const newContent = activeNote.content || '';
      
      if (currentContent !== newContent) {
        editor.commands.setContent(newContent, { emitUpdate: false });
      }
    });
  }, [activeNote?.id, activeNote?.content, editor, getMarkdown]);

  // Handle title Enter key
  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      editor?.commands.focus();
    }
  }, [editor]);

  // Empty state
  if (!activeNote) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-black text-zinc-700">
        <p>Select a note to get started, or create a new one.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full bg-black relative">
      {/* Settings button - positioned absolute top-right */}
      <div className="absolute top-8 right-12 z-10 hidden md:block">
        <NoteSettings 
          note={activeNote} 
          onDelete={handleDelete}
        />
      </div>

      {/* Floating Minimap / TOC */}
      <TableOfContents editor={editor} />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-12 pt-4 md:pt-8 editor-scroll-container relative">
        
        {/* Container for centering */}
        <div className="max-w-4xl mx-auto pr-16">
          
          {/* Toolbar */}
          <div className="inline-block mb-4 md:mb-6"> 
            {editor ? <Toolbar editor={editor} /> : <div className="h-10" />}
          </div>
          
          {/* Title input */}
          <input
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={handleTitleChange}
            onKeyDown={handleTitleKeyDown}
            placeholder="Untitled"
            className="w-full bg-transparent text-3xl md:text-4xl font-bold text-white placeholder-zinc-600 focus:outline-none mb-6 md:mb-8 leading-tight break-words"
          />
          
          {/* Editor content */}
          <div className="min-h-[500px] editor-wrapper pb-32">
            {editor ? (
              <EditorContent editor={editor} />
            ) : (
              <div className="h-40 rounded-md bg-zinc-800/40 animate-pulse" />
            )}
          </div>
        </div>
      </div>
      
      {/* Global editor styles */}
      <style jsx global>{`
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

        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #52525b;
          pointer-events: none;
          height: 0;
        }

        /* Important for Scroll Spy accuracy: offset headings when scrolling to them */
        .ProseMirror h1, .ProseMirror h2, .ProseMirror h3 {
          scroll-margin-top: 100px;
        }

        .ProseMirror h1 {
          font-size: 2.25em;
          font-weight: 700;
          margin-top: 0.5em;
          margin-bottom: 0.5em;
          line-height: 1.2;
        }

        .ProseMirror h2 {
          font-size: 1.875em;
          font-weight: 700;
          margin-top: 0.5em;
          margin-bottom: 0.5em;
          line-height: 1.3;
        }

        .ProseMirror h3 {
          font-size: 1.5em;
          font-weight: 600;
          margin-top: 0.5em;
          margin-bottom: 0.5em;
        }

        .ProseMirror h4 {
          font-size: 1.25em;
          font-weight: 600;
          margin-top: 0.5em;
          margin-bottom: 0.5em;
        }

        .ProseMirror ul {
          list-style-type: disc;
          padding-left: 1.5em;
          margin: 1em 0;
        }

        .ProseMirror ol {
          list-style-type: decimal;
          padding-left: 1.5em;
          margin: 1em 0;
        }

        .ProseMirror li {
          margin: 0.25em 0;
        }

        .ProseMirror a {
          color: #fbbf24;
          text-decoration: underline;
        }

        .ProseMirror a:hover {
          color: #f59e0b;
        }

        .ProseMirror hr {
          border: none;
          border-top: 2px solid #3f3f46;
          margin: 2em 0;
        }

        .tippy-box[data-theme~='dark'] {
          background-color: transparent;
          border: none;
        }
      `}</style>
    </div>
  );
}