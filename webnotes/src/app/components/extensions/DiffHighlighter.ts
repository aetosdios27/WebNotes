// src/app/components/extensions/DiffHighlighter.ts
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface DiffHighlighterOptions {
  addedIds?: Set<string>;
  removedIds?: Set<string>;
  modifiedIds?: Set<string>;
}

export const DiffHighlighter = Extension.create<DiffHighlighterOptions>({
  name: "diffHighlighter",

  addOptions() {
    return {
      addedIds: new Set(),
      removedIds: new Set(),
      modifiedIds: new Set(),
    };
  },

  addProseMirrorPlugins() {
    // Need to capture 'this' context options here
    // But inside the plugin, 'this' refers to the plugin instance
    // So we access options via the extension instance created by Tiptap
    const extension = this;

    return [
      new Plugin({
        key: new PluginKey("diffHighlighter"),
        props: {
          decorations(state) {
            const { doc } = state;
            const decorations: Decoration[] = [];

            // Access options from the extension instance
            const { addedIds, removedIds, modifiedIds } = extension.options;

            doc.descendants((node, pos) => {
              if (node.attrs && node.attrs.id) {
                const id = node.attrs.id;

                if (addedIds?.has(id)) {
                  decorations.push(
                    Decoration.node(pos, pos + node.nodeSize, {
                      class: "diff-added",
                    })
                  );
                }
                if (removedIds?.has(id)) {
                  decorations.push(
                    Decoration.node(pos, pos + node.nodeSize, {
                      class: "diff-removed",
                    })
                  );
                }
                if (modifiedIds?.has(id)) {
                  decorations.push(
                    Decoration.node(pos, pos + node.nodeSize, {
                      class: "diff-modified",
                    })
                  );
                }
              }
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});
