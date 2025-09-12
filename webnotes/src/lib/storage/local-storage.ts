// src/lib/storage/local-storage.ts
import { v4 as uuidv4 } from 'uuid';
import type { Note, Folder, UserSettings } from './types';

export class LocalStorageAdapter {
  private getNotesKey() {
    return 'webnotes_notes_v1';
  }

  private getFoldersKey() {
    return 'webnotes_folders_v1';
  }

  private getSettingsKey() {
    return 'webnotes_settings_v1';
  }

  private load<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private save<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  // Notes
  async getNotes(): Promise<Note[]> {
    return this.load(this.getNotesKey(), []);
  }

  async createNote(note: Partial<Note>): Promise<Note> {
    const newNote: Note = {
      id: note.id || uuidv4(),
      title: note.title || 'Untitled',
      content: note.content || '',
      folderId: note.folderId || null,
      createdAt: note.createdAt || new Date(),
      updatedAt: note.updatedAt || new Date(),
      isPinned: note.isPinned || false,
      pinnedAt: note.pinnedAt || null,
    };

    const notes = await this.getNotes();
    const updatedNotes = [newNote, ...notes];
    this.save(this.getNotesKey(), updatedNotes);
    
    return newNote;
  }

  async updateNote(id: string, data: Partial<Note>): Promise<Note> {
    const notes = await this.getNotes();
    const updatedNotes = notes.map(note => 
      note.id === id ? { ...note, ...data, updatedAt: new Date() } : note
    );
    this.save(this.getNotesKey(), updatedNotes);
    
    return updatedNotes.find(n => n.id === id)!;
  }

  async deleteNote(id: string): Promise<void> {
    const notes = await this.getNotes();
    const updatedNotes = notes.filter(note => note.id !== id);
    this.save(this.getNotesKey(), updatedNotes);
  }

  // Folders
  async getFolders(): Promise<Folder[]> {
    return this.load(this.getFoldersKey(), []);
  }

  async createFolder(folder: Partial<Folder>): Promise<Folder> {
    const newFolder: Folder = {
      id: folder.id || uuidv4(),
      name: folder.name || 'New Folder',
      createdAt: folder.createdAt || new Date(),
    };

    const folders = await this.getFolders();
    const updatedFolders = [newFolder, ...folders];
    this.save(this.getFoldersKey(), updatedFolders);
    
    return newFolder;
  }

  async updateFolder(id: string, data: Partial<Folder>): Promise<Folder> {
    const folders = await this.getFolders();
    const updatedFolders = folders.map(folder => 
      folder.id === id ? { ...folder, ...data } : folder
    );
    this.save(this.getFoldersKey(), updatedFolders);
    
    return updatedFolders.find(f => f.id === id)!;
  }

  async deleteFolder(id: string): Promise<void> {
    const folders = await this.getFolders();
    const updatedFolders = folders.filter(folder => folder.id !== id);
    this.save(this.getFoldersKey(), updatedFolders);

    // Move notes out of deleted folder
    const notes = await this.getNotes();
    const updatedNotes = notes.map(note => 
      note.folderId === id ? { ...note, folderId: null } : note
    );
    this.save(this.getNotesKey(), updatedNotes);
  }

  // Settings
  async getSettings(): Promise<UserSettings> {
    return this.load(this.getSettingsKey(), {
      theme: 'dark',
      fontSize: 'medium',
      showLineNumbers: false,
      syncStatus: 'unsynced',
    });
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<void> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    this.save(this.getSettingsKey(), updated);
  }
}