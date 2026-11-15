import { defineConfig } from '@playwright/test';

// UI_PORT lets parallel checkouts run the gate without reusing each other's server.
const port = process.env.UI_PORT || '3100';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // CI runs one project per job on a 4-core runner, so both get four workers.
  workers: 4,
  // A broken shell fails every test at the 60s timeout; stop early instead of running out the job.
  maxFailures: process.env.CI ? 4 : 0,
  // One retry absorbs a cold start; Playwright still reports the test as flaky.
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 5_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  // A single stuck action fails in 15s and retries, rather than using up the whole test timeout.
  use: { actionTimeout: 15_000, baseURL: `http://127.0.0.1:${port}`, browserName: 'chromium', screenshot: 'only-on-failure', trace: 'retain-on-failure', reducedMotion: 'reduce' },
  projects: ['light', 'dark'].flatMap(theme => [1280, 390].map(width => ({
    name: `${theme}-${width}`, use: { viewport: { width, height: width === 390 ? 844 : 800 } },
  }))),
  webServer: {
    command: `bun run build && bun run start -- --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    env: { DIRECT_DATABASE_URL: 'postgresql://u', DATABASE_URL: 'postgresql://u', AUTH_SECRET: 'x' },
  },
});
