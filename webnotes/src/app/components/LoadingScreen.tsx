"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const LOADING_MESSAGES = [
  "loading notes...",
  "syncing workspace...",
  "restoring session...",
  "preparing editor...",
  "almost ready...",
];

export default function LoadingScreen() {
  const [showMessage, setShowMessage] = useState(false);
  const [message] = useState(
    () => LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]
  );
  const [pattern, setPattern] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPattern((p) => p + 1);
    }, 83); // ~12fps like Spider-Verse's animation on twos (24fps film / 2)
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowMessage(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // More dynamic patterns for that comic book snap
  const PATTERNS = [
    [1, 1, 1, 0, 0, 0, 0, 0, 0], // Swipe top
    [0, 1, 1, 0, 0, 1, 0, 0, 0], // Diagonal swipe
    [0, 0, 1, 0, 0, 1, 0, 0, 1], // Diagonal complete
    [0, 0, 0, 0, 1, 1, 0, 1, 1], // Bottom right form
    [0, 0, 0, 1, 1, 1, 1, 1, 1], // Bottom heavy
    [0, 1, 0, 1, 1, 1, 0, 1, 0], // Plus explode
    [1, 1, 1, 1, 0, 1, 1, 1, 1], // Ring
    [1, 0, 1, 0, 0, 0, 1, 0, 1], // Corners snap
    [1, 0, 1, 0, 1, 0, 1, 0, 1], // X
    [0, 1, 0, 0, 1, 0, 0, 1, 0], // Vertical slash
    [0, 0, 0, 1, 1, 1, 0, 0, 0], // Horizontal slash
    [1, 0, 0, 0, 1, 0, 0, 0, 1], // Diagonal slash
  ];

  const currentGrid = PATTERNS[pattern % PATTERNS.length];

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(4px)" }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="fixed inset-0 bg-[#000000] z-50 flex items-center justify-center font-mono"
    >
      <div className="flex flex-col items-center justify-center gap-8 w-full h-full">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="text-4xl font-bold tracking-tighter select-none text-center"
        >
          <span className="text-yellow-500">Web</span>
          <span className="text-zinc-700">Notes</span>
        </motion.div>

        {/* THE SENTIENT BLOCK */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="relative flex items-center justify-center"
        >
          {/* Subtle ambient glow */}
          <div className="absolute inset-0 bg-yellow-500/5 blur-xl rounded-full" />

          <div className="grid grid-cols-3 gap-0.5 p-0.5 relative z-10">
            {currentGrid.map((active, i) => (
              <div
                key={i}
                className={`w-2 h-2 transition-none ${
                  active
                    ? "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.7)]"
                    : "bg-zinc-900/50"
                }`}
              />
            ))}
          </div>
        </motion.div>

        <div className="h-4 flex items-center justify-center text-center w-full">
          {showMessage && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="text-[10px] text-zinc-700 uppercase tracking-[0.3em] font-medium"
            >
              {message}
            </motion.p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
