"use client";

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
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { Markdown } from "tiptap-markdown";
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
}

// --- Custom Extensions ---
const CustomLink = Mark.create({
  name: "link",
  priority: 1000,
  inclusive: false,
  addAttributes() {
    return { href: { default: null }, target: { default: "_blank" } };
  },
  parseHTML() {
    return [{ tag: "a[href]:not([data-note-id])" }];
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
        getAttributes: (match) => ({ href: match[2] }),
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
        parseHTML: (element) => element.getAttribute("data-meaning"),
        renderHTML: (attributes) => ({ "data-meaning": attributes.meaning }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-meaning]" }];
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
          const start = range.from;
          const end = range.to;
          const word = match[1];
          const meaning = match[2];
          tr.replaceWith(start, end, state.schema.text(word)).addMark(
            start,
            start + word.length,
            this.type.create({ meaning })
          );
        },
      }),
    ];
  },
});

const getFontClass = (font: string) => {
  switch (font) {
    case "serif":
      return "font-serif text-lg leading-relaxed";
    case "mono":
      return "font-mono text-[0.95rem] leading-7";
    default:
      return "font-sans";
  }
};

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
}: NoteEditorProps) {
  const [title, setTitle] = useState("");
  const [isReadingMode, setIsReadingMode] = useState(false);
  const [activeSubnote, setActiveSubnote] = useState<{
    meaning: string;
    rect: DOMRect;
  } | null>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);

  // Critical Refs for Stability
  const activeNoteIdRef = useRef<string | null>(activeNote?.id || null);
  const lastNoteIdRef = useRef<string | null>(null);
  const allNotesRef = useRef(allNotes);

  // Sync refs
  useEffect(() => {
    allNotesRef.current = allNotes;
  }, [allNotes]);

  useEffect(() => {
    activeNoteIdRef.current = activeNote?.id || null;
  }, [activeNote?.id]);

  const handleCreateNoteFromLink = useCallback(
    async (id: string, title: string) => {
      if (onCreateNote) {
        await onCreateNote(title, id);
      }
    },
    [onCreateNote]
  );

  // Memoized suggestion plugin configuration
  // DEPENDENCIES must be minimal to prevent editor re-creation
  const noteLinkSuggestion = useMemo(
    () =>
      createNoteLinkSuggestion(
        () =>
          allNotesRef.current
            .filter((n) => n.id !== activeNoteIdRef.current)
            .map((n) => ({ id: n.id, title: n.title || "Untitled" })),
        handleCreateNoteFromLink
      ),
    [handleCreateNoteFromLink]
  );

  useEffect(() => {
    if (activeNote) {
      setTitle(activeNote.title || "");
      if (!activeNote.title && !activeNote.content && titleInputRef.current) {
        setTimeout(() => titleInputRef.current?.focus(), 50);
      }
    }
  }, [activeNote?.id]);

  const getMarkdown = useCallback((editorInstance: any) => {
    if (!editorInstance) return "";
    return (
      editorInstance.storage.markdown?.getMarkdown() || editorInstance.getHTML()
    );
  }, []);

  const debouncedSave = useDebouncedCallback(
    async (noteId: string, newTitle: string, markdownContent: string) => {
      // Guard: If we switched notes since this save was queued, cancel it.
      if (noteId !== activeNoteIdRef.current) return;

      onSavingStatusChange(true);
      try {
        await onNoteUpdate({
          ...activeNote!,
          id: noteId,
          title: newTitle.trim() || "Untitled",
          content: markdownContent,
          updatedAt: new Date(),
        });
      } catch (e) {
        console.error(e);
      } finally {
        // Only turn off saving if we are still on the same note
        if (noteId === activeNoteIdRef.current) {
          onSavingStatusChange(false);
        }
      }
    },
    1000
  );

  useEffect(() => {
    return () => debouncedSave.cancel();
  }, [debouncedSave]);

  useEffect(() => {
    debouncedSave.cancel();
  }, [activeNote?.id, debouncedSave]);

  const fontClass = getFontClass(activeNote?.font || "sans");

  // The Editor Instance
  // CRITICAL: Dependencies are minimized. `isRightSidebarOpen` is NOT a dependency.
  // This ensures toggling the sidebar does NOT re-mount the editor.
  const editor = useEditor(
    {
      extensions: [
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
        }),
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
          transformPastedText: true,
          transformCopiedText: true,
        }),
        SlashCommand.configure({ suggestion: slashCommandSuggestion }),
        MathInline,
        MathBlock,
        CodeBlock,
      ],
      content: activeNote?.content ?? "",
      editorProps: {
        attributes: {
          class: `prose prose-invert prose-lg focus:outline-none max-w-none break-words`,
        },
      },
      onUpdate: ({ editor: editorInstance }) => {
        if (!activeNote?.id) return;
        debouncedSave(activeNote.id, title, getMarkdown(editorInstance));
      },
      immediatelyRender: false,
    },
    [activeNote?.id] // ONLY recreates if note ID changes
  );

  useEffect(() => {
    if (editor) {
      editor.setEditable(!isReadingMode);
    }
  }, [editor, isReadingMode]);

  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const subnoteEl = target.closest(".subnote-item");
    if (subnoteEl) {
      setActiveSubnote({
        meaning: subnoteEl.getAttribute("data-meaning") || "",
        rect: subnoteEl.getBoundingClientRect(),
      });
    } else {
      setActiveSubnote(null);
    }
  }, []);

  useEffect(() => {
    if (!editor || !activeNote || lastNoteIdRef.current === activeNote.id)
      return;

    lastNoteIdRef.current = activeNote.id;

    queueMicrotask(() => {
      if (editor.isDestroyed) return;
      editor.commands.setContent(activeNote.content || "", {
        emitUpdate: false,
      });
    });
  }, [activeNote?.id, editor]);

  if (!activeNote) return null;

  return (
    <div
      id="note-editor-root"
      data-font={activeNote.font || "sans"}
      className="flex flex-col flex-1 h-full bg-black relative"
      onClick={() => setActiveSubnote(null)}
    >
      {/* Top Right Controls */}
      <div
        className="absolute top-8 right-12 z-[60] hidden md:flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <ReadingModeToggle
          isReading={isReadingMode}
          onToggle={() => setIsReadingMode(!isReadingMode)}
        />

        {/* Right Sidebar Toggle */}
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
        >
          <PanelRight className="h-4 w-4" />
        </button>

        <NoteSettings
          note={activeNote}
          onDelete={() => onDeleteNote?.(activeNote.id)}
          onUpdate={(u) => onNoteUpdate({ ...activeNote, ...u })}
        />
      </div>

      <TableOfContents editor={editor} />

      <div className="flex-1 overflow-y-auto px-4 md:px-12 pt-4 md:pt-8 editor-scroll-container relative">
        <div className="max-w-4xl mx-auto pr-16">
          {/* Toolbar */}
          <div
            className={`inline-block mb-4 md:mb-6 transition-opacity duration-200 ${
              isReadingMode ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
          >
            {editor ? <Toolbar editor={editor} /> : <div className="h-10" />}
          </div>

          {/* Title Input */}
          <input
            ref={titleInputRef}
            type="text"
            value={title}
            disabled={isReadingMode}
            onChange={(e) => {
              setTitle(e.target.value);
              debouncedSave(activeNote.id, e.target.value, getMarkdown(editor));
            }}
            onKeyDown={(e) => e.key === "Enter" && editor?.commands.focus()}
            placeholder="Untitled"
            className={`w-full bg-transparent text-3xl md:text-4xl font-bold text-white focus:outline-none mb-6 md:mb-8 break-words ${fontClass} ${
              isReadingMode ? "cursor-default" : ""
            }`}
          />

          {/* Editor Content */}
          <div
            className="min-h-[500px] relative pb-8"
            onClick={(e) => {
              e.stopPropagation();
              handleEditorClick(e);
            }}
          >
            {editor ? (
              <EditorContent editor={editor} />
            ) : (
              <div className="h-40 rounded-md bg-zinc-800 animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Subnote Tooltip */}
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

      {/* Global Styles */}
      <style jsx global>{`
        /* FONT OVERRIDES */
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

        /* EDITOR RESETS */
        .ProseMirror {
          word-wrap: break-word !important;
          white-space: pre-wrap !important;
          outline: none !important;
          padding-left: 2px !important;
        }

        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #52525b;
          pointer-events: none;
          height: 0;
        }

        /* NOTE LINKS */
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

        /* PLACEHOLDER / GHOST LINK */
        .note-link-placeholder {
          color: #fbbf24;
          background: rgba(251, 191, 36, 0.1);
          padding: 1px 6px;
          border-radius: 4px;
          opacity: 0.8;
        }

        /* TASK LIST */
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

        /* TABLES */
        .ProseMirror table {
          border-collapse: collapse;
          margin: 1rem 0;
          overflow: hidden;
          table-layout: fixed;
          width: 100%;
          border: 1px solid #3f3f46;
          border-radius: 6px;
        }

        .ProseMirror td,
        .ProseMirror th {
          border: 1px solid #3f3f46;
          box-sizing: border-box;
          min-width: 1em;
          padding: 8px 12px;
          position: relative;
          vertical-align: top;
        }

        .ProseMirror th {
          background-color: #27272a;
          font-weight: 600;
          text-align: left;
        }

        .ProseMirror .selectedCell:after {
          background: rgba(234, 179, 8, 0.15);
          border: 2px solid #eab308;
          content: "";
          left: 0;
          right: 0;
          top: 0;
          bottom: 0;
          pointer-events: none;
          position: absolute;
          z-index: 2;
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
      `}</style>
    </div>
  );
}
