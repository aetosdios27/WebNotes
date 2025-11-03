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
    <div className="border border-zinc-700 bg-transparent rounded-lg p-1 flex items-center gap-1 overflow-x-auto">
      <Toggle
        size="sm"
        pressed={editor.isActive('bold')}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        className="data-[state=on]:bg-zinc-900 data-[state=on]:text-yellow-400 h-9 w-9 md:h-8 md:w-8 flex-shrink-0"
      >
        <Bold className="h-4 w-4" />
      </Toggle>
      
      <Toggle
        size="sm"
        pressed={editor.isActive('italic')}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        className="data-[state=on]:bg-zinc-900 data-[state=on]:text-yellow-400 h-9 w-9 md:h-8 md:w-8 flex-shrink-0"
      >
        <Italic className="h-4 w-4" />
      </Toggle>
      
      <Toggle
        size="sm"
        pressed={editor.isActive('strike')}
        onPressedChange={() => editor.chain().focus().toggleStrike().run()}
        className="data-[state=on]:bg-zinc-900 data-[state=on]:text-yellow-400 h-9 w-9 md:h-8 md:w-8 flex-shrink-0"
      >
        <Strikethrough className="h-4 w-4" />
      </Toggle>
      
      <Toggle
        size="sm"
        pressed={editor.isActive('bulletList')}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        className="data-[state=on]:bg-zinc-900 data-[state=on]:text-yellow-400 h-9 w-9 md:h-8 md:w-8 flex-shrink-0"
      >
        <List className="h-4 w-4" />
      </Toggle>
      
      <Toggle
        size="sm"
        pressed={editor.isActive('orderedList')}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        className="data-[state=on]:bg-zinc-900 data-[state=on]:text-yellow-400 h-9 w-9 md:h-8 md:w-8 flex-shrink-0"
      >
        <ListOrdered className="h-4 w-4" />
      </Toggle>
    </div>
  );
}