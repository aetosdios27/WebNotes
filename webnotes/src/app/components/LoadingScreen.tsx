"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const LOADING_MESSAGES = [
  "hang tight, fetching your notes...",
  "your notes are on the way...",
  "gathering your thoughts...",
  "loading your brilliance...",
  "almost there...",
];

export default function LoadingScreen() {
  const [showMessage, setShowMessage] = useState(false);
  const [message] = useState(
    () => LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]
  );

  // Only show message if loading takes longer than 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowMessage(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed inset-0 bg-black z-50 flex items-center justify-center"
    >
      <div className="flex flex-col items-center">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-4xl font-bold mb-8 tracking-tight select-none"
        >
          <span className="text-yellow-500">Web</span>
          <span className="text-white">Notes</span>
        </motion.h1>

        {/* Simple spinner instead of fake progress bar */}
        <div className="relative w-8 h-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-zinc-700 border-t-yellow-500 rounded-full"
          />
        </div>

        {/* Message only appears after 2 seconds */}
        {showMessage && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-6 text-sm text-zinc-500"
          >
            {message}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
