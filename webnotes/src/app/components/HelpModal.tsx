'use client';

import { useState, useEffect } from 'react';
import { Search, Command, Keyboard, Calculator } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogDescription 
} from '@/app/components/ui/dialog';
import katex from 'katex';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<'shortcuts' | 'math'>('math');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const RenderMath = ({ latex }: { latex: string }) => {
    try {
      const html = katex.renderToString(latex, { throwOnError: false });
      return <span dangerouslySetInnerHTML={{ __html: html }} />;
    } catch {
      return <span>{latex}</span>;
    }
  };

  const filteredMath = mathReference.filter(item => 
    item.label.toLowerCase().includes(search.toLowerCase()) || 
    item.cmd.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  const filteredShortcuts = appShortcuts.filter(item => 
    item.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] bg-zinc-950 border-zinc-800 p-0 overflow-hidden flex flex-col">
        {/* Accessibility: Hidden Title and Description */}
        <DialogTitle className="sr-only">Help & Shortcuts</DialogTitle>
        <DialogDescription className="sr-only">
          Reference guide for keyboard shortcuts and LaTeX math commands.
        </DialogDescription>

        <div className="p-4 border-b border-zinc-800 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search commands (e.g. 'matrix', 'save', 'integral')..." 
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md py-2 pl-10 pr-4 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          {/* Spacer to keep input away from the absolute positioned close button */}
          <div className="w-8" />
        </div>

        <div className="flex border-b border-zinc-800 bg-zinc-900/50">
          <button
            onClick={() => setActiveTab('math')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'math' 
                ? 'border-yellow-500 text-yellow-500' 
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Calculator className="w-4 h-4" />
            Math & LaTeX
          </button>
          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'shortcuts' 
                ? 'border-yellow-500 text-yellow-500' 
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            Keyboard Shortcuts
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'shortcuts' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              {Object.entries(groupBy(filteredShortcuts, 'category')).map(([category, items]) => (
                <div key={category}>
                  <h3 className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-4">{category}</h3>
                  <div className="space-y-3">
                    {items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between group">
                        <span className="text-zinc-300 text-sm group-hover:text-white transition-colors">{item.label}</span>
                        <div className="flex gap-1">
                          {item.keys.map((key, k) => (
                            <kbd key={k} className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-400 min-w-[24px] text-center">
                              {key}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Math Typing Hints Section */}
              <div className="bg-blue-900/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                <h4 className="text-blue-400 text-sm font-semibold mb-2 flex items-center gap-2">
                  <Command className="w-4 h-4" /> Pro Tip: Speed Typing
                </h4>
                <p className="text-zinc-400 text-sm mb-2">
                  You don&apos;t always need slash commands! Try these auto-replacements inside any math block:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-mono text-zinc-300">
                  <div>Type <span className="text-yellow-500">{'//'}</span> → <RenderMath latex="\frac{a}{b}" /></div>
                  <div>Type <span className="text-yellow-500">alpha</span> → <RenderMath latex="\alpha" /></div>
                  <div>Type <span className="text-yellow-500">sum</span> → <RenderMath latex="\sum" /></div>
                  <div>Type <span className="text-yellow-500">-{'>'}</span> → <RenderMath latex="\rightarrow" /></div>
                </div>
              </div>

              {Object.entries(groupBy(filteredMath, 'category')).map(([category, items]) => (
                <div key={category}>
                  <h3 className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-4 sticky top-0 bg-zinc-950 py-2 z-10">
                    {category}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((item, i) => (
                      <div key={i} className="bg-zinc-900/50 border border-zinc-800/50 rounded p-3 flex flex-col gap-2 hover:border-zinc-700 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400 text-xs font-medium">{item.label}</span>
                          <code className="text-yellow-500/80 text-xs bg-zinc-900 px-1.5 py-0.5 rounded">
                            {item.cmd}
                          </code>
                        </div>
                        <div className="flex items-center justify-center h-12 bg-zinc-950/50 rounded border border-zinc-900">
                          <div className="scale-90 origin-center">
                            <RenderMath latex={item.preview} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helpers & Data
function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, currentValue) => {
    (result[currentValue[key] as string] = result[currentValue[key] as string] || []).push(currentValue);
    return result;
  }, {} as Record<string, T[]>);
}

const appShortcuts = [
  { category: 'General', label: 'Command Palette', keys: ['⌘', 'K'] },
  { category: 'General', label: 'New Note', keys: ['⌘', 'E'] },
  { category: 'General', label: 'New Folder', keys: ['⌘', '⇧', 'F'] },
  { category: 'General', label: 'Toggle Sidebar', keys: ['⌘', '\\'] },
  { category: 'General', label: 'Open This Guide', keys: ['⌘', '/'] },
  { category: 'Editor', label: 'Inline Math', keys: ['⌘', 'M'] },
  { category: 'Editor', label: 'Block Math', keys: ['⌘', '⇧', 'M'] },
  { category: 'Editor', label: 'Save', keys: ['⌘', 'S'] },
  { category: 'Formatting', label: 'Bold', keys: ['⌘', 'B'] },
  { category: 'Formatting', label: 'Italic', keys: ['⌘', 'I'] },
];

const mathReference = [
  // Basic
  { category: 'Basic', label: 'Inline Equation', cmd: '/math', preview: 'x^2' },
  { category: 'Basic', label: 'Block Equation', cmd: '/block', preview: '\\sum_{i=0}^n x_i' },
  { category: 'Basic', label: 'Fraction', cmd: '/fraction', preview: '\\frac{a}{b}' },
  { category: 'Basic', label: 'Square Root', cmd: '/sqrt', preview: '\\sqrt{x}' },
  { category: 'Basic', label: 'Subscript', cmd: '/subscript', preview: 'x_i' },
  { category: 'Basic', label: 'Superscript', cmd: '/superscript', preview: 'x^n' },
  { category: 'Basic', label: 'Infinity', cmd: '/infinity', preview: '\\infty' },

  // Calculus
  { category: 'Calculus', label: 'Integral', cmd: '/integral', preview: '\\int_a^b x dx' },
  { category: 'Calculus', label: 'Summation', cmd: '/sum', preview: '\\sum' },
  { category: 'Calculus', label: 'Limit', cmd: '/limit', preview: '\\lim_{x \\to 0}' },
  { category: 'Calculus', label: 'Derivative', cmd: '/derivative', preview: '\\frac{d}{dx}' },
  { category: 'Calculus', label: 'Partial', cmd: '/partial', preview: '\\frac{\\partial}{\\partial x}' },
  { category: 'Calculus', label: 'Gradient', cmd: '/gradient', preview: '\\nabla f' },

  // Linear Algebra
  { category: 'Linear Algebra', label: 'Matrix', cmd: '/matrix', preview: '\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}' },
  { category: 'Linear Algebra', label: 'Vector', cmd: '/vector', preview: '\\begin{pmatrix}x\\\\y\\end{pmatrix}' },
  { category: 'Linear Algebra', label: 'Norm', cmd: '/norm', preview: '\\|x\\|' },

  // Stats & ML
  { category: 'Statistics & ML', label: 'Expectation', cmd: '/expectation', preview: '\\mathbb{E}[X]' },
  { category: 'Statistics & ML', label: 'Variance', cmd: '/variance', preview: '\\text{Var}(X)' },
  { category: 'Statistics & ML', label: 'Normal Dist', cmd: '/normal', preview: '\\mathcal{N}(\\mu, \\sigma)' },
  { category: 'Statistics & ML', label: 'Sigmoid', cmd: '/sigmoid', preview: '\\sigma(z)' },
  { category: 'Statistics & ML', label: 'Loss Function', cmd: '/cross', preview: 'L(\\theta)' },

  // Sets & Logic
  { category: 'Sets & Logic', label: 'Union', cmd: '/union', preview: 'A \\cup B' },
  { category: 'Sets & Logic', label: 'Intersection', cmd: '/intersection', preview: 'A \\cap B' },
  { category: 'Sets & Logic', label: 'For All', cmd: '/forall', preview: '\\forall x' },
  { category: 'Sets & Logic', label: 'Exists', cmd: '/exists', preview: '\\exists y' },
  { category: 'Sets & Logic', label: 'Implies', cmd: '/implies', preview: 'P \\Rightarrow Q' },
];