import { Mark, markInputRule, mergeAttributes } from '@tiptap/core';

export const CustomLink = Mark.create({
  name: 'link', // Kept as 'link' for Markdown compatibility
  priority: 1000,
  keepOnSplit: false,

  addAttributes() {
    return {
      href: {
        default: null,
      },
      target: {
        default: '_blank',
      },
    };
  },

  parseHTML() {
    return [{ tag: 'a[href]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        class: 'text-yellow-500 underline underline-offset-4 cursor-pointer hover:text-yellow-400 transition-colors',
      }),
      0,
    ];
  },

  addInputRules() {
    return [
      markInputRule({
        /**
         * The Regex Breakdown:
         * \[         -> matches starting bracket
         * ([^\]]+)   -> captures text (anything not a closing bracket)
         * \]         -> matches closing bracket
         * \(         -> matches starting parenthesis
         * ([^)]+)    -> captures the URL (anything not a closing parenthesis)
         * \)         -> matches closing parenthesis
         */
        find: /\[([^\]]+)\]\(([^)]+)\)$/,
        type: this.type,
        getAttributes: (match) => ({
          href: match[2],
        }),
      }),
    ];
  },
});