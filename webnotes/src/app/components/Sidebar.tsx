// src/app/components/Sidebar.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronsLeft, FolderPlus, FilePlus, Search, Cloud, CloudOff } from 'lucide-react';
import { Collapsible, CollapsibleTrigger } from '@/app/components/ui/collapsible';
import { Button } from '@/app/components/ui/button';
import NoteList from './NoteList';
import AuthButton from './AuthButton';
import type { Note } from '@/lib/storage/types'; // Import from storage types
import type { FolderWithNotes } from '../page';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';

interface SidebarProps {
  notes: Note[]; // Now using storage Note type
  folders: FolderWithNotes[];
  activeNoteId: string | null;
  setActiveNoteId: (id: string) => void;
  createNote: (folderId?: string | null) => void;
  deleteNote: (id: string) => void;
  moveNote: (noteId: string, folderId: string | null) => void;
  createFolder: () => void;
  onDataChange: () => void;
  syncStatus?: 'synced' | 'unsynced' | 'syncing';
}

export default function Sidebar({ 
  notes, 
  folders,
  activeNoteId, 
  setActiveNoteId, 
  createNote,
  deleteNote,
  moveNote,
  createFolder,
  onDataChange,
  syncStatus = 'unsynced'
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

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
        {/* Header */}
        <div className={`p-4 flex items-center border-b border-zinc-800 flex-shrink-0 ${isOpen ? 'justify-between' : 'justify-center'}`}>
          {isOpen && (
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-200">WebNotes</h1>
              <div className="flex items-center gap-1">
                {syncStatus === 'syncing' && (
                  <div className="animate-spin w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full"></div>
                )}
                {syncStatus === 'synced' && (
                  <Cloud className="w-4 h-4 text-green-500" />
                )}
                {syncStatus === 'unsynced' && (
                  <CloudOff className="w-4 h-4 text-yellow-500" />
                )}
              </div>
            </div>
          )}
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon">
              <ChevronsLeft className={`h-5 w-5 transition-transform duration-300 ${isOpen ? '' : 'rotate-180'}`} />
            </Button>
          </CollapsibleTrigger>
        </div>

        {/* Toolbar */}
        <div className={`p-2 border-b border-zinc-800 flex items-center ${ isOpen ? 'flex-row justify-around' : 'flex-col justify-start gap-2' }`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => createNote()}>
                <FilePlus size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right"><p>New Note</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={createFolder}>
                <FolderPlus size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right"><p>New Folder</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Search size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right"><p>Search</p></TooltipContent>
          </Tooltip>
        </div>

        {/* Notes List */}
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
            />
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto p-2 border-t border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            {isOpen && (
              <span className="text-xs text-zinc-500">
                {syncStatus === 'synced' && 'Synced across devices'}
                {syncStatus === 'unsynced' && 'Local only - Sign in to sync'}
                {syncStatus === 'syncing' && 'Syncing...'}
              </span>
            )}
          </div>
          <AuthButton isOpen={isOpen} />
        </div>
      </Collapsible>
    </TooltipProvider>
  );
}