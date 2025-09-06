// src/app/components/Toolbar.tsx

'use client';

import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold,
  Strikethrough,
  Italic,
  List,
  ListOrdered,
} from 'lucide-react';
import { Toggle } from '@/app/components/ui/toggle';

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
      editor.on('transaction', onTransaction);
      return () => {
        editor.off('transaction', onTransaction);
      };
    }
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-zinc-700 bg-transparent rounded-lg p-1 flex items-center gap-1">
      {/* The only change is bg-zinc-700 -> bg-zinc-900 */}
      <Toggle
        size="sm"
        pressed={editor.isActive('bold')}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        className="data-[state=on]:bg-zinc-900 data-[state=on]:text-yellow-400"
      >
        <Bold className="h-4 w-4" />
      </Toggle>
      
      <Toggle
        size="sm"
        pressed={editor.isActive('italic')}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        className="data-[state=on]:bg-zinc-900 data-[state=on]:text-yellow-400"
      >
        <Italic className="h-4 w-4" />
      </Toggle>
      
      <Toggle
        size="sm"
        pressed={editor.isActive('strike')}
        onPressedChange={() => editor.chain().focus().toggleStrike().run()}
        className="data-[state=on]:bg-zinc-900 data-[state=on]:text-yellow-400"
      >
        <Strikethrough className="h-4 w-4" />
      </Toggle>
      
      <Toggle
        size="sm"
        pressed={editor.isActive('bulletList')}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        className="data-[state=on]:bg-zinc-900 data-[state=on]:text-yellow-400"
      >
        <List className="h-4 w-4" />
      </Toggle>
      
      <Toggle
        size="sm"
        pressed={editor.isActive('orderedList')}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        className="data-[state=on]:bg-zinc-900 data-[state=on]:text-yellow-400"
      >
        <ListOrdered className="h-4 w-4" />
      </Toggle>
    </div>
  );
}