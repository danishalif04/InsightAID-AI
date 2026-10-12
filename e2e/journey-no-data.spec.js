import { expect, test } from '@playwright/test'
import { CREDENTIALS_AVAILABLE, login } from './helpers'

// FYP2.md §75, journey 2 ("no-data" journey):
//   Start -> Select Business Startup -> Choose "I Don't Have Data Yet" ->
//   Describe Business -> Extract Profile -> Answer Missing Information ->
//   Generate Scenario -> Edit Assumption -> Regenerate Scenario ->
//   Generate Report
//
// Onboarding is behind RequireAuth (same as journey 1) — same credential
// requirement, see e2e/helpers.js.
test.describe('Journey 2 — no-data planning walkthrough', () => {
  test.skip(!CREDENTIALS_AVAILABLE, 'No E2E_TEST_EMAIL/E2E_TEST_PASSWORD provided — see e2e/helpers.js')

  test('describe a business, extract a profile, generate and edit a scenario, generate a report', async ({ page }) => {
    await test.step('Start + Login', async () => {
      const loggedIn = await login(page)
      expect(loggedIn, 'Login did not reach an authenticated route').toBe(true)
    })

    await test.step('Select Business Startup mode', async () => {
      await page.goto('/')
      const startupTab = page.getByRole('tab', { name: /^Startup$/i })
      if ((await startupTab.count()) > 0) await startupTab.click()
    })

    await test.step('Go to Onboarding, choose "I don\'t have data yet"', async () => {
      await page.goto('/onboarding')
      const noDataButton = page.getByRole('button', { name: /I don.t have data yet/i })
      // Existing-profile users skip straight to the profile step — only click when the choice screen shows.
      if ((await noDataButton.count()) > 0) await noDataButton.click()
    })

    await test.step('Describe Business + Extract Profile', async () => {
      const textarea = page.locator('textarea')
      if ((await textarea.count()) > 0) {
        await textarea.fill(
          'I want to start a small Malaysian skincare business selling affordable products through TikTok Shop and Shopee, targeting university students, selling at RM35 with 100 expected monthly units.'
        )
        await page.getByRole('button', { name: /Extract with AI/i }).click()
        // Gemini may be unconfigured (real possible outcome) — either way the
        // app must land on the profile step, per businessProfileService.js's
        // documented fallback contract.
        await page.waitForTimeout(2000)
      }
    })

    await test.step('Answer Missing Information', async () => {
      const textInputs = page.locator('input[type="text"], input:not([type])')
      const count = await textInputs.count()
      for (let i = 0; i < Math.min(count, 3); i++) {
        const input = textInputs.nth(i)
        if ((await input.inputValue()) === '') await input.fill('Test value')
      }
      await page.getByRole('button', { name: /Save Business Profile/i }).click()
      await page.waitForLoadState('networkidle')
    })

    await test.step('Generate Scenario (renders on save, for the no-data path)', async () => {
      await expect(page.getByText('Scenario Projection', { exact: false })).toBeVisible()
    })

    await test.step('Edit Assumption', async () => {
      const assumptionsCard = page.locator('text=Your Assumptions').locator('..').locator('..')
      const firstInput = assumptionsCard.locator('input').first()
      await firstInput.fill('50')
    })

    await test.step('Regenerate Scenario', async () => {
      await page.getByRole('button', { name: /Recalculate/i }).click()
      await page.waitForTimeout(500)
    })

    await test.step('Generate Report', async () => {
      await page.goto('/reports')
      const card = page.locator('text=Business Planning Report').locator('..')
      await card.getByRole('button', { name: 'Generate' }).click()
      await expect(page.getByText('Executive Summary').first()).toBeVisible({ timeout: 15000 })
    })
  })
})
