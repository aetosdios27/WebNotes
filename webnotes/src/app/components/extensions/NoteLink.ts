import { Mark, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import Suggestion, { SuggestionOptions } from "@tiptap/suggestion";

export interface NoteLinkOptions {
  HTMLAttributes: Record<string, any>;
  suggestion: Omit<SuggestionOptions, "editor">;
  onNavigate?: (noteId: string) => void;
}

export const NoteLink = Mark.create<NoteLinkOptions>({
  name: "noteLink",
  priority: 1000,
  keepOnSplit: false,
  inclusive: false,

  addOptions() {
    return {
      HTMLAttributes: {},
      suggestion: {
        char: "[[",
        allowSpaces: true,
        pluginKey: new PluginKey("noteLinkSuggestion"),
        command: ({ editor, range, props }) => {
          const { id, label } = props;
          // Simple atomic insert
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent([
              {
                type: "text",
                text: label,
                marks: [{ type: "noteLink", attrs: { id, label } }],
              },
              { type: "text", text: " " },
            ])
            .run();
        },
      },
      onNavigate: undefined,
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-note-id"),
        renderHTML: (attrs) => ({ "data-note-id": attrs.id }),
      },
      label: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-note-label"),
        renderHTML: (attrs) => ({ "data-note-label": attrs.label }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "a[data-note-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "a",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: "note-link",
        href: "#",
        onclick: "return false",
      }),
      0,
    ];
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({ editor: this.editor, ...this.options.suggestion }),
      new Plugin({
        key: new PluginKey("noteLinkClick"),
        props: {
          handleClick: (view, pos, event) => {
            const link = (event.target as HTMLElement).closest("a.note-link");
            if (link) {
              event.preventDefault();
              event.stopPropagation();
              const noteId = link.getAttribute("data-note-id");
              if (noteId && this.options.onNavigate) {
                this.options.onNavigate(noteId);
              }
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },
});

export default NoteLink;
