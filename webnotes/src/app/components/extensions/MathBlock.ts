import { Node, mergeAttributes } from '@tiptap/core'
import katex from 'katex'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mathBlock: {
      setMathBlock: (latex: string) => ReturnType
    }
  }
}

export const MathBlock = Node.create({
  name: 'mathBlock',

  group: 'block',
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: '',
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="math-block"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'math-block', class: 'math-block' }),
      node.attrs.latex,
    ]
  },

  addNodeView() {
    return ({ node }) => {
      const container = document.createElement('div')
      container.classList.add('math-block-render')

      try {
        katex.render(node.attrs.latex, container, {
          throwOnError: false,
          displayMode: true,
        })
      } catch (e) {
        container.innerText = node.attrs.latex
        container.style.color = '#ef4444'
      }

      return { dom: container }
    }
  },

  addCommands() {
    return {
      setMathBlock:
        (latex) =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name, attrs: { latex } })
        },
    }
  },
})