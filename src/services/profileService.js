import { supabase } from '@/config/supabaseClient'

/**
 * Real `profiles` row (auto-created on signup, supabase/migrations/0001_init.sql).
 * Used by Navbar/Sidebar (real name/initials instead of "Admin User"/"AU")
 * and SettingsPage's Profile section. Pages never call supabase directly.
 */

export async function getMyProfile() {
  const { data, error } = await supabase.from('profiles').select('*').maybeSingle()
  if (error) throw error
  if (data) return data

  // Accounts created before the on_auth_user_created trigger existed (or
  // for which it otherwise never fired) have no profiles row at all - the
  // UI's "Save Changes" button only ever UPDATEs, which silently affects
  // zero rows here, so it can never fix this on its own. Self-heal by
  // creating the row now, matching what the trigger would have inserted.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert({ id: user.id, email: user.email ?? '' })
    .select('*')
    .single()

  if (insertError) {
    // Navbar/Sidebar/SettingsPage all call getMyProfile() independently on
    // every page load - for an account with no row yet, more than one can
    // race to create it. '23505' is Postgres's unique-violation code: it
    // means someone else's insert won the race, not a real failure, so
    // just return what's actually there now instead of throwing.
    if (insertError.code === '23505') {
      const { data: existing, error: refetchError } = await supabase.from('profiles').select('*').maybeSingle()
      if (refetchError) throw refetchError
      return existing
    }
    throw insertError
  }
  return created
}

export async function updateMyProfile(fields) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in.')

  const { error } = await supabase
    .from('profiles')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', user.id)
  if (error) throw error
}
