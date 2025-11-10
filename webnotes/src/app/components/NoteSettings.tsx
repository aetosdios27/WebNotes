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
  BookOpen
} from 'lucide-react';
import type { Note } from '@/lib/storage/types';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface NoteSettingsProps {
  note: Note | null;
  onDelete?: () => void;
}

export default function NoteSettings({ note, onDelete }: NoteSettingsProps) {
  const [open, setOpen] = useState(false);

  // Calculate stats
  const stats = useMemo(() => {
    if (!note?.content) {
      return {
        words: 0,
        characters: 0,
        charactersNoSpaces: 0,
        readingTime: 0,
        paragraphs: 0,
        lines: 0
      };
    }

    // Strip HTML/Markdown for accurate count
    const plainText = note.content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/#{1,6}\s/g, '') // Remove markdown headers
      .replace(/[*_~`]/g, ''); // Remove markdown formatting

    const words = plainText.trim().split(/\s+/).filter(word => word.length > 0).length;
    const characters = plainText.length;
    const charactersNoSpaces = plainText.replace(/\s/g, '').length;
    const readingTime = Math.max(1, Math.ceil(words / 200)); // 200 words per minute average
    const paragraphs = plainText.split(/\n\n+/).filter(p => p.trim()).length;
    const lines = plainText.split('\n').filter(l => l.trim()).length;

    return {
      words,
      characters,
      charactersNoSpaces,
      readingTime,
      paragraphs,
      lines
    };
  }, [note?.content]);

  // Format dates
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'Never';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
    });
  };

  // Copy as markdown
  const copyAsMarkdown = () => {
    if (!note) return;
    const markdown = `# ${note.title || 'Untitled'}\n\n${note.content || ''}`;
    navigator.clipboard.writeText(markdown);
    toast.success('Copied as Markdown');
    setOpen(false);
  };

  // Export as markdown file
  const exportAsMarkdown = () => {
    if (!note) return;
    const markdown = `# ${note.title || 'Untitled'}\n\n${note.content || ''}`;
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title || 'untitled'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Exported as Markdown');
    setOpen(false);
  };

  // Export as PDF
  const exportAsPDF = async () => {
    if (!note) return;
    
    // Create a temporary container for rendering
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '210mm'; // A4 width
    tempDiv.style.padding = '20mm';
    tempDiv.style.background = 'white';
    tempDiv.style.color = 'black';
    tempDiv.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    
    // Add styled content
    tempDiv.innerHTML = `
      <style>
        * { box-sizing: border-box; }
        h1 { font-size: 32px; margin-bottom: 8px; color: #111; font-weight: 700; }
        h2 { font-size: 24px; margin-bottom: 8px; margin-top: 20px; color: #333; font-weight: 600; }
        h3 { font-size: 20px; margin-bottom: 6px; margin-top: 16px; color: #444; font-weight: 600; }
        h4 { font-size: 18px; margin-bottom: 6px; margin-top: 14px; color: #555; font-weight: 600; }
        p { font-size: 14px; line-height: 1.6; margin-bottom: 12px; color: #1f2937; }
        ul, ol { margin-bottom: 12px; padding-left: 24px; }
        li { margin-bottom: 4px; font-size: 14px; line-height: 1.5; }
        code { background: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-size: 13px; font-family: monospace; }
        pre { background: #f3f4f6; padding: 12px; border-radius: 4px; overflow-x: auto; margin: 12px 0; }
        pre code { background: none; padding: 0; }
        blockquote { border-left: 4px solid #e5e7eb; padding-left: 16px; color: #6b7280; margin: 16px 0; font-style: italic; }
        hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
        strong { font-weight: 600; }
        em { font-style: italic; }
        a { color: #2563eb; text-decoration: underline; }
        table { border-collapse: collapse; width: 100%; margin: 16px 0; }
        th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 14px; }
        th { background: #f9fafb; font-weight: 600; }
      </style>
      <div style="margin-bottom: 24px;">
        <h1 style="margin-bottom: 4px;">${note.title || 'Untitled'}</h1>
        <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
          Created: ${new Date(note.createdAt).toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          })} • 
          Modified: ${new Date(note.updatedAt).toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          })}
        </p>
      </div>
      <div style="line-height: 1.6;">
        ${note.content || '<p style="color: #9ca3af;">Empty note</p>'}
      </div>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 11px; text-align: center; margin: 0;">
          Created with WebNotes
        </p>
      </div>
    `;
    
    document.body.appendChild(tempDiv);
    
    try {
      // Show loading toast
      toast.loading('Generating PDF...');
      
      // Convert to canvas
      const canvas = await html2canvas(tempDiv, {
        scale: 2, // Higher quality
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: 794, // A4 width in pixels at 96 DPI
      });
      
      // Calculate dimensions
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pageHeight = 297; // A4 height in mm
      
      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      let heightLeft = imgHeight;
      let position = 0;
      
      // Add first page
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        0,
        position,
        imgWidth,
        imgHeight
      );
      heightLeft -= pageHeight;
      
      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(
          canvas.toDataURL('image/png'),
          'PNG',
          0,
          position,
          imgWidth,
          imgHeight
        );
        heightLeft -= pageHeight;
      }
      
      // Download
      const filename = `${note.title || 'untitled'}.pdf`.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      pdf.save(filename);
      
      toast.dismiss();
      toast.success('Exported as PDF');
      setOpen(false);
    } catch (error) {
      console.error('PDF export error:', error);
      toast.dismiss();
      toast.error('Failed to export PDF');
    } finally {
      // Cleanup
      document.body.removeChild(tempDiv);
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
          <Info className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-zinc-900 border-zinc-800" align="end">
        <div className="p-4 space-y-4">
          {/* Title */}
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
            <FileText className="h-4 w-4 text-zinc-400" />
            <h3 className="font-medium text-white">Note Information</h3>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="space-y-1"
            >
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Type className="h-3 w-3" />
                Words
              </div>
              <div className="text-lg font-semibold text-white">
                {stats.words.toLocaleString()}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-1"
            >
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <BookOpen className="h-3 w-3" />
                Reading Time
              </div>
              <div className="text-lg font-semibold text-white">
                {stats.readingTime} min
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="space-y-1"
            >
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Hash className="h-3 w-3" />
                Characters
              </div>
              <div className="text-lg font-semibold text-white">
                {stats.characters.toLocaleString()}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-1"
            >
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <FileText className="h-3 w-3" />
                Lines
              </div>
              <div className="text-lg font-semibold text-white">
                {stats.lines.toLocaleString()}
              </div>
            </motion.div>
          </div>

          {/* Dates */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="space-y-2 pt-2 border-t border-zinc-800"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-zinc-500">
                <Calendar className="h-3 w-3" />
                Created
              </span>
              <span className="text-zinc-300">{formatDate(note.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-zinc-500">
                <Clock className="h-3 w-3" />
                Modified
              </span>
              <span className="text-zinc-300">{formatDate(note.updatedAt)}</span>
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-1 pt-2 border-t border-zinc-800"
          >
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
                className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-zinc-800"
                onClick={() => {
                  onDelete();
                  setOpen(false);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Note
              </Button>
            )}
          </motion.div>
        </div>
      </PopoverContent>
    </Popover>
  );
}