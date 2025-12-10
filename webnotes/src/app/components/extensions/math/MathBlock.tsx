import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { useState, useCallback } from 'react';
import { renderLatex } from './MathUtils';
import { MathInput } from './MathInput';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mathBlock: {
      setMathBlock: (latex?: string) => ReturnType;
    };
  }
}

// React component for block math
function MathBlockComponent({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const [isEditing, setIsEditing] = useState(!node.attrs.latex);
  const latex = node.attrs.latex || '';
  
  const handleSave = useCallback((newLatex: string) => {
    if (!newLatex.trim()) {
      // Delete empty node
      editor.commands.deleteSelection();
      return;
    }
    updateAttributes({ latex: newLatex });
    setIsEditing(false);
  }, [updateAttributes, editor]);
  
  const handleCancel = useCallback(() => {
    if (!latex.trim()) {
      editor.commands.deleteSelection();
    } else {
      setIsEditing(false);
    }
  }, [latex, editor]);

  if (isEditing) {
    return (
      <NodeViewWrapper>
        <MathInput
          initialLatex={latex}
          displayMode={true}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </NodeViewWrapper>
    );
  }

  const { html, error } = renderLatex(latex, true);

  return (
    <NodeViewWrapper>
      <div
        onClick={() => setIsEditing(true)}
        className={`math-block-render cursor-pointer ${selected ? 'ring-2 ring-yellow-500' : ''} ${error ? 'border-red-500/50' : ''}`}
        title={error || 'Click to edit'}
      >
        {html ? (
          <div dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <span className="text-zinc-500 italic">$$...$$</span>
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
      // Match $$content$$ 
      new InputRule({
        find: /\$\$([^$]+)\$\$\s?$/,
        handler: ({ state, range, match }) => {
          const latex = match[1];
          if (!latex || !latex.trim()) return null;
          
          const { tr } = state;
          tr.replaceWith(range.from, range.to, this.type.create({ latex: latex.trim() }));
        },
      }),
      // Match just $$ at start of line to open editor
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