'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import Sidebar from '@/app/components/Sidebar';
import dynamic from 'next/dynamic';
import { NoteListSkeleton } from '@/app/components/NoteListSkeleton';
import { toast } from 'sonner';
import { useStorage } from '@/hooks/useStorage';
import type { Note, Folder } from '@/lib/storage/types';
import { Button } from '@/app/components/ui/button';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CommandPalette from '@/app/components/CommandPalette';

export type FolderWithNotes = Omit<Folder, 'notes'> & { 
  notes: Note[] 
};

const NoteEditor = dynamic(() => import('@/app/components/NoteEditor'), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center h-full bg-black text-zinc-700">Loading Editor...</div>,
});

export default function Home() {
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  const {
    notes,
    folders,
    settings,
    isLoading,
    createNote: storageCreateNote,
    updateNote: storageUpdateNote,
    updateNoteLocally,
    togglePin: storageTogglePin,
    deleteNote: storageDeleteNote,
    createFolder: storageCreateFolder,
    refresh,
  } = useStorage();

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (window.innerWidth < 768 && showMobileSidebar) {
        if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
          setShowMobileSidebar(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMobileSidebar]);

  const foldersWithNotes = useMemo<FolderWithNotes[]>(() => {
    return folders.map(folder => ({
      ...folder,
      notes: notes.filter(note => note.folderId === folder.id)
        .sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          
          if (a.isPinned && b.isPinned) {
            const aTime = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
            const bTime = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
            return bTime - aTime;
          }
          
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        })
    }));
  }, [folders, notes]);

  // UPDATED: Accept optional title parameter
  const createNote = useCallback(async (folderId?: string | null, title?: string): Promise<string | null> => {
    try {
      const newNote = await storageCreateNote({ 
        title: title || '',  // Use provided title or empty
        content: '', 
        folderId 
      });
      setActiveNoteId(newNote.id);
      setShowMobileSidebar(false); // Close sidebar on mobile
      if (title) {
        toast.success(`Created "${title}"`);
      } else {
        toast.success('Note created');
      }
      return newNote.id; // Return the ID for reference
    } catch (error) {
      toast.error('Failed to create note');
      return null;
    }
  }, [storageCreateNote]);

  const deleteNote = useCallback(async (id: string) => {
    try {
      if (activeNoteId === id) setActiveNoteId(null);
      await storageDeleteNote(id);
      toast.success('Note deleted');
    } catch (error) {
      toast.error('Failed to delete note');
    }
  }, [storageDeleteNote, activeNoteId]);

  const moveNote = useCallback(async (noteId: string, folderId: string | null) => {
    const originalNote = notes.find(n => n.id === noteId);
    if (!originalNote) return;

    if (updateNoteLocally) {
      updateNoteLocally(noteId, { folderId });
    }

    try {
      await storageUpdateNote(noteId, { folderId });
      toast.success('Note moved');
    } catch (error) {
      console.error('Failed to move note:', error);
      if (updateNoteLocally) {
        updateNoteLocally(noteId, { folderId: originalNote.folderId });
      }
      toast.error('Failed to move note');
    }
  }, [notes, storageUpdateNote, updateNoteLocally]);

  const createFolder = useCallback(async () => {
    const folderName = prompt('Enter folder name:');
    if (folderName) {
      try {
        await storageCreateFolder({ name: folderName });
        toast.success('Folder created');
      } catch (error) {
        toast.error('Failed to create folder');
      }
    }
  }, [storageCreateFolder]);

  const handleNoteUpdate = useCallback(async (updatedNote: Note) => {
    try {
      await storageUpdateNote(updatedNote.id, {
        title: updatedNote.title,
        content: updatedNote.content,
      });
    } catch (error) {
      toast.error('Failed to update note');
    }
  }, [storageUpdateNote]);

  const togglePin = useCallback(async (noteId: string) => {
    try {
      await storageTogglePin(noteId);
    } catch (error) {
      console.error('Failed to toggle pin:', error);
      throw error;
    }
  }, [storageTogglePin]);

  // Mobile-specific: close sidebar when selecting note
  const handleSetActiveNoteForMobile = useCallback((noteId: string | null) => {
    setActiveNoteId(noteId);
    if (window.innerWidth < 768) {
      setShowMobileSidebar(false);
    }
  }, []);

  const activeNote = notes.find(n => n.id === activeNoteId);

  const combinedStatus = useMemo(() => {
    if (isSaving) return 'syncing';
    return settings.syncStatus;
  }, [isSaving, settings.syncStatus]);

  return (
    <main className="flex w-screen h-screen overflow-hidden">
      {/* Mobile backdrop overlay */}
      <AnimatePresence>
        {showMobileSidebar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setShowMobileSidebar(false)}
          />
        )}
      </AnimatePresence>

      {/* DESKTOP SIDEBAR - always visible */}
      <div className="hidden md:block">
        {isLoading ? (
          <div className="w-80 h-full bg-zinc-900 border-r border-zinc-800">
            <NoteListSkeleton />
          </div>
        ) : (
          <Sidebar
            notes={notes}
            folders={foldersWithNotes}
            activeNoteId={activeNoteId}
            setActiveNoteId={setActiveNoteId}
            createNote={createNote}
            deleteNote={deleteNote}
            moveNote={moveNote}
            createFolder={createFolder}
            onDataChange={refresh}
            updateNoteLocally={updateNoteLocally}
            togglePin={togglePin}
            syncStatus={combinedStatus}
          />
        )}
      </div>

      {/* MOBILE SIDEBAR - animated slide-in */}
      <AnimatePresence>
        {showMobileSidebar && (
          <motion.div
            ref={sidebarRef}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
            }}
            className="fixed md:hidden inset-y-0 left-0 z-50 w-80"
          >
            {isLoading ? (
              <div className="w-full h-full bg-zinc-900 border-r border-zinc-800">
                <NoteListSkeleton />
              </div>
            ) : (
              <Sidebar
                notes={notes}
                folders={foldersWithNotes}
                activeNoteId={activeNoteId}
                setActiveNoteId={handleSetActiveNoteForMobile}
                createNote={createNote}
                deleteNote={deleteNote}
                moveNote={moveNote}
                createFolder={createFolder}
                onDataChange={refresh}
                updateNoteLocally={updateNoteLocally}
                togglePin={togglePin}
                syncStatus={combinedStatus}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* EDITOR - with mobile header */}
      <div className="flex-1 h-full flex flex-col">
        {/* Mobile header bar */}
        <div className="md:hidden border-b border-zinc-800 bg-zinc-900 flex items-center px-3 py-2.5 gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            className="text-zinc-400 hover:text-white hover:bg-zinc-800 h-9 w-9"
          >
            {showMobileSidebar ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
          {activeNote && (
            <h2 className="text-sm font-medium text-zinc-200 truncate">
              {activeNote.title || 'Untitled Note'}
            </h2>
          )}
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          <NoteEditor 
            activeNote={activeNote} 
            onNoteUpdate={handleNoteUpdate} 
            onSavingStatusChange={setIsSaving}
            onDeleteNote={deleteNote}
          />
        </div>
      </div>

      {/* Command Palette */}
      <CommandPalette
        notes={notes}
        folders={folders}
        activeNoteId={activeNoteId}
        setActiveNoteId={setActiveNoteId}
        createNote={createNote}
        createFolder={createFolder}
        deleteNote={deleteNote}
        togglePin={togglePin}
      />
    </main>
  );
}