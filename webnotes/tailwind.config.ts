import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'
import animate from 'tailwindcss-animate'

const config: Config = {
  // This is the most critical line.
  darkMode: 'class', 
  
  // These paths tell Tailwind where to find your classes.
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [animate, typography],
}
export default config