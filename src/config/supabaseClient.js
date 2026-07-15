import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'

/**
 * Shared Supabase client (Postgres + Auth). All domain services build on
 * this instance — UI components never call supabase directly.
 */
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey)
