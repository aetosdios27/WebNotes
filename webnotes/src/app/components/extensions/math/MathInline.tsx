import { MathNode } from './MathNode';
import { insertMath } from './MathEditing';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mathInline: {
      setMathInline: (latex?: string) => ReturnType;
    };
  }
}

export const MathInline = MathNode.extend({
  name: 'mathInline',
  group: 'inline',
  inline: true,

  addCommands() {
    return {
      setMathInline: (latex = '') => ({ commands, tr }) =>
        insertMath(tr, this.type, latex, node => commands.insertContent(node)),
    };
  },

  addKeyboardShortcuts() {
    return { 'Mod-m': () => this.editor.commands.setMathInline() };
  },
});
