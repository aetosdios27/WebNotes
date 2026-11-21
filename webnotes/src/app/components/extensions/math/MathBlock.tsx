import { MathNode } from './MathNode';
import { insertMath } from './MathEditing';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mathBlock: {
      setMathBlock: (latex?: string) => ReturnType;
    };
  }
}

export const MathBlock = MathNode.extend({
  name: 'mathBlock',
  group: 'block',

  addCommands() {
    return {
      setMathBlock: (latex = '') => ({ commands, tr }) =>
        insertMath(tr, this.type, latex, node => commands.insertContent(node)),
    };
  },

  addKeyboardShortcuts() {
    return { 'Mod-Shift-m': () => this.editor.commands.setMathBlock() };
  },
});
