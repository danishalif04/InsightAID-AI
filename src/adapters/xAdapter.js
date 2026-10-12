import { supabase } from '@/config/supabaseClient'
import { SOURCE_STATUS } from './sourceStatus'
import { mapXPostsToSocialRows } from './xMapping'
import { getProfile } from '@/services/businessProfileService'
import { ingestRows } from '@/services/dataPipelineService'

/**
 * Real X (Twitter) integration — unlike TikTok/Threads (still
 * `createSocialSourceAdapter` stubs, no credentials exist for either),
 * X_BEARER_TOKEN is configured, so this calls the real
 * sync-x-mentions Edge Function. Honest limitation, stated in
 * docs/API_INTEGRATION.md: X's Free tier only permits posting, not
 * reading — a real call may come back AUTH_REQUIRED rather than data, and
 * that is reported as such, never silently upgraded to CONNECTED.
 */

async function fetchXConfigured() {
  try {
    const { data, error } = await supabase.functions.invoke('source-status')
    if (error) return false
    return data?.sources?.x?.status === 'not_configured_but_present'
  } catch {
    return false
  }
}

export const xAdapter = {
  id: 'x',
  name: 'X API',
  mode: 'api',
  modes: ['startup', 'ecommerce'],

  async checkStatus() {
    const configured = await fetchXConfigured()
    if (!configured) return { status: SOURCE_STATUS.NOT_CONFIGURED, lastSync: null, recordCount: 0 }

    const { count, error } = await supabase.from('raw_data').select('id', { count: 'exact', head: true }).eq('source', 'api_sync').eq('template_id', 'social')
    if (error) throw error

    if (!count) {
      return {
        status: SOURCE_STATUS.AUTH_REQUIRED,
        lastSync: null,
        recordCount: 0,
        detail: 'Credentials are set but no successful sync has happened yet — click Sync to try a real fetch.',
      }
    }

    const { data: latest } = await supabase
      .from('raw_data')
      .select('created_at')
      .eq('source', 'api_sync')
      .eq('template_id', 'social')
      .order('created_at', { ascending: false })
      .limit(1)

    return { status: SOURCE_STATUS.CONNECTED, lastSync: latest?.[0]?.created_at ?? null, recordCount: count }
  },

  async sync() {
    const profile = await getProfile()
    const query = profile.values?.business_name || profile.values?.product_category
    if (!query) {
      return {
        status: SOURCE_STATUS.AUTH_REQUIRED,
        message: 'No business name or product category on file to search for — add one in Onboarding first.',
      }
    }

    const { data, error } = await supabase.functions.invoke('sync-x-mentions', { body: { query } })

    if (error) {
      return { status: SOURCE_STATUS.ERROR, message: error.message ?? 'Could not reach the X sync function.' }
    }
    if (data?.error === 'NOT_CONFIGURED') {
      return { status: SOURCE_STATUS.NOT_CONFIGURED, message: data.message }
    }
    if (data?.error === 'AUTH_REQUIRED') {
      return { status: SOURCE_STATUS.AUTH_REQUIRED, message: data.message }
    }
    if (data?.error === 'RATE_LIMITED') {
      return { status: SOURCE_STATUS.RATE_LIMITED, message: data.message }
    }
    if (data?.error) {
      return { status: SOURCE_STATUS.ERROR, message: data.message ?? 'X sync failed.' }
    }

    const rows = mapXPostsToSocialRows(data?.posts ?? [])
    if (rows.length === 0) {
      return { status: SOURCE_STATUS.CONNECTED, message: `Connected, but found 0 real posts matching "${query}".` }
    }

    const result = await ingestRows('social', rows, 'api_sync', null)
    return {
      status: SOURCE_STATUS.CONNECTED,
      message: `Synced ${result.rawCount} real post(s) matching "${query}" from X.`,
    }
  },
}
