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
  font?: string | null; // 👈 Added font field (optional/nullable)
}

export interface Folder {
  id: string;
  name: string;
  userId?: string;
  createdAt: Date;
}

// THE FIX: The shared type definition that everything else will use.
export type SyncStatus = 'synced' | 'syncing' | 'unsynced';

export interface UserSettings {
  theme: 'dark' | 'light' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  showLineNumbers: boolean;
  syncStatus: SyncStatus;
}

export type StorageOperation = 'create' | 'update' | 'delete';