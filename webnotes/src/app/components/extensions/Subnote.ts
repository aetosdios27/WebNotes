import { Mark, mergeAttributes, InputRule } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';

export const Subnote = Mark.create({
  name: 'subnote',
  priority: 1001,
  inclusive: false,

  addAttributes() {
    return {
      meaning: {
        default: null,
        parseHTML: element => element.getAttribute('data-meaning'),
        renderHTML: attributes => ({ 'data-meaning': attributes.meaning }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-meaning]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'subnote-item border-b-2 border-dotted border-yellow-500/60 text-yellow-100/90 cursor-pointer hover:bg-yellow-500/10 transition-all font-medium',
      }),
      0
    ];
  },

  addInputRules() {
    return [
      new InputRule({
        // Regex: {Group 1}(Group 2)
        find: /\{([^}]+)\}\(([^)]+)\)$/,
        handler: ({ state, range, match }) => {
          const { tr } = state;
          const start = range.from;
          const end = range.to;
          
          const word = match[1];    // This is the word you want to see
          const meaning = match[2]; // This is the hidden meaning

          if (word) {
            /**
             * STEP 1: Wipe out the entire typed string {word}(meaning)
             * STEP 2: Insert ONLY the 'word'
             * STEP 3: Apply the mark with the 'meaning' attribute
             */
            tr.replaceWith(start, end, state.schema.text(word)); //
            tr.addMark(start, start + word.length, this.type.create({ meaning })); //
            
            // Ensure the cursor moves to the end of the new word
            tr.setSelection(TextSelection.create(tr.doc, start + word.length)); //
          }
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () => this.editor.commands.command(({ tr, state }) => {
        const { selection } = state;
        const { empty, $from } = selection;

        if (!empty) return false;

        // Find the subnote mark at or before the cursor
        const subnoteMark = $from.marks().find(m => m.type.name === this.name) 
                         || (state.doc.resolve($from.pos - 1).marks().find(m => m.type.name === this.name));

        if (subnoteMark) {
          const pos = $from.pos;
          let markStart = pos;
          let markEnd = pos;

          // Find the precise start/end of the current mark range
          state.doc.nodesBetween($from.before(), $from.after(), (node, p) => {
            if (node.isText && node.marks.some(m => m.type === this.type)) {
              markStart = p;
              markEnd = p + node.nodeSize;
              return false;
            }
          });

          const word = state.doc.textBetween(markStart, markEnd);
          const meaning = subnoteMark.attrs.meaning;
          const revertedText = `{${word}}(${meaning})`;

          // Transform the visible word back into raw markdown
          tr.replaceWith(markStart, markEnd, state.schema.text(revertedText));
          
          // Place cursor at the end of the reverted text string
          tr.setSelection(TextSelection.create(tr.doc, markStart + revertedText.length)); //
          
          return true;
        }

        return false;
      }),
    };
  },
});