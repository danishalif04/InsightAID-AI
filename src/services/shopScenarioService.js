import { supabase } from '@/config/supabaseClient'
import { validateShopScenario } from '@/utils/shopScenarioSchema'

/**
 * Generates a Local Shop scenario from the owner's three onboarding answers.
 *
 * All Supabase access for this feature lives here (CLAUDE.md: "Supabase
 * access only through src/services/*Service.js"), so components call this
 * and never `supabase.functions.invoke` directly.
 *
 * Never throws and never returns a raw error object. Every failure comes
 * back as `{ ok: false, reason, message }` with a `reason` the UI can map to
 * its own wording — a scenario that half-renders across five pages is worse
 * than an honest failure message.
 */

/** Stable failure codes. The UI switches on these, not on message text. */
export const SCENARIO_ERRORS = Object.freeze({
  INVALID_INPUT: 'INVALID_INPUT',
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  UPSTREAM: 'UPSTREAM',
  MALFORMED: 'MALFORMED',
  REJECTED: 'REJECTED',
  UNKNOWN: 'UNKNOWN',
})

function failure(reason, message, extra = {}) {
  return { ok: false, reason, message, ...extra }
}

/**
 * @param {{sector?: string, revenueTarget?: number|string|null, description: string}} profile
 * @returns {Promise<{ok: true, shop: object, warnings: string[]} | {ok: false, reason: string, message: string, errors?: string[]}>}
 */
export async function generateShopScenario(profile) {
  const description = typeof profile?.description === 'string' ? profile.description.trim() : ''
  if (!description) {
    return failure(SCENARIO_ERRORS.INVALID_INPUT, 'Describe your business first so the scenario has something to work from.')
  }

  const sector = typeof profile?.sector === 'string' ? profile.sector.trim() : ''

  // Accepts the raw form string as well as a number, so callers do not each
  // reimplement the parse. An unparseable value is rejected here rather than
  // silently sent as NaN.
  let revenueTarget = null
  if (profile?.revenueTarget !== undefined && profile?.revenueTarget !== null && profile?.revenueTarget !== '') {
    const parsed = Number(profile.revenueTarget)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return failure(SCENARIO_ERRORS.INVALID_INPUT, 'Revenue target must be a positive number.')
    }
    revenueTarget = parsed
  }

  let data
  let error
  try {
    ;({ data, error } = await supabase.functions.invoke('generate-shop-scenario', {
      body: { sector, revenueTarget, description },
    }))
  } catch (caught) {
    return failure(SCENARIO_ERRORS.UNKNOWN, `Could not reach the scenario service: ${String(caught)}`)
  }

  if (error) {
    return failure(SCENARIO_ERRORS.UPSTREAM, 'The scenario service could not be reached. Check your connection and try again.')
  }

  if (data?.error) {
    const reason = data.error === 'NOT_CONFIGURED'
      ? SCENARIO_ERRORS.NOT_CONFIGURED
      : data.error === 'INVALID_REQUEST'
        ? SCENARIO_ERRORS.INVALID_INPUT
        : data.error === 'UPSTREAM_MALFORMED'
          ? SCENARIO_ERRORS.MALFORMED
          : SCENARIO_ERRORS.UPSTREAM
    const message = reason === SCENARIO_ERRORS.NOT_CONFIGURED
      ? 'The AI provider is not configured for this project yet.'
      : data.message || 'The scenario service returned an error.'
    return failure(reason, message)
  }

  if (!data?.scenario) {
    return failure(SCENARIO_ERRORS.MALFORMED, 'The scenario service returned nothing usable.')
  }

  // The validator is the gate. Anything it rejects is reported as a failure
  // rather than partially applied, and anything it strips (a margin or
  // break-even the model tried to supply) is surfaced as a warning.
  const result = validateShopScenario(data.scenario, { sector, revenueTarget, description })
  if (!result.ok) {
    return failure(
      SCENARIO_ERRORS.REJECTED,
      'The generated scenario did not pass validation, so it was not applied. Try again, or adjust your description.',
      { errors: result.errors }
    )
  }

  return { ok: true, shop: result.shop, warnings: result.warnings }
}
