'use client';

import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code,
  Quote,
  Minus,
  Type
} from 'lucide-react';

interface CommandItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: (props: any) => void;
  keywords?: string[];
}

interface SlashCommandsProps {
  items: CommandItem[];
  command: (item: CommandItem) => void;
}

export const SlashCommands = forwardRef((props: SlashCommandsProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }

      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }

      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden p-2 min-w-[280px]">
      {props.items.length > 0 ? (
        props.items.map((item, index) => (
          <button
            key={index}
            onClick={() => selectItem(index)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
              index === selectedIndex
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300'
            }`}
          >
            <div className="flex-shrink-0 text-zinc-500">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{item.title}</div>
              <div className="text-xs text-zinc-600 truncate">{item.description}</div>
            </div>
          </button>
        ))
      ) : (
        <div className="text-sm text-zinc-500 px-3 py-2">No results</div>
      )}
    </div>
  );
});

SlashCommands.displayName = 'SlashCommands';

export const slashCommandItems = (): CommandItem[] => [
  {
    title: 'Text',
    description: 'Just start writing with plain text',
    icon: <Type className="h-4 w-4" />,
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleNode('paragraph', 'paragraph')
        .run();
    },
  },
  {
    title: 'Heading 1',
    description: 'Big section heading',
    icon: <Heading1 className="h-4 w-4" />,
    keywords: ['h1', 'heading1', 'title'],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode('heading', { level: 1 })
        .run();
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: <Heading2 className="h-4 w-4" />,
    keywords: ['h2', 'heading2', 'subtitle'],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode('heading', { level: 2 })
        .run();
    },
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    icon: <Heading3 className="h-4 w-4" />,
    keywords: ['h3', 'heading3', 'subheading'],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode('heading', { level: 3 })
        .run();
    },
  },
  {
    title: 'Bullet List',
    description: 'Create a simple bullet list',
    icon: <List className="h-4 w-4" />,
    keywords: ['ul', 'list', 'bullet'],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleBulletList()
        .run();
    },
  },
  {
    title: 'Numbered List',
    description: 'Create a numbered list',
    icon: <ListOrdered className="h-4 w-4" />,
    keywords: ['ol', 'ordered', 'numbered'],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleOrderedList()
        .run();
    },
  },
  {
    title: 'Quote',
    description: 'Create a blockquote',
    icon: <Quote className="h-4 w-4" />,
    keywords: ['blockquote', 'citation'],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleBlockquote()
        .run();
    },
  },
  {
    title: 'Code Block',
    description: 'Create a code block',
    icon: <Code className="h-4 w-4" />,
    keywords: ['code', 'codeblock', 'snippet'],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleCodeBlock()
        .run();
    },
  },
  {
    title: 'Divider',
    description: 'Insert a horizontal rule',
    icon: <Minus className="h-4 w-4" />,
    keywords: ['hr', 'horizontal', 'line', 'separator'],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setHorizontalRule()
        .run();
    },
  },
];

export const slashCommandSuggestion = {
  items: ({ query }: { query: string }) => {
    const items = slashCommandItems();
    
    return items.filter(item => {
      const searchTerm = query.toLowerCase();
      return (
        item.title.toLowerCase().includes(searchTerm) ||
        item.description.toLowerCase().includes(searchTerm) ||
        item.keywords?.some(keyword => keyword.toLowerCase().includes(searchTerm))
      );
    });
  },

  render: () => {
    let component: ReactRenderer;
    let popup: any;

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(SlashCommands, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) {
          return;
        }

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        });
      },

      onUpdate(props: any) {
        component.updateProps(props);

        if (!props.clientRect) {
          return;
        }

        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        });
      },

      onKeyDown(props: any) {
        if (props.event.key === 'Escape') {
          popup[0].hide();
          return true;
        }

        return (component.ref as any)?.onKeyDown(props);
      },

      onExit() {
        popup[0].destroy();
        component.destroy();
      },
    };
  },
};