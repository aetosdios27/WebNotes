// src/app/components/extensions/table/TableGripHandles.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { GripVertical, GripHorizontal, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TableGripHandlesProps {
  editor: Editor | null;
}

interface HandlePosition {
  index: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export function TableGripHandles({ editor }: TableGripHandlesProps) {
  const [tableElement, setTableElement] = useState<HTMLTableElement | null>(
    null
  );
  const [tableRect, setTableRect] = useState<DOMRect | null>(null);
  const [rowHandles, setRowHandles] = useState<HandlePosition[]>([]);
  const [colHandles, setColHandles] = useState<HandlePosition[]>([]);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [selectedCol, setSelectedCol] = useState<number | null>(null);
  const [showRowMenu, setShowRowMenu] = useState(false);
  const [showColMenu, setShowColMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  // Find active table
  const updateTableState = useCallback(() => {
    if (!editor || !editor.view) {
      setTableElement(null);
      setTableRect(null);
      return;
    }

    const { selection } = editor.state;
    const $pos = selection.$from;

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
          const rect = table.getBoundingClientRect();
          setTableRect(rect);

          // Calculate row handles
          const rows: HandlePosition[] = [];
          Array.from(table.rows).forEach((row, index) => {
            const rowRect = row.getBoundingClientRect();
            rows.push({
              index,
              x: rect.left - 24,
              y: rowRect.top + rowRect.height / 2,
              height: rowRect.height,
            });
          });
          setRowHandles(rows);

          // Calculate column handles
          const cols: HandlePosition[] = [];
          const firstRow = table.rows[0];
          if (firstRow) {
            Array.from(firstRow.cells).forEach((cell, index) => {
              const cellRect = cell.getBoundingClientRect();
              cols.push({
                index,
                x: cellRect.left + cellRect.width / 2,
                y: rect.top - 24,
                width: cellRect.width,
              });
            });
          }
          setColHandles(cols);
          return;
        }
      }
    }

    setTableElement(null);
    setTableRect(null);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    updateTableState();
    editor.on("selectionUpdate", updateTableState);
    editor.on("transaction", updateTableState);

    const handleScroll = () => updateTableState();
    const handleResize = () => updateTableState();

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      editor.off("selectionUpdate", updateTableState);
      editor.off("transaction", updateTableState);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [editor, updateTableState]);

  // Select entire row
  const selectRow = useCallback(
    (rowIndex: number) => {
      if (!editor || !tableElement) return;

      const row = tableElement.rows[rowIndex];
      if (!row) return;

      // Get first and last cell positions
      const firstCell = row.cells[0];
      const lastCell = row.cells[row.cells.length - 1];

      if (firstCell && lastCell) {
        // Use Tiptap's table selection
        const { state } = editor;
        const { doc } = state;

        // Find the table in document and select the row
        // For now, we'll highlight visually and use context menu for actions
        setSelectedRow(rowIndex);
        setSelectedCol(null);
      }
    },
    [editor, tableElement]
  );

  // Select entire column
  const selectColumn = useCallback(
    (colIndex: number) => {
      if (!editor || !tableElement) return;

      setSelectedCol(colIndex);
      setSelectedRow(null);
    },
    [editor, tableElement]
  );

  // Delete row
  const deleteRow = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().deleteRow().run();
    setShowRowMenu(false);
    setSelectedRow(null);
  }, [editor]);

  // Delete column
  const deleteColumn = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().deleteColumn().run();
    setShowColMenu(false);
    setSelectedCol(null);
  }, [editor]);

  // Add row above
  const addRowAbove = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().addRowBefore().run();
    setShowRowMenu(false);
  }, [editor]);

  // Add row below
  const addRowBelow = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().addRowAfter().run();
    setShowRowMenu(false);
  }, [editor]);

  // Add column left
  const addColumnLeft = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().addColumnBefore().run();
    setShowColMenu(false);
  }, [editor]);

  // Add column right
  const addColumnRight = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().addColumnAfter().run();
    setShowColMenu(false);
  }, [editor]);

  // Handle row grip click
  const handleRowGripClick = useCallback(
    (e: React.MouseEvent, rowIndex: number) => {
      e.preventDefault();
      e.stopPropagation();
      selectRow(rowIndex);
      setMenuPosition({ x: e.clientX, y: e.clientY });
      setShowRowMenu(true);
      setShowColMenu(false);
    },
    [selectRow]
  );

  // Handle column grip click
  const handleColGripClick = useCallback(
    (e: React.MouseEvent, colIndex: number) => {
      e.preventDefault();
      e.stopPropagation();
      selectColumn(colIndex);
      setMenuPosition({ x: e.clientX, y: e.clientY });
      setShowColMenu(true);
      setShowRowMenu(false);
    },
    [selectColumn]
  );

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowRowMenu(false);
      setShowColMenu(false);
      setSelectedRow(null);
      setSelectedCol(null);
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  if (!tableElement || !tableRect) return null;

  return (
    <>
      {/* Row Grip Handles (Left side) */}
      {rowHandles.map((handle) => (
        <motion.button
          key={`row-${handle.index}`}
          initial={{ opacity: 0 }}
          animate={{
            opacity:
              hoveredRow === handle.index || selectedRow === handle.index
                ? 1
                : 0.4,
          }}
          whileHover={{ opacity: 1 }}
          className={`fixed z-[98] flex items-center justify-center w-5 h-5 rounded transition-all duration-100 cursor-grab active:cursor-grabbing ${
            selectedRow === handle.index
              ? "bg-yellow-500 text-black"
              : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white"
          }`}
          style={{
            left: handle.x,
            top: handle.y,
            transform: "translateY(-50%)",
          }}
          onMouseEnter={() => setHoveredRow(handle.index)}
          onMouseLeave={() => setHoveredRow(null)}
          onClick={(e) => handleRowGripClick(e, handle.index)}
          title={`Row ${handle.index + 1}`}
        >
          <GripVertical className="w-3 h-3" />
        </motion.button>
      ))}

      {/* Column Grip Handles (Top side) */}
      {colHandles.map((handle) => (
        <motion.button
          key={`col-${handle.index}`}
          initial={{ opacity: 0 }}
          animate={{
            opacity:
              hoveredCol === handle.index || selectedCol === handle.index
                ? 1
                : 0.4,
          }}
          whileHover={{ opacity: 1 }}
          className={`fixed z-[98] flex items-center justify-center w-5 h-5 rounded transition-all duration-100 cursor-grab active:cursor-grabbing ${
            selectedCol === handle.index
              ? "bg-yellow-500 text-black"
              : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white"
          }`}
          style={{
            left: handle.x,
            top: handle.y,
            transform: "translateX(-50%)",
          }}
          onMouseEnter={() => setHoveredCol(handle.index)}
          onMouseLeave={() => setHoveredCol(null)}
          onClick={(e) => handleColGripClick(e, handle.index)}
          title={`Column ${handle.index + 1}`}
        >
          <GripHorizontal className="w-3 h-3" />
        </motion.button>
      ))}

      {/* Row Highlight */}
      <AnimatePresence>
        {(hoveredRow !== null || selectedRow !== null) && tableRect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed pointer-events-none z-[97]"
            style={{
              left: tableRect.left,
              top: rowHandles[hoveredRow ?? selectedRow ?? 0]?.y,
              width: tableRect.width,
              height: rowHandles[hoveredRow ?? selectedRow ?? 0]?.height || 40,
              transform: "translateY(-50%)",
              background:
                selectedRow !== null
                  ? "rgba(234, 179, 8, 0.15)"
                  : "rgba(255, 255, 255, 0.03)",
              borderTop:
                selectedRow !== null
                  ? "2px solid rgba(234, 179, 8, 0.5)"
                  : "none",
              borderBottom:
                selectedRow !== null
                  ? "2px solid rgba(234, 179, 8, 0.5)"
                  : "none",
            }}
          />
        )}
      </AnimatePresence>

      {/* Column Highlight */}
      <AnimatePresence>
        {(hoveredCol !== null || selectedCol !== null) && tableRect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed pointer-events-none z-[97]"
            style={{
              left: colHandles[hoveredCol ?? selectedCol ?? 0]?.x,
              top: tableRect.top,
              width: colHandles[hoveredCol ?? selectedCol ?? 0]?.width || 100,
              height: tableRect.height,
              transform: "translateX(-50%)",
              background:
                selectedCol !== null
                  ? "rgba(234, 179, 8, 0.15)"
                  : "rgba(255, 255, 255, 0.03)",
              borderLeft:
                selectedCol !== null
                  ? "2px solid rgba(234, 179, 8, 0.5)"
                  : "none",
              borderRight:
                selectedCol !== null
                  ? "2px solid rgba(234, 179, 8, 0.5)"
                  : "none",
            }}
          />
        )}
      </AnimatePresence>

      {/* Row Context Menu */}
      <AnimatePresence>
        {showRowMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="fixed z-[200] bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl py-1 min-w-[160px]"
            style={{
              left: menuPosition.x,
              top: menuPosition.y,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={addRowAbove}
              className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
            >
              Insert row above
            </button>
            <button
              onClick={addRowBelow}
              className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
            >
              Insert row below
            </button>
            <div className="h-px bg-zinc-700 my-1" />
            <button
              onClick={deleteRow}
              className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-zinc-800 hover:text-red-300 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete row
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Column Context Menu */}
      <AnimatePresence>
        {showColMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="fixed z-[200] bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl py-1 min-w-[160px]"
            style={{
              left: menuPosition.x,
              top: menuPosition.y,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={addColumnLeft}
              className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
            >
              Insert column left
            </button>
            <button
              onClick={addColumnRight}
              className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
            >
              Insert column right
            </button>
            <div className="h-px bg-zinc-700 my-1" />
            <button
              onClick={deleteColumn}
              className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-zinc-800 hover:text-red-300 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete column
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
