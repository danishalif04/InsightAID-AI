import { expect, test } from '@playwright/test'
import { CREDENTIALS_AVAILABLE, login } from './helpers'

// FYP2.md §75, journey 1:
//   Open Application -> Login -> Switch Business Startup -> E-Commerce ->
//   Open Dashboard -> View Sentiment -> View Forecast -> View Crisis ->
//   View Recommendation
//
// Requires a real, email-confirmed Supabase account (E2E_TEST_EMAIL /
// E2E_TEST_PASSWORD) — see e2e/helpers.js for why this can't be faked.
test.describe('Journey 1 — existing-data walkthrough', () => {
  test.skip(!CREDENTIALS_AVAILABLE, 'No E2E_TEST_EMAIL/E2E_TEST_PASSWORD provided — see e2e/helpers.js')

  // Every analysis page is timed, not just the dashboard, because Objective 3
  // states one response target for the system and reporting a single page
  // would understate the slowest path. Measured from navigation start to
  // network idle, so it includes Supabase queries and rendering.
  //
  // The per-page target is asserted with `expect.soft` on purpose. A hard
  // assertion aborts the test at the first slow page, so the remaining four
  // are never measured — and a run that reports one page cannot produce the
  // per-page median and maximum the measurement protocol requires
  // (results/post_submission_2026-11/PROTOCOL.md, Task 2). Soft assertions
  // still fail the test; they just let every page be measured first.
  const timings = []
  async function openTimed(page, path, label) {
    const start = Date.now()
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    const elapsedMs = Date.now() - start
    timings.push({ label, elapsedMs })
    return elapsedMs
  }

  test.afterAll(() => {
    if (!timings.length) return
    const rows = timings.map((t) => `  ${t.label.padEnd(28)} ${String(t.elapsedMs).padStart(6)} ms`)
    const slowest = timings.reduce((a, b) => (b.elapsedMs > a.elapsedMs ? b : a))
    console.log(
      ['', 'End-to-end response time (navigation start to network idle)', ...rows,
       `  ${'SLOWEST'.padEnd(28)} ${String(slowest.elapsedMs).padStart(6)} ms (${slowest.label})`,
       `  Target < 3000 ms: ${slowest.elapsedMs < 3000 ? 'met' : 'NOT met'}`, ''].join('\n'),
    )
  })

  test('open app, log in, switch mode, and view every core page', async ({ page }) => {
    await test.step('Open Application', async () => {
      await page.goto('/')
      await expect(page).toHaveURL(/\/login/)
    })

    await test.step('Login', async () => {
      const loggedIn = await login(page)
      expect(loggedIn, 'Login did not reach an authenticated route — check credentials/account confirmation status').toBe(true)
    })

    await test.step('Open Dashboard + measure response time (<3s target)', async () => {
      const elapsedMs = await openTimed(page, '/', 'Dashboard')
      await expect(page.getByText('Executive Summary').first()).toBeVisible()
      // Target, not a guaranteed pass/fail gate for the whole suite — logged either way, asserted here.
      expect.soft(elapsedMs, `Dashboard took ${elapsedMs}ms, target is <3000ms`).toBeLessThan(3000)
    })

    await test.step('Switch Business Startup -> E-Commerce', async () => {
      const ecommerceTab = page.getByRole('tab', { name: /E-Commerce/i })
      await ecommerceTab.click()
      await expect(ecommerceTab).toHaveAttribute('aria-selected', 'true')
    })

    await test.step('View Sentiment', async () => {
      const elapsedMs = await openTimed(page, '/sentiment', 'Sentiment Analysis')
      await expect(page.getByRole('heading', { name: 'Sentiment Analysis' })).toBeVisible()
      expect.soft(elapsedMs, `Sentiment Analysis took ${elapsedMs}ms, target is <3000ms`).toBeLessThan(3000)
    })

    await test.step('View Forecast', async () => {
      const elapsedMs = await openTimed(page, '/forecasting', 'Forecasting')
      await expect(page.getByRole('heading', { name: 'Business Forecasting' })).toBeVisible()
      expect.soft(elapsedMs, `Forecasting took ${elapsedMs}ms, target is <3000ms`).toBeLessThan(3000)
    })

    await test.step('View Crisis', async () => {
      const elapsedMs = await openTimed(page, '/crisis-detection', 'Crisis Detection')
      await expect(page.getByRole('heading', { name: 'Crisis Detection Center' })).toBeVisible()
      expect.soft(elapsedMs, `Crisis Detection took ${elapsedMs}ms, target is <3000ms`).toBeLessThan(3000)
    })

    await test.step('View Recommendation', async () => {
      const elapsedMs = await openTimed(page, '/recommendations', 'Recommendations')
      await expect(page.getByRole('heading', { name: 'AI Recommendation Engine' })).toBeVisible()
      expect.soft(elapsedMs, `Recommendations took ${elapsedMs}ms, target is <3000ms`).toBeLessThan(3000)
    })
  })
})
