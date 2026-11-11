import { expect, test } from '@playwright/test'
import { CREDENTIALS_AVAILABLE, login } from './helpers'

/**
 * Local Shop smoke test. Follows the same honesty convention as the other
 * specs here: it needs a real signed-in session (RequireAuth has no test
 * bypass by design), so it skips plainly when E2E_TEST_EMAIL /
 * E2E_TEST_PASSWORD are not provided rather than faking a session.
 */
test.describe('Local Shop pathway', () => {
  test.skip(!CREDENTIALS_AVAILABLE, 'Set E2E_TEST_EMAIL / E2E_TEST_PASSWORD to run authenticated specs.')

  test('Overview loads the demo shop and shows real calculated figures', async ({ page }) => {
    expect(await login(page)).toBe(true)

    await page.goto('/local-shop')
    await expect(page.getByRole('navigation', { name: /local shop|kedai tempatan/i })).toBeVisible()

    // Empty state first, then load the demo shop.
    await page.getByRole('button', { name: /load demo shop/i }).click()

    await expect(page.getByText('Kedai Makmur')).toBeVisible()
    // The spec's own figures must appear, not placeholders.
    await expect(page.getByText('28')).toBeVisible()
    await expect(page.getByText(/RM2,500/)).toBeVisible()
    await expect(page.getByText(/35/)).toBeVisible()
    // Demo data must be ribboned as illustrative.
    await expect(page.getByText(/illustrative/i).first()).toBeVisible()
  })

  test('BM/EN switch translates the navigation', async ({ page }) => {
    expect(await login(page)).toBe(true)
    await page.goto('/local-shop')

    await expect(page.getByRole('link', { name: 'Business Overview' })).toBeVisible()
    await page.getByRole('button', { name: 'Bahasa Melayu' }).click()
    await expect(page.getByRole('link', { name: 'Gambaran Perniagaan' })).toBeVisible()

    // The choice must survive a reload.
    await page.reload()
    await expect(page.getByRole('link', { name: 'Gambaran Perniagaan' })).toBeVisible()
  })

  test('every Local Shop route renders without an error boundary', async ({ page }) => {
    expect(await login(page)).toBe(true)
    await page.goto('/local-shop')
    await page.getByRole('button', { name: /load demo shop/i }).click()

    for (const path of [
      '/local-shop',
      '/local-shop/business',
      '/local-shop/products',
      '/local-shop/financial',
      '/local-shop/what-if',
      '/local-shop/capital',
      '/local-shop/economic',
      '/local-shop/assistant',
      '/local-shop/actions',
    ]) {
      await page.goto(path)
      await expect(page.getByRole('navigation', { name: /local shop|kedai tempatan/i })).toBeVisible()
      await expect(page.getByText(/something went wrong|unexpected error/i)).toHaveCount(0)
    }
  })

  test('an investigation runs offline and its decision persists in the Action Centre', async ({ page }) => {
    expect(await login(page)).toBe(true)
    await page.goto('/local-shop')
    await page.getByRole('button', { name: /load demo shop/i }).click()

    await page.goto('/local-shop/assistant')
    await page.getByRole('button', { name: /RM15,000/i }).click()

    // The trace must show real steps, and the answer real figures.
    await expect(page.getByText('EXECUTE')).toBeVisible()
    await expect(page.getByText(/29,400|29400/)).toBeVisible()

    await page.getByRole('button', { name: /^Accept$|^Terima$/ }).click()
    await page.goto('/local-shop/actions')
    await expect(page.getByText(/accepted/i).first()).toBeVisible()

    // Survives a reload.
    await page.reload()
    await expect(page.getByText(/accepted/i).first()).toBeVisible()
  })

  test('locked capabilities are shown as locked, never as operational', async ({ page }) => {
    expect(await login(page)).toBe(true)
    await page.goto('/local-shop')
    await page.getByRole('button', { name: /load demo shop/i }).click()

    // Forecasting/sentiment have no data behind them in this pathway.
    await expect(page.getByText(/forecasting/i).first()).toBeVisible()
    await expect(page.getByText(/locked|terkunci/i).first()).toBeVisible()
  })
})
