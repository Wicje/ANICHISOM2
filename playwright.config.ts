import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

const systemChromium = existsSync('/usr/bin/chromium')
  ? '/usr/bin/chromium'
  : undefined;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Fall back to the system browser when Playwright's is not downloaded
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || systemChromium,
          // Container-safe defaults; avoids tab crashes on small /dev/shm
          args: ['--disable-dev-shm-usage', '--no-sandbox'],
        },
      },
    },
  ],
  webServer: {
    // Production server by default (no HMR races); PW_DEV=1 opts into dev.
    command: process.env.PW_DEV ? 'npm run dev' : 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 600_000,
    env: {
      ...process.env,
      RATE_LIMIT_DISABLED: process.env.RATE_LIMIT_DISABLED ?? '1',
    },
  },
});
