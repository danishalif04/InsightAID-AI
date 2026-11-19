import { defineConfig, devices } from '@playwright/test'

// Separate from vite.config.js/vitest.config.js — E2E has its own concerns
// (a running server, a real browser) that unit tests don't.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // When E2E_BASE_URL is set, the caller is already serving the app — the
  // timing protocol serves a PRODUCTION build (`npm run build` +
  // `npm run preview`, port 4173). Booting the dev server anyway would
  // both ignore that build and burn CPU alongside the measurement, so the
  // managed server is skipped entirely in that case.
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30000,
  },
})
