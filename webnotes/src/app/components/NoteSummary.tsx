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
const MINIATURE_LIMIT = 4_000;
const EDITOR_BLOCK = /^\s*<(?:p|h[1-6]|ul|ol|li|div|section|pre|blockquote|table|hr|br)(?=[\s/>])/i;
// A closing tag the walker understands marks HTML even when it does not start with a block;
// Markdown with literal `Array<T>` has no closing tags and stays Markdown.
const KNOWN_CLOSING_TAG =
  /<\/(?:p|h[1-6]|ul|ol|li|div|section|pre|code|blockquote|table|thead|tbody|tfoot|caption|tr|td|th|strong|b|em|i|s|u|mark|span|a|sup|sub)>/i;

function markdownInline(text: string): ReactNode[] {
  // Record delimiters once so unmatched openers never rescan the line.
  const closingBracket: number[] = [];
  const closingParen: number[] = [];
  const star: number[] = [];
  const whitespace: number[] = [];
  let bracket = text.length;
  let paren = text.length;
  let asterisk = text.length;
  let space = text.length;
  for (let i = text.length; i >= 0; i--) {
    if (text[i] === "]") bracket = i;
    if (text[i] === ")") paren = i;
    if (text[i] === "*") asterisk = i;
    if (/\s/.test(text[i] ?? "")) space = i;
    closingBracket[i] = bracket;
    closingParen[i] = paren;
    star[i] = asterisk;
    whitespace[i] = space;
  }
  const nodes: ReactNode[] = [];
  let plainStart = 0;
  for (let i = 0; i < text.length; i++) {
    let labelStart = i;
    let labelEnd = i;
    let end = i;
    let bold = false;
    if (text.startsWith("**", i)) {
      labelStart = i + 2;
      labelEnd = star[labelStart];
      if (labelEnd > labelStart && text.startsWith("**", labelEnd)) {
        end = labelEnd + 2;
        bold = true;
      }
    } else if (text[i] === "[") {
      const wiki = text[i + 1] === "[";
      labelStart = i + (wiki ? 2 : 1);
      labelEnd = closingBracket[labelStart];
      if (labelEnd > labelStart && labelEnd < text.length) {
        if (wiki && text[labelEnd + 1] === "]") end = labelEnd + 2;
        else if (!wiki && text[labelEnd + 1] === "(") {
          const urlStart = labelEnd + 2;
          const urlEnd = closingParen[urlStart];
          if (urlEnd > urlStart && urlEnd < text.length && whitespace[urlStart] > urlEnd)
            end = urlEnd + 1;
        }
      }
    }
    if (end === i) continue;
    nodes.push(text.slice(plainStart, i));
    nodes.push(
      <span className={bold ? "mini-bold" : "mini-link"} key={i}>
        {text.slice(labelStart, labelEnd)}
      </span>,
    );
    i = end - 1;
    plainStart = end;
  }
  nodes.push(text.slice(plainStart));
  return nodes;
}

function markdownMiniature(content: string): ReactNode {
  return content.split("\n").map((line, key) => {
    const heading = /^#{1,6}\s+(.+)$/.exec(line);
    const task = /^[-*] \[([ xX])\]\s+(.*)$/.exec(line);
    const item = /^(?:[-*]|\d+\.)\s+(.*)$/.exec(line);
    if (heading)
      return (
        <span className="mini-heading" key={key}>
          {markdownInline(heading[1])}
        </span>
      );
    if (task) {
      const checked = task[1].toLowerCase() === "x";
      return (
        <span className={`mini-task${checked ? " mini-done" : ""}`} key={key}>
          <span
            className="mini-box"
            aria-label={checked ? "Checked task" : "Unchecked task"}
          />
          {markdownInline(task[2])}
        </span>
      );
    }
    if (item)
      return (
        <span className="mini-item" key={key}>
          {markdownInline(item[1])}
        </span>
      );
    return (
      <span className="mini-paragraph" key={key}>
        {markdownInline(line)}
      </span>
    );
  });
}

// Only generated spans and line breaks reach React; stored attributes never do.
export function noteMiniature(content: Note["content"]): ReactNode {
  if (!content) return "Empty note";
  content = content.slice(0, MINIATURE_LIMIT);
  if (!EDITOR_BLOCK.test(content) && !KNOWN_CLOSING_TAG.test(content)) {
    return markdownMiniature(content);
  }
  // Parse recognized editor HTML in a detached template; never emit stored attributes.
  const template = document.createElement("template");
  template.innerHTML = content;
  const root = template.content;
  function walk(node: Node, key: number): ReactNode {
    if (node.nodeType === 3) return node.textContent;
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
        return null;
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
