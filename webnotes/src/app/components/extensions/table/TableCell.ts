// src/app/components/extensions/table/TableCell.ts
import { TableCell as TiptapTableCell } from "@tiptap/extension-table-cell";
import { mergeAttributes } from "@tiptap/core";

export interface TableCellOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    tableCell: {
      setCellBackground: (color: string | null) => ReturnType;
    };
  }
}

export const TableCell = TiptapTableCell.extend<TableCellOptions>({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: (element) =>
          element.style.backgroundColor ||
          element.getAttribute("data-bg-color"),
        renderHTML: (attributes) => {
          if (!attributes.backgroundColor) {
            return {};
          }
          return {
            "data-bg-color": attributes.backgroundColor,
            style: `background-color: ${attributes.backgroundColor}`,
          };
        },
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "td",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setCellBackground:
        (color: string | null) =>
        ({ chain, state }) => {
          const { selection } = state;

          return chain()
            .updateAttributes("tableCell", { backgroundColor: color })
            .updateAttributes("tableHeader", { backgroundColor: color })
            .run();
        },
    };
  },
});
