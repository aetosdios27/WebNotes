import type { Config } from 'tailwindcss'

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
  plugins: [],
}
export default config