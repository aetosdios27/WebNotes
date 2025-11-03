'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Command } from 'cmdk';
import { 
  Search, 
  FilePlus, 
  FolderPlus, 
  FileText, 
  LogOut,
  Trash2,
  Home,
  Pin,
  Folder as FolderIcon,
  Calendar,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Note, Folder } from '@/lib/storage/types';
import { signOut } from 'next-auth/react';
import Highlighter from 'react-highlight-words';

interface CommandPaletteProps {
  notes: Note[];
  folders: Folder[];
  activeNoteId: string | null;
  setActiveNoteId: (id: string | null) => void;
  createNote: (folderId?: string | null, title?: string) => Promise<string | null>;
  createFolder: () => void;
  deleteNote: (id: string) => void;
  togglePin?: (noteId: string) => void;
}

type SearchFilter = 'all' | 'pinned' | 'recent' | 'folder';

export default function CommandPalette({
  notes,
  folders,
  activeNoteId,
  setActiveNoteId,
  createNote,
  createFolder,
  deleteNote,
  togglePin
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pages, setPages] = useState<string[]>(['home']);
  const [searchFilter, setSearchFilter] = useState<SearchFilter>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  const activePage = pages[pages.length - 1];
  const isHome = activePage === 'home';

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Save search to recent when selecting a note
  const saveRecentSearch = useCallback((term: string) => {
    if (!term.trim()) return;
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  }, [recentSearches]);

  // Toggle command palette with Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      
      // Quick shortcuts
      if (!open) {
        // Cmd+N - New Note
        if (e.key === 'n' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
          e.preventDefault();
          createNote();
        }
        
        // Cmd+Shift+N - New Folder
        if (e.key === 'N' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
          e.preventDefault();
          createFolder();
        }

        // Cmd+Shift+F - Open search with focus
        if (e.key === 'F' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
          e.preventDefault();
          setOpen(true);
          setSearchFilter('all');
        }
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, createNote, createFolder]);

  // Reset when closing
  useEffect(() => {
    if (!open) {
      setPages(['home']);
      setSearch('');
      setSearchFilter('all');
      setSelectedFolderId(null);
    }
  }, [open]);

  const handleSelectNote = useCallback((noteId: string) => {
    if (search) {
      saveRecentSearch(search);
    }
    setActiveNoteId(noteId);
    setOpen(false);
  }, [setActiveNoteId, search, saveRecentSearch]);

  const handleCreateNote = useCallback(async (folderId?: string | null) => {
    await createNote(folderId);
    setOpen(false);
  }, [createNote]);

  const handleCreateNoteWithTitle = useCallback(async () => {
    await createNote(null, search);
    setOpen(false);
  }, [createNote, search]);

  const handleDeleteNote = useCallback(() => {
    if (activeNoteId) {
      deleteNote(activeNoteId);
      setOpen(false);
    }
  }, [activeNoteId, deleteNote]);

  const handlePinNote = useCallback(() => {
    if (activeNoteId && togglePin) {
      togglePin(activeNoteId);
      setOpen(false);
    }
  }, [activeNoteId, togglePin]);

  const popPage = useCallback(() => {
    setPages((pages) => {
      const newPages = [...pages];
      newPages.pop();
      return newPages.length === 0 ? ['home'] : newPages;
    });
  }, []);

  // Enhanced filtering with multiple criteria
  const filteredNotes = useMemo(() => {
    let filtered = notes;

    // Apply search filter
    if (search) {
      filtered = filtered.filter(note => {
        const searchLower = search.toLowerCase();
        const titleMatch = note.title?.toLowerCase().includes(searchLower);
        const contentMatch = note.content?.toLowerCase().includes(searchLower);
        return titleMatch || contentMatch;
      });
    }

    // Apply additional filters
    switch (searchFilter) {
      case 'pinned':
        filtered = filtered.filter(note => note.isPinned);
        break;
      case 'recent':
        // Show notes from last 7 days
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = filtered.filter(note => 
          new Date(note.updatedAt) > weekAgo
        );
        break;
      case 'folder':
        if (selectedFolderId) {
          filtered = filtered.filter(note => note.folderId === selectedFolderId);
        }
        break;
    }

    // Sort by relevance (title matches first, then by recency)
    if (search) {
      filtered.sort((a, b) => {
        const searchLower = search.toLowerCase();
        const aTitle = a.title?.toLowerCase().includes(searchLower);
        const bTitle = b.title?.toLowerCase().includes(searchLower);
        
        if (aTitle && !bTitle) return -1;
        if (!aTitle && bTitle) return 1;
        
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    }

    return filtered;
  }, [notes, search, searchFilter, selectedFolderId]);

  // Get search suggestions
  const searchSuggestions = useMemo(() => {
    if (!search || search.length < 2) return [];
    
    // Extract unique words from all notes
    const words = new Set<string>();
    notes.forEach(note => {
      const text = `${note.title} ${note.content}`.toLowerCase();
      const matches = text.match(/\b\w+\b/g);
      matches?.forEach(word => {
        if (word.length > 3 && word.startsWith(search.toLowerCase())) {
          words.add(word);
        }
      });
    });
    
    return Array.from(words).slice(0, 3);
  }, [notes, search]);

  // Format date helper
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffHours < 24) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[100]"
            onClick={() => setOpen(false)}
          />

          {/* Command Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl z-[101]"
          >
            <Command
              className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden"
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Escape' || (e.key === 'Backspace' && !search && !isHome)) {
                  e.preventDefault();
                  if (isHome) {
                    setOpen(false);
                  } else {
                    popPage();
                  }
                }
              }}
            >
              {/* Search Input with Filters */}
              <div className="flex flex-col border-b border-zinc-800">
                <div className="flex items-center px-4">
                  <Search className="mr-2 h-4 w-4 text-zinc-400" />
                  <Command.Input
                    value={search}
                    onValueChange={setSearch}
                    placeholder={isHome ? "Search notes or type a command..." : "Search..."}
                    className="flex-1 py-3 text-sm text-white placeholder-zinc-500 bg-transparent outline-none"
                    autoFocus
                  />
                  <kbd className="ml-2 px-2 py-1 text-xs text-zinc-400 bg-zinc-800 rounded">
                    ESC
                  </kbd>
                </div>

                {/* Filter Pills */}
                {search && (
                  <div className="flex items-center gap-2 px-4 pb-2">
                    <span className="text-xs text-zinc-500">Filter:</span>
                    {(['all', 'pinned', 'recent'] as SearchFilter[]).map(filter => (
                      <button
                        key={filter}
                        onClick={() => setSearchFilter(filter)}
                        className={`px-2 py-1 text-xs rounded-full transition-colors ${
                          searchFilter === filter 
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' 
                            : 'bg-zinc-800 text-zinc-400 hover:text-zinc-300'
                        }`}
                      >
                        {filter === 'all' && 'All'}
                        {filter === 'pinned' && '📌 Pinned'}
                        {filter === 'recent' && '🕐 Recent'}
                      </button>
                    ))}
                  </div>
                )}

                {/* Search Suggestions */}
                {searchSuggestions.length > 0 && (
                  <div className="flex items-center gap-2 px-4 pb-2">
                    <Sparkles className="h-3 w-3 text-yellow-500" />
                    <span className="text-xs text-zinc-500">Try:</span>
                    {searchSuggestions.map(suggestion => (
                      <button
                        key={suggestion}
                        onClick={() => setSearch(suggestion)}
                        className="px-2 py-1 text-xs bg-zinc-800 text-zinc-400 rounded hover:bg-zinc-700 hover:text-zinc-300"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Results */}
              <Command.List className="max-h-96 overflow-y-auto p-2">
                {/* Custom Empty State */}
                {search && filteredNotes.length === 0 && (
                  <div className="py-8 text-center">
                    <div className="text-zinc-500 mb-4">
                      <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No notes found for &quot;{search}&quot;</p>
                    </div>
                    <div className="space-y-2">
                      <button
                        onClick={handleCreateNoteWithTitle}
                        className="mx-auto flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                      >
                        <FilePlus className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm text-zinc-300">Create &quot;{search}&quot;</span>
                      </button>
                      {recentSearches.length > 0 && (
                        <div className="pt-4">
                          <p className="text-xs text-zinc-600 mb-2">Recent searches:</p>
                          <div className="flex flex-wrap gap-2 justify-center">
                            {recentSearches.map(term => (
                              <button
                                key={term}
                                onClick={() => setSearch(term)}
                                className="px-2 py-1 text-xs bg-zinc-800/50 text-zinc-500 rounded hover:bg-zinc-800 hover:text-zinc-400"
                              >
                                {term}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Home Page */}
                {isHome && !search && (
                  <>
                    {/* Recent Searches */}
                    {recentSearches.length > 0 && (
                      <Command.Group heading="Recent Searches" className="text-xs text-zinc-500 p-2">
                        {recentSearches.map(term => (
                          <Command.Item
                            key={term}
                            value={term}
                            onSelect={() => setSearch(term)}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 rounded cursor-pointer hover:bg-zinc-800 hover:text-white data-[selected=true]:bg-zinc-800 data-[selected=true]:text-white"
                          >
                            <Search className="h-3 w-3 text-zinc-500" />
                            {term}
                          </Command.Item>
                        ))}
                      </Command.Group>
                    )}

                    {/* Recent Notes */}
                    {notes.length > 0 && (
                      <Command.Group heading="Recent Notes" className="text-xs text-zinc-500 p-2">
                        {notes.slice(0, 3).map((note) => (
                          <Command.Item
                            key={note.id}
                            value={`${note.title} ${note.content}`}
                            onSelect={() => handleSelectNote(note.id)}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 rounded cursor-pointer hover:bg-zinc-800 hover:text-white data-[selected=true]:bg-zinc-800 data-[selected=true]:text-white"
                          >
                            <FileText className="h-4 w-4 text-zinc-500" />
                            <div className="flex-1 overflow-hidden">
                              <div className="font-medium truncate">
                                {note.title || 'Untitled'}
                              </div>
                              {note.content && (
                                <div className="text-xs text-zinc-500 truncate">
                                  {note.content.substring(0, 50)}
                                </div>
                              )}
                            </div>
                            {note.isPinned && (
                              <Pin className="h-3 w-3 text-yellow-500" fill="currentColor" />
                            )}
                          </Command.Item>
                        ))}
                      </Command.Group>
                    )}

                    {/* Quick Actions */}
                    <Command.Group heading="Quick Actions" className="text-xs text-zinc-500 p-2">
                      <Command.Item
                        value="new note"
                        onSelect={() => handleCreateNote()}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 rounded cursor-pointer hover:bg-zinc-800 hover:text-white data-[selected=true]:bg-zinc-800 data-[selected=true]:text-white"
                      >
                        <FilePlus className="h-4 w-4 text-zinc-500" />
                        New Note
                        <kbd className="ml-auto text-xs text-zinc-500">⌘N</kbd>
                      </Command.Item>

                      <Command.Item
                        value="new folder"
                        onSelect={() => {
                          createFolder();
                          setOpen(false);
                        }}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 rounded cursor-pointer hover:bg-zinc-800 hover:text-white data-[selected=true]:bg-zinc-800 data-[selected=true]:text-white"
                      >
                        <FolderPlus className="h-4 w-4 text-zinc-500" />
                        New Folder
                        <kbd className="ml-auto text-xs text-zinc-500">⌘⇧N</kbd>
                      </Command.Item>

                      {activeNoteId && (
                        <>
                          <Command.Item
                            value="pin note toggle pin"
                            onSelect={handlePinNote}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 rounded cursor-pointer hover:bg-zinc-800 hover:text-white data-[selected=true]:bg-zinc-800 data-[selected=true]:text-white"
                          >
                            <Pin className="h-4 w-4 text-zinc-500" />
                            Toggle Pin
                          </Command.Item>

                          <Command.Item
                            value="delete note"
                            onSelect={handleDeleteNote}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-red-400 rounded cursor-pointer hover:bg-zinc-800 hover:text-red-300 data-[selected=true]:bg-zinc-800 data-[selected=true]:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete Current Note
                          </Command.Item>
                        </>
                      )}
                    </Command.Group>

                    {/* Navigation */}
                    <Command.Group heading="Navigation" className="text-xs text-zinc-500 p-2">
                      <Command.Item
                        value="go home"
                        onSelect={() => {
                          setActiveNoteId(null);
                          setOpen(false);
                        }}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 rounded cursor-pointer hover:bg-zinc-800 hover:text-white data-[selected=true]:bg-zinc-800 data-[selected=true]:text-white"
                      >
                        <Home className="h-4 w-4 text-zinc-500" />
                        Go Home
                      </Command.Item>

                      <Command.Item
                        value="sign out logout"
                        onSelect={() => {
                          signOut();
                          setOpen(false);
                        }}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 rounded cursor-pointer hover:bg-zinc-800 hover:text-white data-[selected=true]:bg-zinc-800 data-[selected=true]:text-white"
                      >
                        <LogOut className="h-4 w-4 text-zinc-500" />
                        Sign Out
                      </Command.Item>
                    </Command.Group>

                    {/* Folders for creating notes */}
                    {folders.length > 0 && (
                      <Command.Group heading="Create Note In..." className="text-xs text-zinc-500 p-2">
                        {folders.map((folder) => (
                          <Command.Item
                            key={folder.id}
                            value={`new note in ${folder.name}`}
                            onSelect={() => handleCreateNote(folder.id)}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 rounded cursor-pointer hover:bg-zinc-800 hover:text-white data-[selected=true]:bg-zinc-800 data-[selected=true]:text-white"
                          >
                            <FolderPlus className="h-4 w-4 text-yellow-500" />
                            New note in &quot;{folder.name}&quot;
                          </Command.Item>
                        ))}
                      </Command.Group>
                    )}
                  </>
                )}

                {/* Search Results with Highlighting */}
                {search && filteredNotes.length > 0 && (
                  <Command.Group heading={`Found ${filteredNotes.length} notes`} className="text-xs text-zinc-500 p-2">
                    {filteredNotes.slice(0, 10).map((note) => {
                      const folder = folders.find(f => f.id === note.folderId);
                      
                      return (
                        <Command.Item
                          key={note.id}
                          value={`${note.title} ${note.content}`}
                          onSelect={() => handleSelectNote(note.id)}
                          className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 rounded cursor-pointer hover:bg-zinc-800 hover:text-white data-[selected=true]:bg-zinc-800 data-[selected=true]:text-white group"
                        >
                          <FileText className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                          <div className="flex-1 overflow-hidden">
                            <div className="font-medium truncate">
                              <Highlighter
                                highlightClassName="bg-yellow-500/30 text-yellow-300"
                                searchWords={[search]}
                                autoEscape={true}
                                textToHighlight={note.title || 'Untitled'}
                              />
                            </div>
                            {note.content && (
                              <div className="text-xs text-zinc-500 truncate">
                                <Highlighter
                                  highlightClassName="bg-yellow-500/20 text-yellow-400"
                                  searchWords={[search]}
                                  autoEscape={true}
                                  textToHighlight={note.content.substring(0, 100)}
                                />
                              </div>
                            )}
                            <div className="flex items-center gap-3 mt-1">
                              {folder && (
                                <span className="text-xs text-zinc-600 flex items-center gap-1">
                                  <FolderIcon className="h-3 w-3" />
                                  {folder.name}
                                </span>
                              )}
                              <span className="text-xs text-zinc-600 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(note.updatedAt)}
                              </span>
                            </div>
                          </div>
                          {note.isPinned && (
                            <Pin className="h-3 w-3 text-yellow-500 flex-shrink-0" fill="currentColor" />
                          )}
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                )}
              </Command.List>

              {/* Footer */}
              <div className="border-t border-zinc-800 px-4 py-2 flex items-center justify-between text-xs text-zinc-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">↑↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">↵</kbd>
                    Select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">⌘⇧F</kbd>
                    Search
                  </span>
                </div>
                {search && (
                  <span>{filteredNotes.length} results</span>
                )}
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}