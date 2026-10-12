import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

// Separate from vite.config.js so the app's dev/build config is never at risk
// of being altered by test-only settings.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    // e2e/**/*.spec.js are Playwright specs (`npm run test:e2e`), not
    // Vitest ones — Playwright's `test`/`test.describe` aren't Vitest's
    // globals, so letting Vitest's default glob pick them up produces
    // confusing failures, not real test results.
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
  },
})
