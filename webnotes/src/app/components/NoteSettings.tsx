'use client';

import { useState, useMemo } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/app/components/ui/popover';
import { Button } from '@/app/components/ui/button';
import {
  Info,
  Clock,
  Calendar,
  Type,
  Hash,
  Copy,
  Download,
  Trash2,
  FileText,
  BookOpen,
  Settings
} from 'lucide-react';
import type { Note } from '@/lib/storage/types';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface NoteSettingsProps {
  note: Note | null;
  onDelete?: () => void;
  onUpdate: (updates: Partial<Note>) => void; // Added onUpdate prop
}

export default function NoteSettings({ note, onDelete, onUpdate }: NoteSettingsProps) {
  const [open, setOpen] = useState(false);
  
  // Default to sans if not set
  const currentFont = note?.font || 'sans';

  // 🧮 Compute stats
  const stats = useMemo(() => {
    if (!note?.content) {
      return {
        words: 0,
        characters: 0,
        readingTime: 0,
        lines: 0,
      };
    }
    const plain = note.content
      .replace(/<[^>]*>/g, '')
      .replace(/#{1,6}\s/g, '')
      .replace(/[*_~`]/g, '');

    const words = plain.trim().split(/\s+/).filter(Boolean).length;
    const characters = plain.length;
    const readingTime = Math.max(1, Math.ceil(words / 200));
    const lines = plain.split('\n').filter(l => l.trim()).length;

    return { words, characters, readingTime, lines };
  }, [note?.content]);

  // 🕓 Format dates
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'Never';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  // 📋 Copy as markdown
  const copyAsMarkdown = async () => {
    if (!note) return;
    const markdown = `# ${note.title || 'Untitled'}\n\n${note.content || ''}`;
    await navigator.clipboard.writeText(markdown);
    toast.success('Copied as Markdown');
    setOpen(false);
  };

  // 📦 Export as markdown file
  const exportAsMarkdown = () => {
    if (!note) return;
    const markdown = `# ${note.title || 'Untitled'}\n\n${note.content || ''}`;
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title || 'untitled'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported as Markdown');
    setOpen(false);
  };

  // 🧾 Export as PDF
  const exportAsPDF = async () => {
    if (!note?.id) return;
    toast.loading('Generating PDF...');

    try {
      const res = await fetch(`/api/notes/${note.id}/export-pdf`);
      if (!res.ok) throw new Error('Failed to export');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${note.title || 'note'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success('Exported as PDF');
    } catch (err) {
      console.error(err);
      toast.dismiss();
      toast.error('Failed to export PDF');
    } finally {
      setOpen(false);
    }
  };

  if (!note) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0 bg-zinc-900 border-zinc-800" align="end">
        <div className="p-4 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
            <Info className="h-4 w-4 text-zinc-400" />
            <h3 className="font-medium text-white">Page Settings</h3>
          </div>

          {/* 1. TYPOGRAPHY */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">Typography</div>
            <div className="grid grid-cols-3 gap-2">
              {/* Sans (Geist) */}
              <button
                onClick={() => onUpdate({ font: 'sans' })}
                className={`
                  flex flex-col items-center justify-center gap-1 p-2 rounded-md border transition-all
                  ${currentFont === 'sans' 
                    ? 'bg-zinc-800 border-yellow-500 text-white' 
                    : 'border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-300'
                  }
                `}
              >
                <span className="text-xl font-sans font-semibold">Ag</span>
                <span className="text-[10px]">Sans</span>
              </button>

              {/* Serif (Instrument) */}
              <button
                onClick={() => onUpdate({ font: 'serif' })}
                className={`
                  flex flex-col items-center justify-center gap-1 p-2 rounded-md border transition-all
                  ${currentFont === 'serif' 
                    ? 'bg-zinc-800 border-yellow-500 text-white' 
                    : 'border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-300'
                  }
                `}
              >
                <span className="text-xl font-serif font-semibold">Ag</span>
                <span className="text-[10px]">Serif</span>
              </button>

              {/* Mono (JetBrains) */}
              <button
                onClick={() => onUpdate({ font: 'mono' })}
                className={`
                  flex flex-col items-center justify-center gap-1 p-2 rounded-md border transition-all
                  ${currentFont === 'mono' 
                    ? 'bg-zinc-800 border-yellow-500 text-white' 
                    : 'border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-300'
                  }
                `}
              >
                <span className="text-xl font-mono font-semibold">Ag</span>
                <span className="text-[10px]">Mono</span>
              </button>
            </div>
          </motion.div>

          {/* 2. STATS */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">Statistics</div>
            <div className="grid grid-cols-2 gap-3 bg-zinc-950/50 p-3 rounded-lg border border-zinc-800">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Type className="h-3 w-3" /> Words
                </div>
                <div className="text-base font-medium text-white">{stats.words.toLocaleString()}</div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <BookOpen className="h-3 w-3" /> Time
                </div>
                <div className="text-base font-medium text-white">{stats.readingTime} min</div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Hash className="h-3 w-3" /> Chars
                </div>
                <div className="text-base font-medium text-white">{stats.characters.toLocaleString()}</div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <FileText className="h-3 w-3" /> Lines
                </div>
                <div className="text-base font-medium text-white">{stats.lines.toLocaleString()}</div>
              </div>
            </div>
          </motion.div>

          {/* 3. DATES */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="space-y-2 py-3 border-t border-b border-zinc-800">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-zinc-500">
                  <Calendar className="h-3 w-3" />
                  Created
                </span>
                <span className="text-zinc-300">{formatDate(note.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-zinc-500">
                  <Clock className="h-3 w-3" />
                  Modified
                </span>
                <span className="text-zinc-300">{formatDate(note.updatedAt)}</span>
              </div>
            </div>
          </motion.div>

          {/* 4. ACTIONS */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-zinc-300 hover:text-white hover:bg-zinc-800"
                onClick={copyAsMarkdown}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy as Markdown
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-zinc-300 hover:text-white hover:bg-zinc-800"
                onClick={exportAsMarkdown}
              >
                <Download className="h-4 w-4 mr-2" />
                Export as Markdown
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-zinc-300 hover:text-white hover:bg-zinc-800"
                onClick={exportAsPDF}
              >
                <Download className="h-4 w-4 mr-2" />
                Export as PDF
              </Button>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  onClick={() => {
                    onDelete();
                    setOpen(false);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Note
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </PopoverContent>
    </Popover>
  );
}