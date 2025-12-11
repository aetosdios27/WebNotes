import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { renderLatex } from './MathUtils';
import { CopyButton } from '@/app/components/ui/CopyButton';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mathBlock: {
      setMathBlock: (latex?: string) => ReturnType;
    };
  }
}

// React component for block math
function MathBlockComponent({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [latex, setLatex] = useState(node.attrs.latex || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Start editing if latex is empty (just inserted)
  useEffect(() => {
    if (!node.attrs.latex) {
      setIsEditing(true);
    }
  }, []);

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  // Sync latex with node attrs
  useEffect(() => {
    setLatex(node.attrs.latex || '');
  }, [node.attrs.latex]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [latex]);

  const handleSave = useCallback(() => {
    if (!latex.trim()) {
      editor.commands.deleteSelection();
      return;
    }
    updateAttributes({ latex });
    setIsEditing(false);
  }, [latex, updateAttributes, editor]);

  const handleCancel = useCallback(() => {
    if (!node.attrs.latex) {
      editor.commands.deleteSelection();
    } else {
      setLatex(node.attrs.latex);
      setIsEditing(false);
    }
  }, [node.attrs.latex, editor]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Cmd/Ctrl + Enter to save
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      e.stopPropagation();
      handleSave();
    }
    // Escape to cancel
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      handleCancel();
    }
  }, [handleSave, handleCancel]);

  // EDIT MODE
  if (isEditing) {
    const preview = renderLatex(latex, true);
    
    return (
      <NodeViewWrapper>
        <div 
          className="my-4 rounded-lg border border-yellow-500/50 bg-zinc-900 overflow-hidden"
          contentEditable={false}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-zinc-800/80 border-b border-zinc-700">
            <div className="flex items-center gap-2">
              <span className="text-yellow-500 font-mono text-sm">$$</span>
              <span className="text-zinc-400 text-xs">Block Equation</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500 hidden sm:inline">⌘↵ save · esc cancel</span>
              <button
                onClick={handleSave}
                className="text-xs bg-yellow-500 hover:bg-yellow-400 text-black font-medium px-3 py-1 rounded transition-colors"
              >
                Done
              </button>
            </div>
          </div>

          {/* Editor */}
          <div className="p-3">
            <textarea
              ref={textareaRef}
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="\sum_{i=1}^{n} x_i = \frac{a}{b}"
              className="w-full bg-zinc-800 text-zinc-200 font-mono text-sm p-3 rounded border border-zinc-700 focus:border-yellow-500/50 focus:outline-none focus:ring-1 focus:ring-yellow-500/30 resize-none min-h-[60px]"
              rows={2}
              spellCheck={false}
            />
          </div>

          {/* Preview */}
          <div className="px-3 pb-3">
            <div className="text-xs text-zinc-500 mb-2 flex items-center justify-between">
              <span>Preview</span>
              {preview.error && (
                <span className="text-red-400">{preview.error}</span>
              )}
            </div>
            <div 
              className={`p-4 bg-black/50 rounded border min-h-[60px] flex items-center justify-center ${
                preview.error ? 'border-red-500/30' : 'border-zinc-800'
              }`}
            >
              {preview.html ? (
                <div dangerouslySetInnerHTML={{ __html: preview.html }} />
              ) : (
                <span className="text-zinc-600 italic">Type LaTeX above...</span>
              )}
            </div>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  // RENDER MODE
  const { html, error } = renderLatex(latex, true);

  return (
    <NodeViewWrapper className="group relative">
      {/* 
         COPY BUTTON 
         - Positioned top right
         - Hidden by default, shows on group hover
      */}
      {!error && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <CopyButton value={latex} />
        </div>
      )}

      <div
        onClick={() => setIsEditing(true)}
        className={`math-block-render cursor-pointer ${selected ? 'ring-2 ring-yellow-500' : ''} ${error ? 'border-red-500/50' : ''}`}
        title={error || 'Click to edit'}
        contentEditable={false}
      >
        {html ? (
          <div dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <span className="text-zinc-500 italic">Click to add equation</span>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const MathBlock = Node.create({
  name: 'mathBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-latex') || element.textContent || '',
        renderHTML: (attributes) => ({ 'data-latex': attributes.latex }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'div[data-type="math-block"]' },
      { tag: 'div.math-block' },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 
        'data-type': 'math-block',
        'data-latex': node.attrs.latex,
        class: 'math-block',
      }),
      node.attrs.latex,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathBlockComponent);
  },

  addCommands() {
    return {
      setMathBlock:
        (latex = '') =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { latex },
          });
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-m': () => {
        this.editor.commands.setMathBlock('');
        return true;
      },
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\$\$([^$]+)\$\$\s?$/,
        handler: ({ state, range, match }) => {
          const latex = match[1];
          if (!latex || !latex.trim()) return null;
          
          const { tr } = state;
          tr.replaceWith(range.from, range.to, this.type.create({ latex: latex.trim() }));
        },
      }),
      new InputRule({
        find: /^\$\$\s?$/,
        handler: ({ state, range }) => {
          const { tr } = state;
          tr.replaceWith(range.from, range.to, this.type.create({ latex: '' }));
        },
      }),
    ];
  },
});