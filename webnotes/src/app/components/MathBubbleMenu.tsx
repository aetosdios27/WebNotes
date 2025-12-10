'use client';

import type { Editor } from '@tiptap/react';
import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import katex from 'katex';
import tippy, { type Instance } from 'tippy.js';

interface MathBubbleMenuProps {
  editor: Editor;
}

export function MathBubbleMenu({ editor }: MathBubbleMenuProps) {
  const [latex, setLatex] = useState('');
  const [preview, setPreview] = useState('');
  const [isBlock, setIsBlock] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const tippyInstance = useRef<Instance | null>(null);

  // 1. Handle LaTeX Preview
  useEffect(() => {
    try {
      const rendered = katex.renderToString(latex, {
        throwOnError: false,
        displayMode: isBlock,
      });
      setPreview(rendered);
    } catch {
      setPreview(latex);
    }
  }, [latex, isBlock]);

  // 2. Handle Tippy Instance & Visibility
  useEffect(() => {
    // SAFETY CHECK: Ensure editor and view exist
    if (!menuRef.current || !editor || editor.isDestroyed || !editor.view) return;

    // Create Tippy instance if it doesn't exist
    if (!tippyInstance.current) {
      tippyInstance.current = tippy(editor.view.dom, {
        getReferenceClientRect: null,
        content: menuRef.current,
        interactive: true,
        trigger: 'manual',
        placement: 'top',
        hideOnClick: false,
        duration: 100,
        zIndex: 9999,
        appendTo: document.body,
      });
    }

    const updateMenu = () => {
      // Double check inside the callback too
      if (editor.isDestroyed) return;

      const { selection } = editor.state;
      const isMathActive = editor.isActive('mathInline') || editor.isActive('mathBlock');

      if (isMathActive) {
        const currentAttributes = editor.isActive('mathInline') 
          ? editor.getAttributes('mathInline') 
          : editor.getAttributes('mathBlock');
          
        const currentIsBlock = editor.isActive('mathBlock');

        if (!tippyInstance.current?.state.isVisible) {
           setLatex(currentAttributes.latex || '');
           setIsBlock(currentIsBlock);
        }

        tippyInstance.current?.setProps({
          getReferenceClientRect: () => {
            if (currentIsBlock) {
              const node = editor.view.nodeDOM(selection.from) as HTMLElement;
              if (node) return node.getBoundingClientRect();
            }
            
            // Safe coordinate retrieval
            return (editor.view as any).posToDOMRect(selection.from, selection.to);
          },
        });

        tippyInstance.current?.show();
      } else {
        tippyInstance.current?.hide();
      }
    };

    editor.on('selectionUpdate', updateMenu);
    editor.on('update', updateMenu);
    editor.on('focus', updateMenu);
    editor.on('blur', ({ event }) => {
      if (menuRef.current && !menuRef.current.contains(event.relatedTarget as Node)) {
         // Optional: hide logic
      }
    });

    // Cleanup
    return () => {
      tippyInstance.current?.destroy();
      tippyInstance.current = null;
      if (!editor.isDestroyed) {
        editor.off('selectionUpdate', updateMenu);
        editor.off('update', updateMenu);
        editor.off('focus', updateMenu);
      }
    };
  }, [editor]);

  const handleSave = () => {
    if (isBlock) {
      editor.commands.updateAttributes('mathBlock', { latex });
    } else {
      editor.commands.updateAttributes('mathInline', { latex });
    }
  };

  const handleDelete = () => {
    editor.commands.deleteSelection();
    tippyInstance.current?.hide();
  };

  // Render the Menu
  return (
    <div className="hidden">
      <div 
        ref={menuRef} 
        className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl p-4 max-w-md"
        onMouseDown={(e) => e.stopPropagation()} 
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
            {isBlock ? 'Block Equation' : 'Inline Equation'}
          </span>
          <button
            onClick={handleDelete}
            className="text-zinc-500 hover:text-red-400 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <textarea
          value={latex}
          onChange={(e) => setLatex(e.target.value)}
          placeholder="\sum..."
          className="w-full bg-zinc-800 text-zinc-200 font-mono text-sm p-2 rounded border border-zinc-700 focus:border-yellow-500 focus:outline-none resize-none"
          rows={3}
        />

        <div className="mt-3 p-3 bg-black/40 rounded border border-zinc-800 min-h-[60px] flex items-center justify-center">
          <div
            className="text-white text-lg"
            dangerouslySetInnerHTML={{ __html: preview }}
          />
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={handleSave}
            className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-medium text-sm py-2 px-4 rounded transition-colors"
          >
            Update
          </button>
          <button
            onClick={() => {
              if (isBlock) {
                 editor.chain().deleteSelection().insertContent({
                    type: 'mathInline',
                    attrs: { latex }
                 }).run();
                 setIsBlock(false);
              } else {
                 editor.chain().deleteSelection().insertContent({
                    type: 'mathBlock',
                    attrs: { latex }
                 }).run();
                 setIsBlock(true);
              }
            }}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm py-2 px-3 rounded transition-colors"
          >
            {isBlock ? 'Make Inline' : 'Make Block'}
          </button>
        </div>
      </div>
    </div>
  );
}