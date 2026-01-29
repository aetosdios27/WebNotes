"use client";

import { useEffect, useState, useCallback } from "react";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Strikethrough,
  Italic,
  List,
  ListOrdered,
  Table,
  Plus,
  Minus,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { Toggle } from "@/app/components/ui/toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { Button } from "@/app/components/ui/button";

type Props = {
  editor: Editor | null;
};

export function Toolbar({ editor }: Props) {
  const [, setForceUpdate] = useState(0);

  useEffect(() => {
    if (editor) {
      const onTransaction = () => {
        setForceUpdate((prev) => prev + 1);
      };
      editor.on("transaction", onTransaction);
      return () => {
        editor.off("transaction", onTransaction);
      };
    }
  }, [editor]);

  const insertTable = useCallback(() => {
    editor
      ?.chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  }, [editor]);

  const addColumnBefore = useCallback(() => {
    editor?.chain().focus().addColumnBefore().run();
  }, [editor]);

  const addColumnAfter = useCallback(() => {
    editor?.chain().focus().addColumnAfter().run();
  }, [editor]);

  const addRowBefore = useCallback(() => {
    editor?.chain().focus().addRowBefore().run();
  }, [editor]);

  const addRowAfter = useCallback(() => {
    editor?.chain().focus().addRowAfter().run();
  }, [editor]);

  const deleteColumn = useCallback(() => {
    editor?.chain().focus().deleteColumn().run();
  }, [editor]);

  const deleteRow = useCallback(() => {
    editor?.chain().focus().deleteRow().run();
  }, [editor]);

  const deleteTable = useCallback(() => {
    editor?.chain().focus().deleteTable().run();
  }, [editor]);

  const mergeCells = useCallback(() => {
    editor?.chain().focus().mergeCells().run();
  }, [editor]);

  const splitCell = useCallback(() => {
    editor?.chain().focus().splitCell().run();
  }, [editor]);

  const toggleHeaderRow = useCallback(() => {
    editor?.chain().focus().toggleHeaderRow().run();
  }, [editor]);

  const toggleHeaderColumn = useCallback(() => {
    editor?.chain().focus().toggleHeaderColumn().run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  const isInTable = editor.isActive("table");

  return (
    <div className="border border-zinc-700 bg-transparent rounded-lg p-1 flex items-center gap-1 overflow-x-auto">
      {/* Text Formatting */}
      <Toggle
        size="sm"
        pressed={editor.isActive("bold")}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        className="data-[state=on]:bg-zinc-900 data-[state=on]:text-yellow-400 h-9 w-9 md:h-8 md:w-8 flex-shrink-0"
      >
        <Bold className="h-4 w-4" />
      </Toggle>

      <Toggle
        size="sm"
        pressed={editor.isActive("italic")}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        className="data-[state=on]:bg-zinc-900 data-[state=on]:text-yellow-400 h-9 w-9 md:h-8 md:w-8 flex-shrink-0"
      >
        <Italic className="h-4 w-4" />
      </Toggle>

      <Toggle
        size="sm"
        pressed={editor.isActive("strike")}
        onPressedChange={() => editor.chain().focus().toggleStrike().run()}
        className="data-[state=on]:bg-zinc-900 data-[state=on]:text-yellow-400 h-9 w-9 md:h-8 md:w-8 flex-shrink-0"
      >
        <Strikethrough className="h-4 w-4" />
      </Toggle>

      {/* Divider */}
      <div className="w-px h-6 bg-zinc-700 mx-1 flex-shrink-0" />

      {/* Lists */}
      <Toggle
        size="sm"
        pressed={editor.isActive("bulletList")}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        className="data-[state=on]:bg-zinc-900 data-[state=on]:text-yellow-400 h-9 w-9 md:h-8 md:w-8 flex-shrink-0"
      >
        <List className="h-4 w-4" />
      </Toggle>

      <Toggle
        size="sm"
        pressed={editor.isActive("orderedList")}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        className="data-[state=on]:bg-zinc-900 data-[state=on]:text-yellow-400 h-9 w-9 md:h-8 md:w-8 flex-shrink-0"
      >
        <ListOrdered className="h-4 w-4" />
      </Toggle>

      {/* Divider */}
      <div className="w-px h-6 bg-zinc-700 mx-1 flex-shrink-0" />

      {/* Table Controls */}
      {!isInTable ? (
        // Insert Table Button (when not in a table)
        <Button
          variant="ghost"
          size="sm"
          onClick={insertTable}
          className="h-9 w-9 md:h-8 md:w-8 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800 flex-shrink-0"
          title="Insert Table"
        >
          <Table className="h-4 w-4" />
        </Button>
      ) : (
        // Table Dropdown (when inside a table)
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 md:h-8 px-2 text-yellow-400 bg-zinc-800 hover:bg-zinc-700 flex-shrink-0 gap-1"
            >
              <Table className="h-4 w-4" />
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {/* Add */}
            <DropdownMenuItem onClick={addColumnBefore}>
              <Plus className="h-4 w-4 mr-2" />
              Add Column Before
            </DropdownMenuItem>
            <DropdownMenuItem onClick={addColumnAfter}>
              <Plus className="h-4 w-4 mr-2" />
              Add Column After
            </DropdownMenuItem>
            <DropdownMenuItem onClick={addRowBefore}>
              <Plus className="h-4 w-4 mr-2" />
              Add Row Before
            </DropdownMenuItem>
            <DropdownMenuItem onClick={addRowAfter}>
              <Plus className="h-4 w-4 mr-2" />
              Add Row After
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Headers */}
            <DropdownMenuItem onClick={toggleHeaderRow}>
              Toggle Header Row
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleHeaderColumn}>
              Toggle Header Column
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Merge/Split */}
            <DropdownMenuItem onClick={mergeCells}>
              Merge Cells
            </DropdownMenuItem>
            <DropdownMenuItem onClick={splitCell}>Split Cell</DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Delete */}
            <DropdownMenuItem onClick={deleteColumn} className="text-red-400">
              <Minus className="h-4 w-4 mr-2" />
              Delete Column
            </DropdownMenuItem>
            <DropdownMenuItem onClick={deleteRow} className="text-red-400">
              <Minus className="h-4 w-4 mr-2" />
              Delete Row
            </DropdownMenuItem>
            <DropdownMenuItem onClick={deleteTable} className="text-red-400">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Table
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
