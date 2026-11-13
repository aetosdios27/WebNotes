"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "./ui/button";
export default function ThemeToggle({ isOpen }: { isOpen: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size={isOpen ? "default" : "icon"}
      aria-label={dark ? "Use light theme" : "Use dark theme"}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className={`w-full text-muted hover:text-ink hover:bg-selected ${isOpen ? "justify-start" : "justify-center px-0"}`}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
      {isOpen && (
        <span className="ml-2">{dark ? "Light mode" : "Dark mode"}</span>
      )}
    </Button>
  );
}
