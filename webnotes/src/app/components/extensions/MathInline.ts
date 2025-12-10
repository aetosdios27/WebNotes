import { Node, mergeAttributes, InputRule } from '@tiptap/core'
import katex from 'katex'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mathInline: {
      setMathInline: (latex: string) => ReturnType
    }
  }
}

export const MathInline = Node.create({
  name: 'mathInline',

  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: '',
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="math-inline"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { 'data-type': 'math-inline', class: 'math-inline' }),
      node.attrs.latex,
    ]
  },

  addNodeView() {
    return ({ node }) => {
      const span = document.createElement('span')
      span.classList.add('math-inline-render')
      
      try {
        katex.render(node.attrs.latex, span, {
          throwOnError: false,
          displayMode: false,
        })
      } catch (e) {
        span.innerText = node.attrs.latex
      }

      return { dom: span }
    }
  },

  addCommands() {
    return {
      setMathInline:
        (latex) =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name, attrs: { latex } })
        },
    }
  },

  // MAGICAL INPUT RULE:
  // Typing $...$ automatically creates a math node
  addInputRules() {
    return [
      new InputRule({
        find: /\$(.+)\$/, // Regex for $content$
        handler: ({ state, range, match }) => {
          const { tr } = state
          const start = range.from
          const end = range.to
          const latex = match[1]

          if (latex) {
            tr.replaceWith(start, end, this.type.create({ latex }))
          }
        },
      }),
    ]
  },
})