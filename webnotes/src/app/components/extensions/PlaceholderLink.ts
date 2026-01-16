import { Mark, mergeAttributes } from "@tiptap/core";

export interface PlaceholderLinkOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    placeholderLink: {
      setPlaceholderLink: (attributes: { id: string }) => ReturnType;
      unsetPlaceholderLink: () => ReturnType;
    };
  }
}

export const PlaceholderLink = Mark.create<PlaceholderLinkOptions>({
  name: "placeholderLink",
  priority: 1001, // Higher than noteLink
  inclusive: false,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-placeholder-id"),
        renderHTML: (attributes) => ({
          "data-placeholder-id": attributes.id,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-placeholder-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: "note-link-placeholder",
      }),
      0,
    ];
  },
});

export default PlaceholderLink;
