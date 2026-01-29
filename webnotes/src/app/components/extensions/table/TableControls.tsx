// src/app/components/extensions/table/TableControls.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TableControlsProps {
  editor: Editor | null;
}

interface DragState {
  isDragging: boolean;
  type: "row" | "col" | null;
  startPos: number;
  currentPos: number;
  count: number;
}

export function TableControls({ editor }: TableControlsProps) {
  const [tableElement, setTableElement] = useState<HTMLTableElement | null>(
    null
  );
  const [tableRect, setTableRect] = useState<DOMRect | null>(null);
  const [showRowButton, setShowRowButton] = useState(false);
  const [showColButton, setShowColButton] = useState(false);
  const [rowButtonPos, setRowButtonPos] = useState({ x: 0, y: 0 });
  const [colButtonPos, setColButtonPos] = useState({ x: 0, y: 0 });
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    type: null,
    startPos: 0,
    currentPos: 0,
    count: 0,
  });

  const rowButtonRef = useRef<HTMLButtonElement>(null);
  const colButtonRef = useRef<HTMLButtonElement>(null);
  const dragPreviewRef = useRef<HTMLDivElement>(null);

  // Find active table
  const updateTableElement = useCallback(() => {
    if (!editor || !editor.view) {
      setTableElement(null);
      return;
    }

    const { selection } = editor.state;
    const $pos = selection.$from;

    // Walk up to find table
    for (let d = $pos.depth; d > 0; d--) {
      const node = $pos.node(d);
      if (node.type.name === "table") {
        const pos = $pos.before(d);
        const domNode = editor.view.nodeDOM(pos);
        const table =
          domNode instanceof HTMLTableElement
            ? domNode
            : (domNode as HTMLElement)?.querySelector?.("table");

        if (table) {
          setTableElement(table);
          setTableRect(table.getBoundingClientRect());
          return;
        }
      }
    }

    setTableElement(null);
    setTableRect(null);
  }, [editor]);

  // Listen to editor changes
  useEffect(() => {
    if (!editor) return;

    updateTableElement();
    editor.on("selectionUpdate", updateTableElement);
    editor.on("transaction", updateTableElement);

    return () => {
      editor.off("selectionUpdate", updateTableElement);
      editor.off("transaction", updateTableElement);
    };
  }, [editor, updateTableElement]);

  // Update rect on scroll/resize
  useEffect(() => {
    if (!tableElement) return;

    const updateRect = () => {
      setTableRect(tableElement.getBoundingClientRect());
    };

    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);

    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [tableElement]);

  // Handle mouse movement for hover detection
  useEffect(() => {
    if (!tableRect || dragState.isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const threshold = 24;
      const { clientX, clientY } = e;

      // Check bottom edge (row add)
      const nearBottom =
        clientY >= tableRect.bottom - threshold &&
        clientY <= tableRect.bottom + threshold;
      const withinHorizontal =
        clientX >= tableRect.left && clientX <= tableRect.right;

      // Check right edge (column add)
      const nearRight =
        clientX >= tableRect.right - threshold &&
        clientX <= tableRect.right + threshold;
      const withinVertical =
        clientY >= tableRect.top && clientY <= tableRect.bottom;

      setShowRowButton(nearBottom && withinHorizontal);
      setShowColButton(nearRight && withinVertical);

      if (nearBottom && withinHorizontal) {
        setRowButtonPos({
          x: tableRect.left + tableRect.width / 2,
          y: tableRect.bottom,
        });
      }

      if (nearRight && withinVertical) {
        setColButtonPos({
          x: tableRect.right,
          y: tableRect.top + tableRect.height / 2,
        });
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, [tableRect, dragState.isDragging]);

  // Add single row
  const addRow = useCallback(() => {
    if (!editor) return;

    // Move to last cell of table first
    const { state } = editor;
    const { selection } = state;
    const $pos = selection.$from;

    for (let d = $pos.depth; d > 0; d--) {
      const node = $pos.node(d);
      if (node.type.name === "table") {
        // Go to end of table and add row
        editor.chain().focus().addRowAfter().run();
        return;
      }
    }
  }, [editor]);

  // Add single column
  const addColumn = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().addColumnAfter().run();
  }, [editor]);

  // Add multiple rows
  const addMultipleRows = useCallback(
    (count: number) => {
      if (!editor || count <= 0) return;

      const chain = editor.chain().focus();
      for (let i = 0; i < count; i++) {
        chain.addRowAfter();
      }
      chain.run();
    },
    [editor]
  );

  // Add multiple columns
  const addMultipleColumns = useCallback(
    (count: number) => {
      if (!editor || count <= 0) return;

      const chain = editor.chain().focus();
      for (let i = 0; i < count; i++) {
        chain.addColumnAfter();
      }
      chain.run();
    },
    [editor]
  );

  // Handle drag start for rows
  const handleRowDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragState({
      isDragging: true,
      type: "row",
      startPos: e.clientY,
      currentPos: e.clientY,
      count: 1,
    });
  }, []);

  // Handle drag start for columns
  const handleColDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragState({
      isDragging: true,
      type: "col",
      startPos: e.clientX,
      currentPos: e.clientX,
      count: 1,
    });
  }, []);

  // Handle drag move
  useEffect(() => {
    if (!dragState.isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const ROW_HEIGHT = 40; // Approximate row height
      const COL_WIDTH = 100; // Approximate column width

      if (dragState.type === "row") {
        const delta = e.clientY - dragState.startPos;
        const count = Math.max(1, Math.ceil(delta / ROW_HEIGHT));
        setDragState((prev) => ({
          ...prev,
          currentPos: e.clientY,
          count,
        }));
      } else if (dragState.type === "col") {
        const delta = e.clientX - dragState.startPos;
        const count = Math.max(1, Math.ceil(delta / COL_WIDTH));
        setDragState((prev) => ({
          ...prev,
          currentPos: e.clientX,
          count,
        }));
      }
    };

    const handleMouseUp = () => {
      // Add the rows/columns
      if (dragState.type === "row") {
        addMultipleRows(dragState.count);
      } else if (dragState.type === "col") {
        addMultipleColumns(dragState.count);
      }

      setDragState({
        isDragging: false,
        type: null,
        startPos: 0,
        currentPos: 0,
        count: 0,
      });
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, addMultipleRows, addMultipleColumns]);

  // Get current table dimensions for tooltip
  const getTableDimensions = useCallback(() => {
    if (!tableElement) return { rows: 0, cols: 0 };
    const rows = tableElement.rows.length;
    const cols = tableElement.rows[0]?.cells.length || 0;
    return { rows, cols };
  }, [tableElement]);

  if (!tableElement || !tableRect) return null;

  const { rows: currentRows, cols: currentCols } = getTableDimensions();

  return (
    <>
      {/* Row Add Button (Bottom) */}
      <AnimatePresence>
        {(showRowButton ||
          (dragState.isDragging && dragState.type === "row")) && (
          <motion.button
            ref={rowButtonRef}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            onClick={addRow}
            onMouseDown={handleRowDragStart}
            className="fixed z-[100] flex items-center justify-center w-7 h-7 bg-zinc-800 hover:bg-yellow-500 border border-zinc-600 hover:border-yellow-500 rounded-full shadow-xl cursor-ns-resize transition-colors duration-150 group"
            style={{
              left: rowButtonPos.x,
              top: rowButtonPos.y + 8,
              transform: "translateX(-50%)",
            }}
            title="Drag to add rows, click to add one"
          >
            <Plus className="w-4 h-4 text-zinc-300 group-hover:text-black transition-colors" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Column Add Button (Right) */}
      <AnimatePresence>
        {(showColButton ||
          (dragState.isDragging && dragState.type === "col")) && (
          <motion.button
            ref={colButtonRef}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            onClick={addColumn}
            onMouseDown={handleColDragStart}
            className="fixed z-[100] flex items-center justify-center w-7 h-7 bg-zinc-800 hover:bg-yellow-500 border border-zinc-600 hover:border-yellow-500 rounded-full shadow-xl cursor-ew-resize transition-colors duration-150 group"
            style={{
              left: colButtonPos.x + 8,
              top: colButtonPos.y,
              transform: "translateY(-50%)",
            }}
            title="Drag to add columns, click to add one"
          >
            <Plus className="w-4 h-4 text-zinc-300 group-hover:text-black transition-colors" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Drag Preview / Tooltip */}
      <AnimatePresence>
        {dragState.isDragging && (
          <motion.div
            ref={dragPreviewRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed z-[101] px-3 py-1.5 bg-yellow-500 text-black text-sm font-bold rounded-lg shadow-xl pointer-events-none"
            style={{
              left:
                dragState.type === "row"
                  ? rowButtonPos.x
                  : dragState.currentPos + 16,
              top:
                dragState.type === "row"
                  ? dragState.currentPos + 16
                  : colButtonPos.y,
              transform:
                dragState.type === "row"
                  ? "translateX(-50%)"
                  : "translateY(-50%)",
            }}
          >
            {dragState.type === "row"
              ? `${currentRows + dragState.count}×${currentCols}`
              : `${currentRows}×${currentCols + dragState.count}`}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag Visual Guide */}
      <AnimatePresence>
        {dragState.isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed z-[99] pointer-events-none"
            style={
              dragState.type === "row"
                ? {
                    left: tableRect.left,
                    top: tableRect.bottom,
                    width: tableRect.width,
                    height: Math.max(
                      0,
                      dragState.currentPos - tableRect.bottom
                    ),
                    background:
                      "repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(234, 179, 8, 0.3) 39px, rgba(234, 179, 8, 0.3) 40px)",
                    borderLeft: "2px dashed rgba(234, 179, 8, 0.5)",
                    borderRight: "2px dashed rgba(234, 179, 8, 0.5)",
                    borderBottom: "2px dashed rgba(234, 179, 8, 0.8)",
                  }
                : {
                    left: tableRect.right,
                    top: tableRect.top,
                    width: Math.max(0, dragState.currentPos - tableRect.right),
                    height: tableRect.height,
                    background:
                      "repeating-linear-gradient(90deg, transparent, transparent 99px, rgba(234, 179, 8, 0.3) 99px, rgba(234, 179, 8, 0.3) 100px)",
                    borderTop: "2px dashed rgba(234, 179, 8, 0.5)",
                    borderBottom: "2px dashed rgba(234, 179, 8, 0.5)",
                    borderRight: "2px dashed rgba(234, 179, 8, 0.8)",
                  }
            }
          />
        )}
      </AnimatePresence>
    </>
  );
}
