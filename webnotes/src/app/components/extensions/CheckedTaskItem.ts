import TaskItem from "@tiptap/extension-task-item";
import { taskCheckPath } from "../TaskCheck";

export const CheckedTaskItem = TaskItem.extend({
  addNodeView() {
    const render = this.parent?.();
    if (!render) return null;
    return (props) => {
      const view = render(props);
      if (view.dom instanceof HTMLElement) {
        const styler = view.dom.querySelector("label > span");
        const svg = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg",
        );
        svg.setAttribute("class", "task-check");
        svg.setAttribute("viewBox", "0 0 16 16");
        svg.setAttribute("aria-hidden", "true");
        const path = document.createElementNS(svg.namespaceURI, "path");
        path.setAttribute("d", taskCheckPath);
        path.setAttribute("pathLength", "1");
        svg.append(path);
        styler?.append(svg);
      }
      return view;
    };
  },
});
