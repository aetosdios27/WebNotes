import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface DragHandleOptions {
  dragHandleWidth: number;
  scrollThreshold: number;
}

export const DragHandle = Extension.create<DragHandleOptions>({
  name: "dragHandle",

  addOptions() {
    return {
      dragHandleWidth: 24,
      scrollThreshold: 100,
    };
  },

  addProseMirrorPlugins() {
    let dragHandleElement: HTMLDivElement | null = null;
    let currentNodePos: number | null = null;
    let currentNodeElement: HTMLElement | null = null;
    let isDragging = false;
    let draggedNodePos: number | null = null;
    let dropIndicator: HTMLDivElement | null = null;

    const hideDragHandle = () => {
      if (dragHandleElement) {
        dragHandleElement.style.opacity = "0";
        dragHandleElement.style.pointerEvents = "none";
      }
    };

    const showDragHandle = () => {
      if (dragHandleElement && !isDragging) {
        dragHandleElement.style.opacity = "1";
        dragHandleElement.style.pointerEvents = "auto";
      }
    };

    const updateDragHandlePosition = (
      view: any,
      nodeElement: HTMLElement,
      pos: number
    ) => {
      if (!dragHandleElement) return;

      const editorRect = view.dom.getBoundingClientRect();
      const nodeRect = nodeElement.getBoundingClientRect();

      // Position to the left of the node
      const left = editorRect.left - 32;
      const top = nodeRect.top + nodeRect.height / 2 - 12;

      dragHandleElement.style.left = `${left}px`;
      dragHandleElement.style.top = `${top}px`;

      currentNodePos = pos;
      currentNodeElement = nodeElement;

      showDragHandle();
    };

    const createDropIndicator = () => {
      if (dropIndicator) return dropIndicator;

      dropIndicator = document.createElement("div");
      dropIndicator.className = "drag-drop-indicator";
      dropIndicator.style.cssText = `
        position: absolute;
        left: 0;
        right: 0;
        height: 3px;
        background: #eab308;
        border-radius: 2px;
        pointer-events: none;
        z-index: 9999;
        opacity: 0;
        transition: opacity 0.15s ease;
        box-shadow: 0 0 8px rgba(234, 179, 8, 0.5);
      `;
      document.body.appendChild(dropIndicator);
      return dropIndicator;
    };

    const showDropIndicator = (y: number, containerRect: DOMRect) => {
      const indicator = createDropIndicator();
      indicator.style.top = `${y}px`;
      indicator.style.left = `${containerRect.left}px`;
      indicator.style.width = `${containerRect.width}px`;
      indicator.style.opacity = "1";
    };

    const hideDropIndicator = () => {
      if (dropIndicator) {
        dropIndicator.style.opacity = "0";
      }
    };

    const findBlockParent = (
      element: HTMLElement | null
    ): HTMLElement | null => {
      while (element && element !== document.body) {
        const nodeName = element.getAttribute("data-node-view-wrapper");
        const isProseMirrorNode =
          element.classList.contains("ProseMirror") === false &&
          element.closest(".ProseMirror") !== null;

        // Check if this is a top-level block node
        if (isProseMirrorNode) {
          const parent = element.parentElement;
          if (parent?.classList.contains("ProseMirror")) {
            return element;
          }
        }

        element = element.parentElement;
      }
      return null;
    };

    const getNodePosFromElement = (
      view: any,
      element: HTMLElement
    ): number | null => {
      const pos = view.posAtDOM(element, 0);
      if (pos === undefined || pos === null) return null;

      // Resolve to the start of the block
      try {
        const resolved = view.state.doc.resolve(pos);
        // Find the top-level block
        for (let depth = resolved.depth; depth > 0; depth--) {
          const node = resolved.node(depth);
          if (node.isBlock) {
            return resolved.before(depth);
          }
        }
        return pos;
      } catch {
        return pos;
      }
    };

    return [
      new Plugin({
        key: new PluginKey("dragHandle"),
        view: (editorView) => {
          // Create drag handle element
          dragHandleElement = document.createElement("div");
          dragHandleElement.className = "editor-drag-handle";
          dragHandleElement.draggable = true;
          dragHandleElement.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="9" cy="5" r="2"/>
              <circle cx="9" cy="12" r="2"/>
              <circle cx="9" cy="19" r="2"/>
              <circle cx="15" cy="5" r="2"/>
              <circle cx="15" cy="12" r="2"/>
              <circle cx="15" cy="19" r="2"/>
            </svg>
          `;
          dragHandleElement.style.cssText = `
            position: fixed;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            cursor: grab;
            color: #71717a;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.15s ease, background 0.15s ease, color 0.15s ease;
            z-index: 100;
            user-select: none;
          `;

          document.body.appendChild(dragHandleElement);

          // Hover effect
          dragHandleElement.addEventListener("mouseenter", () => {
            if (dragHandleElement && !isDragging) {
              dragHandleElement.style.background = "#27272a";
              dragHandleElement.style.color = "#fafafa";
            }
          });

          dragHandleElement.addEventListener("mouseleave", () => {
            if (dragHandleElement && !isDragging) {
              dragHandleElement.style.background = "transparent";
              dragHandleElement.style.color = "#71717a";
            }
          });

          // Drag start
          dragHandleElement.addEventListener("dragstart", (e) => {
            if (currentNodePos === null || !currentNodeElement) return;

            isDragging = true;
            draggedNodePos = currentNodePos;

            // Set drag data
            e.dataTransfer?.setData("text/plain", String(currentNodePos));
            e.dataTransfer!.effectAllowed = "move";

            // Add dragging class to the node
            currentNodeElement.classList.add("is-dragging");

            // Hide the drag handle during drag
            hideDragHandle();

            // Create invisible drag image
            const dragImage = document.createElement("div");
            dragImage.style.cssText =
              "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;";
            document.body.appendChild(dragImage);
            e.dataTransfer?.setDragImage(dragImage, 0, 0);
            setTimeout(() => dragImage.remove(), 0);
          });

          // Drag end
          dragHandleElement.addEventListener("dragend", () => {
            isDragging = false;
            draggedNodePos = null;
            hideDropIndicator();

            // Remove dragging class from all nodes
            document.querySelectorAll(".is-dragging").forEach((el) => {
              el.classList.remove("is-dragging");
            });
          });

          return {
            update: () => {
              // Position updates handled by mousemove
            },
            destroy: () => {
              dragHandleElement?.remove();
              dropIndicator?.remove();
            },
          };
        },
        props: {
          handleDOMEvents: {
            mousemove: (view, event) => {
              if (isDragging) return false;

              const target = event.target as HTMLElement;

              // Don't show handle when hovering over the handle itself
              if (target.closest(".editor-drag-handle")) return false;

              // Find the block node under cursor
              const blockElement = findBlockParent(target);

              if (blockElement) {
                const pos = getNodePosFromElement(view, blockElement);
                if (pos !== null) {
                  updateDragHandlePosition(view, blockElement, pos);
                }
              }

              return false;
            },
            mouseleave: () => {
              // Delay hiding to allow moving to the handle
              setTimeout(() => {
                if (!isDragging && !dragHandleElement?.matches(":hover")) {
                  hideDragHandle();
                }
              }, 100);
              return false;
            },
            dragover: (view, event) => {
              if (!isDragging || draggedNodePos === null) return false;

              event.preventDefault();
              event.dataTransfer!.dropEffect = "move";

              const target = event.target as HTMLElement;
              const blockElement = findBlockParent(target);

              if (blockElement) {
                const rect = blockElement.getBoundingClientRect();
                const middle = rect.top + rect.height / 2;
                const insertBefore = event.clientY < middle;

                const indicatorY = insertBefore ? rect.top : rect.bottom;
                const containerRect = view.dom.getBoundingClientRect();

                showDropIndicator(indicatorY, containerRect);
              }

              return false;
            },
            drop: (view, event) => {
              if (!isDragging || draggedNodePos === null) return false;

              event.preventDefault();
              hideDropIndicator();

              const target = event.target as HTMLElement;
              const blockElement = findBlockParent(target);

              if (!blockElement) {
                isDragging = false;
                return false;
              }

              const targetPos = getNodePosFromElement(view, blockElement);
              if (targetPos === null || targetPos === draggedNodePos) {
                isDragging = false;
                return false;
              }

              const rect = blockElement.getBoundingClientRect();
              const insertBefore = event.clientY < rect.top + rect.height / 2;

              try {
                const { state, dispatch } = view;
                const { tr, doc } = state;

                // Get the node to move
                const $from = doc.resolve(draggedNodePos);
                const nodeToMove = $from.nodeAfter;

                if (!nodeToMove) {
                  isDragging = false;
                  return false;
                }

                const nodeSize = nodeToMove.nodeSize;

                // Calculate target position
                const $target = doc.resolve(targetPos);
                let insertPos: number;

                if (insertBefore) {
                  insertPos = targetPos;
                } else {
                  const targetNode = $target.nodeAfter;
                  insertPos = targetPos + (targetNode?.nodeSize || 0);
                }

                // Adjust positions if moving from before to after
                if (draggedNodePos < insertPos) {
                  insertPos -= nodeSize;
                }

                // Delete the original node
                tr.delete(draggedNodePos, draggedNodePos + nodeSize);

                // Insert at new position
                tr.insert(insertPos, nodeToMove);

                dispatch(tr);
              } catch (error) {
                console.error("Drag and drop error:", error);
              }

              isDragging = false;
              draggedNodePos = null;

              return true;
            },
            dragleave: () => {
              hideDropIndicator();
              return false;
            },
          },
        },
      }),
    ];
  },
});

export default DragHandle;
