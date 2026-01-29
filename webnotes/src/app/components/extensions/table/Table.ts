// src/app/components/extensions/table/Table.ts
import { Table as TiptapTable } from "@tiptap/extension-table";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const tablePluginKey = new PluginKey("tableControls");

export const Table = TiptapTable.extend({
  addOptions() {
    return {
      HTMLAttributes: {}, // <--- FIX: Provide default so it's never undefined
      ...this.parent?.(),
      resizable: true,
      handleWidth: 5,
      cellMinWidth: 80,
      lastColumnResizable: true,
      allowTableNodeSelection: true,
    };
  },

  addProseMirrorPlugins() {
    const plugins = this.parent?.() || [];

    // Add custom plugin for table state tracking
    plugins.push(
      new Plugin({
        key: tablePluginKey,
        state: {
          init() {
            return {
              activeTable: null,
              hoveredCell: null,
            };
          },
          apply(tr, value) {
            const meta = tr.getMeta(tablePluginKey);
            if (meta) {
              return { ...value, ...meta };
            }
            return value;
          },
        },
        props: {
          decorations(state) {
            const { doc, selection } = state;
            const decorations: Decoration[] = [];

            // Find if we're in a table
            const $pos = selection.$from;
            for (let d = $pos.depth; d > 0; d--) {
              const node = $pos.node(d);
              if (node.type.name === "table") {
                const pos = $pos.before(d);
                decorations.push(
                  Decoration.node(pos, pos + node.nodeSize, {
                    class: "ProseMirror-table-active",
                  })
                );
                break;
              }
            }

            return DecorationSet.create(doc, decorations);
          },
        },
      })
    );

    return plugins;
  },
});
