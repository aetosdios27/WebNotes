'use client';

import { Moon, Sun } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { useEffect, useState } from 'react';

export default function ThemeToggle({ isOpen }: { isOpen: boolean }) {
  // Use system preference by default
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else if (systemPrefersDark) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <Button
      variant="ghost"
      size={isOpen ? "default" : "icon"}
      onClick={toggleTheme}
      className={`
        w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors
        ${!isOpen && 'justify-center px-0'}
      `}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      {isOpen && <span className="ml-2">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
    </Button>
  );
}