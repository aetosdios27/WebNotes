import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { all, createLowlight } from 'lowlight';
import { CopyButton } from '@/app/components/ui/CopyButton';
import { useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';

// 1. Setup syntax highlighting
const lowlight = createLowlight(all);

// 2. Curated list of languages
const commonLanguages = [
  'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp', 
  'go', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'sql', 'shell', 'bash', 
  'json', 'html', 'css', 'xml', 'yaml', 'markdown'
];

function CodeBlockComponent({ node: { attrs, textContent }, updateAttributes, editor }: any) {
  
  // Debounced Auto-Detection
  const detectLanguage = useDebouncedCallback((content: string) => {
    if (!content || content.length < 5) return;

    try {
      const detection = lowlight.highlightAuto(content, { subset: commonLanguages });
      const detectedLang = detection.data?.language;

      if (detectedLang && detectedLang !== attrs.language) {
        updateAttributes({ language: detectedLang });
      }
    } catch (e) {
      console.warn("Language detection failed", e);
    }
  }, 500);

  // Trigger detection on content change
  useEffect(() => {
    if (textContent) {
      detectLanguage(textContent);
    }
  }, [textContent, detectLanguage]);

  return (
    <NodeViewWrapper 
      className="relative group my-6"
      // FIX: Added type for 'e'
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Tab') {
          e.preventDefault(); 
          editor.commands.insertContent('  ');
        }
      }}
    >
      
      {/* OVERLAY */}
      <div 
        className="absolute right-2 top-2 flex items-center gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        contentEditable={false}
      >
        {/* Language Badge */}
        {attrs.language && attrs.language !== 'auto' && (
          <div 
            className="h-7 flex items-center justify-center text-[10px] uppercase font-bold tracking-wider text-zinc-500 bg-zinc-800/90 px-2.5 rounded backdrop-blur-sm select-none border border-zinc-700/50"
            spellCheck={false}
          >
            {attrs.language}
          </div>
        )}

        {/* Copy Button */}
        <CopyButton value={textContent} />
      </div>

      {/* EDITOR */}
      <pre className="bg-zinc-900 text-zinc-300 p-4 rounded-lg overflow-x-auto font-mono text-sm border border-zinc-800 shadow-sm tab-size-2">
        {/* @ts-expect-error - 'code' is a valid HTML element */}
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  );
}

export const CodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockComponent);
  },
}).configure({
  lowlight,
});