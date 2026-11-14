import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    server: { deps: { inline: ['@scritto/react', '@scritto/core'] } },
    environment: 'happy-dom', // 👈 This provides the 'window' object
  },
});