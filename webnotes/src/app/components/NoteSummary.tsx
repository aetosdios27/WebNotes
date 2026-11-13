"use client";
import { useEffect, useState, type ReactNode } from "react";
import { differenceInCalendarDays } from "date-fns";
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
// Only generated spans and line breaks reach React; stored attributes never do.
export function noteMiniature(content: Note["content"]): ReactNode {
  if (!content) return "Empty note";
  // Do not interpret Markdown or literal comparison operators as HTML.
  if (!/<\/?[a-z][^>]*>/i.test(content)) return content;
  // Template contents cannot load images/frames. Strip template delimiters so
  // stored HTML cannot close the inert wrapper and escape into the document.
  const html = content.replace(/<\/?template\b[^>]*>/gi, "");
  const document = new DOMParser().parseFromString(
    `<template>${html}</template>`,
    "text/html",
  );
  const root = document.querySelector("template")?.content;
  function walk(node: Node, key: number): ReactNode {
    if (node.nodeType === 3) return node.textContent;
    if (!(node instanceof Element)) return null;
    const tag = node.tagName.toLowerCase();
    const children = () => Array.from(node.childNodes, walk);
    switch (tag) {
      case "p":
      case "div":
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
        const task = node.getAttribute("data-type") === "taskItem";
        const checked = task && node.getAttribute("data-checked") === "true";
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
      case "em":
      case "i":
      case "s":
      case "code":
      case "span":
        return <span key={key}>{children()}</span>;
      case "br":
        return <br key={key} />;
      default:
        return null;
    }
  }
  return Array.from(root?.childNodes ?? [], walk);
}

export function NoteMiniature({ content }: { content: Note["content"] }) {
  // DOMParser is browser-only. The initial text also keeps SSR/hydration identical.
  const [miniature, setMiniature] = useState<ReactNode>(null);
  useEffect(() => setMiniature(noteMiniature(content)), [content]);
  return (
    <span className="note-miniature">
      {miniature ?? (noteText(content) || "Empty note")}
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
  if (days > 1 && days < 7)
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
