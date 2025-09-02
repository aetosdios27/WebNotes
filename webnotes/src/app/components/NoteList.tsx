'use client';
import type { Note, Folder } from '@/types';
import { FileText, Folder as FolderIcon, Trash2 } from 'lucide-react';

type ListItem = (Note & { type: 'note' }) | (Folder & { type: 'folder' });

interface NoteListProps {
  items: ListItem[];
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

export default function NoteList({ items, activeNoteId, setActiveNoteId, deleteNote }: NoteListProps) {
  return (
    <div className="h-full overflow-y-auto p-2 space-y-1">
      <ul>
        {items.map((item) => {
          const isNoteSelected = item.type === 'note' && item.id === activeNoteId;

          if (item.type === 'folder') {
            return (
              <li key={item.id} className="flex items-center gap-3 p-2 rounded-md text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer">
                <FolderIcon size={16} className="text-yellow-500" />
                <span className="truncate">{item.name}</span>
              </li>
            );
          }
          
          // Item is a note
          return (
            <li
              key={item.id}
              onClick={() => setActiveNoteId(item.id)}
              // --- This className is now unified with the folder style ---
              className={`flex items-start gap-3 p-2 rounded-md cursor-pointer transition-colors relative group ${
                isNoteSelected
                  ? 'bg-zinc-800 text-white' // Use a subtle highlight for selected notes
                  : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <FileText size={16} className="mt-1 flex-shrink-0 text-yellow-500" />
              <div className="flex-1 overflow-hidden">
                <h2 className="font-semibold truncate">{item.title}</h2>
                <p className="text-sm text-zinc-500">
                  {formatDate(item.updatedAt)}
                </p>
              </div>
              <button
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  deleteNote(item.id);
                }}
                className="absolute top-2 right-2 text-zinc-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Delete note"
              >
                <Trash2 size={14} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}