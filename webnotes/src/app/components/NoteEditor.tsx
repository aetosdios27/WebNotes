// src/app/components/NoteEditor.tsx

"use client";

import type { Editor } from "@tiptap/react";
import type { Note } from "@/lib/storage/types";
import { useDebouncedCallback } from "use-debounce";
import {
  useEditor,
  EditorContent,
  Mark,
  markInputRule,
  mergeAttributes,
  InputRule,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Typography from "@tiptap/extension-typography";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Markdown } from "tiptap-markdown";
import Collaboration from "@tiptap/extension-collaboration";
import * as Y from "yjs";
import { SlashCommand } from "./SlashCommandExtension";
import { slashCommandSuggestion } from "./SlashCommands";
import { Toolbar } from "./Toolbar";
import NoteSettings from "./NoteSettings";
import ReadingModeToggle from "./ReadingModeToggle";
import { MathInline, MathBlock } from "./extensions/math";
import { CodeBlock } from "./extensions/CodeBlock";
import UniqueID from "./extensions/UniqueID";
import Callout from "./extensions/Callout";
import NoteLink from "./extensions/NoteLink";
import PlaceholderLink from "./extensions/PlaceholderLink";
import { createNoteLinkSuggestion } from "./extensions/noteLinkSuggestion";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { TableOfContents } from "./TableOfContents";
import { motion, AnimatePresence } from "framer-motion";
import { PanelRight } from "lucide-react";
import RightSidebar from "./RightSidebar";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { trpc } from "@/lib/trpc/client";

import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
  TableControls,
  TableGripHandles,
  TableCellMenu,
} from "./extensions/table";

// =============================================================================
// TYPES
// =============================================================================

interface NoteEditorProps {
  activeNote: Note | undefined;
  allNotes: Note[];
  onNoteUpdate: (note: Note) => void;
  onSavingStatusChange: (isSaving: boolean) => void;
  onDeleteNote?: (noteId: string) => void;
  onNavigateNote: (noteId: string) => void;
  onCreateNote?: (title: string, id?: string) => Promise<string | null>;
  isRightSidebarOpen: boolean;
  onToggleRightSidebar: () => void;
  onPreviewVersion: (versionId: string) => void;
}

interface SubnoteTooltip {
  meaning: string;
  rect: DOMRect;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const FONT_CLASSES: Record<string, string> = {
  serif: "font-serif text-lg leading-relaxed",
  mono: "font-mono text-[0.95rem] leading-7",
  sans: "font-sans",
};

const EDITOR_CONFIG = {
  AUTOSAVE_DELAY_MS: 2000,
  TITLE_FOCUS_DELAY_MS: 50,
  PASTE_CLEANUP_DELAY_MS: 100,
};

const MARKDOWN_PATTERNS = {
  HEADING: /^#{1,6}\s/m,
  LIST: /^[-*+]\s/m,
  ORDERED_LIST: /^\d+\.\s/m,
  BLOCKQUOTE: /^>\s/m,
  CODE_FENCE: /^`{3}/m,
  INLINE_CODE: /`[^`]+`/,
  BOLD: /\*\*[^*]+\*\*|__[^_]+__/,
  ITALIC: /\*[^*]+\*|_[^_]+_/,
  LINK: /\[.+\]\(.+\)/,
  TABLE: /\|.+\|/,
  HORIZONTAL_RULE: /^---$|^\*\*\*$|^___$/m,
};

// =============================================================================
// HELPERS
// =============================================================================

const getFontClass = (font: string | null | undefined): string =>
  FONT_CLASSES[font ?? "sans"] ?? FONT_CLASSES.sans;

const hasMarkdownSyntax = (text: string): boolean =>
  Object.values(MARKDOWN_PATTERNS).some((p) => p.test(text)) ||
  (text.match(/\n/g) || []).length > 2;

const sanitizeHtml = (html: string): string =>
  DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "s",
      "code",
      "pre",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "blockquote",
      "a",
      "img",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "hr",
      "div",
      "span",
    ],
    ALLOWED_ATTR: [
      "href",
      "src",
      "alt",
      "title",
      "class",
      "id",
      "data-*",
      "style",
    ],
  });

const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++)
    binary += String.fromCharCode(bytes[i]);
  return window.btoa(binary);
};

const base64ToUint8Array = (base64: string): Uint8Array => {
  const bin = window.atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

// =============================================================================
// CUSTOM MARKS
// =============================================================================

const CustomLink = Mark.create({
  name: "customLink",
  priority: 1000,
  inclusive: false,
  addAttributes() {
    return {
      href: {
        default: null,
        parseHTML: (el) => el.getAttribute("href"),
        renderHTML: (a) => (a.href ? { href: a.href } : {}),
      },
      target: {
        default: "_blank",
        parseHTML: (el) => el.getAttribute("target"),
        renderHTML: (a) => ({ target: a.target }),
      },
      rel: {
        default: "noopener noreferrer",
        parseHTML: (el) => el.getAttribute("rel"),
        renderHTML: (a) => ({ rel: a.rel }),
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: "a[href]:not([data-note-id])",
        getAttrs: (node) =>
          !(node as HTMLElement).hasAttribute("data-note-id") ? {} : false,
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        class:
          "text-yellow-500 underline underline-offset-4 cursor-pointer hover:text-yellow-400 transition-colors",
      }),
      0,
    ];
  },
  addInputRules() {
    return [
      markInputRule({
        find: /\[([^\]]+)\]\(([^)]+)\)$/,
        type: this.type,
        getAttributes: (m) => ({
          href: m[2],
          target: "_blank",
          rel: "noopener noreferrer",
        }),
      }),
    ];
  },
});

const Subnote = Mark.create({
  name: "subnote",
  priority: 1001,
  inclusive: false,
  addAttributes() {
    return {
      meaning: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-meaning"),
        renderHTML: (a) => (a.meaning ? { "data-meaning": a.meaning } : {}),
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: "span[data-meaning]",
        getAttrs: (node) =>
          (node as HTMLElement).hasAttribute("data-meaning") ? {} : false,
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        class:
          "subnote-item border-b-2 border-dotted border-yellow-500/60 text-yellow-100/90 cursor-pointer hover:bg-yellow-500/10 transition-all",
      }),
      0,
    ];
  },
  addInputRules() {
    return [
      new InputRule({
        find: /\{([^}]+)\}\(([^)]+)\)$/,
        handler: ({ state, range, match }) => {
          const { tr } = state;
          const [, word, meaning] = match;
          if (!word || !meaning) return;
          tr.replaceWith(range.from, range.to, state.schema.text(word)).addMark(
            range.from,
            range.from + word.length,
            this.type.create({ meaning })
          );
        },
      }),
    ];
  },
});

// =============================================================================
// INNER EDITOR — one Y.Doc + one editor instance per note
// Unmounted and remounted when noteId changes via key={noteId}
// =============================================================================

interface InnerEditorProps {
  noteId: string;
  activeNote: Note;
  allNotes: Note[];
  title: string;
  fontClass: string;
  isReadingMode: boolean;
  isRightSidebarOpen: boolean;
  onNoteUpdate: (note: Note) => void;
  onSavingStatusChange: (isSaving: boolean) => void;
  onNavigateNote: (noteId: string) => void;
  onDeleteNote?: (noteId: string) => void;
  onToggleRightSidebar: () => void;
  onPreviewVersion: (versionId: string) => void;
  onToggleReadingMode: () => void;
  titleInputRef: React.RefObject<HTMLInputElement | null>;
  onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEditorClick: (e: React.MouseEvent) => void;
}

function InnerEditor({
  noteId,
  activeNote,
  allNotes,
  title,
  fontClass,
  isReadingMode,
  isRightSidebarOpen,
  onNoteUpdate,
  onSavingStatusChange,
  onNavigateNote,
  onDeleteNote,
  onToggleRightSidebar,
  onPreviewVersion,
  onToggleReadingMode,
  titleInputRef,
  onTitleChange,
  onEditorClick,
}: InnerEditorProps) {
  // Fresh Y.Doc per note — created on mount, destroyed on unmount
  const [ydoc] = useState(() => new Y.Doc());
  const [isHydrated, setIsHydrated] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const editorRef = useRef<Editor | null>(null);
  const isPastingRef = useRef(false);
  const isSyncingRef = useRef(false);
  const hasPendingChangesRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Fetch full note from server
  // ---------------------------------------------------------------------------
  const { data: fullNote, isLoading } = trpc.notes.byId.useQuery(
    { id: noteId },
    { staleTime: 0, refetchOnWindowFocus: false }
  );

  // ---------------------------------------------------------------------------
  // Sync mutation (normal async save)
  // ---------------------------------------------------------------------------
  const syncMutation = trpc.notes.sync.useMutation({
    onSuccess: () => {
      setSyncError(null);
      isSyncingRef.current = false;
      hasPendingChangesRef.current = false;
    },
    onError: (err) => {
      console.error("❌ Sync failed:", noteId, err.message);
      setSyncError(err.message);
      isSyncingRef.current = false;
    },
  });

  // Normal async sync
  const syncToServer = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    onSavingStatusChange(true);
    try {
      const fullState = Y.encodeStateAsUpdate(ydoc);
      const base64 = uint8ArrayToBase64(fullState);
      await syncMutation.mutateAsync({ id: noteId, update: base64 });
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      onSavingStatusChange(false);
      isSyncingRef.current = false;
    }
  }, [noteId, ydoc, onSavingStatusChange, syncMutation]);

  const debouncedSync = useDebouncedCallback(() => {
    syncToServer();
  }, EDITOR_CONFIG.AUTOSAVE_DELAY_MS);

  // Emergency sync via sendBeacon — survives page close/refresh
  const sendBeaconSync = useCallback(() => {
    if (!hasPendingChangesRef.current) return;
    try {
      const fullState = Y.encodeStateAsUpdate(ydoc);
      const base64 = uint8ArrayToBase64(fullState);
      navigator.sendBeacon(
        "/api/notes/sync-beacon",
        new Blob([JSON.stringify({ id: noteId, update: base64 })], {
          type: "application/json",
        })
      );
      hasPendingChangesRef.current = false;
    } catch (err) {
      console.error("Beacon sync failed:", err);
    }
  }, [noteId, ydoc]);

  // ---------------------------------------------------------------------------
  // Save on page refresh / tab close
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleBeforeUnload = () => {
      debouncedSync.flush();
      sendBeaconSync();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [debouncedSync, sendBeaconSync]);

  // ---------------------------------------------------------------------------
  // Save on unmount (note switch) — flush debounce + beacon as backup
  // ---------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      debouncedSync.flush();
      sendBeaconSync();
      ydoc.destroy();
    };
  }, [ydoc, debouncedSync, sendBeaconSync]);

  // ---------------------------------------------------------------------------
  // Hydrate Y.Doc when server data arrives
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!fullNote || isHydrated) return;
    try {
      if (fullNote.yjsState) {
        const bytes = base64ToUint8Array(fullNote.yjsState);
        Y.applyUpdate(ydoc, bytes, "remote");
      }
      setIsHydrated(true);
    } catch (err) {
      console.error("❌ Hydration failed:", err);
      setSyncError("Failed to load note");
    }
  }, [fullNote, isHydrated, ydoc]);

  // Legacy content migration (old notes that have content but no yjsState)
  useEffect(() => {
    if (!isHydrated || !editorRef.current || editorRef.current.isDestroyed)
      return;
    if (!fullNote) return;
    if (!fullNote.yjsState && fullNote.content) {
      const fragment = ydoc.getXmlFragment("default");
      if (fragment.length === 0) {
        editorRef.current.commands.setContent(fullNote.content, {
          emitUpdate: false,
        });
        syncToServer();
      }
    }
  }, [isHydrated, fullNote, ydoc, syncToServer]);

  // ---------------------------------------------------------------------------
  // Listen for local Yjs changes → trigger debounced sync
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handler = (_update: Uint8Array, origin: unknown) => {
      if (origin === "remote" || !isHydrated) return;
      hasPendingChangesRef.current = true;
      debouncedSync();
    };
    ydoc.on("update", handler);
    return () => {
      ydoc.off("update", handler);
      debouncedSync.cancel();
    };
  }, [ydoc, isHydrated, debouncedSync]);

  // ---------------------------------------------------------------------------
  // Extensions — stable for this editor's lifetime
  // ---------------------------------------------------------------------------
  const allNotesRef = useRef(allNotes);
  useEffect(() => {
    allNotesRef.current = allNotes;
  }, [allNotes]);

  const noteLinkSuggestion = useMemo(
    () =>
      createNoteLinkSuggestion(() =>
        allNotesRef.current
          .filter((n) => n.id !== noteId)
          .map((n) => ({ id: n.id, title: n.title || "Untitled" }))
      ),
    [noteId]
  );

  const extensions = useMemo(
    () => [
      UniqueID.configure({
        types: [
          "heading",
          "paragraph",
          "bulletList",
          "orderedList",
          "taskList",
          "listItem",
          "taskItem",
          "codeBlock",
          "blockquote",
          "horizontalRule",
          "mathBlock",
          "table",
          "callout",
        ],
      }),
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        codeBlock: false,
        undoRedo: false,
      }),
      Collaboration.configure({ document: ydoc }),
      CodeBlock,
      Typography,
      Placeholder.configure({
        placeholder: "Type / for commands, [[ to link notes...",
      }),
      CustomLink,
      Subnote,
      PlaceholderLink,
      NoteLink.configure({
        suggestion: noteLinkSuggestion,
        onNavigate: onNavigateNote,
      }),
      Callout,
      TaskList.configure({ HTMLAttributes: { class: "task-list" } }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: { class: "task-item" },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Markdown.configure({
        html: true,
        transformPastedText: false,
        transformCopiedText: true,
        breaks: false,
        linkify: false,
        tightLists: true,
      }),
      SlashCommand.configure({ suggestion: slashCommandSuggestion }),
      MathInline,
      MathBlock,
    ],
    [ydoc, noteLinkSuggestion, onNavigateNote]
  );

  // ---------------------------------------------------------------------------
  // Editor instance
  // ---------------------------------------------------------------------------
  const editor = useEditor(
    {
      extensions,
      content: "",
      editorProps: {
        attributes: {
          class:
            "prose prose-invert prose-lg focus:outline-none max-w-none break-words",
        },
        handlePaste: (view, event) => {
          const text = event.clipboardData?.getData("text/plain");
          const html = event.clipboardData?.getData("text/html");
          if (html && !html.includes("<meta")) return false;
          if (text && hasMarkdownSyntax(text)) {
            event.preventDefault();
            isPastingRef.current = true;
            try {
              const parsed = marked.parse(text, {
                async: false,
                gfm: true,
                breaks: true,
              }) as string;
              const clean = sanitizeHtml(parsed);
              const ed = editorRef.current;
              if (!ed || ed.isDestroyed) return false;
              if (!ed.state.selection.empty) ed.commands.deleteSelection();
              ed.commands.insertContent(clean, {
                parseOptions: { preserveWhitespace: "full" },
              });
              setTimeout(
                () => (isPastingRef.current = false),
                EDITOR_CONFIG.PASTE_CLEANUP_DELAY_MS
              );
              return true;
            } catch (err) {
              console.error("Markdown paste failed:", err);
              isPastingRef.current = false;
              return false;
            }
          }
          return false;
        },
        handleDrop: () => {
          isPastingRef.current = true;
          setTimeout(
            () => (isPastingRef.current = false),
            EDITOR_CONFIG.PASTE_CLEANUP_DELAY_MS
          );
          return false;
        },
      },
      onCreate: ({ editor: e }) => {
        editorRef.current = e;
      },
      onDestroy: () => {
        editorRef.current = null;
      },
      immediatelyRender: false,
    },
    []
  );

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.setEditable(!isReadingMode);
  }, [editor, isReadingMode]);

  // ---------------------------------------------------------------------------
  // Render — exact same DOM structure as working deployed version
  // ---------------------------------------------------------------------------
  if (isLoading || !isHydrated) {
    return (
      <div className="flex items-center justify-center h-full bg-black">
        <div className="animate-pulse text-zinc-500">Loading note...</div>
      </div>
    );
  }

  return (
    <>
      {syncError && (
        <div className="absolute top-0 left-0 right-0 z-[100] bg-red-900/90 text-white px-4 py-2 flex items-center justify-between">
          <span className="text-sm">⚠️ {syncError}</span>
          <button
            onClick={() => setSyncError(null)}
            className="text-xs hover:text-red-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {editor && (
        <>
          <TableControls editor={editor} />
          <TableGripHandles editor={editor} />
          <TableCellMenu editor={editor} />
        </>
      )}

      <div className="flex-1 flex flex-row overflow-hidden w-full h-full">
        <div className="flex-1 flex flex-col min-w-0 relative h-full">
          <div
            className="absolute top-8 right-12 z-[60] hidden md:flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <ReadingModeToggle
              isReading={isReadingMode}
              onToggle={onToggleReadingMode}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleRightSidebar();
              }}
              className={`h-8 w-8 flex items-center justify-center rounded-md transition-colors ${
                isRightSidebarOpen
                  ? "text-yellow-500 bg-zinc-800"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
              title="Toggle Info Sidebar"
              aria-label="Toggle Info Sidebar"
              aria-expanded={isRightSidebarOpen}
            >
              <PanelRight className="h-4 w-4" />
            </button>
            {onDeleteNote && (
              <NoteSettings
                note={activeNote}
                onDelete={() => onDeleteNote(activeNote.id)}
                onUpdate={(u) => onNoteUpdate({ ...activeNote, ...u })}
              />
            )}
          </div>

          {editor && <TableOfContents editor={editor} />}

          <div className="flex-1 overflow-y-auto px-4 md:px-12 pt-4 md:pt-8 editor-scroll-container relative">
            <div className="max-w-4xl mx-auto pr-16 pb-32">
              <div
                className={`inline-block mb-4 md:mb-6 transition-opacity duration-200 ${
                  isReadingMode
                    ? "opacity-0 pointer-events-none"
                    : "opacity-100"
                }`}
              >
                {editor ? (
                  <Toolbar editor={editor} />
                ) : (
                  <div className="h-10" aria-hidden="true" />
                )}
              </div>

              <input
                ref={titleInputRef}
                type="text"
                value={title}
                disabled={isReadingMode}
                onChange={onTitleChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    editor?.commands.focus();
                  }
                }}
                placeholder="Untitled"
                className={`w-full bg-transparent text-3xl md:text-4xl font-bold text-white focus:outline-none mb-6 md:mb-8 break-words py-2 leading-normal ${fontClass} ${
                  isReadingMode ? "cursor-default" : ""
                }`}
                aria-label="Note title"
              />

              <div
                className="min-h-[500px] relative pb-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditorClick(e);
                }}
              >
                {editor ? (
                  <EditorContent editor={editor} />
                ) : (
                  <div
                    className="h-40 rounded-md bg-zinc-800 animate-pulse"
                    aria-label="Loading editor"
                    aria-busy="true"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {isRightSidebarOpen && editor && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="border-l border-zinc-800 bg-zinc-900/50 flex-shrink-0 h-full overflow-hidden"
            >
              <div className="w-[300px] h-full">
                <RightSidebar
                  activeNote={activeNote}
                  allNotes={allNotes}
                  editor={editor}
                  onNavigate={onNavigateNote}
                  onClose={onToggleRightSidebar}
                  onPreviewVersion={onPreviewVersion}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// =============================================================================
// OUTER SHELL — handles title state, reading mode, note switching via key
// =============================================================================

export default function NoteEditor({
  activeNote,
  allNotes,
  onNoteUpdate,
  onSavingStatusChange,
  onDeleteNote,
  onNavigateNote,
  onCreateNote,
  isRightSidebarOpen,
  onToggleRightSidebar,
  onPreviewVersion,
}: NoteEditorProps) {
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState("");
  const [isReadingMode, setIsReadingMode] = useState(false);
  const [activeSubnote, setActiveSubnote] = useState<SubnoteTooltip | null>(
    null
  );
  const titleInputRef = useRef<HTMLInputElement>(null);
  const titleSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (titleSaveTimeoutRef.current)
        clearTimeout(titleSaveTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (activeNote) {
      setTitle(activeNote.title || "");
      if (!activeNote.title && !activeNote.content && titleInputRef.current) {
        setTimeout(
          () => titleInputRef.current?.focus(),
          EDITOR_CONFIG.TITLE_FOCUS_DELAY_MS
        );
      }
    }
  }, [activeNote?.id, activeNote?.title, activeNote?.content]);

  const fontClass = useMemo(
    () => getFontClass(activeNote?.font),
    [activeNote?.font]
  );

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      setTitle(newTitle);
      if (activeNote?.id) {
        if (titleSaveTimeoutRef.current)
          clearTimeout(titleSaveTimeoutRef.current);
        titleSaveTimeoutRef.current = setTimeout(() => {
          onNoteUpdate({
            ...activeNote,
            title: newTitle,
            updatedAt: new Date(),
          });
          titleSaveTimeoutRef.current = null;
        }, EDITOR_CONFIG.AUTOSAVE_DELAY_MS);
      }
    },
    [activeNote, onNoteUpdate]
  );

  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const subnoteEl = target.closest(".subnote-item");
    if (subnoteEl) {
      const meaning = subnoteEl.getAttribute("data-meaning");
      if (meaning)
        setActiveSubnote({ meaning, rect: subnoteEl.getBoundingClientRect() });
    } else {
      setActiveSubnote(null);
    }
  }, []);

  if (!mounted || !activeNote) return null;

  return (
    <div
      id="note-editor-root"
      data-font={activeNote.font || "sans"}
      className="flex flex-col flex-1 h-full bg-black relative"
      onClick={() => setActiveSubnote(null)}
    >
      <InnerEditor
        key={activeNote.id}
        noteId={activeNote.id}
        activeNote={activeNote}
        allNotes={allNotes}
        title={title}
        fontClass={fontClass}
        isReadingMode={isReadingMode}
        isRightSidebarOpen={isRightSidebarOpen}
        onNoteUpdate={onNoteUpdate}
        onSavingStatusChange={onSavingStatusChange}
        onNavigateNote={onNavigateNote}
        onDeleteNote={onDeleteNote}
        onToggleRightSidebar={onToggleRightSidebar}
        onPreviewVersion={onPreviewVersion}
        onToggleReadingMode={() => setIsReadingMode((p) => !p)}
        titleInputRef={titleInputRef}
        onTitleChange={handleTitleChange}
        onEditorClick={handleEditorClick}
      />

      <AnimatePresence>
        {activeSubnote && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="fixed z-[9999] p-4 bg-[#121212] backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-[280px] pointer-events-none"
            style={{
              top: activeSubnote.rect.top - 15,
              left: activeSubnote.rect.left + activeSubnote.rect.width / 2,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="flex flex-col gap-2 relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                <span className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.2em]">
                  Context
                </span>
              </div>
              <p className="text-[14px] text-zinc-50 font-medium leading-relaxed italic font-sans">
                &quot;{activeSubnote.meaning}&quot;
              </p>
            </div>
            <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-[#121212] border-r border-b border-white/20 z-0" />
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        #note-editor-root[data-font="serif"] .ProseMirror,
        #note-editor-root[data-font="serif"] .ProseMirror * {
          font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times,
            serif !important;
        }
        #note-editor-root[data-font="mono"] .ProseMirror,
        #note-editor-root[data-font="mono"] .ProseMirror * {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
            "Liberation Mono", "Courier New", monospace !important;
        }
        #note-editor-root[data-font="sans"] .ProseMirror,
        #note-editor-root[data-font="sans"] .ProseMirror * {
          font-family: ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial,
            sans-serif !important;
        }
        .ProseMirror {
          word-wrap: break-word !important;
          white-space: pre-wrap !important;
          outline: none !important;
          padding-left: 2px !important;
          min-height: 200px !important;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #52525b;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror a.note-link {
          color: #60a5fa;
          background: rgba(96, 165, 250, 0.1);
          padding: 1px 6px;
          border-radius: 4px;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.15s ease;
          font-weight: 500;
        }
        .ProseMirror a.note-link:hover {
          background: rgba(96, 165, 250, 0.25);
          color: #93c5fd;
        }
        .ProseMirror a.note-link:active {
          transform: scale(0.98);
        }
        .note-link-placeholder {
          color: #fbbf24;
          background: rgba(251, 191, 36, 0.1);
          padding: 1px 6px;
          border-radius: 4px;
          opacity: 0.8;
        }
        .ProseMirror ul.task-list {
          list-style: none !important;
          padding-left: 0 !important;
          margin: 0.5rem 0 !important;
        }
        .ProseMirror li.task-item {
          display: flex !important;
          align-items: flex-start !important;
          gap: 0.5rem !important;
          padding: 0.25rem 0 !important;
          margin: 0 !important;
        }
        .ProseMirror li.task-item > label {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex-shrink: 0 !important;
          width: 1.25rem !important;
          height: 1.25rem !important;
          margin-top: 0.2rem !important;
          cursor: pointer !important;
        }
        .ProseMirror li.task-item > label > input[type="checkbox"] {
          appearance: none !important;
          width: 1.125rem !important;
          height: 1.125rem !important;
          border: 2px solid #52525b !important;
          border-radius: 4px !important;
          background: transparent !important;
          cursor: pointer !important;
          transition: all 0.15s ease !important;
          position: relative !important;
        }
        .ProseMirror li.task-item > label > input[type="checkbox"]:hover {
          border-color: #eab308 !important;
          background: rgba(234, 179, 8, 0.1) !important;
        }
        .ProseMirror li.task-item > label > input[type="checkbox"]:checked {
          background: #eab308 !important;
          border-color: #eab308 !important;
        }
        .ProseMirror
          li.task-item
          > label
          > input[type="checkbox"]:checked::after {
          content: "" !important;
          position: absolute !important;
          left: 5px !important;
          top: 2px !important;
          width: 4px !important;
          height: 8px !important;
          border: solid #000 !important;
          border-width: 0 2px 2px 0 !important;
          transform: rotate(45deg) !important;
        }
        .ProseMirror li.task-item > div {
          flex: 1 !important;
          min-width: 0 !important;
        }
        .ProseMirror li.task-item[data-checked="true"] > div {
          text-decoration: line-through !important;
          color: #71717a !important;
        }
        .ProseMirror table {
          border-collapse: collapse;
          margin: 1rem 0;
          table-layout: fixed;
          width: 100%;
          border: 1px solid #52525b;
        }
        .ProseMirror td,
        .ProseMirror th {
          border: 1px solid #52525b;
          padding: 8px 12px;
          position: relative;
          vertical-align: top;
          background: transparent;
          min-width: 80px;
        }
        .ProseMirror th {
          background: transparent;
          font-weight: 400;
          text-align: left;
        }
        .ProseMirror .selectedCell {
          background-color: rgba(234, 179, 8, 0.15) !important;
        }
        .ProseMirror .selectedCell::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          bottom: 0;
          border: 2px solid #eab308;
          pointer-events: none;
          z-index: 2;
        }
        .ProseMirror .tableWrapper {
          overflow-x: auto;
          margin: 1rem 0;
        }
        .ProseMirror .column-resize-handle {
          position: absolute;
          right: -2px;
          top: 0;
          bottom: 0;
          width: 4px;
          background-color: #eab308;
          cursor: col-resize;
          z-index: 10;
        }
        .ProseMirror.resize-cursor {
          cursor: col-resize;
        }
        .ProseMirror td:hover,
        .ProseMirror th:hover {
          background-color: rgba(255, 255, 255, 0.03);
        }
        .callout-block {
          padding: 1rem;
          background: #18181b;
          border-radius: 0.5rem;
          border: 1px solid #3f3f46;
          border-left: 4px solid #eab308;
          display: flex;
          gap: 0.75rem;
          margin: 1rem 0;
        }
        .callout-icon {
          font-size: 1.25rem;
          line-height: 1.5rem;
          user-select: none;
          flex-shrink: 0;
        }
        .callout-content {
          flex: 1;
          min-width: 0;
        }
        .callout-content p {
          margin: 0 !important;
        }
        .ProseMirror pre {
          background: #18181b;
          border: 1px solid #3f3f46;
          border-radius: 0.5rem;
          padding: 1rem;
          margin: 1rem 0;
          overflow-x: auto;
        }
        .ProseMirror blockquote {
          border-left: 4px solid #3f3f46;
          padding-left: 1rem;
          margin: 1rem 0;
          color: #a1a1aa;
          font-style: italic;
        }
        .ProseMirror hr {
          border: none;
          border-top: 1px solid #3f3f46;
          margin: 2rem 0;
        }
        .ProseMirror ::selection {
          background: rgba(234, 179, 8, 0.3);
        }
        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .ProseMirror li {
          margin: 0.25rem 0;
        }
        .ProseMirror li p {
          margin: 0;
        }
        .ProseMirror h1 {
          font-size: 2em;
          margin: 0.67em 0;
          font-weight: bold;
        }
        .ProseMirror h2 {
          font-size: 1.5em;
          margin: 0.75em 0;
          font-weight: bold;
        }
        .ProseMirror h3 {
          font-size: 1.17em;
          margin: 0.83em 0;
          font-weight: bold;
        }
        .ProseMirror h4 {
          font-size: 1em;
          margin: 1em 0;
          font-weight: bold;
        }
        .ProseMirror h5 {
          font-size: 0.83em;
          margin: 1.5em 0;
          font-weight: bold;
        }
        .ProseMirror h6 {
          font-size: 0.67em;
          margin: 2.33em 0;
          font-weight: bold;
        }
        .ProseMirror {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
        }
        .editor-scroll-container::-webkit-scrollbar {
          width: 8px;
        }
        .editor-scroll-container::-webkit-scrollbar-track {
          background: transparent;
        }
        .editor-scroll-container::-webkit-scrollbar-thumb {
          background: #3f3f46;
          border-radius: 4px;
        }
        .editor-scroll-container::-webkit-scrollbar-thumb:hover {
          background: #52525b;
        }
      `}</style>
    </div>
  );
}
