import { EditorView } from "@codemirror/view";

export const smoothCursor = EditorView.theme({
  ".cm-cursor": {
    transition: "left 0.1s ease-out, top 0.1s ease-out",
  },
  ".cm-cursorLayer": {
    animation: "none", // Prevent conflicting animations
  },
});
