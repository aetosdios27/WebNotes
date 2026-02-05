import React from "react";
import {
  siJavascript,
  siTypescript,
  siPython,
  siRust,
  siHtml5,
  siCss,
  siJson,
  siMarkdown,
  siPostgresql,
  siYaml,
  siGnubash,
  siCplusplus,
  siC,
  siSharp,
  siGo,
  siPhp,
  siRuby,
  siSwift,
  siKotlin,
  siDocker,
  siGraphql,
  siOpenjdk,
} from "simple-icons/icons";

// Map slugs to Simple Icons objects
const ICON_MAP: Record<string, any> = {
  javascript: siJavascript,
  js: siJavascript,
  typescript: siTypescript,
  ts: siTypescript,
  python: siPython,
  py: siPython,
  rust: siRust,
  rs: siRust,
  html: siHtml5,
  css: siCss,
  json: siJson,
  markdown: siMarkdown,
  md: siMarkdown,
  sql: siPostgresql,
  yaml: siYaml,
  yml: siYaml,
  bash: siGnubash,
  shell: siGnubash,
  sh: siGnubash,
  java: siOpenjdk, // Java trademark workaround
  c: siC,
  cpp: siCplusplus,
  "c++": siCplusplus,
  csharp: siSharp,
  cs: siSharp,
  go: siGo,
  php: siPhp,
  ruby: siRuby,
  rb: siRuby,
  swift: siSwift,
  kotlin: siKotlin,
  dockerfile: siDocker,
  docker: siDocker,
  graphql: siGraphql,
};

export const BrandIcon = ({
  lang,
  className,
}: {
  lang: string;
  className?: string;
}) => {
  const icon = ICON_MAP[lang?.toLowerCase()];

  if (!icon) {
    // Fallback: Terminal Icon
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    );
  }

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={icon.path} />
    </svg>
  );
};
