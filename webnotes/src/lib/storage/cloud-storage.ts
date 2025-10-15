// src/lib/storage/cloud-storage.ts
import type { Note, Folder, UserSettings } from './types';

export class CloudStorageAdapter {
  private async fetchWithAuth(url: string, options: RequestInit = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return response;
  }

  // Notes
  async getNotes(): Promise<Note[]> {
    const response = await this.fetchWithAuth('/api/notes');
    return response.json();
  }

  async createNote(note: Partial<Note>): Promise<Note> {
    const response = await this.fetchWithAuth('/api/notes', {
      method: 'POST',
      body: JSON.stringify({
        title: note.title,
        content: note.content,
        folderId: note.folderId,
      }),
    });
    return response.json();
  }

  async updateNote(id: string, data: Partial<Note>): Promise<Note> {
    const response = await this.fetchWithAuth(`/api/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        htmlContent: data.content,
        textContent: data.title,
      }),
    });
    return response.json();
  }

  async deleteNote(id: string): Promise<void> {
    await this.fetchWithAuth(`/api/notes/${id}`, {
      method: 'DELETE',
    });
  }

  // Toggle pin status - UPDATED
  async togglePin(id: string): Promise<Note> {
    const response = await this.fetchWithAuth(`/api/notes/${id}/pin`, {
      method: 'PATCH',
    });
    // Now the API returns the full updated note
    return response.json();
  }

  // Folders
  async getFolders(): Promise<Folder[]> {
    const response = await this.fetchWithAuth('/api/folders');
    const data = await response.json();
    return data.folders || [];
  }

  async createFolder(folder: Partial<Folder>): Promise<Folder> {
    const response = await this.fetchWithAuth('/api/folders', {
      method: 'POST',
      body: JSON.stringify({ name: folder.name }),
    });
    const data = await response.json();
    return data.folder;
  }

  async updateFolder(id: string, data: Partial<Folder>): Promise<Folder> {
    const response = await this.fetchWithAuth(`/api/folders/${id}/rename`, {
      method: 'PATCH',
      body: JSON.stringify({ newName: data.name }),
    });
    return response.json();
  }

  async deleteFolder(id: string): Promise<void> {
    await this.fetchWithAuth(`/api/folders/${id}`, {
      method: 'DELETE',
    });
  }

  // Settings
  async getSettings(): Promise<UserSettings> {
    return {
      theme: 'dark',
      fontSize: 'medium',
      showLineNumbers: false,
      syncStatus: 'synced',
    };
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<void> {
    console.log('Settings update not implemented yet:', settings);
  }
}