"use client";

import type { Note } from "@/lib/storage/types";
import { useDebouncedCallback } from "use-debounce";
// FIX: Added InputRule to imports
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
import { Markdown } from "tiptap-markdown";
import { SlashCommand } from "./SlashCommandExtension";
import { slashCommandSuggestion } from "./SlashCommands";
import { Toolbar } from "./Toolbar";
import NoteSettings from "./NoteSettings";
import { MathInline, MathBlock } from "./extensions/math";
import { CodeBlock } from "./extensions/CodeBlock";
import { useEffect, useRef, useState, useCallback } from "react";
import { TableOfContents } from "./TableOfContents";
import { motion, AnimatePresence } from "framer-motion";

interface NoteEditorProps {
  activeNote: Note | undefined;
  onNoteUpdate: (note: Note) => void;
  onSavingStatusChange: (isSaving: boolean) => void;
  onDeleteNote?: (noteId: string) => void;
}

// --- Extensions ---
const CustomLink = Mark.create({
  name: "link",
  priority: 1000,
  inclusive: false,
  addAttributes() {
    return { href: { default: null }, target: { default: "_blank" } };
  },
  parseHTML() {
    return [{ tag: "a[href]" }];
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
      // FIX: Wrapped in new InputRule to satisfy TypeScript types
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
  onNoteUpdate,
  onSavingStatusChange,
  onDeleteNote,
}: NoteEditorProps) {
  const [title, setTitle] = useState("");
  const [activeSubnote, setActiveSubnote] = useState<{
    meaning: string;
    rect: DOMRect;
  } | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const lastNoteIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (activeNote) {
      setTitle(activeNote.title || "");
      if (!activeNote.title && !activeNote.content && titleInputRef.current) {
        setTimeout(() => titleInputRef.current?.focus(), 100);
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
      if (!noteId) return;
      onSavingStatusChange(true);
      try {
        await onNoteUpdate({
          ...activeNote!,
          title: newTitle.trim() || "Untitled",
          content: markdownContent,
          updatedAt: new Date(),
        });
      } catch (e) {
        console.error(e);
      } finally {
        onSavingStatusChange(false);
      }
    },
    1500
  );

  const fontClass = getFontClass(activeNote?.font || "sans");

  const editor = useEditor(
    {
      extensions: [
        CustomLink,
        Subnote,
        StarterKit.configure({
          heading: { levels: [1, 2, 3, 4, 5, 6] },
          codeBlock: false,
        }),
        Typography,
        Placeholder.configure({
          placeholder: "Type [link](url) or {text}(meaning)...",
        }),
        Markdown.configure({ html: true }),
        SlashCommand.configure({ suggestion: slashCommandSuggestion }),
        MathInline,
        MathBlock,
        CodeBlock,
      ],
      content: activeNote?.content ?? "",
      editorProps: {
        attributes: {
          class: `prose prose-invert prose-lg focus:outline-none max-w-none break-words ${fontClass}`,
        },
      },
      onUpdate: ({ editor: editorInstance }) => {
        if (!activeNote?.id) return;
        debouncedSave(activeNote.id, title, getMarkdown(editorInstance));
      },
      immediatelyRender: false,
    },
    [activeNote?.id, fontClass]
  );

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
      className="flex flex-col flex-1 h-full bg-black relative"
      onClick={() => setActiveSubnote(null)}
    >
      <div
        className="absolute top-8 right-12 z-[60] hidden md:block"
        onClick={(e) => e.stopPropagation()}
      >
        <NoteSettings
          note={activeNote}
          onDelete={() => onDeleteNote?.(activeNote.id)}
          onUpdate={(u) => onNoteUpdate({ ...activeNote, ...u })}
        />
      </div>

      <TableOfContents editor={editor} />

      <div className="flex-1 overflow-y-auto px-4 md:px-12 pt-4 md:pt-8 editor-scroll-container relative">
        <div className="max-w-4xl mx-auto pr-16">
          <div className="inline-block mb-4 md:mb-6">
            {editor ? <Toolbar editor={editor} /> : <div className="h-10" />}
          </div>

          <input
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              debouncedSave(activeNote.id, e.target.value, getMarkdown(editor));
            }}
            onKeyDown={(e) => e.key === "Enter" && editor?.commands.focus()}
            placeholder="Untitled"
            className={`w-full bg-transparent text-3xl md:text-4xl font-bold text-white focus:outline-none mb-6 md:mb-8 break-words ${fontClass}`}
          />

          <div
            className="min-h-[500px] relative"
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

      <AnimatePresence>
        {activeSubnote && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="fixed z-[9999] p-4 bg-[#121212] backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-[280px] pointer-events-none"
            style={{
              // Precise Math: Place top of box relative to word top, minus 15px for spacing
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
                "{activeSubnote.meaning}"
              </p>
            </div>

            {/* Pointer with Outline Fix: Shares bg and border-right/bottom to create seamless point */}
            <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-[#121212] border-r border-b border-white/20 z-0" />
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .ProseMirror {
          word-wrap: break-word !important;
          white-space: pre-wrap !important;
          outline: none !important;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #52525b;
          pointer-events: none;
          height: 0;
        }
      `}</style>
    </div>
  );
}
