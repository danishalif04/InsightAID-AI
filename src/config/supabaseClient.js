import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'

const isConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey)

if (!isConfigured) {
  // createClient() throws synchronously when these are missing, which would
  // otherwise crash the whole app at import time (before any page can render).
  console.error(
    'Supabase is not configured — VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing. ' +
      'Copy .env.example to .env and fill in real project values. Auth will not work until this is set.'
  )
}

/**
 * Shared Supabase client (Postgres + Auth). All domain services build on
 * this instance — UI components never call supabase directly.
 * `null` when the app is running without valid credentials, so a missing
 * .env degrades gracefully instead of crashing on load.
 */
export const supabase = isConfigured ? createClient(env.supabaseUrl, env.supabaseAnonKey) : null
