// src/app/components/VersionPreview.tsx

"use client";

import { useEffect, useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/app/components/ui/button";
import {
  ArrowLeft,
  RotateCcw,
  Copy,
  Check,
  Columns,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import type { Note } from "@/lib/storage/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/components/ui/alert-dialog";

// Extensions
import Typography from "@tiptap/extension-typography";
import { Table, TableRow, TableHeader, TableCell } from "./extensions/table";
import { MathBlock, MathInline } from "./extensions/math";
import UniqueID from "./extensions/UniqueID";
import { computeBlockDiff } from "@/lib/logic/diff";
import { DiffHighlighter } from "./extensions/DiffHighlighter";

// Helper to ensure all blocks have IDs for diffing
function ensureBlockIds(content: any): any {
  if (!content) return { type: "doc", content: [] };

  let json = content;

  if (typeof content === "string") {
    try {
      json = JSON.parse(content);
    } catch (e) {
      return {
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: { id: crypto.randomUUID() },
            content: [{ type: "text", text: content }],
          },
        ],
      };
    }
  }

  const traverse = (node: any) => {
    if (
      node.type &&
      [
        "paragraph",
        "heading",
        "codeBlock",
        "blockquote",
        "listItem",
        "taskItem",
      ].includes(node.type)
    ) {
      if (!node.attrs) node.attrs = {};
      if (!node.attrs.id) {
        node.attrs.id = crypto.randomUUID();
      }
    }
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(traverse);
    }
  };

  try {
    const clonedJson = JSON.parse(JSON.stringify(json));
    traverse(clonedJson);
    return clonedJson;
  } catch (e) {
    return json;
  }
}

interface VersionPreviewProps {
  versionId: string;
  currentNote: Note;
  onClose: () => void;
  onRestore: (restoredNote: Note) => void;
}

export default function VersionPreview({
  versionId,
  currentNote,
  onClose,
  onRestore,
}: VersionPreviewProps) {
  const { data: version, isLoading } = trpc.versions.get.useQuery({
    versionId,
  });

  const restoreMutation = trpc.versions.restore.useMutation({
    onSuccess: (restoredNote) => {
      toast.success("Version restored successfully");
      // Explicitly pick fields to avoid yjsState type mismatch
      const note: Note = {
        id: restoredNote.id,
        title: restoredNote.title,
        content: restoredNote.content,
        folderId: restoredNote.folderId ?? null,
        isPinned: restoredNote.isPinned,
        pinnedAt: restoredNote.pinnedAt
          ? new Date(restoredNote.pinnedAt)
          : null,
        font: restoredNote.font ?? null,
        createdAt: new Date(restoredNote.createdAt),
        updatedAt: new Date(restoredNote.updatedAt),
      };
      onRestore(note);
      onClose();
    },
    onError: () => toast.error("Failed to restore version"),
  });

  const [viewMode, setViewMode] = useState<"single" | "split">("single");
  const [copied, setCopied] = useState(false);

  // Compute Diffs
  const diffs = useMemo(() => {
    if (!version?.content || !currentNote?.content) return null;
    return computeBlockDiff(currentNote.content, version.content);
  }, [version, currentNote]);

  // 1. Historic Editor (Right Pane - shows Removed/Red)
  const historicEditor = useEditor({
    extensions: [
      StarterKit,
      Typography,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      MathBlock,
      MathInline,
      UniqueID.configure({
        types: ["paragraph", "heading", "list", "codeBlock"],
      }),
      DiffHighlighter.configure({
        removedIds: diffs?.removedIds,
        modifiedIds: diffs?.modifiedIds,
      }),
    ],
    content: "",
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose prose-invert prose-lg max-w-none focus:outline-none p-8",
      },
    },
  });

  // 2. Current Editor (Left Pane - shows Added/Green)
  const currentEditor = useEditor({
    extensions: [
      StarterKit,
      Typography,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      MathBlock,
      MathInline,
      UniqueID.configure({
        types: ["paragraph", "heading", "list", "codeBlock"],
      }),
      DiffHighlighter.configure({
        addedIds: diffs?.addedIds,
        modifiedIds: diffs?.modifiedIds,
      }),
    ],
    content: "",
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-invert prose-lg max-w-none focus:outline-none p-8 opacity-90",
      },
    },
  });

  // Load historic content
  useEffect(() => {
    if (version && historicEditor) {
      const contentWithIds = ensureBlockIds(version.content);
      historicEditor.commands.setContent(contentWithIds);
    }
  }, [version, historicEditor]);

  // Load current content
  useEffect(() => {
    if (currentNote && currentEditor) {
      const contentWithIds = ensureBlockIds(currentNote.content);
      currentEditor.commands.setContent(contentWithIds);
    }
  }, [currentNote, currentEditor]);

  // Sync Scrolling
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (viewMode !== "split") return;
    const target = e.target as HTMLDivElement;
    const syncTargetId =
      target.id === "scroll-left" ? "scroll-right" : "scroll-left";
    const syncTarget = document.getElementById(syncTargetId);
    if (syncTarget) {
      syncTarget.scrollTop = target.scrollTop;
    }
  };

  const handleCopy = () => {
    if (version?.content) {
      const text = historicEditor?.getText() || "";
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Content copied to clipboard");
    }
  };

  const handleRestore = () => {
    restoreMutation.mutate({ versionId });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black text-zinc-500">
        Loading version...
      </div>
    );
  }

  if (!version) return null;

  return (
    <div className="flex flex-col h-full bg-black">
      {/* HEADER BAR */}
      <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900/50">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="h-6 w-px bg-zinc-800" />

          <div className="flex bg-zinc-800/50 p-0.5 rounded-lg border border-zinc-800">
            <button
              onClick={() => setViewMode("single")}
              className={`px-3 py-1 text-xs font-medium rounded flex items-center gap-2 transition-all ${
                viewMode === "single"
                  ? "bg-zinc-700 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Preview
            </button>
            <button
              onClick={() => setViewMode("split")}
              className={`px-3 py-1 text-xs font-medium rounded flex items-center gap-2 transition-all ${
                viewMode === "split"
                  ? "bg-zinc-700 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              Compare
            </button>
          </div>

          <div className="flex flex-col ml-4">
            <span className="text-sm font-medium text-white">
              {viewMode === "split" ? "Comparing Versions" : "Viewing Version"}
            </span>
            <span className="text-xs text-zinc-500">
              {format(new Date(version.createdAt), "MMM d, h:mm a")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {viewMode === "single" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="text-zinc-400 border-zinc-700 hover:bg-zinc-800"
            >
              {copied ? (
                <Check className="w-4 h-4 mr-2" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              Copy
            </Button>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                className="bg-yellow-500 text-black hover:bg-yellow-400"
                disabled={restoreMutation.isPending}
              >
                {restoreMutation.isPending ? (
                  "Restoring..."
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Restore
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-white">
              <AlertDialogHeader>
                <AlertDialogTitle>Restore this version?</AlertDialogTitle>
                <AlertDialogDescription className="text-zinc-400">
                  Your current note content will be saved as a backup version.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRestore}
                  className="bg-yellow-500 text-black hover:bg-yellow-400"
                >
                  Confirm
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANE (Current) */}
        {viewMode === "split" && (
          <div className="flex-1 flex flex-col border-r border-zinc-800 min-w-0">
            <div className="h-8 bg-zinc-900/30 border-b border-zinc-800 flex items-center justify-between px-4">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Current Version
              </span>
              <span className="text-[10px] text-zinc-600">Live</span>
            </div>
            <div
              id="scroll-left"
              className="flex-1 overflow-y-auto bg-zinc-950 custom-scrollbar"
              onScroll={handleScroll}
            >
              <div className="max-w-2xl mx-auto py-8 px-8">
                <EditorContent editor={currentEditor} />
              </div>
            </div>
          </div>
        )}

        {/* RIGHT PANE (Historic) */}
        <div className="flex-1 flex flex-col min-w-0">
          {viewMode === "split" && (
            <div className="h-8 bg-yellow-500/5 border-b border-yellow-500/10 flex items-center justify-between px-4">
              <span className="text-xs font-bold text-yellow-600 uppercase tracking-wider">
                Selected Version
              </span>
              <span className="text-[10px] text-yellow-700/50">
                {format(new Date(version.createdAt), "MMM d, yyyy")}
              </span>
            </div>
          )}

          <div
            id="scroll-right"
            className="flex-1 overflow-y-auto bg-zinc-950 custom-scrollbar"
            onScroll={handleScroll}
          >
            <div
              className={`mx-auto py-8 ${
                viewMode === "split" ? "max-w-2xl px-8" : "max-w-4xl"
              }`}
            >
              <h1 className="text-4xl font-bold text-white mb-8 px-8 opacity-50">
                {version.title || "Untitled"}
              </h1>
              <EditorContent editor={historicEditor} />
            </div>
          </div>
        </div>
      </div>

      {/* Diff CSS */}
      <style jsx global>{`
        .diff-added {
          background-color: rgba(34, 197, 94, 0.1) !important;
          border-left: 2px solid #22c55e !important;
          padding-left: 12px !important;
        }
        .diff-removed {
          background-color: rgba(239, 68, 68, 0.1) !important;
          border-left: 2px solid #ef4444 !important;
          padding-left: 12px !important;
          text-decoration: line-through;
          opacity: 0.7;
        }
        .diff-modified {
          border-left: 2px solid #eab308 !important;
          padding-left: 12px !important;
        }
      `}</style>
    </div>
  );
}
