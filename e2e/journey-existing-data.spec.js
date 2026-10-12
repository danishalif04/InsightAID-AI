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
      const start = Date.now()
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      const elapsedMs = Date.now() - start
      console.log(`Dashboard load (nav start -> network idle): ${elapsedMs}ms`)
      expect(page.getByText('Executive Summary').first()).toBeTruthy()
      // Target, not a guaranteed pass/fail gate for the whole suite — logged either way, asserted here.
      expect(elapsedMs, `Dashboard took ${elapsedMs}ms, target is <3000ms`).toBeLessThan(3000)
    })

    await test.step('Switch Business Startup -> E-Commerce', async () => {
      const ecommerceTab = page.getByRole('tab', { name: /E-Commerce/i })
      await ecommerceTab.click()
      await expect(ecommerceTab).toHaveAttribute('aria-selected', 'true')
    })

    await test.step('View Sentiment', async () => {
      await page.goto('/sentiment')
      await expect(page.getByRole('heading', { name: 'Sentiment Analysis' })).toBeVisible()
    })

    await test.step('View Forecast', async () => {
      await page.goto('/forecasting')
      await expect(page.getByRole('heading', { name: 'Business Forecasting' })).toBeVisible()
    })

    await test.step('View Crisis', async () => {
      await page.goto('/crisis-detection')
      await expect(page.getByRole('heading', { name: 'Crisis Detection Center' })).toBeVisible()
    })

    await test.step('View Recommendation', async () => {
      await page.goto('/recommendations')
      await expect(page.getByRole('heading', { name: 'AI Recommendation Engine' })).toBeVisible()
    })
  })
})
