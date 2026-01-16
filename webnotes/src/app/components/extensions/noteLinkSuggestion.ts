import { ReactRenderer } from "@tiptap/react";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { NoteLinkSuggestion, NoteLinkItem } from "../ui/NoteLinkSuggestion";

export const createNoteLinkSuggestion = (getNotes: () => NoteLinkItem[]) => ({
  items: ({ query }: { query: string }): NoteLinkItem[] => {
    const notes = getNotes();
    if (!query.trim()) return notes.slice(0, 8);

    const lowerQuery = query.toLowerCase();
    return notes
      .filter((n) => (n.title || "").toLowerCase().includes(lowerQuery))
      .slice(0, 8);
  },

  render: () => {
    let component: ReactRenderer | null = null;
    let popup: TippyInstance[] | null = null;

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(NoteLinkSuggestion, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) return;

        popup = tippy("body", {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: "manual",
          placement: "bottom-start",
          maxWidth: "none",
          zIndex: 9999,
        });
      },

      onUpdate: (props: any) => {
        if (component) component.updateProps(props);
        if (props.clientRect && popup?.[0]) {
          popup[0].setProps({ getReferenceClientRect: props.clientRect });
        }
      },

      onKeyDown: (props: any) => {
        if (props.event.key === "Escape") {
          popup?.[0]?.hide();
          return true;
        }
        return (component?.ref as any)?.onKeyDown?.(props) || false;
      },

      onExit: () => {
        popup?.[0]?.destroy();
        component?.destroy();
      },
    };
  },
});
