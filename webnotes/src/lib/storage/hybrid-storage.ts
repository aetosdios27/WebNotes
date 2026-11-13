import { toast } from "sonner";
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
  private authCheck: Promise<void> | null = null;

  constructor() {
    this.local = new LocalStorageAdapter();
    this.cloud = new CloudStorageAdapter();
    this.tauri = new TauriStorageAdapter(); // <--- NEW

    // Initialize Rust DB if in Tauri
    if (isTauri) {
      this.tauri.init().catch(console.error);
    }

    if (typeof window !== "undefined" && !isTauri) {
      window.addEventListener("online", () => {
        this.isOnline = true;
        this.sync();
      });
      window.addEventListener("offline", () => {
        this.isOnline = false;
      });

      void this.checkAuth();
    }
  }

  private checkAuth(): Promise<void> {
    if (isTauri) return Promise.resolve();
    if (this.authCheck) return this.authCheck;
    this.authCheck = this.detectAuth().finally(() => { this.authCheck = null; });
    return this.authCheck;
  }

  private async detectAuth(): Promise<void> {
    let userId: string | null = null;
    try {
      const response = await fetch("/api/auth/session");
      if (!response.ok) throw new Error("Could not check session");
      const session = await response.json();
      userId = typeof session?.user?.id === "string" ? session.user.id : null;
    } catch (error) {
      console.error("Could not check session", error);
    }
    this.isAuthenticated = userId !== null;
    if (!userId) return;
    // A failed upload must not hide the account's cloud notes; device copies stay and retry.
    try {
      await this.migrateLocalToCloud(userId);
    } catch (error) {
      console.error("Account upload deferred; device notes retained", error);
      toast.error("Some notes on this device couldn't be uploaded yet. They're kept here and will retry.");
    }
  }

  private async migrateLocalToCloud(userId: string): Promise<void> {
    // New signed-out notes must still upload after an earlier migration. Check
    // metadata rather than letting the device marker hide future local work.
    const hasLocalData = ["webnotes_notes_v1", "webnotes_folders_v1"].some((key) => {
      const value = localStorage.getItem(key);
      return value !== null && value !== "[]";
    });
    if (!hasLocalData) return;
    const { migrateDeviceNotes } = await import("../migration/browser");
    await migrateDeviceNotes(userId);
  }

  private async sync(): Promise<void> {
    if (isTauri) return; // No sync logic for Tauri yet
    if (!this.isOnline) return;
    await this.checkAuth();
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
    await this.authCheck;
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

    await this.authCheck;
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
  }
}
