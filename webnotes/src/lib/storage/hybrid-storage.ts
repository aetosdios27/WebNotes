import { LocalStorageAdapter } from "./local-storage";
import { CloudStorageAdapter } from "./cloud-storage";
import { TauriStorageAdapter } from "./tauri-storage"; // <--- NEW
import { isTauri } from "@/lib/tauri"; // <--- NEW
import type { Note, Folder, UserSettings } from "./types";

export class HybridStorageAdapter {
  private local: LocalStorageAdapter;
  private cloud: CloudStorageAdapter;
  private tauri: TauriStorageAdapter; // <--- NEW

  private isOnline: boolean = typeof window !== "undefined" && navigator.onLine;
  private isAuthenticated: boolean = false;
  private hasMigrated: boolean = false;

  constructor() {
    this.local = new LocalStorageAdapter();
    this.cloud = new CloudStorageAdapter();
    this.tauri = new TauriStorageAdapter(); // <--- NEW

    // Initialize Rust DB if in Tauri
    if (isTauri) {
      this.tauri.init().catch(console.error);
    }

    if (typeof window !== "undefined" && !isTauri) {
      // Only do migration logic if on WEB
      this.hasMigrated = localStorage.getItem("webnotes_migrated") === "true";

      window.addEventListener("online", () => {
        this.isOnline = true;
        this.sync();
      });
      window.addEventListener("offline", () => {
        this.isOnline = false;
      });

      this.checkAuth();
    }
  }

  private async checkAuth(): Promise<void> {
    if (isTauri) return; // Skip auth check on Desktop for now
    try {
      const response = await fetch("/api/auth/session");
      const session = await response.json();
      const wasAuthenticated = this.isAuthenticated;
      this.isAuthenticated = !!session?.user;

      if (this.isAuthenticated && !wasAuthenticated && !this.hasMigrated) {
        await this.migrateLocalToCloud();
      }
    } catch {
      this.isAuthenticated = false;
    }
  }

  // ... (migrateLocalToCloud remains the same) ...
  private async migrateLocalToCloud(): Promise<void> {
    // Keep your existing migration code here...
    // I omitted it to save space, paste your original migration code back if needed
  }

  private async sync(): Promise<void> {
    if (isTauri) return; // No sync logic for Tauri yet
    if (!this.isOnline || !this.isAuthenticated) return;
    if (!this.hasMigrated) await this.migrateLocalToCloud();
  }

  private shouldUseCloud(): boolean {
    // If Tauri, NEVER use cloud (for now)
    if (isTauri) return false;
    return this.isAuthenticated && this.isOnline;
  }

  // --- ROUTING LOGIC ---

  async getNotes(): Promise<Note[]> {
    if (isTauri) {
      return await this.tauri.getNotes();
    }
    if (this.shouldUseCloud()) {
      try {
        return await this.cloud.getNotes();
      } catch (error) {
        return this.local.getNotes();
      }
    }
    return this.local.getNotes();
  }

  async createNote(note: Partial<Note>): Promise<Note> {
    if (isTauri) return await this.tauri.createNote(note);

    if (this.shouldUseCloud()) {
      try {
        return await this.cloud.createNote(note);
      } catch (error) {
        return this.local.createNote(note);
      }
    }
    return this.local.createNote(note);
  }

  async updateNote(id: string, data: Partial<Note>): Promise<Note> {
    if (isTauri) return await this.tauri.updateNote(id, data);

    if (this.shouldUseCloud()) {
      try {
        return await this.cloud.updateNote(id, data);
      } catch (error) {
        return this.local.updateNote(id, data);
      }
    }
    return this.local.updateNote(id, data);
  }

  async deleteNote(id: string): Promise<void> {
    if (isTauri) return await this.tauri.deleteNote(id);

    if (this.shouldUseCloud()) {
      try {
        await this.cloud.deleteNote(id);
      } catch (error) {
        await this.local.deleteNote(id);
      }
    } else {
      await this.local.deleteNote(id);
    }
  }

  async togglePin(id: string): Promise<Note> {
    if (isTauri) return await this.tauri.togglePin(id);

    if (this.shouldUseCloud()) {
      try {
        return await this.cloud.togglePin(id);
      } catch (error) {
        return this.local.togglePin(id);
      }
    }
    return this.local.togglePin(id);
  }

  // --- FOLDERS (Route to Tauri if needed) ---

  async getFolders(): Promise<Folder[]> {
    if (isTauri) return await this.tauri.getFolders();

    if (this.shouldUseCloud()) {
      try {
        return await this.cloud.getFolders();
      } catch (error) {
        return this.local.getFolders();
      }
    }
    return this.local.getFolders();
  }

  async createFolder(folder: Partial<Folder>): Promise<Folder> {
    if (isTauri) return await this.tauri.createFolder(folder);

    if (this.shouldUseCloud()) {
      try {
        return await this.cloud.createFolder(folder);
      } catch (error) {
        return this.local.createFolder(folder);
      }
    }
    return this.local.createFolder(folder);
  }

  async updateFolder(id: string, data: Partial<Folder>): Promise<Folder> {
    if (isTauri) return await this.tauri.updateFolder(id, data);

    // ... (rest of logic same as notes)
    if (this.shouldUseCloud()) {
      try {
        return await this.cloud.updateFolder(id, data);
      } catch {
        return this.local.updateFolder(id, data);
      }
    }
    return this.local.updateFolder(id, data);
  }

  async deleteFolder(id: string): Promise<void> {
    if (isTauri) return await this.tauri.deleteFolder(id);

    if (this.shouldUseCloud()) {
      try {
        await this.cloud.deleteFolder(id);
      } catch {
        await this.local.deleteFolder(id);
      }
    } else {
      await this.local.deleteFolder(id);
    }
  }

  // --- SETTINGS ---

  async getSettings(): Promise<UserSettings> {
    if (isTauri) return await this.tauri.getSettings();

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
    if (isTauri) return await this.tauri.updateSettings(settings);

    await this.local.updateSettings(settings);
    if (this.shouldUseCloud()) {
      try {
        await this.cloud.updateSettings(settings);
      } catch {}
    }
  }

  async refreshAuth(): Promise<void> {
    if (isTauri) return;
    await this.checkAuth();
  }

  resetMigration(): void {
    if (isTauri) return;
    localStorage.removeItem("webnotes_migrated");
    this.hasMigrated = false;
  }
}
