'use client';

import type { Note } from '@prisma/client';
import { useDebouncedCallback } from 'use-debounce';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Toolbar } from './Toolbar';

interface NoteEditorProps {
 activeNote: Note | undefined;
 onNoteUpdate: (note: Note) => void;
}

export default function NoteEditor({ activeNote, onNoteUpdate }: NoteEditorProps) {
 const debouncedSave = useDebouncedCallback(
   async (noteId: string, htmlContent: string, textContent: string) => {
     if (!noteId) return;

     const res = await fetch(`/api/notes/${noteId}`, {
       method: 'PUT',
       headers: {
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({
         htmlContent,
         textContent
       }),
     });

     if (res.ok) {
       const updatedNote: Note = await res.json();
       onNoteUpdate(updatedNote);
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
     // Critical for Next.js to avoid hydration mismatch
     immediatelyRender: false,
   },
   // Recreate the editor when switching notes
   [activeNote?.id]
 );

 if (!activeNote) {
   return (
     <div className="flex-1 flex items-center justify-center h-full bg-black text-zinc-700">
       Select a note to view or create a new one.
     </div>
   );
 }

 return (
   <div className="flex flex-col flex-1 h-full p-8 bg-black">
     <div className="pb-4">
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