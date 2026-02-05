import { LanguageSupport } from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { rust } from "@codemirror/lang-rust";
import { sql } from "@codemirror/lang-sql";
import { xml } from "@codemirror/lang-xml";
import { yaml } from "@codemirror/lang-yaml";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { php } from "@codemirror/lang-php";

type LanguageLoader = () => LanguageSupport;

export const LANGUAGES: Record<string, LanguageLoader> = {
  javascript: () => javascript(),
  js: () => javascript(),
  typescript: () => javascript({ typescript: true }),
  ts: () => javascript({ typescript: true }),
  jsx: () => javascript({ jsx: true }),
  tsx: () => javascript({ jsx: true, typescript: true }),
  python: () => python(),
  py: () => python(),
  html: () => html(),
  css: () => css(),
  json: () => json(),
  markdown: () => markdown(),
  md: () => markdown(),
  rust: () => rust(),
  rs: () => rust(),
  sql: () => sql(),
  xml: () => xml(),
  yaml: () => yaml(),
  yml: () => yaml(),
  cpp: () => cpp(),
  "c++": () => cpp(),
  c: () => cpp(),
  java: () => java(),
  php: () => php(),
};

export const DISPLAY_NAMES: Record<string, string> = {
  javascript: "JavaScript",
  js: "JavaScript",
  typescript: "TypeScript",
  ts: "TypeScript",
  jsx: "JSX",
  tsx: "TSX",
  python: "Python",
  py: "Python",
  html: "HTML",
  css: "CSS",
  json: "JSON",
  markdown: "Markdown",
  md: "Markdown",
  rust: "Rust",
  rs: "Rust",
  sql: "SQL",
  xml: "XML",
  yaml: "YAML",
  yml: "YAML",
  cpp: "C++",
  "c++": "C++",
  c: "C",
  java: "Java",
  php: "PHP",
};

export function getLanguageSupport(
  lang: string | null
): LanguageSupport | null {
  if (!lang) return null;
  const loader = LANGUAGES[lang.toLowerCase()];
  return loader ? loader() : null;
}
