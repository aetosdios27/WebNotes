// src/lib/effect/services.ts
// Service definitions (dependency injection)

import { Context, Layer, Effect } from "effect";
import type { Note, Folder } from "@/lib/storage/types";

// Define what a NoteRepository can do
export interface NoteRepository {
  readonly getAll: () => Effect.Effect<Note[], Error>;
  readonly getById: (id: string) => Effect.Effect<Note | null, Error>;
  readonly create: (note: Partial<Note>) => Effect.Effect<Note, Error>;
  readonly update: (
    id: string,
    data: Partial<Note>
  ) => Effect.Effect<Note, Error>;
  readonly delete: (id: string) => Effect.Effect<void, Error>;
}

// Create a "tag" for dependency injection
export class NoteRepositoryService extends Context.Tag("NoteRepository")<
  NoteRepositoryService,
  NoteRepository
>() {}

// Define what a FolderRepository can do
export interface FolderRepository {
  readonly getAll: () => Effect.Effect<Folder[], Error>;
  readonly create: (folder: Partial<Folder>) => Effect.Effect<Folder, Error>;
  readonly update: (
    id: string,
    data: Partial<Folder>
  ) => Effect.Effect<Folder, Error>;
  readonly delete: (id: string) => Effect.Effect<void, Error>;
}

export class FolderRepositoryService extends Context.Tag("FolderRepository")<
  FolderRepositoryService,
  FolderRepository
>() {}

// Network status service
export interface NetworkStatus {
  readonly isOnline: () => Effect.Effect<boolean, never>;
  readonly waitForOnline: () => Effect.Effect<void, never>;
}

export class NetworkStatusService extends Context.Tag("NetworkStatus")<
  NetworkStatusService,
  NetworkStatus
>() {}
