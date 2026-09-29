import { supabase } from '@/config/supabaseClient'
import { SOURCE_STATUS } from './sourceStatus'

/**
 * Shared factory for TikTok/X/Threads — each calls the same source-status
 * Edge Function, differing only by which key it reads back. No live data
 * fetching exists yet for any of them (no OAuth exchange has been built or
 * tested against a real endpoint — see docs/API_INTEGRATION.md); sync()
 * says so honestly instead of fabricating a result.
 */
export function createSocialSourceAdapter({ id, name, sourceKey }) {
  return {
    id,
    name,
    mode: 'api',
    modes: ['startup', 'ecommerce'],

    async checkStatus() {
      try {
        const { data, error } = await supabase.functions.invoke('source-status')
        if (error) throw error

        const entry = data?.sources?.[sourceKey]
        if (entry?.status === 'not_configured_but_present') {
          return {
            status: SOURCE_STATUS.AUTH_REQUIRED,
            lastSync: null,
            recordCount: 0,
            detail: 'Credentials are set, but the OAuth exchange and data fetch are not implemented yet.',
          }
        }
        return { status: SOURCE_STATUS.NOT_CONFIGURED, lastSync: null, recordCount: 0 }
      } catch {
        // Unreachable function (e.g. not deployed yet), network error, etc.
        // Still a real, honest status for THIS adapter only — never throws
        // in a way that would break other adapters in the registry.
        return { status: SOURCE_STATUS.NOT_CONFIGURED, lastSync: null, recordCount: 0 }
      }
    },

    async sync() {
      return {
        status: SOURCE_STATUS.NOT_CONFIGURED,
        message: `${name} data collection isn't implemented yet — see docs/API_INTEGRATION.md.`,
      }
    },
  }
}
