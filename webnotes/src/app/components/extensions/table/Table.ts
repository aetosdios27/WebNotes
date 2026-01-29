import { Table as TiptapTable, TableOptions } from "@tiptap/extension-table";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const tablePluginKey = new PluginKey("tableControls");

export const Table = TiptapTable.extend({
  addOptions(): TableOptions {
    return {
      ...(this.parent?.() || {}),
      HTMLAttributes: {},
      renderWrapper: true,
      resizable: true,
      handleWidth: 5,
      cellMinWidth: 80,
      lastColumnResizable: true,
      allowTableNodeSelection: true,
    } as TableOptions;
  },
  addProseMirrorPlugins() {
    const plugins = this.parent?.() || [];
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
