import { supabase } from '@/config/supabaseClient'
import { splitByTable } from '@/utils/businessProfileSchema'

/**
 * Domain service for the business planning onboarding (FYP2.md §10, §23-27).
 * Pages never call supabase directly — same convention as every other
 * *Service.js file in this project.
 */

/** Calls the extract-business-profile Edge Function. Never throws — callers fall back to the manual form on any failure. */
export async function extractProfile(description) {
  const { data, error } = await supabase.functions.invoke('extract-business-profile', {
    body: { description },
  })

  if (error) {
    return { profile: null, warnings: [], error: error.message ?? 'AI extraction is unavailable right now.' }
  }
  if (data?.error) {
    return { profile: null, warnings: [], error: data.message ?? 'AI extraction is unavailable right now.' }
  }
  return { profile: data?.profile ?? {}, warnings: data?.warnings ?? [], error: null }
}

/** Fetches the current user's profile + assumptions as one flat { values, provenance } shape, or nulls if none saved yet. */
export async function getProfile() {
  const [{ data: profile, error: profileError }, { data: assumptions, error: assumptionsError }] = await Promise.all([
    supabase.from('business_profiles').select('*').maybeSingle(),
    supabase.from('business_assumptions').select('*').maybeSingle(),
  ])

  if (profileError || assumptionsError) {
    throw profileError ?? assumptionsError
  }
  if (!profile) {
    return { values: {}, provenance: {}, dataAvailabilityPath: null, exists: false }
  }

  const { provenance, id: _id, user_id: _userId, updated_at: _updatedAt, data_availability_path, ...profileFields } = profile
  const { id: _assumptionsId, user_id: _assumptionsUserId, updated_at: _assumptionsUpdatedAt, ...assumptionFields } =
    assumptions ?? {}

  return {
    values: { ...profileFields, ...assumptionFields },
    provenance: provenance ?? {},
    dataAvailabilityPath: data_availability_path,
    exists: true,
  }
}

/** Upserts both tables from one flat { fieldId: value } object plus its provenance map. */
export async function saveProfile({ values, provenance, dataAvailabilityPath }) {
  const { profile, assumptions } = splitByTable(values)

  const [{ error: profileError }, { error: assumptionsError }] = await Promise.all([
    supabase.from('business_profiles').upsert(
      {
        ...profile,
        data_availability_path: dataAvailabilityPath,
        provenance,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    ),
    supabase
      .from('business_assumptions')
      .upsert({ ...assumptions, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }),
  ])

  if (profileError || assumptionsError) {
    throw profileError ?? assumptionsError
  }
}
