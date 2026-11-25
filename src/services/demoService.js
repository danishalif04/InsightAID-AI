import { supabase } from '@/config/supabaseClient'
import { ingestRows } from '@/services/dataPipelineService'
import { saveProfile } from '@/services/businessProfileService'
import { savePreferences } from '@/services/settingsService'
import { PROVENANCE } from '@/utils/businessProfileSchema'
import { DEMO_PROFILE, DEMO_SOURCE, buildDemoRecords } from '@/utils/demoSeed'

/**
 * "Try demo" without signing up (SPARK 2026).
 *
 * 1. Supabase anonymous sign-in gives the visitor a real, private account.
 *    Row Level Security keys on auth.uid(), so a visitor only ever sees
 *    their own copy, and no schema change is needed.
 * 2. The synthetic Koperasi Siswa Maju data is pushed through the SAME
 *    ingestion pipeline a CSV upload uses (dataPipelineService.ingestRows),
 *    so sentiment, crisis and planner results are computed, not pre-baked.
 *
 * Needs "Allow anonymous sign-ins" switched on in the Supabase project
 * (Authentication > Sign In / Providers).
 */

export class DemoUnavailableError extends Error {}

export async function startDemo() {
  if (!supabase) throw new DemoUnavailableError('The demo is not configured on this site.')
  const { error } = await supabase.auth.signInAnonymously()
  if (error) {
    throw new DemoUnavailableError(
      /anonymous/i.test(error.message)
        ? 'The demo is switched off at the moment. Please sign up or use a demo account.'
        : `The demo could not start: ${error.message}`,
    )
  }
  return seedDemoAccount()
}

/** Seeds the signed-in account once. A second call (e.g. a page refresh mid-way) does nothing if sales already exist. */
export async function seedDemoAccount({ today = new Date().toISOString().slice(0, 10) } = {}) {
  const { count, error } = await supabase
    .from('raw_data')
    .select('id', { count: 'exact', head: true })
    .eq('template_id', 'sales')
  if (error) throw error
  if (count > 0) return { seeded: false }

  // Loaded only when a visitor actually starts the demo, so the Login page stays light.
  const { default: bundle } = await import('@/data/koperasiSiswaMaju.json')
  const records = buildDemoRecords(bundle, { today })

  // Profile and pathway first, so the Dashboard never shows the onboarding prompt.
  await Promise.all([
    saveProfile({
      values: DEMO_PROFILE,
      provenance: Object.fromEntries(Object.keys(DEMO_PROFILE).map((k) => [k, PROVENANCE.defaultAssumption])),
      dataAvailabilityPath: 'has_data',
    }),
    savePreferences({ workspace_mode: 'startup' }),
  ])
  await ingestRows('sales', records.sales, DEMO_SOURCE, 'koperasi_siswa_maju_sales_SYNTHETIC.csv')
  await ingestRows('reviews', records.reviews, DEMO_SOURCE, 'koperasi_siswa_maju_reviews_SYNTHETIC.csv')
  return { seeded: true, shiftDays: records.shiftDays, from: records.from, to: records.to }
}
