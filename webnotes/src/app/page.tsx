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
import LoadingScreen from '@/app/components/LoadingScreen';
import { useSession } from 'next-auth/react';

export type FolderWithNotes = Omit<Folder, 'notes'> & { 
  notes: Note[] 
};

// Remove "Loading Editor..." flicker
const NoteEditor = dynamic(() => import('@/app/components/NoteEditor'), {
  ssr: false,
  loading: () => null,
});

export default function Home() {
  const { status } = useSession();
  
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // Track minimum animation time AND if we're in extended loading
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [showExtendedMessage, setShowExtendedMessage] = useState(false);
  
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

  // Minimum 2.8s timer for animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 2800);
    
    return () => clearTimeout(timer);
  }, []);

  // If still loading after 3.5s, show extended message
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        setShowExtendedMessage(true);
      }
    }, 3500); // 700ms after animation finishes
    
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Show loading until BOTH animation finishes AND data is loaded
  const showLoading = !minTimeElapsed || isLoading;

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

  const createNote = useCallback(async (folderId?: string | null, title?: string): Promise<string | null> => {
    try {
      const newNote = await storageCreateNote({ 
        title: title || '',
        content: '', 
        folderId 
      });
      setActiveNoteId(newNote.id);
      setShowMobileSidebar(false);
      if (title) {
        toast.success(`Created "${title}"`);
      } else {
        toast.success('Note created');
      }
      return newNote.id;
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

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyboard = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isEditing = target.tagName === 'INPUT' || 
                        target.tagName === 'TEXTAREA' || 
                        target.contentEditable === 'true' ||
                        target.closest('.ProseMirror');
      
      if (isEditing) return;
      
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      
      // Cmd/Ctrl + E - Create New Note
      if (modKey && e.key === 'e' && !e.shiftKey) {
        e.preventDefault();
        createNote();
        return;
      }
      
      // Cmd/Ctrl + Shift + F - Create New Folder
      if (modKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        createFolder();
        return;
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyboard);
    return () => window.removeEventListener('keydown', handleGlobalKeyboard);
  }, [createNote, createFolder]);

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

  // Show loading screen with extended message if needed
  if (showLoading) {
    return <LoadingScreen isExtended={showExtendedMessage} />;
  }

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