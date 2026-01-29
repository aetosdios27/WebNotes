// src/app/components/extensions/table/useTableState.ts
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { CellSelection } from "@tiptap/pm/tables";

export interface TableRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export interface TableState {
  isActive: boolean;
  tableElement: HTMLTableElement | null;
  tableRect: TableRect | null;
  rows: number;
  cols: number;
  selectedCells: { row: number; col: number }[];
}

export function useTableState(editor: Editor | null) {
  const [state, setState] = useState<TableState>({
    isActive: false,
    tableElement: null,
    tableRect: null,
    rows: 0,
    cols: 0,
    selectedCells: [],
  });

  const updateState = useCallback(() => {
    if (!editor || !editor.view) {
      setState((prev) => ({ ...prev, isActive: false, tableElement: null }));
      return;
    }

    const { selection } = editor.state;

    // Check if we're in a table
    let inTable = false;
    let tableNode = null;
    let tablePos = 0;

    const $pos = selection.$from;
    for (let d = $pos.depth; d > 0; d--) {
      const node = $pos.node(d);
      if (node.type.name === "table") {
        inTable = true;
        tableNode = node;
        tablePos = $pos.before(d);
        break;
      }
    }

    if (!inTable || !tableNode) {
      setState((prev) => ({ ...prev, isActive: false, tableElement: null }));
      return;
    }

    // Get DOM element
    const domNode = editor.view.nodeDOM(tablePos);
    const tableElement =
      domNode instanceof HTMLTableElement
        ? domNode
        : (domNode as HTMLElement)?.querySelector?.("table");

    if (!tableElement) {
      setState((prev) => ({ ...prev, isActive: false, tableElement: null }));
      return;
    }

    const rect = tableElement.getBoundingClientRect();

    // Count rows and cols
    const rows = tableElement.rows.length;
    const cols = tableElement.rows[0]?.cells.length || 0;

    // Get selected cells
    const selectedCells: { row: number; col: number }[] = [];
    if (selection instanceof CellSelection) {
      selection.forEachCell((node, pos) => {
        const cellDom = editor.view.nodeDOM(pos);
        if (cellDom instanceof HTMLTableCellElement) {
          const rowElement = cellDom.parentElement as HTMLTableRowElement;
          selectedCells.push({
            row: rowElement.rowIndex,
            col: cellDom.cellIndex,
          });
        }
      });
    }

    setState({
      isActive: true,
      tableElement,
      tableRect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right,
      },
      rows,
      cols,
      selectedCells,
    });
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    updateState();

    editor.on("selectionUpdate", updateState);
    editor.on("transaction", updateState);

    // Also update on scroll/resize
    const handleScroll = () => updateState();
    const handleResize = () => updateState();

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      editor.off("selectionUpdate", updateState);
      editor.off("transaction", updateState);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [editor, updateState]);

  return state;
}
