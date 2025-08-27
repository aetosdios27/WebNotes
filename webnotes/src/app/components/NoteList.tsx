'use client';
import type { Note } from '@/types';

interface NoteListProps {
  notes: Note[];
  activeNoteId: string | null;
  setActiveNoteId: (id: string) => void;
  deleteNote: (id: string) => void;
}

function formatDate(date: Date | string) {
  const today = new Date();
  const noteDate = new Date(date);

  if (noteDate.toDateString() === today.toDateString()) {
    return noteDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  
  return noteDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function NoteList({ notes, activeNoteId, setActiveNoteId, deleteNote }: NoteListProps) {
  return (
    <div className="h-full overflow-y-auto">
      <ul>
        {notes.map((note) => (
          <li
            key={note.id}
            onClick={() => setActiveNoteId(note.id)}
            // The change is on the line below
            className={`p-4 border-b border-zinc-800 cursor-pointer relative group ${
              note.id === activeNoteId 
                ? 'bg-yellow-400 text-zinc-900' 
                : 'text-zinc-200 hover:bg-yellow-400/10'
            }`}
          >
            <h2 className="font-semibold truncate">{note.title}</h2>
            <p className={`text-sm truncate ${note.id === activeNoteId ? 'text-zinc-700' : 'text-zinc-500'}`}>
              {formatDate(note.updatedAt)}
            </p>
            <button
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                deleteNote(note.id);
              }}
              className="absolute top-2 right-2 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Delete note"
            >
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4L4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3V2h11v1h-11z"/>
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}