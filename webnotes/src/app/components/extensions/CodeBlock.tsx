import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { all, createLowlight } from "lowlight";
import { CopyButton } from "@/app/components/ui/CopyButton";
import { useMemo, useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { BrandIcon } from "./codemirror/icons";
import { DISPLAY_NAMES } from "./codemirror/languages";
import { detectHeuristic } from "./codemirror/heuristics";
import { Loader2 } from "lucide-react";

const lowlight = createLowlight(all);

const LANGUAGE_COLORS: Record<string, string> = {
  typescript: "#3178c6",
  javascript: "#f7df1e",
  python: "#3776ab",
  rust: "#dea584",
  html: "#e34c26",
  css: "#264de4",
  json: "#facc15",
  markdown: "#ffffff",
  sql: "#e38c00",
  xml: "#0060ac",
  yaml: "#cb171e",
  bash: "#4eaa25",
  shell: "#4eaa25",
  java: "#b07219",
  c: "#555555",
  cpp: "#f34b7d",
  csharp: "#178600",
  go: "#00add8",
  php: "#4f5d95",
  ruby: "#701516",
  swift: "#ffac45",
  kotlin: "#7f52ff",
  dockerfile: "#384d54",
  graphql: "#e10098",
  text: "#a1a1aa",
};
const DEFAULT_COLOR = "#a1a1aa";

function CodeBlockComponent({
  node: { attrs, textContent },
  updateAttributes,
}: NodeViewProps) {
  const currentLang = attrs.language || "text";
  const displayLang =
    DISPLAY_NAMES[currentLang] ||
    (currentLang === "text" ? "Plain Text" : currentLang);
  const brandColor =
    LANGUAGE_COLORS[currentLang.toLowerCase()] || DEFAULT_COLOR;

  const [isDetecting, setIsDetecting] = useState(false);

  const lineCount = useMemo(
    () => (textContent.match(/\n/g) || []).length + 1,
    [textContent]
  );

  const detectLanguage = useDebouncedCallback((content: string) => {
    if (!content || content.length < 10) {
      setIsDetecting(false);
      return;
    }

    // 1. Heuristics (Fast)
    const heuristicLang = detectHeuristic(content);
    if (heuristicLang && heuristicLang !== currentLang) {
      updateAttributes({ language: heuristicLang });
      setIsDetecting(false);
      return;
    }

    // 2. Lowlight (Fallback)
    // Only run if heuristic failed AND current isn't locked by user (how to track that? assume auto)
    // We will re-detect even if current is set, to fix the C++ -> Rust paste issue.
    try {
      const result = lowlight.highlightAuto(content);
      const detected = result.data?.language;

      if (detected && detected !== currentLang) {
        updateAttributes({ language: detected });
      }
    } catch (e) {}

    setIsDetecting(false);
  }, 1000);

  useEffect(() => {
    if (textContent.length > 10) {
      setIsDetecting(true);
      detectLanguage(textContent);
    }
  }, [textContent, detectLanguage]);

  return (
    <NodeViewWrapper className="code-block relative my-6 rounded-lg border border-zinc-800 bg-[#0a0a0a] overflow-hidden shadow-sm group">
      {/* HEADER (Persistent) */}
      <div
        className="flex items-center justify-end px-3 py-2 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm select-none"
        contentEditable={false}
      >
        <div className="flex items-center gap-4">
          {/* Brand Pill */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-bold tracking-wide transition-all"
            style={{
              color: brandColor,
              backgroundColor: `${brandColor}10`,
              borderColor: `${brandColor}20`,
            }}
          >
            {isDetecting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <BrandIcon lang={currentLang} className="w-3.5 h-3.5" />
            )}
            <span className="uppercase">
              {isDetecting ? "DETECTING..." : displayLang}
            </span>
          </div>

          <div className="h-3 w-px bg-zinc-800" />

          {/* Copy */}
          <CopyButton
            value={textContent}
            className="h-6 w-6 !bg-transparent hover:!bg-zinc-800 !border-0 text-zinc-500 hover:text-zinc-300"
          />
        </div>
      </div>

      {/* EDITOR AREA */}
      <div className="relative flex bg-[#0a0a0a]">
        {/* Line Numbers */}
        <div
          className="flex-shrink-0 flex flex-col items-end gap-0 py-4 pl-3 pr-4 text-right select-none bg-[#0a0a0a] border-r border-zinc-800/50"
          contentEditable={false}
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "13px",
            lineHeight: "1.5",
            color: "#52525b",
            minWidth: "2.5em",
          }}
        >
          {Array.from({ length: lineCount }).map((_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          <pre
            className="!m-0 !p-4 !bg-[#0a0a0a] !border-0 !outline-none !font-[inherit]"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "13px",
              lineHeight: "1.5",
              tabSize: 2,
            }}
          >
            <NodeViewContent as="div" className="block" />
          </pre>
        </div>
      </div>
    </NodeViewWrapper>
  );
}

export const CodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockComponent);
  },
}).configure({
  lowlight,
  defaultLanguage: "text",
});
