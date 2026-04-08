"use client";
import { useState, useEffect, useRef } from "react";
import React from "react";
import type { Note, Folder } from "@/lib/storage/types";
import {
  FileText,
  Trash2,
  Edit,
  Check,
  X,
  Pin,
  PinOff,
  MoreVertical,
} from "lucide-react";
import {
  FolderOpenIcon,
  type FolderOpenIconHandle,
} from "lucide-animated";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "./context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./dropdown-menu";
import { toast } from "sonner";

const sectionLabelClass =
  "px-3 pb-2 pt-4 text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-500";

interface NoteListProps {
  folders: Folder[];
  notesInFolders: Map<string, Note[]>;
  unfiledNotes: Note[];
  activeNoteId: string | null;
  setActiveNoteId: (id: string) => void;
  expandedFolders: Set<string>;
  toggleFolder: (folderId: string) => void;
  moveNote: (noteId: string, folderId: string | null) => void;
  onDataChange: () => void;
  updateNoteLocally?: (noteId: string, updates: Partial<Note>) => void;
  togglePin: (noteId: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
}

function AnimatedFolderIcon({ isOpen }: { isOpen: boolean }) {
  const iconRef = useRef<FolderOpenIconHandle>(null);

  useEffect(() => {
    if (!iconRef.current) return;

    if (isOpen) {
      iconRef.current.startAnimation();
      return;
    }

    iconRef.current.stopAnimation();
  }, [isOpen]);

  return (
    <FolderOpenIcon
      ref={iconRef}
      size={15}
      aria-hidden="true"
      className={isOpen ? "text-yellow-400" : "text-zinc-500"}
    />
  );
}

export default function NoteList({
  folders,
  notesInFolders,
  unfiledNotes,
  activeNoteId,
  setActiveNoteId,
  expandedFolders,
  toggleFolder,
  moveNote,
  onDataChange,
  updateNoteLocally,
  togglePin,
  deleteNote,
  deleteFolder,
}: NoteListProps) {
  // Drag State
  const draggedNoteIdRef = useRef<string | null>(null);
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  // UI State
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    type: "note" | "folder";
    name: string;
  } | null>(null);
  const [justDropped, setJustDropped] = useState<string | null>(null);
  const [justPinnedNotes, setJustPinnedNotes] = useState<Set<string>>(
    new Set()
  );
  const [isMobile, setIsMobile] = useState(false);

  // Refs for Manual DOM Manipulation
  const dragOverlayRef = useRef<HTMLDivElement | null>(null);
  const emptyDragImageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // --- INITIALIZE DOM ELEMENTS ---
  useEffect(() => {
    const empty = document.createElement("div");
    empty.style.cssText =
      "width:1px;height:1px;position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none;";
    document.body.appendChild(empty);
    emptyDragImageRef.current = empty;

    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 99999;
      display: none;
      padding: 8px 12px;
      background: #27272a;
      border: 1px solid #52525b;
      border-radius: 6px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.4);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      will-change: transform;
    `;
    document.body.appendChild(overlay);
    dragOverlayRef.current = overlay;

    return () => {
      empty.remove();
      overlay.remove();
    };
  }, []);

  // --- ACTIONS ---
  const handleTogglePin = async (noteId: string, currentPinned: boolean) => {
    const newPinnedStatus = !currentPinned;
    if (updateNoteLocally) {
      updateNoteLocally(noteId, {
        isPinned: newPinnedStatus,
        pinnedAt: newPinnedStatus ? new Date() : null,
      });
    }

    if (newPinnedStatus) {
      setJustPinnedNotes((prev) => new Set(prev).add(noteId));
      setTimeout(() => {
        setJustPinnedNotes((prev) => {
          const next = new Set(prev);
          next.delete(noteId);
          return next;
        });
      }, 800);
    }

    try {
      await togglePin(noteId);
    } catch {
      if (updateNoteLocally) {
        updateNoteLocally(noteId, {
          isPinned: currentPinned,
          pinnedAt: currentPinned ? new Date() : null,
        });
      }
      toast.error("Failed to pin note");
    }
  };

  const handleRename = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
  };

  const confirmRename = async (id: string, type: "note" | "folder") => {
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }

    try {
      const res = await fetch(`/api/${type}s/${id}/rename`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newName: renameValue.trim() }),
      });
      if (res.ok) {
        toast.success(
          `${type.charAt(0).toUpperCase() + type.slice(1)} renamed`
        );
        onDataChange();
      } else {
        throw new Error();
      }
    } catch {
      toast.error(`Failed to rename ${type}`);
    } finally {
      setRenamingId(null);
      setRenameValue("");
    }
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  const handleDelete = (id: string, type: "note" | "folder", name: string) => {
    setDeleteConfirm({ id, type, name });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    const { id, type } = deleteConfirm;
    setDeleteConfirm(null);

    if (type === "note" && id === activeNoteId) {
      setActiveNoteId("");
    }

    try {
      if (type === "note") {
        await deleteNote(id);
      } else {
        await deleteFolder(id);
      }
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted`);
    } catch {
      toast.error(`Failed to delete ${type}`);
    }
  };

  // --- DRAG HANDLERS ---

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, note: Note) => {
    if (isMobile) {
      e.preventDefault();
      return;
    }

    const title = note.title || "Untitled";

    draggedNoteIdRef.current = note.id;
    setDraggedNoteId(note.id);

    // DUAL WRITE: Write both custom (for us) and plain (for Windows)
    e.dataTransfer.setData("text/x-note-id", note.id);
    e.dataTransfer.setData("text/plain", note.id);

    e.dataTransfer.effectAllowed = "move";

    if (emptyDragImageRef.current) {
      e.dataTransfer.setDragImage(emptyDragImageRef.current, 0, 0);
    }

    if (dragOverlayRef.current) {
      dragOverlayRef.current.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <span style="color: white; font-weight: 500; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${title.replace(
            /</g,
            "&lt;"
          )}</span>
        </div>
      `;
      dragOverlayRef.current.style.display = "block";
      dragOverlayRef.current.style.left = `${e.clientX + 12}px`;
      dragOverlayRef.current.style.top = `${e.clientY - 18}px`;
    }

    // Force cursor tracking
    const onDrag = (ev: DragEvent) => {
      if (ev.clientX === 0 && ev.clientY === 0) return;
      if (dragOverlayRef.current) {
        dragOverlayRef.current.style.left = `${ev.clientX + 12}px`;
        dragOverlayRef.current.style.top = `${ev.clientY - 18}px`;
      }
    };

    const onWindowDragOver = (ev: DragEvent) => {
      if (draggedNoteIdRef.current) {
        ev.preventDefault();
        if (ev.dataTransfer) {
          ev.dataTransfer.dropEffect = "move";
        }
      }
      onDrag(ev);
    };

    window.addEventListener("drag", onDrag);
    window.addEventListener("dragover", onWindowDragOver);

    (window as unknown as Record<string, () => void>).__noteDragCleanup =
      () => {
        window.removeEventListener("drag", onDrag);
        window.removeEventListener("dragover", onWindowDragOver);
      };
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (dragOverlayRef.current) {
      dragOverlayRef.current.style.display = "none";
    }

    const cleanup = (
      window as unknown as Record<string, (() => void) | undefined>
    ).__noteDragCleanup;
    if (cleanup) {
      cleanup();
      delete (window as unknown as Record<string, unknown>).__noteDragCleanup;
    }

    draggedNoteIdRef.current = null;
    setDraggedNoteId(null);
    setDragOverFolderId(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (isMobile) return;
    if (!draggedNoteIdRef.current) return;

    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (
    e: React.DragEvent<HTMLDivElement>,
    folderId: string | null
  ) => {
    if (isMobile) return;
    if (!draggedNoteIdRef.current) return;

    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(folderId);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (isMobile) return;

    e.preventDefault();
    e.stopPropagation();

    const relatedTarget = e.relatedTarget as Node | null;
    const currentTarget = e.currentTarget;

    if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
      setDragOverFolderId(null);
    }
  };

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    folderId: string | null
  ) => {
    if (isMobile) return;

    e.preventDefault();
    e.stopPropagation();

    if (dragOverlayRef.current) {
      dragOverlayRef.current.style.display = "none";
    }

    // FALLBACK READ
    let noteId = e.dataTransfer.getData("text/x-note-id");
    if (!noteId) {
      noteId = e.dataTransfer.getData("text/plain");
    }

    if (noteId) {
      setJustDropped(folderId);
      setTimeout(() => setJustDropped(null), 500);
      moveNote(noteId, folderId);
    }

    draggedNoteIdRef.current = null;
    setDraggedNoteId(null);
    setDragOverFolderId(null);
  };

  // --- RENDERERS ---

  const renderNote = (note: Note, isIndented: boolean = false) => {
    const justPinned = justPinnedNotes.has(note.id);
    const isDragging = draggedNoteId === note.id;

    const NoteContent = (
      <div
        draggable={!isMobile && renamingId !== note.id}
        onDragStart={(e) => handleDragStart(e, note)}
        onDragEnd={handleDragEnd}
        className={isIndented ? "ml-5 mt-0.5" : ""}
      >
        <div
          onClick={(e) => {
            if (e.button === 0 && renamingId !== note.id) {
              setActiveNoteId(note.id);
            }
          }}
          className={`group flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors duration-150
            ${
              note.id === activeNoteId
                ? "bg-zinc-900/90 text-yellow-400"
                : "bg-transparent text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
            }
            ${isDragging ? "opacity-40" : ""}
            ${justPinned ? "bg-zinc-900/90 text-yellow-400" : ""}
          `}
        >
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-zinc-500">
            <FileText
              size={15}
              className={
                note.id === activeNoteId || justPinned ? "text-yellow-400" : ""
              }
            />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            {renamingId === note.id ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmRename(note.id, "note");
                    if (e.key === "Escape") cancelRename();
                  }}
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-sm text-white outline-none transition focus:border-zinc-500"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmRename(note.id, "note");
                  }}
                  className="text-green-500 hover:text-green-400 p-1"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    cancelRename();
                  }}
                  className="text-red-500 hover:text-red-400 p-1"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[0.89rem] font-medium tracking-[-0.01em] leading-5">
                    {note.title || "Untitled"}
                  </h2>
                </div>

                {note.isPinned && (
                  <Pin size={12} className="flex-shrink-0 text-yellow-500" />
                )}

                {isMobile && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button className="rounded-md p-1 opacity-0 transition-opacity hover:bg-zinc-800 group-hover:opacity-100">
                        <MoreVertical size={14} className="text-zinc-500" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePin(note.id, note.isPinned || false);
                        }}
                      >
                        {note.isPinned ? (
                          <>
                            <PinOff className="mr-2 h-4 w-4" /> Unpin
                          </>
                        ) : (
                          <>
                            <Pin className="mr-2 h-4 w-4" /> Pin
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRename(note.id, note.title || "Untitled");
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(
                            note.id,
                            "note",
                            note.title || "Untitled"
                          );
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );

    if (isMobile) return <div key={note.id}>{NoteContent}</div>;

    return (
      <ContextMenu key={note.id}>
        <ContextMenuTrigger asChild>{NoteContent}</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onClick={() => handleTogglePin(note.id, note.isPinned || false)}
          >
            {note.isPinned ? (
              <>
                <PinOff className="mr-2 h-4 w-4" /> Unpin
              </>
            ) : (
              <>
                <Pin className="mr-2 h-4 w-4" /> Pin
              </>
            )}
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => handleRename(note.id, note.title || "Untitled")}
          >
            <Edit className="mr-2 h-4 w-4" /> Rename
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            className="text-red-500"
            onClick={() =>
              handleDelete(note.id, "note", note.title || "Untitled")
            }
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  const renderFolder = (folder: Folder & { notes?: Note[] }) => {
    const isExpanded = expandedFolders.has(folder.id);
    const folderNotes = notesInFolders.get(folder.id) || [];
    const isDragOver = dragOverFolderId === folder.id;
    const wasJustDropped = justDropped === folder.id;

    const FolderContent = (
      <div
        onDragOver={handleDragOver}
        onDragEnter={(e) => handleDragEnter(e, folder.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, folder.id)}
        className={`rounded-xl transition-all duration-150 ${
          isDragOver
            ? "ring-1 ring-zinc-600 bg-zinc-900"
            : wasJustDropped
            ? "ring-1 ring-emerald-400/40 bg-emerald-500/10"
            : ""
        }`}
      >
        <div
          onClick={(e) => {
            if (e.button === 0 && renamingId !== folder.id) {
              toggleFolder(folder.id);
            }
          }}
          className={`group flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors duration-150
            ${
              isDragOver
                ? "bg-zinc-900"
                : wasJustDropped
                ? "bg-emerald-500/10"
                : ""
            } ${
              !isDragOver && !wasJustDropped
                ? "bg-transparent text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
                : "text-zinc-100"
            }
          `}
        >
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md">
            <AnimatedFolderIcon isOpen={isExpanded} />
          </div>

          {renamingId === folder.id ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmRename(folder.id, "folder");
                  if (e.key === "Escape") cancelRename();
                }}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-sm text-white outline-none transition focus:border-zinc-500"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  confirmRename(folder.id, "folder");
                }}
                className="text-green-500 hover:text-green-400 p-1"
              >
                <Check size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  cancelRename();
                }}
                className="text-red-500 hover:text-red-400 p-1"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <div className="min-w-0 flex-1">
                <span
                  className={`truncate text-[0.89rem] font-medium tracking-[-0.01em] leading-5 ${
                    isExpanded ? "text-yellow-400" : ""
                  }`}
                >
                  {folder.name}
                </span>
              </div>

              {isMobile && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button className="rounded-md p-1 opacity-0 transition-opacity hover:bg-zinc-800 group-hover:opacity-100">
                      <MoreVertical size={14} className="text-zinc-500" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRename(folder.id, folder.name);
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(folder.id, "folder", folder.name);
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          )}
        </div>

        {isExpanded && folderNotes.map((note) => renderNote(note, true))}
      </div>
    );

    if (isMobile) return <div key={folder.id}>{FolderContent}</div>;

    return (
      <ContextMenu key={folder.id}>
        <ContextMenuTrigger asChild>{FolderContent}</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => handleRename(folder.id, folder.name)}>
            <Edit className="mr-2 h-4 w-4" /> Rename
          </ContextMenuItem>
          <ContextMenuItem
            className="text-red-500"
            onClick={() => handleDelete(folder.id, "folder", folder.name)}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  return (
    <>
      <div className="p-2 space-y-1">
        {folders.map((folder) => renderFolder(folder))}

        {!isMobile && (
          <div
            onDragOver={handleDragOver}
            onDragEnter={(e) => handleDragEnter(e, null)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, null)}
            className={`rounded-2xl transition-all duration-200 ${
              dragOverFolderId === null && draggedNoteId
                ? "ring-1 ring-[rgba(214,178,106,0.45)] p-2"
                : ""
            }`}
          >
            {unfiledNotes.length > 0 && (
              <div className={`${sectionLabelClass} ${folders.length > 0 ? "mt-3" : "mt-1"}`}>
                Unfiled Notes
              </div>
            )}
            {unfiledNotes.map((note) => renderNote(note))}

            {draggedNoteId &&
              unfiledNotes.length === 0 &&
              dragOverFolderId === null && (
                <div className="rounded-xl border border-dashed border-zinc-800 py-4 text-center text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                  Drop here for unfiled
                </div>
              )}
          </div>
        )}

        {isMobile && unfiledNotes.length > 0 && (
          <div>
            <div className={`${sectionLabelClass} ${folders.length > 0 ? "mt-3" : "mt-1"}`}>
              Unfiled Notes
            </div>
            {unfiledNotes.map((note) => renderNote(note))}
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#17181b] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-lg font-semibold tracking-[-0.03em] text-white">
              Delete {deleteConfirm.type}?
            </h3>
            <p className="mb-6 text-sm leading-relaxed text-zinc-400">
              Are you sure you want to delete &ldquo;
              <span className="font-medium text-white">
                {deleteConfirm.name}
              </span>
              &rdquo;?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-white transition-colors hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-xl bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
