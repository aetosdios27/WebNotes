import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { all, createLowlight } from "lowlight";
import { CopyButton } from "@/app/components/ui/CopyButton";
import { OctopusBadge } from "@/app/components/ui/OctopusBadge";
import { useMemo, useEffect, useState, useCallback, useRef } from "react";
import { useDebouncedCallback } from "use-debounce";
import { DISPLAY_NAMES } from "./codemirror/languages";
import { detectHeuristic } from "./codemirror/heuristics";

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
const MIN_DETECTION_LENGTH = 10;

function CodeBlockComponent({
  node: { attrs, textContent },
  updateAttributes,
}: NodeViewProps) {
  const currentLang =
    attrs.language && attrs.language !== "null" ? attrs.language : "text";
  const displayLang =
    DISPLAY_NAMES[currentLang] ||
    (currentLang === "text" ? "Plain Text" : currentLang);
  const brandColor =
    LANGUAGE_COLORS[currentLang.toLowerCase()] || DEFAULT_COLOR;

  const [isDetecting, setIsDetecting] = useState(false);

  // Track previous content to avoid unnecessary updates
  const prevContentRef = useRef(textContent);

  const lineCount = useMemo(
    () => (textContent.match(/\n/g) || []).length + 1,
    [textContent]
  );

  // Stable reference to update language - deferred to avoid flushSync issues
  const updateLang = useCallback(
    (lang: string) => {
      // Defer to next microtask to avoid flushSync during render
      queueMicrotask(() => {
        updateAttributes({ language: lang });
      });
    },
    [updateAttributes]
  );

  // Debounced language detection
  const detectLanguage = useDebouncedCallback((content: string) => {
    const trimmed = content.trim();

    // Not enough content to detect
    if (trimmed.length < MIN_DETECTION_LENGTH) {
      setIsDetecting(false);
      return;
    }

    // 1. Try heuristics first (fast)
    const heuristicLang = detectHeuristic(content);
    if (heuristicLang) {
      updateLang(heuristicLang);
      setIsDetecting(false);
      return;
    }

    // 2. Fall back to lowlight auto-detection
    try {
      const result = lowlight.highlightAuto(content);
      const detected = result.data?.language;
      if (detected) {
        updateLang(detected);
      }
    } catch (e) {
      // Lowlight failed, keep current language
    }

    setIsDetecting(false);
  }, 800);

  // Main effect - only depends on textContent
  useEffect(() => {
    const trimmed = textContent.trim();
    const prevTrimmed = prevContentRef.current.trim();

    // Update ref
    prevContentRef.current = textContent;

    // Empty or too short - reset to plain text
    if (trimmed.length < MIN_DETECTION_LENGTH) {
      detectLanguage.cancel();
      setIsDetecting(false);

      // Only reset if content actually changed to empty (not on mount)
      // and language is not already "text"
      if (
        prevTrimmed.length >= MIN_DETECTION_LENGTH &&
        attrs.language &&
        attrs.language !== "text" &&
        attrs.language !== "null"
      ) {
        updateLang("text");
      }
      return;
    }

    // Content is long enough - trigger detection
    setIsDetecting(true);
    detectLanguage(textContent);
  }, [textContent]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      detectLanguage.cancel();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <NodeViewWrapper className="code-block relative my-6 rounded-lg border border-zinc-800 bg-[#0a0a0a] overflow-hidden shadow-sm group">
      {/* HEADER */}
      <div
        className="flex items-center justify-end px-3 py-2 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm select-none"
        contentEditable={false}
      >
        <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <OctopusBadge
            lang={currentLang}
            displayName={displayLang}
            color={brandColor}
            isDetecting={isDetecting}
          />

          <div className="h-3 w-px bg-zinc-800" />

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

        {/* The Content */}
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
  addAttributes() {
    return {
      language: {
        default: "text",
        parseHTML: (element) => element.getAttribute("data-language"),
        renderHTML: (attributes) => ({
          "data-language": attributes.language,
        }),
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockComponent);
  },
}).configure({
  lowlight,
  defaultLanguage: "text",
});
