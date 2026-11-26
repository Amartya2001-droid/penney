import { defineConfig } from '@playwright/test';

const remote = process.env.E2E_BASE_URL;
const baseURL = remote ? `${remote.replace(/\/+$/, '')}/` : 'http://127.0.0.1:8765/penney/';
if (!['http:', 'https:'].includes(new URL(baseURL).protocol)) throw new Error('E2E_BASE_URL must be an HTTP(S) URL');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  retries: 0,
  timeout: 45_000,
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results/results.json' }]],
  use: {
    baseURL,
    timezoneId: 'UTC',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: process.env.E2E_CHROMIUM_PATH ? { executablePath: process.env.E2E_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: 'desktop-chromium', use: { browserName: 'chromium', viewport: { width: 1280, height: 900 } } },
    { name: 'mobile-chromium', use: { browserName: 'chromium', viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
  ],
  webServer: remote ? undefined : {
    command: process.env.E2E_SERVE_DIR ? 'node scripts/serve-e2e.mjs' : 'npm run build:e2e && node scripts/serve-e2e.mjs',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
