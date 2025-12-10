import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'
import animate from 'tailwindcss-animate'

const config: Config = {
  // Reverting to class based, but without the theme extensions
  darkMode: 'class', 
  
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {}, // Clean slate
  },
  plugins: [animate, typography],
}
export default config