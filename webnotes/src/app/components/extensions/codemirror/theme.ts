import { EditorView } from "@codemirror/view";
import { Extension } from "@codemirror/state";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

const FONT_FAMILY = "'JetBrains Mono', monospace";

// JetBrains Mono + Dark Theme
export const codeBlockTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#0a0a0a",
      color: "#e4e4e7",
      fontSize: "13px",
      fontFamily: FONT_FAMILY,
    },
    ".cm-content": {
      caretColor: "#eab308",
      fontFamily: FONT_FAMILY,
      padding: "12px 0",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "#eab308",
      borderLeftWidth: "2px",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      {
        backgroundColor: "rgba(234, 179, 8, 0.3)",
      },
    ".cm-gutters": {
      backgroundColor: "#0a0a0a",
      color: "#52525b",
      border: "none",
      borderRight: "1px solid #27272a",
      fontFamily: FONT_FAMILY,
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 12px 0 16px",
      minWidth: "3ch",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(255, 255, 255, 0.03)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "rgba(255, 255, 255, 0.03)",
      color: "#a1a1aa",
    },
    ".cm-line": {
      padding: "0 16px",
    },
    ".cm-scroller": {
      overflow: "auto",
      fontFamily: FONT_FAMILY,
    },
    // Force cursor visibility and blinking
    "&.cm-focused .cm-cursor": {
      borderLeftColor: "#eab308",
      borderLeftWidth: "2px",
      display: "block",
    },
    "&.cm-focused": {
      outline: "none",
    },
  },
  { dark: true }
);

// Syntax highlighting colors
const highlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#c792ea" },
  { tag: tags.operator, color: "#89ddff" },
  { tag: tags.special(tags.variableName), color: "#eeffff" },
  { tag: tags.typeName, color: "#ffcb6b" },
  { tag: tags.atom, color: "#f78c6c" },
  { tag: tags.number, color: "#f78c6c" },
  { tag: tags.definition(tags.variableName), color: "#82aaff" },
  { tag: tags.string, color: "#c3e88d" },
  { tag: tags.special(tags.string), color: "#c3e88d" },
  { tag: tags.comment, color: "#545454", fontStyle: "italic" },
  { tag: tags.variableName, color: "#eeffff" },
  { tag: tags.tagName, color: "#f07178" },
  { tag: tags.bracket, color: "#89ddff" },
  { tag: tags.meta, color: "#ffcb6b" },
  { tag: tags.attributeName, color: "#c792ea" },
  { tag: tags.propertyName, color: "#82aaff" },
  { tag: tags.className, color: "#ffcb6b" },
  { tag: tags.labelName, color: "#f07178" },
  { tag: tags.namespace, color: "#89ddff" },
  { tag: tags.macroName, color: "#c792ea" },
  { tag: tags.literal, color: "#f78c6c" },
  { tag: tags.unit, color: "#f78c6c" },
  { tag: tags.null, color: "#89ddff" },
  { tag: tags.bool, color: "#89ddff" },
  { tag: tags.regexp, color: "#c3e88d" },
  { tag: tags.escape, color: "#89ddff" },
  { tag: tags.color, color: "#f78c6c" },
  { tag: tags.url, color: "#c3e88d", textDecoration: "underline" },
  { tag: tags.function(tags.variableName), color: "#82aaff" },
  { tag: tags.definition(tags.function(tags.variableName)), color: "#82aaff" },
]);

export const codeBlockHighlighting: Extension =
  syntaxHighlighting(highlightStyle);
