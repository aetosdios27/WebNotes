'use client';
import { useState } from 'react';
import React from 'react';
import type { Note, Folder } from '@/lib/storage/types';
import { FileText, Folder as FolderIcon, Trash2, ChevronRight, Edit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from './context-menu';
import { toast } from 'sonner';

interface NoteListProps {
  folders: Folder[];
  notesInFolders: Map<string, Note[]>;
  unfiledNotes: Note[];
  activeNoteId: string | null;
  setActiveNoteId: (id: string) => void;
  expandedFolders: Set<string>;
  toggleFolder: (folderId: string) => void;
  moveNote: (noteId: string, folderId: string | null) => void;
  onDataChange: () => void;
}

function formatDate(date: Date | string) {
  // ... (Your existing formatDate function, unchanged)
  const today = new Date();
  const noteDate = new Date(date);
  if (noteDate.toDateString() === today.toDateString()) {
    return noteDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  return noteDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function NoteList({ 
  folders, 
  notesInFolders, 
  unfiledNotes, 
  activeNoteId, 
  setActiveNoteId, 
  expandedFolders,
  toggleFolder,
  moveNote,
  onDataChange // Receive the central data refresh function
}: NoteListProps) {
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  // --- NEW: Handlers for Context Menu Actions ---
  const handleRename = async (id: string, currentName: string, type: 'note' | 'folder') => {
    const newName = prompt(`Rename ${type}:`, currentName);
    if (newName && newName.trim() !== '' && newName !== currentName) {
      try {
        const res = await fetch(`/api/${type}s/${id}/rename`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newName }),
        });
        if (res.ok) {
          toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} renamed.`);
          onDataChange(); // Trigger a refetch
        } else { throw new Error(); }
      } catch { toast.error(`Failed to rename ${type}.`); }
    }
  };

  const handleDelete = async (id: string, type: 'note' | 'folder') => {
    if (confirm(`Are you sure you want to delete this ${type}? This action cannot be undone.`)) {
      try {
        const res = await fetch(`/api/${type}s/${id}`, { method: 'DELETE' });
        if (res.ok) {
          toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted.`);
          onDataChange(); // Trigger a refetch
        } else { throw new Error(); }
      } catch { toast.error(`Failed to delete ${type}.`); }
    }
  };


  // --- Drag and Drop Handlers (Your existing, working code) ---
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, noteId: string) => {
    setDraggedNoteId(noteId);
    e.dataTransfer.setData('noteId', noteId);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragEnd = () => {
    setDraggedNoteId(null);
    setDragOverFolderId(null);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, folderId: string | null) => {
    e.preventDefault();
    setDragOverFolderId(folderId);
  };
  const handleDragLeave = () => {
    setDragOverFolderId(null);
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, folderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    const noteId = e.dataTransfer.getData('noteId');
    setDragOverFolderId(null);
    if (noteId) moveNote(noteId, folderId);
  };

// In NoteList.tsx, update the renderNote function:
const renderNote = (note: Note, isIndented: boolean = false) => (
  <ContextMenu key={note.id}> {/* Move key here */}
    <ContextMenuTrigger asChild>
      <div
        // Remove key from here
        draggable
        onDragStart={(e) => handleDragStart(e, note.id)}
        onDragEnd={handleDragEnd}
        style={{ cursor: draggedNoteId ? 'grabbing' : 'grab' }}
        className={isIndented ? 'ml-6' : ''}
      >
        <motion.div
          layout
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
          onClick={() => setActiveNoteId(note.id)}
          className={`flex items-start gap-3 p-2 rounded-md cursor-pointer transition-all relative group ${
            note.id === activeNoteId
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
          } ${draggedNoteId === note.id ? 'opacity-50' : ''}`}
        >
          <FileText size={16} className="mt-1 flex-shrink-0 text-zinc-400" />
          <div className="flex-1 overflow-hidden">
            <h2 className="font-medium truncate">{note.title || 'Untitled'}</h2>
            <p className="text-sm text-zinc-500">{formatDate(note.updatedAt)}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(note.id, 'note'); }}
            className="absolute top-2 right-2 text-zinc-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Delete note"
          >
            <Trash2 size={14} />
          </button>
        </motion.div>
      </div>
    </ContextMenuTrigger>
    <ContextMenuContent>
      <ContextMenuItem onClick={() => handleRename(note.id, note.title || 'Untitled', 'note')}>
        <Edit className="mr-2 h-4 w-4" /> Rename
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem className="text-red-500" onClick={() => handleDelete(note.id, 'note')}>
        <Trash2 className="mr-2 h-4 w-4" /> Delete
      </ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>
);

// Update the renderFolder function similarly:
const renderFolder = (folder: Folder & { notes?: Note[] }) => {
  const isExpanded = expandedFolders.has(folder.id);
  const folderNotes = notesInFolders.get(folder.id) || [];
  const isDragOver = dragOverFolderId === folder.id;

  return (
    <ContextMenu key={folder.id}> {/* Move key here */}
      <ContextMenuTrigger asChild>
        <div 
          // Remove key from here
          onDragOver={handleDragOver}
          onDragEnter={(e) => handleDragEnter(e, folder.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, folder.id)}
          className={`transition-all ${isDragOver ? 'ring-2 ring-yellow-500/50 rounded-md' : ''}`}
        >
          <motion.div
            layout
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
            onClick={() => toggleFolder(folder.id)}
            className={`flex items-center gap-2 p-2 rounded-md text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer ${
              isDragOver ? 'bg-zinc-800/50' : ''
            }`}
          >
            <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronRight size={16} />
            </motion.div>
            <FolderIcon size={16} className="text-yellow-500" />
            <span className="truncate font-medium">{folder.name}</span>
            <span className="text-xs text-zinc-500 ml-auto">{folderNotes.length}</span>
          </motion.div>
          
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
              >
                {folderNotes.map(note => renderNote(note, true))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => handleRename(folder.id, folder.name, 'folder')}>
          <Edit className="mr-2 h-4 w-4" /> Rename
        </ContextMenuItem>
        <ContextMenuItem className="text-red-500" onClick={() => handleDelete(folder.id, 'folder')}>
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

  // Your existing, working render logic. Unchanged.
  return (
    <div className="p-2 space-y-1">
      <AnimatePresence mode="popLayout">
        {folders.map(folder => renderFolder(folder))}
        
        <div
          onDragOver={handleDragOver}
          onDragEnter={(e) => handleDragEnter(e, null)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, null)}
          className={`transition-all rounded-md ${
            dragOverFolderId === null && draggedNoteId ? 'ring-2 ring-yellow-500/50 p-2' : ''
          }`}
        >
          {unfiledNotes.length > 0 && (
            <div className={`text-xs text-zinc-500 px-2 pt-2 ${ folders.length > 0 ? 'mt-2' : '' }`}>
              Unfiled Notes
            </div>
          )}
          {unfiledNotes.map(note => renderNote(note))}
            
          {draggedNoteId && unfiledNotes.length === 0 && dragOverFolderId === null && (
            <div className="text-xs text-zinc-500 text-center py-4 border-2 border-dashed border-zinc-700 rounded-md">
              Drop here for unfiled notes
            </div>
          )}
        </div>
      </AnimatePresence>
    </div>
  );
}