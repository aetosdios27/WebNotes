'use client';

import { useState, useEffect } from 'react';
import { ChevronsLeft, Folder as FolderIcon, FolderPlus, FilePlus } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';
import { Button } from './ui/button';
import NoteList from './NoteList';
import type { Note, Folder } from '@/types';

interface SidebarProps {
  notes: Note[];
  activeNoteId: string | null;
  setActiveNoteId: (id: string) => void;
  deleteNote: (id: string) => void;
  createNote: () => void;
}

export default function Sidebar({ notes, activeNoteId, setActiveNoteId, deleteNote, createNote }: SidebarProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isOpen, setIsOpen] = useState(true);

  // Fetch folders from the API when the component mounts
  useEffect(() => {
    const fetchFolders = async () => {
      const res = await fetch('/api/folders');
      if (res.ok) {
        const data = await res.json();
        setFolders(data.folders || []);
      }
    };
    fetchFolders();
  }, []);
  
  // Handle creating a new folder
  const handleCreateFolder = async () => {
    const folderName = prompt("Enter new folder name:");
    if (folderName) {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: folderName }),
      });
      if (res.ok) {
        const { folder } = await res.json();
        setFolders(prevFolders => [folder, ...prevFolders]);
      }
    }
  };

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      // Animate the width for a smooth collapse/expand
      className={`h-full flex flex-col bg-zinc-900 border-r border-zinc-800 transition-all duration-300 ease-in-out ${isOpen ? 'w-1/4' : 'w-[68px]'}`}
    >
      <div className={`p-4 flex items-center border-b border-zinc-800 flex-shrink-0 ${isOpen ? 'justify-between' : 'justify-center'}`}>
        {isOpen && <h1 className="text-xl font-bold text-zinc-200">WebNotes</h1>}
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon">
            <ChevronsLeft className={`h-5 w-5 transition-transform duration-300 ${isOpen ? '' : 'rotate-180'}`} />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
        </CollapsibleTrigger>
      </div>
      
      <CollapsibleContent className="flex-1 flex flex-col overflow-y-hidden">
        <div className="p-2 border-b border-zinc-800">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={handleCreateFolder}>
            <FolderPlus size={16} /> {isOpen && 'New Folder'}
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={createNote}>
            <FilePlus size={16} /> {isOpen && 'New Note'}
          </Button>
        </div>

        <div className="p-2 space-y-1 overflow-y-auto">
          <h2 className={`text-xs font-semibold text-zinc-500 uppercase px-2 ${isOpen ? '' : 'text-center'}`}>
            {isOpen ? 'Folders' : '📂'}
          </h2>
          <ul>
            {folders.map(folder => (
              <li key={folder.id} className="flex items-center gap-2 p-2 rounded-md text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer">
                <FolderIcon size={16} /> {isOpen && folder.name}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-1 flex flex-col overflow-y-hidden border-t border-zinc-800 mt-2">
            <NoteList 
              notes={notes} 
              activeNoteId={activeNoteId} 
              setActiveNoteId={setActiveNoteId}
              deleteNote={deleteNote}
            />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}