'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { renderLatex, applyMathShortcuts } from './MathUtils';

interface MathInputProps {
  initialLatex: string;
  displayMode: boolean;
  onSave: (latex: string) => void;
  onCancel: () => void;
  autoFocus?: boolean;
}

export function MathInput({ 
  initialLatex, 
  displayMode, 
  onSave, 
  onCancel,
  autoFocus = true 
}: MathInputProps) {
  const [latex, setLatex] = useState(initialLatex);
  const [preview, setPreview] = useState<{ html: string; error: string | null }>({ html: '', error: null });
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Render preview
  useEffect(() => {
    const result = renderLatex(latex, displayMode);
    setPreview(result);
  }, [latex, displayMode]);

  // Auto-focus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      // Move cursor to end
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
    }
  }, [autoFocus]);

  // Handle input with shortcuts
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    // Check if we should apply shortcuts (space or special char pressed)
    const lastChar = value[cursorPos - 1];
    if (lastChar === ' ' || lastChar === '{' || lastChar === '}') {
      const beforeCursor = value.slice(0, cursorPos - 1);
      const afterCursor = value.slice(cursorPos);
      const converted = applyMathShortcuts(beforeCursor);
      
      if (converted !== beforeCursor) {
        const newValue = converted + lastChar + afterCursor;
        setLatex(newValue);
        
        // Restore cursor position
        setTimeout(() => {
          if (inputRef.current) {
            const newPos = converted.length + 1;
            inputRef.current.setSelectionRange(newPos, newPos);
          }
        }, 0);
        return;
      }
    }
    
    setLatex(value);
  }, []);

  // Handle keyboard
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Cmd/Ctrl + Enter to save
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSave(latex);
      return;
    }
    
    // Escape to cancel
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
      return;
    }
    
    // For inline, Enter also saves
    if (!displayMode && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSave(latex);
      return;
    }
    
    // Tab for auto-complete brackets
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = inputRef.current;
      if (!textarea) return;
      
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      // Find next {} or () and move cursor inside
      const afterCursor = latex.slice(start);
      const bracketMatch = afterCursor.match(/^[^{}()]*([{}()])/);
      
      if (bracketMatch) {
        const newPos = start + bracketMatch[0].length;
        setTimeout(() => {
          textarea.setSelectionRange(newPos, newPos);
        }, 0);
      }
    }
  }, [latex, displayMode, onSave, onCancel]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
    }
  }, [latex]);

  if (displayMode) {
    // Block math editor
    return (
      <div className="math-block-editor my-4 rounded-lg border border-yellow-500/50 bg-zinc-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-800/80 border-b border-zinc-700">
          <div className="flex items-center gap-2">
            <span className="text-yellow-500 font-mono text-sm">$$</span>
            <span className="text-zinc-400 text-xs">Block Equation</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span>⌘↵ save</span>
            <span>esc cancel</span>
          </div>
        </div>
        
        {/* Editor */}
        <div className="p-3">
          <textarea
            ref={inputRef}
            value={latex}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="\sum_{i=1}^{n} x_i"
            className="w-full bg-zinc-800 text-zinc-200 font-mono text-sm p-3 rounded border border-zinc-700 focus:border-yellow-500/50 focus:outline-none focus:ring-1 focus:ring-yellow-500/30 resize-none min-h-[60px]"
            rows={2}
            spellCheck={false}
          />
        </div>
        
        {/* Preview */}
        <div className="px-3 pb-3">
          <div className="text-xs text-zinc-500 mb-2 flex items-center justify-between">
            <span>Preview</span>
            {preview.error && (
              <span className="text-red-400">{preview.error}</span>
            )}
          </div>
          <div 
            className={`p-4 bg-black/50 rounded border min-h-[60px] flex items-center justify-center ${
              preview.error ? 'border-red-500/30' : 'border-zinc-800'
            }`}
          >
            {preview.html ? (
              <div 
                className="text-lg"
                dangerouslySetInnerHTML={{ __html: preview.html }}
              />
            ) : (
              <span className="text-zinc-600 italic">Type LaTeX above...</span>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex justify-end gap-2 px-3 pb-3">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(latex)}
            className="px-4 py-1.5 text-sm bg-yellow-500 hover:bg-yellow-400 text-black font-medium rounded transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // Inline math editor
  return (
    <span className="math-inline-editor inline-flex items-center gap-1 bg-zinc-800 border border-yellow-500/50 rounded px-1 py-0.5">
      <span className="text-yellow-500 text-xs font-mono select-none">$</span>
      <textarea
        ref={inputRef}
        value={latex}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => onSave(latex)}
        placeholder="x^2"
        className="bg-transparent text-zinc-200 font-mono text-sm outline-none resize-none leading-tight min-w-[40px] max-w-[400px]"
        rows={1}
        style={{ 
          width: `${Math.max(40, Math.min(400, latex.length * 8 + 20))}px`,
          height: '1.5em',
        }}
        spellCheck={false}
      />
      <span className="text-yellow-500 text-xs font-mono select-none">$</span>
      
      {/* Live preview tooltip */}
      {latex.trim() && (
        <span className="ml-1 px-2 py-0.5 bg-black/80 rounded text-xs border border-zinc-700">
          {preview.error ? (
            <span className="text-red-400">{preview.error}</span>
          ) : (
            <span dangerouslySetInnerHTML={{ __html: preview.html }} />
          )}
        </span>
      )}
    </span>
  );
}