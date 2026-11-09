import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { CREDENTIALS_AVAILABLE, login } from './helpers'

// FYP II Phase 7: verify the three UI accessibility modes (Standard /
// Low-Sensory / Senior — src/constants/uiModes.js) actually render on
// every page without crashing, and run a real axe-core scan per mode.
// Trilingual (EN/BM/ZH) coverage is NOT included here — no i18n
// infrastructure exists in this app yet (confirmed, see
// docs/ACCESSIBILITY_MODES.md's "cross-cutting" section) — a real, stated
// gap, not faked.

const PAGES = ['/', '/sentiment', '/forecasting', '/crisis-detection', '/recommendations', '/social-intelligence']
const UI_MODES = ['standard', 'low_sensory', 'senior']

async function setUiMode(page, mode) {
  await page.evaluate((m) => window.localStorage.setItem('insightaid.uiMode', m), mode)
  await page.reload()
  await page.waitForLoadState('load')
}

test.describe('UI accessibility modes', () => {
  test.skip(!CREDENTIALS_AVAILABLE, 'No E2E_TEST_EMAIL/E2E_TEST_PASSWORD provided — see e2e/helpers.js')

  test('every mode renders every page without a crash or uncaught error', async ({ page }) => {
    test.setTimeout(120000) // 18 sequential page loads (3 modes x 6 pages) — the 30s default isn't enough
    const loggedIn = await login(page)
    expect(loggedIn, 'Login did not reach an authenticated route').toBe(true)

    for (const mode of UI_MODES) {
      await setUiMode(page, mode)
      for (const route of PAGES) {
        const consoleErrors = []
        page.on('pageerror', (err) => consoleErrors.push(err.message))
        await page.goto(route)
        await page.waitForTimeout(1200)
        const bodyText = await page.locator('body').innerText()
        expect(bodyText.trim().length, `${mode} / ${route} rendered an empty page`).toBeGreaterThan(0)
        expect(consoleErrors, `${mode} / ${route} had uncaught error(s): ${consoleErrors.join('; ')}`).toEqual([])
        page.removeAllListeners('pageerror')
      }
    }
  })

  test('Low-Sensory mode applies its CSS class and overrides the muted text color', async ({ page }) => {
    const loggedIn = await login(page)
    expect(loggedIn).toBe(true)
    await setUiMode(page, 'low_sensory')
    const htmlClass = await page.evaluate(() => document.documentElement.className)
    expect(htmlClass).toContain('ui-low-sensory')
    const slate900 = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-slate-900').trim()
    )
    expect(slate900.toLowerCase()).toBe('#44403c')
  })

  test('Senior mode applies its CSS class, larger base font, and 44px touch targets', async ({ page }) => {
    const loggedIn = await login(page)
    expect(loggedIn).toBe(true)
    await setUiMode(page, 'senior')
    const htmlClass = await page.evaluate(() => document.documentElement.className)
    expect(htmlClass).toContain('ui-senior')
    const fontSize = await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)
    expect(fontSize).toBe('18px')
    const signInButtonBox = await page.locator('button[type="submit"]').first().boundingBox().catch(() => null)
    if (signInButtonBox) {
      expect(signInButtonBox.height).toBeGreaterThanOrEqual(44)
    }
  })

  test('Senior mode shows the real "Apa yang perlu saya buat?" panel on the Dashboard', async ({ page }) => {
    const loggedIn = await login(page)
    expect(loggedIn).toBe(true)
    await setUiMode(page, 'senior')
    await page.goto('/')
    await page.waitForTimeout(1500)
    await expect(page.getByText('Apa yang perlu saya buat?')).toBeVisible()
  })
})

test.describe('axe-core automated accessibility scan', () => {
  test.skip(!CREDENTIALS_AVAILABLE, 'No E2E_TEST_EMAIL/E2E_TEST_PASSWORD provided — see e2e/helpers.js')

  for (const mode of UI_MODES) {
    for (const route of PAGES) {
      test(`${mode} mode, ${route}: zero serious/critical axe-core violations`, async ({ page }) => {
        const loggedIn = await login(page)
        expect(loggedIn).toBe(true)
        await setUiMode(page, mode)
        await page.goto(route)
        await page.waitForTimeout(1200)

        const results = await new AxeBuilder({ page }).include('body').analyze()
        const seriousOrCritical = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')

        if (seriousOrCritical.length > 0) {
          const detail = seriousOrCritical
            .map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} node(s)`)
            .join('\n')
          console.log(`axe-core findings for ${mode} / ${route}:\n${detail}`)
        }
        expect(seriousOrCritical, `Real serious/critical violations on ${mode} / ${route}`).toEqual([])
      })
    }
  }
})
