// src/app/components/Sidebar.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronsLeft, FolderPlus, FilePlus, Search } from 'lucide-react';
import { Collapsible, CollapsibleTrigger } from '@/app/components/ui/collapsible';
import { Button } from '@/app/components/ui/button';
import NoteList from './NoteList';
import AuthButton from './AuthButton';
import type { Note } from '@prisma/client';
import type { FolderWithNotes } from '../page';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';

interface SidebarProps {
  notes: Note[];
  folders: FolderWithNotes[];
  activeNoteId: string | null;
  setActiveNoteId: (id: string) => void;
  createNote: (folderId?: string | null) => void;
  moveNote: (noteId: string, folderId: string | null) => void;
  createFolder: () => Promise<{ id: string; name: string } | null>; // Modified to return folder object
  onDataChange: () => void;
}

export default function Sidebar({ 
  notes, 
  folders,
  activeNoteId, 
  setActiveNoteId, 
  createNote,
  moveNote,
  createFolder,
  onDataChange
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  
  const [newlyCreatedFolder, setNewlyCreatedFolder] = useState<{ id: string; name: string } | null>(null);
  
  const handleCreateFolder = async () => {
    const newFolder = await createFolder();
    if (newFolder) {
      setNewlyCreatedFolder(newFolder);
      // Don't call onDataChange immediately - let the NoteList handle it after rename
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('expandedFolders');
    if (saved) {
      setExpandedFolders(new Set(JSON.parse(saved)));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('expandedFolders', JSON.stringify(Array.from(expandedFolders)));
  }, [expandedFolders]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const { notesInFolders, unfiledNotes } = useMemo(() => {
    const notesInFolders = new Map<string, Note[]>();
    const unfiledNotes: Note[] = [];

    notes.forEach(note => {
      if (note.folderId) {
        const folderNotes = notesInFolders.get(note.folderId) || [];
        folderNotes.push(note);
        notesInFolders.set(note.folderId, folderNotes);
      } else {
        unfiledNotes.push(note);
      }
    });

    return { 
      notesInFolders, 
      unfiledNotes: unfiledNotes.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    };
  }, [notes]);

  return (
    <TooltipProvider delayDuration={0}>
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className={`h-full flex flex-col bg-zinc-900 border-r border-zinc-800 transition-all duration-300 ease-in-out ${isOpen ? 'w-80' : 'w-[68px]'}`}
      >
        <div className={`p-4 flex items-center border-b border-zinc-800 flex-shrink-0 ${isOpen ? 'justify-between' : 'justify-center'}`}>
          {isOpen && <h1 className="text-xl font-bold text-zinc-200">WebNotes</h1>}
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon">
              <ChevronsLeft className={`h-5 w-5 transition-transform duration-300 ${isOpen ? '' : 'rotate-180'}`} />
            </Button>
          </CollapsibleTrigger>
        </div>

        <div className={`p-2 border-b border-zinc-800 flex items-center ${ isOpen ? 'flex-row justify-around' : 'flex-col justify-start gap-2' }`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => createNote()} className="hover:bg-zinc-700">
                <FilePlus size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={0} className="px-2 py-1 text-xs">
              <p>New Note</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleCreateFolder} className="hover:bg-zinc-700">
                <FolderPlus size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={0} className="px-2 py-1 text-xs">
              <p>New Folder</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-zinc-700">
                <Search size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={0} className="px-2 py-1 text-xs">
              <p>Search</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {isOpen && (
          <div className="flex-1 overflow-y-auto">
            <NoteList 
              folders={folders}
              notesInFolders={notesInFolders}
              unfiledNotes={unfiledNotes}
              activeNoteId={activeNoteId} 
              setActiveNoteId={setActiveNoteId}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              moveNote={moveNote}
              onDataChange={onDataChange}
              newlyCreatedFolder={newlyCreatedFolder}
              clearNewlyCreatedFolder={() => setNewlyCreatedFolder(null)}
              // Removed deleteNote - it's handled by onDataChange in NoteList
            />
          </div>
        )}

        <div className="mt-auto p-2 border-t border-zinc-800">
          <AuthButton isOpen={isOpen} />
        </div>
      </Collapsible>
    </TooltipProvider>
  );
}
