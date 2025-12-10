'use client';
import { useState } from 'react';
import React from 'react';
import type { Note, Folder } from '@/lib/storage/types';
import { FileText, Folder as FolderIcon, Trash2, ChevronRight, Edit, Check, X, Pin, PinOff, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from './context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './dropdown-menu';
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
  updateNoteLocally?: (noteId: string, updates: Partial<Note>) => void;
  togglePin: (noteId: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
}

function formatDate(date: Date | string) {
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
  onDataChange,
  updateNoteLocally,
  togglePin,
  deleteNote,
  deleteFolder,
}: NoteListProps) {
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'note' | 'folder'; name: string } | null>(null);
  const [justDropped, setJustDropped] = useState<string | null>(null);
  const [justPinnedNotes, setJustPinnedNotes] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleTogglePin = async (noteId: string, currentPinned: boolean) => {
    const newPinnedStatus = !currentPinned;
    if (updateNoteLocally) {
      updateNoteLocally(noteId, {
        isPinned: newPinnedStatus,
        pinnedAt: newPinnedStatus ? new Date() : null,
      });
    }

    if (newPinnedStatus) {
      setJustPinnedNotes(prev => new Set(prev).add(noteId));
      setTimeout(() => {
        setJustPinnedNotes(prev => {
          const next = new Set(prev);
          next.delete(noteId);
          return next;
        });
      }, 800);
    }

    try {
      await togglePin(noteId);
    } catch (error) {
      if (updateNoteLocally) {
        updateNoteLocally(noteId, {
          isPinned: currentPinned,
          pinnedAt: currentPinned ? new Date() : null,
        });
      }
      toast.error('Failed to pin note');
    }
  };

  const handleRename = (id: string, currentName: string, type: 'note' | 'folder') => {
    setRenamingId(id);
    setRenameValue(currentName);
  };

  const confirmRename = async (id: string, type: 'note' | 'folder') => {
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    
    try {
      const res = await fetch(`/api/${type}s/${id}/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName: renameValue.trim() }),
      });
      if (res.ok) {
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} renamed`);
        onDataChange();
      } else {
        throw new Error();
      }
    } catch {
      toast.error(`Failed to rename ${type}`);
    } finally {
      setRenamingId(null);
      setRenameValue('');
    }
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue('');
  };

  const handleDelete = (id: string, type: 'note' | 'folder', name: string) => {
    setDeleteConfirm({ id, type, name });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    
    const { id, type, name } = deleteConfirm;
    setDeleteConfirm(null);
    
    if (type === 'note' && id === activeNoteId) {
      setActiveNoteId('');
    }

    try {
      if (type === 'note') {
        await deleteNote(id);
      } else {
        await deleteFolder(id);
      }
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted`);
    } catch {
      toast.error(`Failed to delete ${type}`);
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, noteId: string) => {
    if (isMobile) return;
    setDraggedNoteId(noteId);
    e.dataTransfer.setData('noteId', noteId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedNoteId(null);
    setDragOverFolderId(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (isMobile) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, folderId: string | null) => {
    if (isMobile) return;
    e.preventDefault();
    if (draggedNoteId) { 
      setDragOverFolderId(folderId);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (isMobile) return;
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverFolderId(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, folderId: string | null) => {
    if (isMobile) return;
    e.preventDefault();
    e.stopPropagation();
    const noteId = e.dataTransfer.getData('noteId');
    setDragOverFolderId(null);
    
    if (noteId) {
      setJustDropped(folderId);
      setTimeout(() => setJustDropped(null), 1000);
      moveNote(noteId, folderId);
    }
  };

  const renderNote = (note: Note, isIndented: boolean = false) => {
    const justPinned = justPinnedNotes.has(note.id);
    
    const NoteContent = (
      <div
        draggable={!isMobile && renamingId !== note.id}
        onDragStart={(e) => handleDragStart(e, note.id)}
        onDragEnd={handleDragEnd}
        style={{ cursor: !isMobile && renamingId !== note.id && draggedNoteId ? 'grabbing' : 'default' }}
        className={isIndented ? 'ml-6' : ''}
      >
        <motion.div
          layout
          layoutId={`note-${note.id}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ 
            opacity: 1, 
            y: 0,
          }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ 
            duration: 0.3,
            layout: { type: "spring", stiffness: 300, damping: 30 }
          }}
          onClick={() => renamingId !== note.id && setActiveNoteId(note.id)}
          className={`flex items-start gap-3 p-3 md:p-2 rounded-md cursor-pointer transition-all relative group ${
            note.id === activeNoteId
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
          } ${draggedNoteId === note.id ? 'opacity-50' : ''} ${
            note.isPinned ? 'border-l-2 border-yellow-500/70' : ''
          } ${justPinned ? 'ring-2 ring-yellow-500/50 bg-yellow-500/10' : ''}`}
        >
          <FileText size={16} className="mt-1 flex-shrink-0 text-zinc-400" />
          <div className="flex-1 overflow-hidden">
            {renamingId === note.id ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmRename(note.id, 'note');
                    if (e.key === 'Escape') cancelRename();
                  }}
                  className="flex-1 bg-zinc-700 text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmRename(note.id, 'note');
                  }}
                  className="text-green-500 hover:text-green-400 p-1"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    cancelRename();
                  }}
                  className="text-red-500 hover:text-red-400 p-1"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h2 className="font-medium truncate flex-1 text-sm md:text-base">{note.title || 'Untitled'}</h2>
                  {note.isPinned && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    >
                      <Pin size={12} className="text-yellow-500 flex-shrink-0" fill="currentColor" />
                    </motion.div>
                  )}
                  
                  {isMobile && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <button className="p-1 hover:bg-zinc-700 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical size={14} className="text-zinc-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePin(note.id, note.isPinned || false);
                        }}>
                          {note.isPinned ? (
                            <><PinOff className="mr-2 h-4 w-4" /> Unpin</>
                          ) : (
                            <><Pin className="mr-2 h-4 w-4" /> Pin</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleRename(note.id, note.title || 'Untitled', 'note');
                        }}>
                          <Edit className="mr-2 h-4 w-4" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-500" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(note.id, 'note', note.title || 'Untitled');
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <p className="text-xs md:text-sm text-zinc-500">{formatDate(note.updatedAt)}</p>
              </>
            )}
          </div>
        </motion.div>
      </div>
    );

    if (isMobile) {
      return <div key={note.id}>{NoteContent}</div>;
    }

    return (
      <ContextMenu key={note.id}>
        <ContextMenuTrigger asChild>
          {NoteContent}
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => handleTogglePin(note.id, note.isPinned || false)}>
            {note.isPinned ? (
              <><PinOff className="mr-2 h-4 w-4" /> Unpin</>
            ) : (
              <><Pin className="mr-2 h-4 w-4" /> Pin</>
            )}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleRename(note.id, note.title || 'Untitled', 'note')}>
            <Edit className="mr-2 h-4 w-4" /> Rename
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem 
            className="text-red-500" 
            onClick={() => handleDelete(note.id, 'note', note.title || 'Untitled')}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  const renderFolder = (folder: Folder & { notes?: Note[] }) => {
    const isExpanded = expandedFolders.has(folder.id);
    const folderNotes = notesInFolders.get(folder.id) || [];
    const isDragOver = dragOverFolderId === folder.id;
    const wasJustDropped = justDropped === folder.id;

    const FolderContent = (
      <div 
        onDragOver={handleDragOver}
        onDragEnter={(e) => handleDragEnter(e, folder.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, folder.id)}
        className={`transition-all duration-200 ${
          isDragOver 
            ? 'ring-2 ring-yellow-500/50 bg-yellow-500/10 rounded-md' 
            : wasJustDropped 
            ? 'ring-2 ring-green-500/50 bg-green-500/10 rounded-md'
            : ''
        }`}
      >
        <motion.div
          layout
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
          onClick={() => renamingId !== folder.id && toggleFolder(folder.id)}
          className={`flex items-center gap-2 p-3 md:p-2 rounded-md text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer group ${
            isDragOver ? 'bg-yellow-500/20' : wasJustDropped ? 'bg-green-500/20' : ''
          }`}
        >
          <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronRight size={16} />
          </motion.div>
          <FolderIcon size={16} className="text-yellow-500" />
          {renamingId === folder.id ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmRename(folder.id, 'folder');
                  if (e.key === 'Escape') cancelRename();
                }}
                className="flex-1 bg-zinc-700 text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  confirmRename(folder.id, 'folder');
                }}
                className="text-green-500 hover:text-green-400 p-1"
              >
                <Check size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  cancelRename();
                }}
                className="text-red-500 hover:text-red-400 p-1"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <span className="truncate font-medium flex-1 text-sm md:text-base">{folder.name}</span>
              <span className="text-xs text-zinc-500">{folderNotes.length}</span>
              
              {isMobile && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button className="p-1 hover:bg-zinc-700 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical size={14} className="text-zinc-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      handleRename(folder.id, folder.name, 'folder');
                    }}>
                      <Edit className="mr-2 h-4 w-4" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-red-500" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(folder.id, 'folder', folder.name);
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          )}
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

    if (isMobile) {
      return <div key={folder.id}>{FolderContent}</div>;
    }

    return (
      <ContextMenu key={folder.id}>
        <ContextMenuTrigger asChild>
          {FolderContent}
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => handleRename(folder.id, folder.name, 'folder')}>
            <Edit className="mr-2 h-4 w-4" /> Rename
          </ContextMenuItem>
          <ContextMenuItem 
            className="text-red-500" 
            onClick={() => handleDelete(folder.id, 'folder', folder.name)}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  return (
    <>
      <div className="p-2 space-y-1">
        <AnimatePresence mode="popLayout">
          {folders.map(folder => renderFolder(folder))}
          
          {!isMobile && (
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
                <div className={`text-xs text-zinc-500 px-2 pt-2 ${folders.length > 0 ? 'mt-2' : ''}`}>
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
          )}
          
          {isMobile && unfiledNotes.length > 0 && (
            <div>
              <div className={`text-xs text-zinc-500 px-2 pt-2 ${folders.length > 0 ? 'mt-2' : ''}`}>
                Unfiled Notes
              </div>
              {unfiledNotes.map(note => renderNote(note))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {deleteConfirm && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setDeleteConfirm(null)}
        >
          <div 
            className="bg-zinc-900 p-6 rounded-lg shadow-xl border border-zinc-800 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4 text-white">
              Delete {deleteConfirm.type}?
            </h3>
            <p className="text-zinc-400 mb-6 text-sm md:text-base">
              Are you sure you want to delete &ldquo;<span className="font-medium text-white">{deleteConfirm.name}</span>&rdquo;? 
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2.5 md:py-2 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors text-white text-sm md:text-base"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2.5 md:py-2 bg-red-600 hover:bg-red-700 rounded transition-colors text-white text-sm md:text-base"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}