import { supabase } from '@/config/supabaseClient'

/**
 * Real `profiles` row (auto-created on signup, supabase/migrations/0001_init.sql).
 * Used by Navbar/Sidebar (real name/initials instead of "Admin User"/"AU")
 * and SettingsPage's Profile section. Pages never call supabase directly.
 */

export async function getMyProfile() {
  const { data, error } = await supabase.from('profiles').select('*').maybeSingle()
  if (error) throw error
  return data
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
