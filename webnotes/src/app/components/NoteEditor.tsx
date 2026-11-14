// src/app/components/NoteEditor.tsx

"use client";
import { EditorSkeleton } from "./ContentSkeletons";
import { LoadingRegion } from "./ui/skeleton";

import type { Editor } from "@tiptap/react";
import type { Note } from "@/lib/storage/types";
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
import { CheckedTaskItem } from "./extensions/CheckedTaskItem";
import { Markdown } from "tiptap-markdown";
import Collaboration, { isChangeOrigin } from "@tiptap/extension-collaboration";
import { ySyncPluginKey } from "@tiptap/y-tiptap";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { useSession } from "next-auth/react";
import { SlashCommand } from "./SlashCommandExtension";
import { slashCommandSuggestion } from "./SlashCommands";
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
import { BubbleMenu } from "@tiptap/react/menus";
import { Toolbar } from "./Toolbar";
import { useNotesStore } from "@/store/useNotesStore";
import { NoteMeta } from "./NoteSummary";
import RightSidebar from "./RightSidebar";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { useNoteSync } from "@/hooks/useNoteSync";
import { createContentSnapshot } from "@/lib/content-snapshot";

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
  onNoteUpdate: (id: string, changes: Partial<Note>) => void;
  onSavingStatusChange: (isSaving: boolean) => void;
  onSyncErrorChange: (failed: boolean) => void;
  onDeleteNote?: (noteId: string) => void;
  onNavigateNote: (noteId: string) => void;
  isReadingMode: boolean;
  onToggleReadingMode: () => void;
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
  onNoteUpdate: (id: string, changes: Partial<Note>) => void;
  onSavingStatusChange: (isSaving: boolean) => void;
  onSyncErrorChange: (failed: boolean) => void;
  onNavigateNote: (noteId: string) => void;
  onDeleteNote?: (noteId: string) => void;
  onToggleRightSidebar: () => void;
  onPreviewVersion: (versionId: string) => void;
  onToggleReadingMode: () => void;
  titleInputRef: React.RefObject<HTMLInputElement | null>;
  onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEditorClick: (e: React.MouseEvent) => void;
}

function InnerEditor(props: InnerEditorProps) {
  const [ydoc] = useState(() => new Y.Doc());
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    const persistence = new IndexeddbPersistence(
      "webnotes-note-" + props.noteId,
      ydoc
    );
    void persistence.whenSynced.then(() => {
      if (active) setIsHydrated(true);
    });
    return () => {
      active = false;
      void persistence.destroy();
      ydoc.destroy();
    };
  }, [props.noteId, ydoc]);

  return <LoadingRegion pending={!isHydrated} skeleton={<EditorSkeleton />} label="Opening note" className="editor-hydration">
    {isHydrated && <HydratedEditor {...props} ydoc={ydoc} />}
  </LoadingRegion>;
}

function HydratedEditor({
  ydoc,
  noteId,
  activeNote,
  allNotes,
  title,
  fontClass,
  isReadingMode,
  isRightSidebarOpen,
  onNoteUpdate,
  onSavingStatusChange,
  onSyncErrorChange,
  onNavigateNote,
  onDeleteNote,
  onToggleRightSidebar,
  onPreviewVersion,
  onToggleReadingMode,
  titleInputRef,
  onTitleChange,
  onEditorClick,
}: InnerEditorProps & { ydoc: Y.Doc }) {
  const { status, data: session } = useSession();
  const isAuthenticated = status === "authenticated";
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const { error: syncError, pulled, hasServerState } = useNoteSync({
    id: noteId,
    doc: ydoc,
    userId: isAuthenticated ? session?.user?.id : undefined,
    onSavingStatusChange,
  });
  useEffect(() => {
    onSyncErrorChange(Boolean(syncError));
    if (!syncError) setNoticeDismissed(false);
    return () => onSyncErrorChange(false);
  }, [syncError, onSyncErrorChange]);

  const editorRef = useRef<Editor | null>(null);
  const isPastingRef = useRef(false);
  const hasEditedBody = useRef(false);
  const contentSnapshot = useRef<ReturnType<typeof createContentSnapshot> | null>(null);
  const hasCheckedSnapshot = useRef(false);
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
      CheckedTaskItem.configure({
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
      onUpdate: ({ transaction }) => {
        if (!isChangeOrigin(transaction)) hasEditedBody.current = true;
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
    if (!editor) return;
    const snapshot = createContentSnapshot(
      () => (editor.isDestroyed ? undefined : editor.getHTML()),
      (content) => {
        const store = useNotesStore.getState();
        // Closing a deleted note must not try to recreate its snapshot.
        if (!store.notes.some((note) => note.id === noteId)) return;
        void store.updateNote(noteId, { content }).catch((error: unknown) => {
          console.error("Failed to save note content snapshot:", error);
        });
      },
    );
    contentSnapshot.current = snapshot;
    const onUpdate = ({
      transaction,
    }: {
      transaction: Parameters<typeof isChangeOrigin>[0];
    }) => {
      // Yjs undo/redo is a local edit too, despite using a Yjs-origin transaction.
      if (
        !isChangeOrigin(transaction) ||
        transaction.getMeta(ySyncPluginKey)?.isUndoRedoOperation === true
      ) {
        snapshot.schedule();
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") snapshot.flush();
    };
    editor.on("update", onUpdate);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", snapshot.flush);
    return () => {
      editor.off("update", onUpdate);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", snapshot.flush);
      snapshot.flush();
      contentSnapshot.current = null;
    };
  }, [editor, noteId]);

  // Seed legacy HTML only after both applicable providers have hydrated.
  const hasSeededLegacy = useRef(false);
  useEffect(() => {
    if (!editor || editor.isDestroyed || hasSeededLegacy.current) return;
    if (status === "loading" || (isAuthenticated && !pulled)) return;
    hasSeededLegacy.current = true;
    // Server Yjs state is authoritative, even when the body was cleared on purpose.
    if (isAuthenticated && hasServerState) return;
    const content = activeNote.content;
    // Tiptap's empty-paragraph placeholder can already be persisted locally from an
    // earlier open, so judge by visible emptiness, not by the fragment being empty.
    const isUnwritten = editor.isEmpty && !hasEditedBody.current;
    if (isUnwritten && content) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [
    editor,
    status,
    isAuthenticated,
    pulled,
    hasServerState,
    activeNote.content,
    ydoc,
  ]);

  // HydratedEditor already waits for IndexedDB. Wait for the server pull and
  // legacy seed above before repairing a snapshot missed during an earlier close.
  useEffect(() => {
    if (!editor || editor.isDestroyed || hasCheckedSnapshot.current) return;
    if (
      !hasSeededLegacy.current ||
      status === "loading" ||
      (isAuthenticated && !pulled)
    ) return;
    hasCheckedSnapshot.current = true;
    // Block IDs are regenerated for fresh empty paragraphs, so compare without them.
    const withoutIds = (html: string) => {
      const template = document.createElement("template");
      template.innerHTML = html;
      template.content
        .querySelectorAll("[data-id]")
        .forEach((element) => element.removeAttribute("data-id"));
      return template.innerHTML;
    };
    if (withoutIds(editor.getHTML()) !== withoutIds(activeNote.content ?? "")) {
      contentSnapshot.current?.schedule();
    }
  }, [editor, status, isAuthenticated, pulled, activeNote.content]);

  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.setEditable(!isReadingMode);
  }, [editor, isReadingMode]);

  // ---------------------------------------------------------------------------
  // Render — exact same DOM structure as working deployed version
  // ---------------------------------------------------------------------------
  return (
    <>
      {syncError && !noticeDismissed && (
        <div className="sync-notice" role="status">
          <span>Sync is paused. Your device copy is still here; we’ll keep trying.</span>
          <button onClick={() => setNoticeDismissed(true)} className="text-xs">
            Dismiss
          </button>
        </div>
      )}

      {editor && (
        <>
          <BubbleMenu editor={editor}>
            <div className="rounded-lg bg-popover shadow-lg">
              <Toolbar editor={editor} />
            </div>
          </BubbleMenu>
          <TableControls editor={editor} />
          <TableGripHandles editor={editor} />
          <TableCellMenu editor={editor} />
        </>
      )}

      <div className="flex-1 flex flex-row overflow-hidden w-full h-full">
        <div className="flex-1 flex flex-col min-w-0 relative h-full">
          {editor && <TableOfContents editor={editor} />}

          <div className="flex-1 overflow-y-auto px-4 md:px-12 pt-8 md:pt-[34px] editor-scroll-container relative">
            <div className="max-w-[600px] mx-auto pb-32">
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
                className={`w-full bg-transparent text-[31px] md:text-[42px] font-bold text-white focus:outline-none mb-[10px] tracking-[-.036em] break-words py-0 leading-[1.08] ${fontClass} ${
                  isReadingMode ? "cursor-default" : ""
                }`}
                aria-label="Note title"
              />

              <div className="text-[13.5px] text-muted mb-[26px]">
                <NoteMeta
                  note={activeNote}
                  folders={useNotesStore.getState().folders}
                />
              </div>

              <div
                className="min-h-[500px] relative pb-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditorClick(e);
                }}
              >
                <LoadingRegion pending={!editor} skeleton={<EditorSkeleton bodyOnly />} label="Preparing editor">
                  {editor && <EditorContent editor={editor} />}
                </LoadingRegion>
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
  onSyncErrorChange,
  onDeleteNote,
  onNavigateNote,
  onCreateNote,
  isReadingMode,
  onToggleReadingMode,
  isRightSidebarOpen,
  onToggleRightSidebar,
  onPreviewVersion,
}: NoteEditorProps) {
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState("");
  const [activeSubnote, setActiveSubnote] = useState<SubnoteTooltip | null>(
    null
  );
  const titleInputRef = useRef<HTMLInputElement>(null);
  const titleSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const pendingTitleSave = useRef<(() => void) | null>(null);
  const flushTitle = useCallback(() => {
    if (titleSaveTimeoutRef.current) clearTimeout(titleSaveTimeoutRef.current);
    titleSaveTimeoutRef.current = null;
    const save = pendingTitleSave.current;
    pendingTitleSave.current = null;
    save?.();
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => () => flushTitle(), [activeNote?.id, flushTitle]);

  useEffect(() => {
    setTitle(activeNote?.title || "");
  }, [activeNote?.id, activeNote?.title]);

  useEffect(() => {
    if (activeNote) {
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
        pendingTitleSave.current = () => {
          const latest = useNotesStore.getState().notes.find(
            (note) => note.id === activeNote.id
          );
          if (latest)
            onNoteUpdate(activeNote.id, { title: newTitle });
        };
        titleSaveTimeoutRef.current = setTimeout(
          flushTitle,
          EDITOR_CONFIG.AUTOSAVE_DELAY_MS
        );
      }
    },
    [activeNote, onNoteUpdate, flushTitle]
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

  if (!mounted) return <LoadingRegion pending skeleton={<EditorSkeleton />} className="editor-loading" label="Preparing note" />;
  if (!activeNote) return null;

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
        onSyncErrorChange={onSyncErrorChange}
        onNavigateNote={onNavigateNote}
        onDeleteNote={onDeleteNote}
        onToggleRightSidebar={onToggleRightSidebar}
        onPreviewVersion={onPreviewVersion}
        onToggleReadingMode={onToggleReadingMode}
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
          font-family:
            ui-serif, Georgia, Cambria, "Times New Roman", Times, serif !important;
        }
        #note-editor-root[data-font="mono"] .ProseMirror,
        #note-editor-root[data-font="mono"] .ProseMirror * {
          font-family:
            ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
            "Liberation Mono", "Courier New", monospace !important;
        }
        #note-editor-root[data-font="sans"] .ProseMirror,
        #note-editor-root[data-font="sans"] .ProseMirror * {
          font-family: var(--font-geist-sans), sans-serif !important;
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
