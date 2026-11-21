import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { MathFormula } from './MathEditor';
import { latexSource, mathMarkdownStorage } from './MathMarkdown';

export const MathNode = Node.create({
  name: 'mathNode',
  atom: true,
  selectable: true,
  draggable: true,

  extendNodeSchema(extension) {
    // Markdown tables need to recognize a formula-only cell as nonempty.
    // Keep the text representation one character wide for input-rule offsets.
    return extension.name === this.name ? { leafText: () => '\uFFFC' } : {};
  },

  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-latex') ?? element.textContent ?? '',
        renderHTML: (attributes: Record<string, unknown>) => ({ 'data-latex': attributes.latex }),
      },
    };
  },

  parseHTML() {
    const tag = this.name === 'mathInline' ? 'span' : 'div';
    const type = this.name === 'mathInline' ? 'math-inline' : 'math-block';
    return [{ tag: `${tag}[data-type="${type}"]` }, { tag: `${tag}.${type}` }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const tag = node.isInline ? 'span' : 'div';
    const type = node.isInline ? 'math-inline' : 'math-block';
    return [tag, mergeAttributes(HTMLAttributes, { 'data-type': type, class: type }), latexSource(node)];
  },

  addStorage() {
    return mathMarkdownStorage(this.name === 'mathBlock');
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathFormula, { as: this.name === 'mathInline' ? 'span' : 'div' });
  },
});
