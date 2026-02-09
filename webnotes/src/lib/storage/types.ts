// src/lib/storage/types.ts

export interface Note {
  id: string;
  title: string | null;
  content: string | null; // Keeps HTML for fallback/search
  userId?: string;
  folderId: string | null;
  createdAt: Date;
  updatedAt: Date;
  isPinned?: boolean;
  pinnedAt?: Date | null;
  font?: string | null;

  // ✅ NEW: The CRDT Binary State (Base64 encoded string)
  // This is the source of truth for the editor content.
  yjsState?: string | null;
}

export interface Folder {
  id: string;
  name: string;
  userId?: string;
  createdAt: Date;
}

export type SyncStatus = "synced" | "syncing" | "unsynced";

export interface UserSettings {
  theme: "dark" | "light" | "system";
  fontSize: "small" | "medium" | "large";
  showLineNumbers: boolean;
  syncStatus: SyncStatus;
}

export type StorageOperation = "create" | "update" | "delete";
