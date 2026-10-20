import { supabase } from '@/config/supabaseClient'
import { SOURCE_STATUS } from './sourceStatus'

/**
 * Shared factory for Shopee/Lazada/TikTok Shop marketplace adapters.
 *
 * Honest by construction, same pattern already used for TikTok's social
 * adapter before any real credentials existed for it: checkStatus() only
 * ever reports real state (secret presence, real sync history from
 * marketplace_sync_log/marketplace_products — 0009 migration), never a
 * fabricated CONNECTED. sync() is a real, callable function, but with no
 * authorized affiliate API access confirmed for any of these three
 * platforms yet (see docs/API_INTEGRATION.md), it has nothing real to
 * call - it reports NOT_CONFIGURED/AUTH_REQUIRED honestly rather than
 * pretending to fetch.
 *
 * Once a provider's affiliate API is actually confirmed and credentialed,
 * the fetch step inside sync() is the only thing that needs filling in -
 * this file's structure, the status checks, and the normalization layer
 * it will call (marketplaceNormalization.js) do not need to change.
 */
export function createMarketplaceAdapter({ id, name, sourcePlatform, sourceKey, modes = ['ecommerce'] }) {
  return {
    id,
    name,
    mode: 'api',
    modes,

    async checkStatus() {
      try {
        const { data, error } = await supabase.functions.invoke('source-status')
        if (error) throw error

        const entry = data?.sources?.[sourceKey]
        if (entry?.status !== 'not_configured_but_present') {
          return { status: SOURCE_STATUS.NOT_CONFIGURED, lastSync: null, recordCount: 0 }
        }

        const { count, error: countError } = await supabase
          .from('marketplace_products')
          .select('id', { count: 'exact', head: true })
          .eq('source_platform', sourcePlatform)
        if (countError) throw countError

        if (!count) {
          return {
            status: SOURCE_STATUS.AUTH_REQUIRED,
            lastSync: null,
            recordCount: 0,
            detail: 'Credentials are set but no successful sync has happened yet — click Sync to try a real fetch.',
          }
        }

        const { data: latest } = await supabase
          .from('marketplace_products')
          .select('last_synced_at')
          .eq('source_platform', sourcePlatform)
          .order('last_synced_at', { ascending: false })
          .limit(1)

        return { status: SOURCE_STATUS.CONNECTED, lastSync: latest?.[0]?.last_synced_at ?? null, recordCount: count }
      } catch {
        return { status: SOURCE_STATUS.NOT_CONFIGURED, lastSync: null, recordCount: 0 }
      }
    },

    async sync() {
      return {
        status: SOURCE_STATUS.NOT_CONFIGURED,
        message: `${name} has no authorized affiliate API access configured yet — see docs/API_INTEGRATION.md's Marketplace section for the real path (affiliate program sign-up), not a live fetch yet.`,
      }
    },
  }
}
