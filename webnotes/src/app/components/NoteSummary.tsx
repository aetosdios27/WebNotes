"use client";
import { useEffect, useState, type ReactNode } from "react";
import { differenceInCalendarDays } from "date-fns";
import MarkdownIt from "markdown-it";
import taskLists from "markdown-it-task-lists";
import type { Note, Folder } from "@/lib/storage/types";

// Plain text keeps stored HTML inert, including scripts and remote resources.
export function noteText(content: Note["content"]) {
  if (!content) return "";
  const text = content
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<\/(p|li|h[1-6]|div)>/gi, "\n")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "");
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}
const MINIATURE_LIMIT = 4_000;
// Elements whose whole subtree is dropped; every other unknown element keeps only its text.
const UNSAFE = new Set([
  "script", "style", "iframe", "object", "embed", "svg", "math", "template", "noscript",
  "link", "meta", "form", "input", "button", "img", "video", "audio", "source", "canvas",
  "select", "textarea", "frame", "frameset",
]);

// The editor's own parser and task-list plugin (via tiptap-markdown); unlike marked, its
// link and emphasis scanning stays fast on pathological input.
const markdown = new MarkdownIt({ html: true }).use(taskLists);

// Separator whitespace only between blocks; inside a paragraph a newline is a space.
const BLOCK_PARENTS = new Set([
  "ul", "ol", "li", "table", "thead", "tbody", "tfoot", "tr", "blockquote", "section", "div",
]);

// `[[Title]]` is not Markdown; show it as an inert link. indexOf keeps this linear.
function wikiLinks(text: string, key: number): ReactNode {
  const parts: ReactNode[] = [];
  let from = 0;
  for (;;) {
    const open = text.indexOf("[[", from);
    const close = open < 0 ? -1 : text.indexOf("]]", open + 2);
    if (open < 0 || close < 0) break;
    parts.push(text.slice(from, open));
    parts.push(<span className="mini-link" key={`${key}-${open}`}>{text.slice(open + 2, close)}</span>);
    from = close + 2;
  }
  if (from === 0) return text;
  parts.push(text.slice(from));
  return parts;
}

// Only generated spans and line breaks reach React; stored attributes never do.
export function noteMiniature(content: Note["content"]): ReactNode {
  if (!content) return "Empty note";
  content = content.slice(0, MINIATURE_LIMIT);
  // Bodies are HTML (current editor) or Markdown (saved by earlier versions), with no
  // marker. Do what the editor does on load: parse as Markdown, letting raw HTML through.
  const html = markdown.render(content);
  // Parse in a detached template; never emit stored attributes.
  const template = document.createElement("template");
  template.innerHTML = html;
  const root = template.content;
  function walk(node: Node, key: number): ReactNode {
    if (node.nodeType === 3) {
      let text = node.textContent ?? "";
      if (!text.trim() && text.includes("\n")) {
        const parent = node.parentNode;
        const between =
          !(parent instanceof Element) || BLOCK_PARENTS.has(parent.tagName.toLowerCase());
        return between ? null : " ";
      }
      if (node.previousSibling instanceof Element && node.previousSibling.tagName === "INPUT")
        text = text.trimStart();
      return wikiLinks(text, key);
    }
    if (!(node instanceof Element)) return null;
    const tag = node.tagName.toLowerCase();
    const children = () => Array.from(node.childNodes, walk);
    switch (tag) {
      case "p":
      case "div":
      case "section":
      case "blockquote":
      case "table":
      case "thead":
      case "tbody":
      case "tfoot":
      case "caption":
      case "tr":
        return (
          <span className="mini-paragraph" key={key}>
            {children()}
          </span>
        );
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6":
        return (
          <span className="mini-heading" key={key}>
            {children()}
          </span>
        );
      case "ul":
      case "ol":
        return (
          <span className="mini-list" key={key}>
            {children()}
          </span>
        );
      case "li": {
        // Editor HTML marks tasks with data attributes; Markdown task lists render a checkbox.
        const box = node.querySelector(':scope > input[type="checkbox"], :scope > p > input[type="checkbox"]');
        const task = node.getAttribute("data-type") === "taskItem" || box !== null;
        const checked =
          node.getAttribute("data-checked") === "true" || (box?.hasAttribute("checked") ?? false);
        return (
          <span
            className={
              task ? `mini-task${checked ? " mini-done" : ""}` : "mini-item"
            }
            key={key}
          >
            {task && (
              <span
                className="mini-box"
                aria-label={checked ? "Checked task" : "Unchecked task"}
              />
            )}
            {children()}
          </span>
        );
      }
      case "a":
        return (
          <span className="mini-link" key={key}>
            {children()}
          </span>
        );
      case "strong":
      case "b":
        return (
          <span className="mini-bold" key={key}>
            {children()}
          </span>
        );
      case "pre":
        return <span className="mini-paragraph mini-code" key={key}>{children()}</span>;
      case "td":
      case "th":
        return <span key={key}>{children()}{" "}</span>;
      case "em":
      case "i":
      case "s":
      case "code":
      case "span":
      case "u":
      case "mark":
      case "sup":
      case "sub":
        return <span key={key}>{children()}</span>;
      case "hr":
      case "br":
        return <br key={key} />;
      default:
        return UNSAFE.has(tag) ? null : <span key={key}>{children()}</span>;
    }
  }
  return Array.from(root.childNodes, walk);
}

export function NoteMiniature({ content }: { content: Note["content"] }) {
  // Template parsing is browser-only. The initial text also keeps SSR/hydration identical.
  const [miniature, setMiniature] = useState<ReactNode>(null);
  useEffect(() => setMiniature(noteMiniature(content)), [content]);
  return (
    <span className="note-miniature">
      {miniature ?? (content?.slice(0, MINIATURE_LIMIT) || "Empty note")}
    </span>
  );
}

export function formatNoteTime(
  value: Note["updatedAt"],
  {
    now = new Date(),
    locale,
    preview = false,
  }: {
    now?: Date;
    locale?: string;
    preview?: boolean;
  } = {},
) {
  const date = new Date(value);
  const days = differenceInCalendarDays(now, date);
  const clock = date.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
  });
  if (days === 0) return preview ? `Today at ${clock}` : clock;
  if (days === 1) return preview ? `Yesterday at ${clock}` : "Yesterday";
  if (date.getFullYear() === now.getFullYear() && days > 1 && days < 7)
    return date.toLocaleDateString(locale, { weekday: "short" });
  return `${date.getDate()} ${date.toLocaleDateString(locale, { month: "short" })}${date.getFullYear() === now.getFullYear() ? "" : ` ${date.getFullYear()}`}`;
}

export function NoteMeta({
  note,
  folders,
  preview = false,
}: {
  note: Note;
  folders: Folder[];
  preview?: boolean;
}) {
  const folder = folders.find((folder) => folder.id === note.folderId);
  const time = formatNoteTime(note.updatedAt, { preview });
  return (
    <>
      {preview
        ? `${time}${folder ? ` · ${folder.name}` : ""}`
        : `${folder ? `${folder.name} · ` : ""}${time}`}
    </>
  );
}
