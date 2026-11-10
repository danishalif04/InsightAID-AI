import { SOURCE_STATUS } from './sourceStatus'
import { salesDataAdapter } from './salesDataAdapter'
import { shopeeAdapter } from './shopeeAdapter'

/**
 * Every registered source, in the order shown in Dataset Management.
 *
 * Previously also listed tiktokAdapter/xAdapter/threadsAdapter/
 * shopeeAffiliateAdapter/lazadaAffiliateAdapter/tiktokShopAdapter — removed
 * by explicit user request ("remove threads, x, tiktok, shopee affiliate
 * api, lazada affiliate, tiktok shop affiliate api from the dataset
 * management page"). shopeeAdapter (dataset-mode, non-affiliate — real
 * uploaded Shopee review/social rows) was NOT in that list and stays.
 * The removed adapters' own files (and their now-orphaned helpers/edge
 * functions) were deleted outright rather than just unregistered, since
 * nothing else referenced them — see the commit this change shipped in.
 */
export const SOURCE_ADAPTERS = [salesDataAdapter, shopeeAdapter]

/**
 * Checks every adapter's status independently (FYP2.md §66 — one source
 * failing must never affect the others). A thrown error becomes that one
 * adapter's own ERROR status, not an app-wide failure.
 */
export async function getAllSourceStatuses() {
  const results = await Promise.all(
    SOURCE_ADAPTERS.map(async (adapter) => {
      try {
        const status = await adapter.checkStatus()
        return { ...adapter, ...status }
      } catch (error) {
        return {
          ...adapter,
          status: SOURCE_STATUS.ERROR,
          lastSync: null,
          recordCount: 0,
          detail: error?.message ?? 'Status check failed.',
        }
      }
    })
  )
  return results
}
