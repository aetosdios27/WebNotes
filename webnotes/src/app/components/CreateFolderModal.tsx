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
      <DialogContent className="bg-panel border border-line text-ink sm:max-w-[460px] shadow-2xl p-0 gap-0 overflow-hidden">
        {/* Header Section */}
        <DialogHeader className="p-6 pb-4 border-b border-line bg-panel">
          <DialogTitle className="flex items-center gap-3 text-xl font-semibold tracking-tight text-ink">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-panel border border-line shadow-inner">
              <FolderPlus className="w-5 h-5 text-ink" />
            </div>
            <span>Create new folder</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {/* Body Section */}
          <div className="p-6 space-y-4 bg-panel">
            <div className="space-y-2">
              <label
                htmlFor="folder-name"
                className="text-xs font-medium  tracking-normal text-muted ml-1"
              >
                Folder name
              </label>
              <div className="relative group">
                <Input
                  id="folder-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Project Obsidian Killer"
                  className="
                    h-12
                    bg-panel
                    border-line
                    text-ink
                    text-base
                    placeholder:text-muted
                    rounded-lg
                    focus-visible:ring-2
                    focus-visible:ring-muted
                    focus-visible:border-line
                    group-hover:border-line
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
          <DialogFooter className="p-6 pt-2 bg-panel flex flex-row justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-line bg-transparent hover:bg-panel text-muted hover:text-ink h-11 px-6"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="bg-highlight hover:bg-highlight/90 text-[#111110] font-bold h-11 px-8   transition-all duration-200   disabled:opacity-50 disabled:shadow-none disabled:hover:scale-100"
            >
              {isSubmitting ? "Creating..." : "Create Folder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
