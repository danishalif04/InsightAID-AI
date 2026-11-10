import { supabase } from '@/config/supabaseClient'

/**
 * Startup Capital Planner (knowledge_updated_nov2026.md item 3). Separate
 * from businessProfileService.js's schema-driven save/load (its field
 * list — src/utils/businessProfileSchema.js — doesn't know about these
 * two columns), since this is a self-contained sub-form nothing else in
 * the app reads.
 */

/** @returns {Promise<{items: Record<string, number>, availableCapital: number|null}>} */
export async function getStartupCapital() {
  const { data, error } = await supabase
    .from('business_assumptions')
    .select('startup_capital_items, available_capital')
    .maybeSingle()
  if (error) throw error
  return { items: data?.startup_capital_items ?? {}, availableCapital: data?.available_capital ?? null }
}

/** @param {{items: Record<string, number>, availableCapital: number|null}} params */
export async function saveStartupCapital({ items, availableCapital }) {
  const { error } = await supabase
    .from('business_assumptions')
    .upsert(
      { startup_capital_items: items, available_capital: availableCapital, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
  if (error) throw error
}
