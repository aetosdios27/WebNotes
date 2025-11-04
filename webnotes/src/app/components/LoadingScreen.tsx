'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  isExtended?: boolean;
}

// Collection of random messages
const EXTENDED_MESSAGES = [
  "hang tight, fetching your notes...",
  "still loading, won't be long...",
  "your notes are on the way...",
  "waking up the database...",
  "almost there, promise...",
  "loading your brilliance...",
  "gathering your thoughts...",
  "this is taking longer than usual...",
  "sorry, still working on it...",
  "patience, young padawan...",
  "convincing the server to cooperate...",
  "untangling some bytes...",
  "just a few more seconds...",
  "loading at the speed of light (almost)...",
  "your notes are being extra slow today...",
];

export default function LoadingScreen({ isExtended = false }: LoadingScreenProps) {
  // Pick a random message when extended loading starts
  const [message] = useState(() => 
    EXTENDED_MESSAGES[Math.floor(Math.random() * EXTENDED_MESSAGES.length)]
  );

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
      className="fixed inset-0 bg-black z-50 flex items-center justify-center"
    >
      <div className="flex flex-col items-center">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-4xl font-bold mb-8 tracking-tight select-none"
        >
          <span className="text-yellow-500">Web</span>
          <span className="text-white">Notes</span>
        </motion.h1>

        <div className="w-48 h-[2px] bg-zinc-800 overflow-hidden rounded-full">
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{
              duration: 2.0,
              ease: [0.4, 0, 0.2, 1],
            }}
            className="h-full bg-white"
          />
        </div>

        {/* Random message if loading is taking longer */}
        {isExtended && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-6 text-sm text-zinc-500"
          >
            {message}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}