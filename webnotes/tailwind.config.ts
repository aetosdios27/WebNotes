import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: 'class',
  
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}', // Added components path
  ],
  theme: {
    extend: {
      fontFamily: {
        // Sans: Geist Sans (The "Open Source Söhne")
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui"],
        
        // Serif: Instrument Serif (Elegant, editorial)
        serif: ["var(--font-serif)", "ui-serif", "Georgia"],
        
        // Mono: JetBrains Mono (Tech, ligatures)
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular"],
      },
    },
  },
  plugins: [animate, typography],
};
export default config;