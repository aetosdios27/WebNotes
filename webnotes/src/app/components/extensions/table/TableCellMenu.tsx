// src/app/components/extensions/table/TableCellMenu.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Editor } from "@tiptap/react";
import {
  Trash2,
  Merge,
  SplitSquareHorizontal,
  Columns,
  Rows,
  Palette,
  ToggleLeft,
  ChevronRight,
  Copy,
  ClipboardPaste,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TableCellMenuProps {
  editor: Editor | null;
}

interface MenuPosition {
  x: number;
  y: number;
}

const CELL_COLORS = [
  { name: "Default", value: null },
  { name: "Gray", value: "rgba(55, 55, 55, 0.5)" },
  { name: "Brown", value: "rgba(100, 71, 58, 0.5)" },
  { name: "Orange", value: "rgba(133, 76, 29, 0.5)" },
  { name: "Yellow", value: "rgba(133, 115, 29, 0.5)" },
  { name: "Green", value: "rgba(43, 89, 63, 0.5)" },
  { name: "Blue", value: "rgba(40, 69, 108, 0.5)" },
  { name: "Purple", value: "rgba(73, 47, 100, 0.5)" },
  { name: "Pink", value: "rgba(105, 49, 76, 0.5)" },
  { name: "Red", value: "rgba(110, 44, 44, 0.5)" },
];

export function TableCellMenu({ editor }: TableCellMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ x: 0, y: 0 });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isInTable, setIsInTable] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Check if cursor is in a table
  const checkTableContext = useCallback(() => {
    if (!editor?.view) {
      setIsInTable(false);
      return;
    }

    try {
      const { selection } = editor.state;
      const $pos = selection.$from;

      for (let d = $pos.depth; d > 0; d--) {
        const node = $pos.node(d);
        if (node.type.name === "table") {
          setIsInTable(true);
          return;
        }
      }
      setIsInTable(false);
    } catch {
      setIsInTable(false);
    }
  }, [editor]);

  useEffect(() => {
    if (!editor?.view) return;

    checkTableContext();
    editor.on("selectionUpdate", checkTableContext);
    editor.on("transaction", checkTableContext);

    return () => {
      editor.off("selectionUpdate", checkTableContext);
      editor.off("transaction", checkTableContext);
    };
  }, [editor, checkTableContext]);

  // Handle right-click on table cells
  useEffect(() => {
    // Don't do anything if editor isn't ready
    if (!editor) return;

    // Check if view exists and is mounted
    let editorElement: HTMLElement;
    try {
      if (!editor.view || !editor.view.dom) return;
      editorElement = editor.view.dom;
    } catch (error) {
      // Editor view not ready yet
      return;
    }

    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const cell = target.closest("td, th");
      const table = target.closest("table");

      if (cell && table && isInTable) {
        e.preventDefault();
        setPosition({ x: e.clientX, y: e.clientY });
        setIsOpen(true);
        setShowColorPicker(false);
      }
    };

    editorElement.addEventListener("contextmenu", handleContextMenu);

    return () => {
      editorElement.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [editor, isInTable]);

  // Close menu on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowColorPicker(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setShowColorPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  // Menu actions
  const insertRowAbove = useCallback(() => {
    editor?.chain().focus().addRowBefore().run();
    setIsOpen(false);
  }, [editor]);

  const insertRowBelow = useCallback(() => {
    editor?.chain().focus().addRowAfter().run();
    setIsOpen(false);
  }, [editor]);

  const insertColumnLeft = useCallback(() => {
    editor?.chain().focus().addColumnBefore().run();
    setIsOpen(false);
  }, [editor]);

  const insertColumnRight = useCallback(() => {
    editor?.chain().focus().addColumnAfter().run();
    setIsOpen(false);
  }, [editor]);

  const deleteRow = useCallback(() => {
    editor?.chain().focus().deleteRow().run();
    setIsOpen(false);
  }, [editor]);

  const deleteColumn = useCallback(() => {
    editor?.chain().focus().deleteColumn().run();
    setIsOpen(false);
  }, [editor]);

  const deleteTable = useCallback(() => {
    editor?.chain().focus().deleteTable().run();
    setIsOpen(false);
  }, [editor]);

  const mergeCells = useCallback(() => {
    editor?.chain().focus().mergeCells().run();
    setIsOpen(false);
  }, [editor]);

  const splitCell = useCallback(() => {
    editor?.chain().focus().splitCell().run();
    setIsOpen(false);
  }, [editor]);

  const toggleHeaderRow = useCallback(() => {
    editor?.chain().focus().toggleHeaderRow().run();
    setIsOpen(false);
  }, [editor]);

  const toggleHeaderColumn = useCallback(() => {
    editor?.chain().focus().toggleHeaderColumn().run();
    setIsOpen(false);
  }, [editor]);

  const toggleHeaderCell = useCallback(() => {
    editor?.chain().focus().toggleHeaderCell().run();
    setIsOpen(false);
  }, [editor]);

  const setCellColor = useCallback(
    (color: string | null) => {
      if (!editor) return;

      editor
        .chain()
        .focus()
        .updateAttributes("tableCell", { backgroundColor: color })
        .updateAttributes("tableHeader", { backgroundColor: color })
        .run();

      setShowColorPicker(false);
      setIsOpen(false);
    },
    [editor]
  );

  const copyCell = useCallback(() => {
    if (!editor) return;

    try {
      const text = editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to,
        " "
      );
      if (text) {
        navigator.clipboard.writeText(text);
      }
    } catch {
      // Ignore clipboard errors
    }
    setIsOpen(false);
  }, [editor]);

  const pasteToCell = useCallback(async () => {
    if (!editor) return;

    try {
      const text = await navigator.clipboard.readText();
      editor.chain().focus().insertContent(text).run();
    } catch {
      // Ignore clipboard errors
    }
    setIsOpen(false);
  }, [editor]);

  // Check if actions are available
  const canMergeCells = editor?.can().mergeCells() ?? false;
  const canSplitCell = editor?.can().splitCell() ?? false;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.1 }}
          className="fixed z-[300] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl py-2 min-w-[200px] overflow-hidden"
          style={{
            left: Math.min(position.x, window.innerWidth - 220),
            top: Math.min(position.y, window.innerHeight - 400),
          }}
        >
          {/* Insert Section */}
          <div className="px-2 py-1">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold px-2">
              Insert
            </span>
          </div>

          <button
            onClick={insertRowAbove}
            className="w-full px-3 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-3"
          >
            <Plus className="w-4 h-4 text-zinc-500" />
            Insert row above
          </button>
          <button
            onClick={insertRowBelow}
            className="w-full px-3 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-3"
          >
            <Plus className="w-4 h-4 text-zinc-500" />
            Insert row below
          </button>
          <button
            onClick={insertColumnLeft}
            className="w-full px-3 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-3"
          >
            <Plus className="w-4 h-4 text-zinc-500" />
            Insert column left
          </button>
          <button
            onClick={insertColumnRight}
            className="w-full px-3 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-3"
          >
            <Plus className="w-4 h-4 text-zinc-500" />
            Insert column right
          </button>

          <div className="h-px bg-zinc-800 my-2" />

          {/* Cell Actions */}
          <div className="px-2 py-1">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold px-2">
              Cell
            </span>
          </div>

          {/* Color Picker */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="w-full px-3 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center justify-between"
            >
              <span className="flex items-center gap-3">
                <Palette className="w-4 h-4 text-zinc-500" />
                Cell color
              </span>
              <ChevronRight
                className={`w-4 h-4 text-zinc-500 transition-transform ${
                  showColorPicker ? "rotate-90" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {showColorPicker && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-5 gap-1 px-3 py-2 bg-zinc-800/50">
                    {CELL_COLORS.map((color) => (
                      <button
                        key={color.name}
                        onClick={() => setCellColor(color.value)}
                        className="w-7 h-7 rounded-md border border-zinc-600 hover:border-yellow-500 transition-colors flex items-center justify-center"
                        style={{
                          backgroundColor: color.value || "transparent",
                        }}
                        title={color.name}
                      >
                        {!color.value && (
                          <div className="w-4 h-px bg-red-500 rotate-45" />
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={mergeCells}
            disabled={!canMergeCells}
            className={`w-full px-3 py-1.5 text-left text-sm flex items-center gap-3 ${
              canMergeCells
                ? "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                : "text-zinc-600 cursor-not-allowed"
            }`}
          >
            <Merge className="w-4 h-4 text-zinc-500" />
            Merge cells
          </button>

          <button
            onClick={splitCell}
            disabled={!canSplitCell}
            className={`w-full px-3 py-1.5 text-left text-sm flex items-center gap-3 ${
              canSplitCell
                ? "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                : "text-zinc-600 cursor-not-allowed"
            }`}
          >
            <SplitSquareHorizontal className="w-4 h-4 text-zinc-500" />
            Split cell
          </button>

          <div className="h-px bg-zinc-800 my-2" />

          {/* Header Toggles */}
          <div className="px-2 py-1">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold px-2">
              Header
            </span>
          </div>

          <button
            onClick={toggleHeaderRow}
            className="w-full px-3 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-3"
          >
            <Rows className="w-4 h-4 text-zinc-500" />
            Toggle header row
          </button>

          <button
            onClick={toggleHeaderColumn}
            className="w-full px-3 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-3"
          >
            <Columns className="w-4 h-4 text-zinc-500" />
            Toggle header column
          </button>

          <button
            onClick={toggleHeaderCell}
            className="w-full px-3 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-3"
          >
            <ToggleLeft className="w-4 h-4 text-zinc-500" />
            Toggle header cell
          </button>

          <div className="h-px bg-zinc-800 my-2" />

          {/* Clipboard */}
          <button
            onClick={copyCell}
            className="w-full px-3 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-3"
          >
            <Copy className="w-4 h-4 text-zinc-500" />
            Copy
          </button>

          <button
            onClick={pasteToCell}
            className="w-full px-3 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-3"
          >
            <ClipboardPaste className="w-4 h-4 text-zinc-500" />
            Paste
          </button>

          <div className="h-px bg-zinc-800 my-2" />

          {/* Delete Section */}
          <div className="px-2 py-1">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold px-2">
              Delete
            </span>
          </div>

          <button
            onClick={deleteRow}
            className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-zinc-800 hover:text-red-300 flex items-center gap-3"
          >
            <Trash2 className="w-4 h-4" />
            Delete row
          </button>

          <button
            onClick={deleteColumn}
            className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-zinc-800 hover:text-red-300 flex items-center gap-3"
          >
            <Trash2 className="w-4 h-4" />
            Delete column
          </button>

          <button
            onClick={deleteTable}
            className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-zinc-800 hover:text-red-300 flex items-center gap-3"
          >
            <Trash2 className="w-4 h-4" />
            Delete table
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
