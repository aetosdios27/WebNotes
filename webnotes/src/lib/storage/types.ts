// src/lib/storage/types.ts
export interface Note {
  id: string;
  title: string | null;
  content: string | null;
  userId?: string;
  folderId: string | null;
  createdAt: Date;
  updatedAt: Date;
  isPinned?: boolean;
  pinnedAt?: Date | null;
}

export interface Folder {
  id: string;
  name: string;
  userId?: string;
  createdAt: Date;
}

export interface UserSettings {
  theme: 'dark' | 'light' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  showLineNumbers: boolean;
  syncStatus: 'synced' | 'unsynced' | 'syncing';
}

export type StorageOperation = 'create' | 'update' | 'delete';