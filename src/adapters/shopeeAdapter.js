import { supabase } from '@/config/supabaseClient'
import { SOURCE_STATUS } from './sourceStatus'

/**
 * Shopee adapter — DATASET MODE ONLY (FYP2.md §37): no public Shopee API
 * exists for this, and this project never bypasses anti-bot mechanisms or
 * assumes access to a private/internal API. "Connected" means Shopee-
 * platform rows exist in processed_data from an approved upload (Phase 4's
 * Reviews/Social templates), not a live OAuth session.
 */
export const shopeeAdapter = {
  id: 'shopee',
  name: 'Shopee (Dataset Mode)',
  mode: 'dataset',
  modes: ['ecommerce'],

  async checkStatus() {
    const { count, error: countError } = await supabase
      .from('processed_data')
      .select('id', { count: 'exact', head: true })
      .ilike('platform', 'shopee')
    if (countError) throw countError

    if (!count) {
      return { status: SOURCE_STATUS.NOT_CONFIGURED, lastSync: null, recordCount: 0 }
    }

    const { data, error: lastError } = await supabase
      .from('processed_data')
      .select('created_at')
      .ilike('platform', 'shopee')
      .order('created_at', { ascending: false })
      .limit(1)
    if (lastError) throw lastError

    return { status: SOURCE_STATUS.CONNECTED, lastSync: data?.[0]?.created_at ?? null, recordCount: count }
  },

  async sync() {
    const status = await this.checkStatus()
    return {
      status: status.status,
      message:
        status.status === SOURCE_STATUS.CONNECTED
          ? `${status.recordCount} Shopee row(s) on record.`
          : 'No Shopee dataset uploaded yet — this is dataset mode, not a live API (see docs/API_INTEGRATION.md).',
    }
  },
}
