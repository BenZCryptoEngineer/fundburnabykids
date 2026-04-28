import { defineConfig, devices } from '@playwright/test';

// E2E config for the signature form. BASE_URL points at:
//   - http://localhost:8888 when the dev runs `netlify dev` locally
//     (default — netlify dev serves the static build + the submit
//     Function so the full POST → 303 → /confirm-thanks/ chain works).
//   - https://fundburnabykids.ca for a post-deploy production check
//     (writes a real signature row + sends a real email — only run
//     this when you mean to).
//
// Default timeout is generous for cold-start netlify dev.

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:8888';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL,
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Auto-start netlify dev when no server already listens on 8888. Skipped
  // when running against prod (E2E_BASE_URL points elsewhere).
  webServer: baseURL.startsWith('http://localhost:8888')
    ? {
        command: 'npx netlify dev --port 8888 --offline',
        url: 'http://localhost:8888/',
        reuseExistingServer: true,
        timeout: 180_000,
        cwd: '..',
      }
    : undefined,
});
