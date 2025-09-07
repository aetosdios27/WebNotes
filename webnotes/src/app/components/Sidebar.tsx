// src/app/components/Sidebar.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronsLeft, FolderPlus, FilePlus, Search, ChevronRight, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleTrigger } from '@/app/components/ui/collapsible';
import { Button } from '@/app/components/ui/button';
import NoteList from './NoteList';
import AuthButton from './AuthButton';
import type { Note, Folder } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';

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
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Load expanded folders from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('expandedFolders');
    if (saved) {
      setExpandedFolders(new Set(JSON.parse(saved)));
    }
  }, []);

  // Save expanded folders to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('expandedFolders', JSON.stringify(Array.from(expandedFolders)));
  }, [expandedFolders]);

  // Fetch folders from the API
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

  // Toggle folder expansion
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

  // Group notes by folder
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

    // Sort notes within each folder
    notesInFolders.forEach((notes, folderId) => {
      notesInFolders.set(folderId, notes.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ));
    });

    return { 
      notesInFolders, 
      unfiledNotes: unfiledNotes.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
    };
  }, [notes]);

  return (
    <TooltipProvider delayDuration={0}>
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className={`h-full flex flex-col bg-zinc-900 border-r border-zinc-800 transition-all duration-300 ease-in-out ${isOpen ? 'w-80' : 'w-[68px]'}`}
      >
        {/* Section 1: Header (Title and Collapse Button) */}
        <div className={`p-4 flex items-center border-b border-zinc-800 flex-shrink-0 ${isOpen ? 'justify-between' : 'justify-center'}`}>
          {isOpen && <h1 className="text-xl font-bold text-zinc-200">WebNotes</h1>}
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon">
              <ChevronsLeft className={`h-5 w-5 transition-transform duration-300 ${isOpen ? '' : 'rotate-180'}`} />
              <span className="sr-only">Toggle sidebar</span>
            </Button>
          </CollapsibleTrigger>
        </div>

        {/* Section 2: The Icon Toolbar */}
        <div
          className={`p-2 border-b border-zinc-800 flex items-center ${
            isOpen ? 'flex-row justify-around' : 'flex-col justify-start gap-2'
          }`}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={createNote}>
                <FilePlus size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right"><p>New Note</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleCreateFolder}>
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

        {/* Section 3: Tree View (conditionally rendered) */}
        {isOpen && (
          <div className="flex-1 overflow-y-auto">
            <NoteList 
              folders={folders}
              notesInFolders={notesInFolders}
              unfiledNotes={unfiledNotes}
              activeNoteId={activeNoteId} 
              setActiveNoteId={setActiveNoteId}
              deleteNote={deleteNote}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
            />
          </div>
        )}

        {/* Section 4: Auth Button Footer */}
        <div className="mt-auto p-2 border-t border-zinc-800">
          <AuthButton />
        </div>
      </Collapsible>
    </TooltipProvider>
  );
}