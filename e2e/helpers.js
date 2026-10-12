/**
 * Shared E2E helpers (FYP2.md §75).
 *
 * Both journeys below require a signed-in session, and RequireAuth
 * (src/routes/RequireAuth.jsx) has no test bypass — by design, adding one
 * would be a real security hole, not a testing convenience. So these tests
 * read real credentials from the environment (never hardcoded) and
 * `test.skip()` honestly when none are available, rather than faking a
 * session or failing in a confusing way. Provide E2E_TEST_EMAIL /
 * E2E_TEST_PASSWORD for a real, email-confirmed Supabase account to run
 * the authenticated parts of this suite.
 */
export const TEST_EMAIL = process.env.E2E_TEST_EMAIL
export const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD

export const CREDENTIALS_AVAILABLE = Boolean(TEST_EMAIL && TEST_PASSWORD)

/** Attempts a real login. Returns true if it actually reached an
 * authenticated route, false otherwise (wrong credentials, unconfirmed
 * email, network failure — all real possible outcomes, not distinguished
 * here; callers that care about *why* should assert on the page content
 * themselves). */
export async function login(page) {
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(TEST_EMAIL)
  await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.waitForLoadState('networkidle')
  return !page.url().includes('/login')
}
