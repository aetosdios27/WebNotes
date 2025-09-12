// src/lib/storage/hybrid-storage.ts
import { LocalStorageAdapter } from './local-storage';
import { CloudStorageAdapter } from './cloud-storage';
import type { Note, Folder, UserSettings } from './types';

export class HybridStorageAdapter {
  private local: LocalStorageAdapter;
  private cloud: CloudStorageAdapter;
  private isOnline: boolean = typeof window !== 'undefined' && navigator.onLine;
  private isAuthenticated: boolean = false;

  constructor() {
    this.local = new LocalStorageAdapter();
    this.cloud = new CloudStorageAdapter();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.sync();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });

      // Check authentication status
      this.checkAuth();
    }
  }

  private async checkAuth(): Promise<void> {
    try {
      const response = await fetch('/api/auth/session');
      const session = await response.json();
      this.isAuthenticated = !!session?.user;
      
      // If just authenticated, migrate local data
      if (this.isAuthenticated) {
        await this.migrateLocalToCloud();
      }
    } catch {
      this.isAuthenticated = false;
    }
  }

  private async migrateLocalToCloud(): Promise<void> {
    try {
      const localNotes = await this.local.getNotes();
      const localFolders = await this.local.getFolders();
      
      // Skip if no local data
      if (localNotes.length === 0 && localFolders.length === 0) return;
      
      console.log('Migrating local data to cloud...');
      
      // Migrate folders first
      for (const folder of localFolders) {
        try {
          await this.cloud.createFolder(folder);
        } catch (error) {
          console.error('Failed to migrate folder:', folder.name, error);
        }
      }
      
      // Then migrate notes
      for (const note of localNotes) {
        try {
          await this.cloud.createNote(note);
        } catch (error) {
          console.error('Failed to migrate note:', note.title, error);
        }
      }
      
      // Clear local storage after successful migration
      localStorage.removeItem('webnotes_notes_v1');
      localStorage.removeItem('webnotes_folders_v1');
      
      console.log('Migration complete!');
    } catch (error) {
      console.error('Migration failed:', error);
    }
  }

  private async sync(): Promise<void> {
    if (!this.isOnline || !this.isAuthenticated) return;
    
    // For now, just ensure we're using cloud storage
    // In a real app, you'd implement proper sync logic here
  }

  private shouldUseCloud(): boolean {
    return this.isAuthenticated && this.isOnline;
  }

  // Notes
  async getNotes(): Promise<Note[]> {
    if (this.shouldUseCloud()) {
      try {
        return await this.cloud.getNotes();
      } catch (error) {
        console.error('Failed to fetch from cloud, falling back to local:', error);
        return this.local.getNotes();
      }
    }
    return this.local.getNotes();
  }

  async createNote(note: Partial<Note>): Promise<Note> {
    if (this.shouldUseCloud()) {
      try {
        return await this.cloud.createNote(note);
      } catch (error) {
        console.error('Failed to create in cloud, saving locally:', error);
        return this.local.createNote(note);
      }
    }
    return this.local.createNote(note);
  }

  async updateNote(id: string, data: Partial<Note>): Promise<Note> {
    if (this.shouldUseCloud()) {
      try {
        return await this.cloud.updateNote(id, data);
      } catch (error) {
        console.error('Failed to update in cloud, updating locally:', error);
        return this.local.updateNote(id, data);
      }
    }
    return this.local.updateNote(id, data);
  }

  async deleteNote(id: string): Promise<void> {
    if (this.shouldUseCloud()) {
      try {
        await this.cloud.deleteNote(id);
      } catch (error) {
        console.error('Failed to delete from cloud, deleting locally:', error);
        await this.local.deleteNote(id);
      }
    } else {
      await this.local.deleteNote(id);
    }
  }

  // Folders
  async getFolders(): Promise<Folder[]> {
    if (this.shouldUseCloud()) {
      try {
        return await this.cloud.getFolders();
      } catch (error) {
        console.error('Failed to fetch folders from cloud, falling back to local:', error);
        return this.local.getFolders();
      }
    }
    return this.local.getFolders();
  }

  async createFolder(folder: Partial<Folder>): Promise<Folder> {
    if (this.shouldUseCloud()) {
      try {
        return await this.cloud.createFolder(folder);
      } catch (error) {
        console.error('Failed to create folder in cloud, saving locally:', error);
        return this.local.createFolder(folder);
      }
    }
    return this.local.createFolder(folder);
  }

  async updateFolder(id: string, data: Partial<Folder>): Promise<Folder> {
    if (this.shouldUseCloud()) {
      try {
        return await this.cloud.updateFolder(id, data);
      } catch (error) {
        console.error('Failed to update folder in cloud, updating locally:', error);
        return this.local.updateFolder(id, data);
      }
    }
    return this.local.updateFolder(id, data);
  }

  async deleteFolder(id: string): Promise<void> {
    if (this.shouldUseCloud()) {
      try {
        await this.cloud.deleteFolder(id);
      } catch (error) {
        console.error('Failed to delete folder from cloud, deleting locally:', error);
        await this.local.deleteFolder(id);
      }
    } else {
      await this.local.deleteFolder(id);
    }
  }

  // Settings
  async getSettings(): Promise<UserSettings> {
    if (this.shouldUseCloud()) {
      try {
        return await this.cloud.getSettings();
      } catch {
        return this.local.getSettings();
      }
    }
    return this.local.getSettings();
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<void> {
    await this.local.updateSettings(settings);
    
    if (this.shouldUseCloud()) {
      try {
        await this.cloud.updateSettings(settings);
      } catch (error) {
        console.error('Failed to sync settings to cloud:', error);
      }
    }
  }

  // Public method to trigger auth check (call after sign in/out)
  async refreshAuth(): Promise<void> {
    await this.checkAuth();
  }
}