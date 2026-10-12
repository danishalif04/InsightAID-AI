import { supabase } from '@/config/supabaseClient'

/**
 * Real Settings-page reads/writes against companies/user_preferences/api_keys
 * (supabase/migrations/0001_init.sql — profiles is handled by profileService.js).
 * Pages never call supabase directly.
 */

export async function getCompany() {
  const { data, error } = await supabase.from('companies').select('*').maybeSingle()
  if (error) throw error
  return data
}

export async function saveCompany(fields) {
  const { error } = await supabase.from('companies').upsert({ ...fields }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function getPreferences() {
  const { data, error } = await supabase.from('user_preferences').select('*').maybeSingle()
  if (error) throw error
  return data
}

export async function savePreferences(fields) {
  const { error } = await supabase
    .from('user_preferences')
    .upsert({ ...fields, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function getApiKeys() {
  const { data, error } = await supabase.from('api_keys').select('*').order('name')
  if (error) throw error
  return data ?? []
}
