/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    // This is the only line that changes
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
};

export default config;