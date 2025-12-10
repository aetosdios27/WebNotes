import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { renderLatex } from './MathUtils';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mathInline: {
      setMathInline: (latex?: string) => ReturnType;
    };
  }
}

function MathInlineComponent({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [latex, setLatex] = useState(node.attrs.latex || '');
  const inputRef = useRef<HTMLInputElement>(null);

  // Start editing if latex is empty (just inserted via slash command)
  useEffect(() => {
    if (!node.attrs.latex) {
      setIsEditing(true);
    }
  }, []);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
    }
  }, [isEditing]);

  // Sync latex with node attrs when they change externally
  useEffect(() => {
    if (!isEditing) {
      setLatex(node.attrs.latex || '');
    }
  }, [node.attrs.latex, isEditing]);

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
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleSave();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      handleCancel();
    }
    // Prevent TipTap from handling these keys
    e.stopPropagation();
  }, [handleSave, handleCancel]);

  if (isEditing) {
    const preview = latex.trim() ? renderLatex(latex, false) : null;

    return (
      <NodeViewWrapper as="span" className="inline-flex items-center">
        <span
          className="inline-flex items-center gap-1 bg-zinc-800 border border-yellow-500/50 rounded px-1.5 py-0.5"
          contentEditable={false}
        >
          <span className="text-yellow-500 text-xs font-mono select-none">$</span>
          <input
            ref={inputRef}
            type="text"
            value={latex}
            onChange={(e) => setLatex(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            placeholder="x^2 + y^2"
            className="bg-transparent text-zinc-200 font-mono text-sm outline-none min-w-[60px] max-w-[300px]"
            style={{ width: `${Math.max(60, latex.length * 8 + 20)}px` }}
            spellCheck={false}
            autoComplete="off"
          />
          <span className="text-yellow-500 text-xs font-mono select-none">$</span>

          {/* Live preview */}
          {preview && preview.html && !preview.error && (
            <span className="ml-2 pl-2 border-l border-zinc-600 opacity-70 text-sm">
              <span dangerouslySetInnerHTML={{ __html: preview.html }} />
            </span>
          )}
          {preview && preview.error && (
            <span className="ml-2 pl-2 border-l border-zinc-600 text-red-400 text-xs">
              {preview.error}
            </span>
          )}
        </span>
      </NodeViewWrapper>
    );
  }

  const { html, error } = renderLatex(latex, false);

  return (
    <NodeViewWrapper as="span" className="inline">
      <span
        onClick={() => setIsEditing(true)}
        className={`math-inline-render ${selected ? 'ring-2 ring-yellow-500' : ''} ${error ? 'text-red-400' : ''}`}
        title={error || 'Click to edit'}
        contentEditable={false}
      >
        {html ? (
          <span dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <span className="text-zinc-500 italic text-sm">$...$</span>
        )}
      </span>
    </NodeViewWrapper>
  );
}

export const MathInline = Node.create({
  name: 'mathInline',
  group: 'inline',
  inline: true,
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
      { tag: 'span[data-type="math-inline"]' },
      { tag: 'span.math-inline' },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'math-inline',
        'data-latex': node.attrs.latex,
        class: 'math-inline',
      }),
      node.attrs.latex,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathInlineComponent, {
      as: 'span',
    });
  },

  addCommands() {
    return {
      setMathInline:
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
      'Mod-m': () => {
        this.editor.commands.setMathInline('');
        return true;
      },
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: /(?<!\$)\$([^$]+)\$(?!\$)$/,
        handler: ({ state, range, match }) => {
          const latex = match[1];
          if (!latex || !latex.trim()) return null;

          const { tr } = state;
          tr.replaceWith(range.from, range.to, this.type.create({ latex: latex.trim() }));
        },
      }),
    ];
  },
});