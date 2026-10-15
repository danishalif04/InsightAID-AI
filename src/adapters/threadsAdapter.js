import { supabase } from '@/config/supabaseClient'
import { SOURCE_STATUS } from './sourceStatus'
import { mapThreadsPostsToSocialRows } from './threadsMapping'
import { ingestRows } from '@/services/dataPipelineService'

/**
 * Real Threads API integration, replacing the generic
 * createSocialSourceAdapter stub — mirrors src/adapters/xAdapter.js's
 * architecture. Only ever retrieves the authenticated account's OWN posts
 * (and their replies, best-effort) — see
 * supabase/functions/sync-threads-mentions/index.ts and
 * docs/API_INTEGRATION.md for why public brand-mention search is NOT
 * implemented here (it requires threads_keyword_search, a separate
 * permission this token hasn't been confirmed to have).
 */

async function fetchThreadsConfigured() {
  try {
    const { data, error } = await supabase.functions.invoke('source-status')
    if (error) return false
    return data?.sources?.threads?.status === 'not_configured_but_present'
  } catch {
    return false
  }
}

/** Already-synced posts' source_post_id values, so a repeated sync never
 * re-inserts the same real post twice. Scoped to this adapter — `raw_data`
 * has no dedicated external-id column, so this reads the last 500
 * api_sync/social rows and filters to Threads-origin ones in JS (fine at
 * this project's real data volumes; see FYP2.md §85 — not over-engineered
 * into a new migration for a problem this small). */
async function fetchAlreadySyncedPostIds() {
  const { data, error } = await supabase
    .from('raw_data')
    .select('payload')
    .eq('source', 'api_sync')
    .eq('template_id', 'social')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw error

  const ids = new Set()
  for (const row of data ?? []) {
    if (row.payload?.platform === 'Threads' && row.payload?.source_post_id) {
      ids.add(row.payload.source_post_id)
    }
  }
  return ids
}

export const threadsAdapter = {
  id: 'threads',
  name: 'Threads API',
  mode: 'api',
  modes: ['startup', 'ecommerce'],

  async checkStatus() {
    const configured = await fetchThreadsConfigured()
    if (!configured) return { status: SOURCE_STATUS.NOT_CONFIGURED, lastSync: null, recordCount: 0 }

    // processed_data has a real `platform` column (unlike raw_data, where
    // it's nested in jsonb) — filtering on it here keeps Threads' own
    // count/lastSync from being inflated by X's rows, since both currently
    // share the same source='api_sync'/template_id='social' combination.
    const { count, error } = await supabase
      .from('processed_data')
      .select('id', { count: 'exact', head: true })
      .eq('source', 'api_sync')
      .eq('platform', 'Threads')
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
      .from('processed_data')
      .select('collected_at')
      .eq('source', 'api_sync')
      .eq('platform', 'Threads')
      .order('collected_at', { ascending: false })
      .limit(1)

    return { status: SOURCE_STATUS.CONNECTED, lastSync: latest?.[0]?.collected_at ?? null, recordCount: count }
  },

  async sync() {
    let alreadySynced
    try {
      alreadySynced = await fetchAlreadySyncedPostIds()
    } catch (error) {
      return { status: SOURCE_STATUS.ERROR, message: error.message ?? 'Could not check previously-synced Threads posts.' }
    }

    const { data, error } = await supabase.functions.invoke('sync-threads-mentions', { body: {} })

    if (error) {
      return { status: SOURCE_STATUS.ERROR, message: error.message ?? 'Could not reach the Threads sync function.' }
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
      return { status: SOURCE_STATUS.ERROR, message: data.message ?? 'Threads sync failed.' }
    }

    const mapped = mapThreadsPostsToSocialRows(data?.posts ?? [], { repliesAvailable: Boolean(data?.repliesAvailable) })
    const newRows = mapped.filter((row) => !alreadySynced.has(row.source_post_id))

    const username = data?.account?.username
    const who = username ? `@${username}` : 'this account'

    if (mapped.length === 0) {
      return { status: SOURCE_STATUS.CONNECTED, message: `Connected to ${who}, but found 0 real posts.` }
    }
    if (newRows.length === 0) {
      return { status: SOURCE_STATUS.CONNECTED, message: `Connected to ${who} — all ${mapped.length} fetched post(s) were already synced previously.` }
    }

    const result = await ingestRows('social', newRows, 'api_sync', null)
    const skipped = mapped.length - newRows.length
    const repliesNote = data?.repliesAvailable ? '' : ' (reply counts unavailable — threads_read_replies not confirmed for this token)'
    return {
      status: SOURCE_STATUS.CONNECTED,
      message: `Synced ${result.rawCount} new real post(s) from ${who}${skipped > 0 ? ` (${skipped} already synced, skipped)` : ''}.${repliesNote}`,
    }
  },
}
