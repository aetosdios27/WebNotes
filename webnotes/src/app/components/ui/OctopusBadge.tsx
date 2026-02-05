import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { BrandIcon } from "../extensions/codemirror/icons";

interface OctopusBadgeProps {
  lang: string;
  displayName: string;
  color: string;
  isDetecting: boolean;
}

const LOADING_TEXT = "DETECTING"; // Or whatever text you want

export function OctopusBadge({
  lang,
  displayName,
  color,
  isDetecting,
}: OctopusBadgeProps) {
  // Use the processing yellow color during detection, then morph to brand color
  const activeColor = isDetecting ? "#eab308" : color;
  const activeBg = isDetecting ? "rgba(234, 179, 8, 0.1)" : `${color}10`;
  const activeBorder = isDetecting ? "rgba(234, 179, 8, 0.2)" : `${color}20`;

  return (
    <motion.div
      layout
      initial={false}
      animate={{
        backgroundColor: activeBg,
        borderColor: activeBorder,
        color: activeColor,
      }}
      transition={{ duration: 0.5, ease: "easeInOut" }} // Slow, organic morph
      className="flex items-center justify-center px-2.5 py-1 rounded-md border text-[11px] font-bold tracking-wide select-none overflow-hidden relative h-7"
      style={{ minWidth: "80px" }}
    >
      <AnimatePresence mode="wait">
        {isDetecting ? (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            {/* Mini Bloom Loader */}
            <MiniLoader color={activeColor} />
            <span className="uppercase tracking-widest text-[9px]">
              {LOADING_TEXT}
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="flex items-center gap-1.5"
          >
            <BrandIcon lang={lang} className="w-3.5 h-3.5" />
            <span className="uppercase">{displayName}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Mini ASCII Loader (The WebNotes Style)
function MiniLoader({ color }: { color: string }) {
  const [frame, setFrame] = useState(0);
  const chars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((f) => (f + 1) % chars.length);
    }, 80);
    return () => clearInterval(timer);
  }, [chars.length]);

  return (
    <span
      className="font-mono text-xs inline-block w-3 text-center"
      style={{
        textShadow: `0 0 10px ${color}`, // Bloom
      }}
    >
      {chars[frame]}
    </span>
  );
}
