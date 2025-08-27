'use client';
import type { Note } from '@/types';

interface NoteListProps {
  notes: Note[];
  activeNoteId: string | null;
  setActiveNoteId: (id: string) => void;
  deleteNote: (id: string) => void;
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('en-US', {
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
            className={`p-4 border-b border-zinc-200 cursor-pointer hover:bg-yellow-100 relative group ${
              note.id === activeNoteId ? 'bg-yellow-200' : ''
            }`}
          >
            <h2 className="font-semibold truncate">{note.title}</h2>
            <p className="text-sm text-zinc-500 truncate">{formatDate(note.updatedAt)}</p>
            <button
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation(); // Prevent li's onClick from firing
                deleteNote(note.id);
              }}
              className="absolute top-2 right-2 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Delete note"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}