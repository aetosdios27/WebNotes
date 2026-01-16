import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { v4 as uuidv4 } from "uuid";

export interface UniqueIDOptions {
  attributeName: string;
  types: string[];
  generateID: () => string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    uniqueID: {
      /**
       * Regenerate all block IDs
       */
      regenerateIDs: () => ReturnType;
    };
  }
}

export const UniqueID = Extension.create<UniqueIDOptions>({
  name: "uniqueID",

  addOptions() {
    return {
      attributeName: "data-id",
      types: [
        "heading",
        "paragraph",
        "bulletList",
        "orderedList",
        "taskList",
        "listItem",
        "taskItem",
        "codeBlock",
        "blockquote",
        "horizontalRule",
        "mathBlock",
      ],
      generateID: () => uuidv4(),
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          [this.options.attributeName]: {
            default: null,
            parseHTML: (element) =>
              element.getAttribute(this.options.attributeName),
            renderHTML: (attributes) => {
              if (!attributes[this.options.attributeName]) {
                return {};
              }
              return {
                [this.options.attributeName]:
                  attributes[this.options.attributeName],
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      regenerateIDs:
        () =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return true;

          state.doc.descendants((node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                [this.options.attributeName]: this.options.generateID(),
              });
            }
          });

          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const { types, attributeName, generateID } = this.options;

    const pluginKey = new PluginKey("uniqueID");

    return [
      new Plugin({
        key: pluginKey,
        appendTransaction: (transactions, oldState, newState) => {
          const hasDocChanged = transactions.some((tr) => tr.docChanged);
          if (!hasDocChanged) return null;

          const tr = newState.tr;
          let modified = false;

          newState.doc.descendants((node, pos) => {
            if (types.includes(node.type.name)) {
              const existingID = node.attrs[attributeName];

              if (!existingID) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  [attributeName]: generateID(),
                });
                modified = true;
              }
            }
          });

          return modified ? tr : null;
        },
      }),
    ];
  },
});

export default UniqueID;
