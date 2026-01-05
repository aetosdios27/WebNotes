"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { useNotesStore } from "@/store/useNotesStore"; // <--- CHANGE IMPORT
import { FolderPlus } from "lucide-react";
import { toast } from "sonner"; // Assuming you use sonner for toasts

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateFolderModal({ isOpen, onClose }: CreateFolderModalProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // <--- USE ZUSTAND STORE
  const createFolder = useNotesStore((state) => state.createFolder);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await createFolder({ name: name.trim() });
      toast.success("Folder created");
      setName("");
      onClose();
    } catch (error) {
      console.error("Failed to create folder", error);
      toast.error("Failed to create folder");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border border-zinc-800 text-zinc-100 sm:max-w-[460px] shadow-2xl p-0 gap-0 overflow-hidden">
        {/* Header Section */}
        <DialogHeader className="p-6 pb-4 border-b border-zinc-900 bg-zinc-950/50">
          <DialogTitle className="flex items-center gap-3 text-xl font-semibold tracking-tight text-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 shadow-inner">
              <FolderPlus className="w-5 h-5 text-yellow-500" />
            </div>
            <span>Create New Folder</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {/* Body Section */}
          <div className="p-6 space-y-4 bg-zinc-950/80">
            <div className="space-y-2">
              <label
                htmlFor="folder-name"
                className="text-xs font-medium uppercase tracking-wider text-zinc-500 ml-1"
              >
                Folder Name
              </label>
              <div className="relative group">
                <Input
                  id="folder-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Project Obsidian Killer"
                  className="
                    h-12
                    bg-zinc-900/50
                    border-zinc-800
                    text-zinc-100
                    text-base
                    placeholder:text-zinc-700
                    rounded-lg
                    focus-visible:ring-2
                    focus-visible:ring-yellow-500/20
                    focus-visible:border-yellow-500
                    group-hover:border-zinc-700
                    transition-all
                    duration-200
                  "
                  autoFocus
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

          {/* Footer Section */}
          <DialogFooter className="p-6 pt-2 bg-zinc-900/30 flex flex-row justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-zinc-800 bg-transparent hover:bg-zinc-900 text-zinc-400 hover:text-white h-11 px-6"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="bg-yellow-500 hover:bg-yellow-400 text-zinc-950 font-bold h-11 px-8 shadow-[0_0_20px_-5px_rgba(234,179,8,0.4)] hover:shadow-[0_0_25px_-5px_rgba(234,179,8,0.6)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:shadow-none disabled:hover:scale-100"
            >
              {isSubmitting ? "Creating..." : "Create Folder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
