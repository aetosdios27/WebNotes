import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  // One retry absorbs a cold start; Playwright still reports the test as flaky.
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 5_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:3100', browserName: 'chromium', screenshot: 'only-on-failure', trace: 'retain-on-failure', reducedMotion: 'reduce' },
  projects: ['light', 'dark'].flatMap(theme => [1280, 390].map(width => ({
    name: `${theme}-${width}`, use: { viewport: { width, height: width === 390 ? 844 : 800 } },
  }))),
  webServer: {
    command: 'bun run build && bun run start -- --port 3100',
    url: 'http://127.0.0.1:3100',
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    env: { DIRECT_DATABASE_URL: 'postgresql://u', DATABASE_URL: 'postgresql://u', AUTH_SECRET: 'x' },
  },
});
