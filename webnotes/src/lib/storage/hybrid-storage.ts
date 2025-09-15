// src/lib/storage/hybrid-storage.ts
import { LocalStorageAdapter } from './local-storage';
import { CloudStorageAdapter } from './cloud-storage';
import type { Note, Folder, UserSettings } from './types';

export class HybridStorageAdapter {
  private local: LocalStorageAdapter;
  private cloud: CloudStorageAdapter;
  private isOnline: boolean = typeof window !== 'undefined' && navigator.onLine;
  private isAuthenticated: boolean = false;
  private hasMigrated: boolean = false;

  constructor() {
    this.local = new LocalStorageAdapter();
    this.cloud = new CloudStorageAdapter();

    if (typeof window !== 'undefined') {
      // Check if we've already migrated
      this.hasMigrated = localStorage.getItem('webnotes_migrated') === 'true';
      
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
      const wasAuthenticated = this.isAuthenticated;
      this.isAuthenticated = !!session?.user;
      
      // If just authenticated and haven't migrated yet, migrate local data
      if (this.isAuthenticated && !wasAuthenticated && !this.hasMigrated) {
        console.log('User just logged in, migrating local data...');
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
      
      console.log(`Found ${localNotes.length} local notes and ${localFolders.length} local folders to migrate`);
      
      // Skip if no local data
      if (localNotes.length === 0 && localFolders.length === 0) {
        this.hasMigrated = true;
        localStorage.setItem('webnotes_migrated', 'true');
        return;
      }
      
      // Create a mapping of old folder IDs to new ones
      const folderIdMap = new Map<string, string>();
      
      // Migrate folders first
      for (const folder of localFolders) {
        try {
          console.log(`Migrating folder: ${folder.name}`);
          const cloudFolder = await this.cloud.createFolder({
            name: folder.name,
            createdAt: folder.createdAt
          });
          folderIdMap.set(folder.id, cloudFolder.id);
        } catch (error) {
          console.error('Failed to migrate folder:', folder.name, error);
        }
      }
      
      // Then migrate notes with updated folder IDs
      for (const note of localNotes) {
        try {
          console.log(`Migrating note: ${note.title}`);
          // Map the local folder ID to the new cloud folder ID
          const newFolderId = note.folderId ? (folderIdMap.get(note.folderId) || null) : null;
          
          await this.cloud.createNote({
            title: note.title,
            content: note.content,
            folderId: newFolderId, // Use mapped ID instead of original
            createdAt: note.createdAt,
            isPinned: note.isPinned,
            pinnedAt: note.pinnedAt
          });
        } catch (error) {
          console.error('Failed to migrate note:', note.title, error);
          // If it fails due to folder constraint, try again without folder
          if (error instanceof Error && error.message.includes('P2003')) {
            try {
              console.log('Retrying note migration without folder...');
              await this.cloud.createNote({
                title: note.title,
                content: note.content,
                folderId: null, // Remove folder association
                createdAt: note.createdAt,
                isPinned: note.isPinned,
                pinnedAt: note.pinnedAt
              });
            } catch (retryError) {
              console.error('Failed to migrate note even without folder:', note.title, retryError);
            }
          }
        }
      }
      
      // Mark as migrated
      this.hasMigrated = true;
      localStorage.setItem('webnotes_migrated', 'true');
      
      // Clear local storage after successful migration
      localStorage.removeItem('webnotes_notes_v1');
      localStorage.removeItem('webnotes_folders_v1');
      
      console.log('Migration complete!');
      
      // Trigger a refresh to show the migrated data
      window.location.reload();
    } catch (error) {
      console.error('Migration failed:', error);
      this.hasMigrated = false;
    }
  }

  private async sync(): Promise<void> {
    if (!this.isOnline || !this.isAuthenticated) return;
    
    // Check if we need to migrate
    if (!this.hasMigrated) {
      await this.migrateLocalToCloud();
    }
  }

  private shouldUseCloud(): boolean {
    return this.isAuthenticated && this.isOnline;
  }

  // Notes
  async getNotes(): Promise<Note[]> {
    if (this.shouldUseCloud()) {
      try {
        const notes = await this.cloud.getNotes();
        console.log(`Fetched ${notes.length} notes from cloud`);
        return notes;
      } catch (error) {
        console.error('Failed to fetch from cloud, falling back to local:', error);
        return this.local.getNotes();
      }
    }
    const notes = await this.local.getNotes();
    console.log(`Fetched ${notes.length} notes from local storage`);
    return notes;
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
        const folders = await this.cloud.getFolders();
        console.log(`Fetched ${folders.length} folders from cloud`);
        return folders;
      } catch (error) {
        console.error('Failed to fetch folders from cloud, falling back to local:', error);
        return this.local.getFolders();
      }
    }
    const folders = await this.local.getFolders();
    console.log(`Fetched ${folders.length} folders from local storage`);
    return folders;
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
  
  // Reset migration flag (useful for testing)
  resetMigration(): void {
    localStorage.removeItem('webnotes_migrated');
    this.hasMigrated = false;
  }
}