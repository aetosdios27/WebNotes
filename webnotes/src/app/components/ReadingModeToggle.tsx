"use client";

import { BookOpen, Pencil } from "lucide-react";
import { Button } from "@/app/components/ui/button"; // Reuse your UI button for perfect match

interface ReadingModeToggleProps {
  isReading: boolean;
  onToggle: () => void;
}

export default function ReadingModeToggle({
  isReading,
  onToggle,
}: ReadingModeToggleProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      // Match NoteSettings classes exactly
      className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
      onClick={onToggle}
      title={isReading ? "Switch to Edit Mode" : "Switch to Reading Mode"}
    >
      {isReading ? (
        <Pencil className="h-4 w-4" />
      ) : (
        <BookOpen className="h-4 w-4" />
      )}
    </Button>
  );
}
