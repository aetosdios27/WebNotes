// src/app/components/NoteList.tsx
'use client';
import { useState } from 'react';
import React from 'react';
import type { Note, Folder } from '@prisma/client';
import { FileText, Folder as FolderIcon, Trash2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NoteListProps {
  folders: Folder[];
  notesInFolders: Map<string, Note[]>;
  unfiledNotes: Note[];
  activeNoteId: string | null;
  setActiveNoteId: (id: string) => void;
  deleteNote: (id: string) => void;
  expandedFolders: Set<string>;
  toggleFolder: (folderId: string) => void;
  moveNote: (noteId: string, folderId: string | null) => void;
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

export default function NoteList({ 
  folders, 
  notesInFolders, 
  unfiledNotes, 
  activeNoteId, 
  setActiveNoteId, 
  deleteNote,
  expandedFolders,
  toggleFolder,
  moveNote
}: NoteListProps) {
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

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

  // FIXED: Removed the activeNoteId check to allow all notes to be moved
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, folderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    
    const noteId = e.dataTransfer.getData('noteId');
    setDragOverFolderId(null);
    
    if (noteId) {
      // Now any note can be moved, including the active one
      moveNote(noteId, folderId);
    }
  };

  const renderNote = (note: Note, isIndented: boolean = false) => (
    <div
      key={note.id}
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
          <p className="text-sm text-zinc-500">
            {formatDate(note.updatedAt)}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteNote(note.id);
          }}
          className="absolute top-2 right-2 text-zinc-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Delete note"
        >
          <Trash2 size={14} />
        </button>
      </motion.div>
    </div>
  );

  const renderFolder = (folder: Folder & { notes?: Note[] }) => {
    const isExpanded = expandedFolders.has(folder.id);
    const folderNotes = notesInFolders.get(folder.id) || [];
    const isDragOver = dragOverFolderId === folder.id;

    return (
      <div 
        key={folder.id}
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
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
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
    );
  };

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
            <div className={`text-xs text-zinc-500 px-2 pt-2 ${
              folders.length > 0 ? 'mt-2' : ''
            }`}>
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