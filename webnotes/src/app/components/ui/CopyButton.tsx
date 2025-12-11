'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy } from 'lucide-react';

interface CopyButtonProps {
  value: string;
  className?: string;
}

export function CopyButton({ value, className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      // Faster reset (1 second instead of 2)
      setTimeout(() => setCopied(false), 1000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <button
      onClick={onCopy}
      className={`
        flex items-center justify-center
        h-7 w-7 rounded-md transition-colors duration-200
        bg-zinc-800/80 hover:bg-zinc-700 
        border border-zinc-700/50 hover:border-zinc-600
        backdrop-blur-sm
        ${className}
      `}
      aria-label="Copy to clipboard"
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.div
            key="check"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-green-400"
            >
              <motion.path
                d="M4 12L9 17L20 6" 
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                // Faster drawing (0.2s)
                transition={{ duration: 0.2, ease: "easeOut" }}
              />
            </svg>
          </motion.div>
        ) : (
          <motion.div
            key="copy"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            <Copy className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}