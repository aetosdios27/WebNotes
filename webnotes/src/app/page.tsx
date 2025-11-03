'use client';

import { useState, useCallback, useMemo } from 'react';
import Sidebar from '@/app/components/Sidebar';
import dynamic from 'next/dynamic';
import { NoteListSkeleton } from '@/app/components/NoteListSkeleton';
import { toast } from 'sonner';
import { useStorage } from '@/hooks/useStorage';
import type { Note, Folder } from '@/lib/storage/types';
import { Button } from '@/app/components/ui/button';
import { ChevronLeft, Menu } from 'lucide-react';

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
  const [showSidebar, setShowSidebar] = useState(true); // NEW: mobile sidebar state
  
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

  const createNote = useCallback(async (folderId?: string | null) => {
    try {
      const newNote = await storageCreateNote({ title: '', content: '', folderId });
      setActiveNoteId(newNote.id);
      setShowSidebar(false); // Hide sidebar on mobile when creating note
      toast.success('Note created');
    } catch (error) {
      toast.error('Failed to create note');
    }
  }, [storageCreateNote]);

  const deleteNote = useCallback(async (id: string) => {
    try {
      if (activeNoteId === id) {
        setActiveNoteId(null);
        setShowSidebar(true); // Show sidebar when deleting active note
      }
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

  // MODIFIED: When selecting note, hide sidebar on mobile
  const handleSetActiveNote = useCallback((noteId: string | null) => {
    setActiveNoteId(noteId);
    if (noteId) {
      setShowSidebar(false); // Hide sidebar on mobile when selecting note
    }
  }, []);

  const activeNote = notes.find(n => n.id === activeNoteId);

  const combinedStatus = useMemo(() => {
    if (isSaving) return 'syncing';
    return settings.syncStatus;
  }, [isSaving, settings.syncStatus]);

  return (
    <main className="flex w-screen h-screen overflow-hidden">
      {/* SIDEBAR - responsive visibility */}
      <div className={`
        h-full
        ${showSidebar ? 'block' : 'hidden md:block'}
      `}>
        {isLoading ? (
          <div className="w-full md:w-80 h-full bg-zinc-900 border-r border-zinc-800">
            <NoteListSkeleton />
          </div>
        ) : (
          <Sidebar
            notes={notes}
            folders={foldersWithNotes}
            activeNoteId={activeNoteId}
            setActiveNoteId={handleSetActiveNote}
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

      {/* EDITOR - with mobile header */}
      <div className="flex-1 h-full flex flex-col overflow-hidden">
        {/* Mobile header bar */}
        <div className="md:hidden border-b border-zinc-800 bg-zinc-900 flex items-center px-4 py-2 gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSidebar(true)}
            className="text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <Menu className="h-5 w-5" />
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
          />
        </div>
      </div>
    </main>
  );
}